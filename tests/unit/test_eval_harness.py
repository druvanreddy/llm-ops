"""Tests for src/eval/harness.py — golden set loading and percentile calculation."""

from __future__ import annotations

import json
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest

from src.eval.harness import EvalHarness


@pytest.fixture
def settings():
    s = MagicMock()
    s.golden_set_path = "data/golden_set"
    s.active_prompt_version = "v1"
    s.prompts_dir = "prompts"
    s.primary_model = "test/model"
    s.fallback_model = "test/fallback"
    s.circuit_breaker_failure_threshold = 5
    s.circuit_breaker_recovery_timeout = 30.0
    s.llm_timeout = 30
    return s


@pytest.fixture
def harness(settings):
    with patch("src.eval.harness.LLMMetrics"):
        with patch("src.eval.harness.LLMGateway"):
            h = EvalHarness(settings)
            yield h


class TestPercentile:
    def test_empty_list(self) -> None:
        assert EvalHarness._percentile([], 50) == 0.0

    def test_single_value(self) -> None:
        assert EvalHarness._percentile([100.0], 50) == 100.0
        assert EvalHarness._percentile([100.0], 95) == 100.0

    def test_p50(self) -> None:
        data = [10.0, 20.0, 30.0, 40.0, 50.0]
        result = EvalHarness._percentile(data, 50)
        assert result == 30.0

    def test_p95(self) -> None:
        data = list(range(1, 101))
        result = EvalHarness._percentile([float(x) for x in data], 95)
        assert 95.0 <= result <= 96.0

    def test_p99(self) -> None:
        data = [float(x) for x in range(1, 101)]
        result = EvalHarness._percentile(data, 99)
        assert result >= 99.0

    def test_two_values(self) -> None:
        result = EvalHarness._percentile([0.0, 100.0], 50)
        assert result == 50.0


class TestLoadGoldenSet:
    def test_load_test_split(self, harness) -> None:
        examples = harness.load_golden_set("test")
        assert len(examples) > 0
        assert examples[0].ticket_text
        assert examples[0].expected

    def test_load_dev_split(self, harness) -> None:
        examples = harness.load_golden_set("dev")
        assert len(examples) > 0

    def test_nonexistent_split_raises(self, harness) -> None:
        with pytest.raises(FileNotFoundError):
            harness.load_golden_set("nonexistent")

    def test_example_has_expected_fields(self, harness) -> None:
        examples = harness.load_golden_set("test")
        ex = examples[0]
        assert "category" in ex.expected or "priority" in ex.expected

    def test_exact_match_fields_defined(self) -> None:
        assert "category" in EvalHarness.EXACT_MATCH_FIELDS
        assert "priority" in EvalHarness.EXACT_MATCH_FIELDS
        assert "severity" in EvalHarness.EXACT_MATCH_FIELDS
        assert "customer_intent" in EvalHarness.EXACT_MATCH_FIELDS

    def test_custom_golden_set(self, tmp_path: Path, settings) -> None:
        golden_dir = tmp_path / "golden"
        golden_dir.mkdir()
        test_file = golden_dir / "test.jsonl"
        test_file.write_text(
            json.dumps(
                {
                    "ticket_text": "Test ticket text for eval",
                    "expected": {"category": "billing", "priority": "high"},
                    "id": "custom_1",
                }
            )
            + "\n"
        )
        settings.golden_set_path = str(golden_dir)
        with patch("src.eval.harness.LLMMetrics"):
            with patch("src.eval.harness.LLMGateway"):
                h = EvalHarness(settings)
                examples = h.load_golden_set("test")
        assert len(examples) == 1
        assert examples[0].example_id == "custom_1"
        assert examples[0].expected["category"] == "billing"


class TestEvalResult:
    def test_eval_result_schema(self) -> None:
        from src.core.schemas import EvalResult

        result = EvalResult(
            total_examples=10,
            accuracy_by_field={"category": 90.0, "priority": 80.0},
            overall_accuracy=85.0,
            schema_valid_rate=100.0,
            latency_p50_ms=100.0,
            latency_p95_ms=200.0,
            latency_p99_ms=300.0,
            cost_per_request_usd=0.001,
            cost_per_1k_success_usd=1.0,
            total_cost_usd=0.01,
            error_rate=0.0,
            errors_by_class={},
        )
        dumped = result.model_dump()
        assert dumped["total_examples"] == 10
        assert dumped["overall_accuracy"] == 85.0
        assert dumped["errors_by_class"] == {}
