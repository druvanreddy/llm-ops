from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path

from src.core.schemas import EvalResult


@dataclass
class ComparisonResult:
    passed: bool
    details: list[str]
    table_markdown: str
    baseline: EvalResult
    current: EvalResult


def load_baseline(path: str = "results/baseline.json") -> EvalResult:
    with open(path) as f:
        data = json.load(f)
    return EvalResult(**data)


def compare(
    current: EvalResult,
    baseline: EvalResult,
    accuracy_threshold: float = 2.0,
    latency_threshold_pct: float = 15.0,
    cost_threshold_pct: float = 15.0,
) -> ComparisonResult:
    failures: list[str] = []
    rows: list[str] = []

    accuracy_delta = current.overall_accuracy - baseline.overall_accuracy
    accuracy_status = "PASS" if accuracy_delta >= -accuracy_threshold else "FAIL"
    if accuracy_status == "FAIL":
        failures.append(
            f"Accuracy dropped {abs(accuracy_delta):.1f} points "
            f"(threshold: {accuracy_threshold})"
        )
    rows.append(
        f"| Overall accuracy | {baseline.overall_accuracy:.1f}% | "
        f"{current.overall_accuracy:.1f}% | {accuracy_delta:+.1f} | {accuracy_status} |"
    )

    for field in sorted(set(baseline.accuracy_by_field) | set(current.accuracy_by_field)):
        b = baseline.accuracy_by_field.get(field, 0)
        c = current.accuracy_by_field.get(field, 0)
        d = c - b
        status = "PASS" if d >= -accuracy_threshold else "FAIL"
        if status == "FAIL":
            failures.append(f"Field '{field}' accuracy dropped {abs(d):.1f} points")
        rows.append(f"| {field} accuracy | {b:.1f}% | {c:.1f}% | {d:+.1f} | {status} |")

    if baseline.latency_p95_ms > 0:
        latency_pct_change = (
            (current.latency_p95_ms - baseline.latency_p95_ms) / baseline.latency_p95_ms * 100
        )
        latency_status = "PASS" if latency_pct_change <= latency_threshold_pct else "FAIL"
        if latency_status == "FAIL":
            failures.append(
                f"p95 latency regressed {latency_pct_change:.1f}% "
                f"(threshold: {latency_threshold_pct}%)"
            )
        rows.append(
            f"| p95 latency | {baseline.latency_p95_ms:.0f}ms | "
            f"{current.latency_p95_ms:.0f}ms | {latency_pct_change:+.1f}% | {latency_status} |"
        )

    if baseline.cost_per_request_usd > 0:
        cost_pct_change = (
            (current.cost_per_request_usd - baseline.cost_per_request_usd)
            / baseline.cost_per_request_usd
            * 100
        )
        cost_status = "PASS" if cost_pct_change <= cost_threshold_pct else "FAIL"
        if cost_status == "FAIL":
            failures.append(
                f"Cost per request regressed {cost_pct_change:.1f}% "
                f"(threshold: {cost_threshold_pct}%)"
            )
        rows.append(
            f"| Cost/request | ${baseline.cost_per_request_usd:.5f} | "
            f"${current.cost_per_request_usd:.5f} | {cost_pct_change:+.1f}% | {cost_status} |"
        )

    rows.append(
        f"| Schema valid rate | {baseline.schema_valid_rate:.1f}% | "
        f"{current.schema_valid_rate:.1f}% | "
        f"{current.schema_valid_rate - baseline.schema_valid_rate:+.1f} | — |"
    )
    rows.append(
        f"| Error rate | {baseline.error_rate:.1f}% | "
        f"{current.error_rate:.1f}% | "
        f"{current.error_rate - baseline.error_rate:+.1f} | — |"
    )

    header = "| Metric | Baseline | Current | Delta | Status |\n| --- | --- | --- | --- | --- |"
    table = header + "\n" + "\n".join(rows)

    return ComparisonResult(
        passed=len(failures) == 0,
        details=failures,
        table_markdown=table,
        baseline=baseline,
        current=current,
    )


def save_result(result: EvalResult, path: str = "results/current.json") -> None:
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w") as f:
        json.dump(result.model_dump(), f, indent=2)
