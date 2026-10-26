from __future__ import annotations

import json
import logging
import statistics
import time
from pathlib import Path
from typing import Any

from src.core.config import Settings
from src.core.schemas import EvalResult
from src.gateway.llm_gateway import LLMGateway
from src.observability.metrics import LLMMetrics
from src.prompts.registry import PromptRegistry

logger = logging.getLogger(__name__)


class EvalExample:
    def __init__(self, ticket_text: str, expected: dict[str, Any], example_id: str = "") -> None:
        self.ticket_text = ticket_text
        self.expected = expected
        self.example_id = example_id


class EvalHarness:
    EXACT_MATCH_FIELDS = ["category", "priority", "product", "severity", "customer_intent"]

    def __init__(self, settings: Settings) -> None:
        self._settings = settings
        self._metrics = LLMMetrics()
        self._gateway = LLMGateway(settings, self._metrics)
        self._registry = PromptRegistry(settings.prompts_dir)

    def load_golden_set(self, split: str = "test") -> list[EvalExample]:
        path = Path(self._settings.golden_set_path) / f"{split}.jsonl"
        if not path.exists():
            raise FileNotFoundError(f"Golden set not found: {path}")

        examples = []
        with open(path) as f:
            for i, line in enumerate(f):
                data = json.loads(line)
                examples.append(
                    EvalExample(
                        ticket_text=data["ticket_text"],
                        expected=data["expected"],
                        example_id=data.get("id", f"example_{i}"),
                    )
                )
        return examples

    async def run(self, split: str = "test", max_examples: int | None = None) -> EvalResult:
        examples = self.load_golden_set(split)
        if max_examples:
            examples = examples[:max_examples]

        prompt_config = self._registry.load("triage", self._settings.active_prompt_version)

        results: list[dict[str, Any]] = []
        latencies: list[float] = []
        costs: list[float] = []
        errors_by_class: dict[str, int] = {}
        schema_valid_first = 0
        schema_valid_repair = 0
        schema_fail = 0

        for example in examples:
            system_prompt, user_prompt = self._registry.render(
                prompt_config, {"ticket_text": example.ticket_text}
            )

            start = time.perf_counter()
            try:
                call_result = await self._gateway.call(
                    system_prompt=system_prompt,
                    user_prompt=user_prompt,
                    model=prompt_config.model,
                    temperature=prompt_config.temperature,
                    max_tokens=prompt_config.max_tokens,
                )
                elapsed_ms = (time.perf_counter() - start) * 1000
                latencies.append(elapsed_ms)
                costs.append(call_result.cost_usd)

                if call_result.repair_attempted:
                    schema_valid_repair += 1
                else:
                    schema_valid_first += 1

                field_matches = {}
                for field in self.EXACT_MATCH_FIELDS:
                    predicted = getattr(call_result.result, field, None)
                    expected_val = example.expected.get(field)
                    if predicted is not None and expected_val is not None:
                        field_matches[field] = str(predicted).lower() == str(expected_val).lower()

                results.append(
                    {
                        "id": example.example_id,
                        "field_matches": field_matches,
                        "latency_ms": elapsed_ms,
                        "cost_usd": call_result.cost_usd,
                        "model": call_result.model,
                        "fallback_used": call_result.fallback_used,
                    }
                )

            except Exception as exc:
                elapsed_ms = (time.perf_counter() - start) * 1000
                latencies.append(elapsed_ms)
                error_class = type(exc).__name__
                errors_by_class[error_class] = errors_by_class.get(error_class, 0) + 1
                schema_fail += 1
                logger.warning("Eval example %s failed: %s", example.example_id, exc)

        total = len(examples)
        successful = len(results)

        accuracy_by_field: dict[str, float] = {}
        for field in self.EXACT_MATCH_FIELDS:
            matches = [
                r["field_matches"].get(field, False)
                for r in results
                if field in r["field_matches"]
            ]
            if matches:
                accuracy_by_field[field] = sum(matches) / len(matches) * 100

        overall_accuracy = (
            statistics.mean(accuracy_by_field.values()) if accuracy_by_field else 0.0
        )

        schema_valid_rate = (
            (schema_valid_first + schema_valid_repair) / total * 100 if total > 0 else 0.0
        )

        sorted_latencies = sorted(latencies) if latencies else [0.0]
        total_cost = sum(costs)
        cost_per_request = total_cost / successful if successful > 0 else 0.0

        return EvalResult(
            total_examples=total,
            accuracy_by_field=accuracy_by_field,
            overall_accuracy=round(overall_accuracy, 2),
            schema_valid_rate=round(schema_valid_rate, 2),
            latency_p50_ms=round(self._percentile(sorted_latencies, 50), 2),
            latency_p95_ms=round(self._percentile(sorted_latencies, 95), 2),
            latency_p99_ms=round(self._percentile(sorted_latencies, 99), 2),
            cost_per_request_usd=round(cost_per_request, 6),
            cost_per_1k_success_usd=round(cost_per_request * 1000, 4),
            total_cost_usd=round(total_cost, 4),
            error_rate=round((total - successful) / total * 100, 2) if total > 0 else 0.0,
            errors_by_class=errors_by_class,
        )

    @staticmethod
    def _percentile(sorted_data: list[float], p: float) -> float:
        if not sorted_data:
            return 0.0
        k = (len(sorted_data) - 1) * (p / 100)
        f = int(k)
        c = f + 1
        if c >= len(sorted_data):
            return sorted_data[-1]
        return sorted_data[f] + (k - f) * (sorted_data[c] - sorted_data[f])
