from __future__ import annotations

from prometheus_client import Counter, Histogram, Info


class LLMMetrics:
    def __init__(self) -> None:
        self.app_info = Info("llm_ops", "LLM Ops service metadata")

        self.requests_total = Counter(
            "llm_requests_total",
            "Total LLM requests",
            ["status", "model", "prompt_version"],
        )

        self.request_duration = Histogram(
            "llm_request_duration_seconds",
            "End-to-end request latency",
            ["model"],
            buckets=(0.5, 1.0, 2.0, 3.0, 4.0, 5.0, 8.0, 12.0, 16.0, 30.0),
        )

        self.llm_call_duration = Histogram(
            "llm_call_duration_milliseconds",
            "LLM provider call latency in ms",
            ["model"],
            buckets=(200, 500, 1000, 2000, 3000, 4000, 5000, 8000, 12000, 16000, 30000),
        )

        self.tokens_total = Counter(
            "llm_tokens_total",
            "Total tokens used",
            ["direction", "model"],
        )

        self.cost_dollars = Counter(
            "llm_cost_dollars_total",
            "Total cost in USD",
            ["model"],
        )

        self.errors_total = Counter(
            "llm_errors_total",
            "Total errors by class",
            ["error_class"],
        )

        self.fallback_total = Counter(
            "llm_fallback_total",
            "Requests routed to fallback provider",
            ["from_provider", "to_provider"],
        )

        self.schema_valid_total = Counter(
            "llm_schema_valid_total",
            "Schema validation results",
            ["attempt"],
        )

    def record_request(
        self,
        status: str,
        model: str,
        prompt_version: str,
        duration_s: float,
    ) -> None:
        self.requests_total.labels(status=status, model=model, prompt_version=prompt_version).inc()
        self.request_duration.labels(model=model).observe(duration_s)

    def record_latency(self, latency_ms: float, model: str) -> None:
        self.llm_call_duration.labels(model=model).observe(latency_ms)

    def record_tokens(self, input_tokens: int, output_tokens: int, model: str) -> None:
        self.tokens_total.labels(direction="input", model=model).inc(input_tokens)
        self.tokens_total.labels(direction="output", model=model).inc(output_tokens)

    def record_cost(self, cost_usd: float, model: str) -> None:
        self.cost_dollars.labels(model=model).inc(cost_usd)

    def record_error(self, error_class: str) -> None:
        self.errors_total.labels(error_class=error_class).inc()

    def record_fallback(self, from_provider: str, to_provider: str) -> None:
        self.fallback_total.labels(from_provider=from_provider, to_provider=to_provider).inc()

    def record_schema_valid(self, attempt: str = "first") -> None:
        self.schema_valid_total.labels(attempt=attempt).inc()
