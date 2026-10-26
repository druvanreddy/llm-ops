"""Run the eval harness and save results.

Usage:
    python -m scripts.run_eval --split test --output results/current.json
    python -m scripts.run_eval --split dev --max-examples 20
"""
from __future__ import annotations

import argparse
import asyncio
import json
import sys

from src.core.config import get_settings
from src.eval.harness import EvalHarness


def main() -> None:
    parser = argparse.ArgumentParser(description="Run LLM eval harness")
    parser.add_argument("--split", default="test", choices=["dev", "test"])
    parser.add_argument("--output", default="results/current.json")
    parser.add_argument("--max-examples", type=int, default=None)
    args = parser.parse_args()

    settings = get_settings()
    harness = EvalHarness(settings)

    print(f"Running eval on '{args.split}' split...")
    print(f"  Model: {settings.primary_model}")
    print(f"  Prompt: {settings.active_prompt_version}")
    print()

    result = asyncio.run(harness.run(split=args.split, max_examples=args.max_examples))

    # Print results table
    print("=" * 60)
    print("EVAL RESULTS")
    print("=" * 60)
    print(f"  Total examples:        {result.total_examples}")
    print(f"  Overall accuracy:      {result.overall_accuracy:.1f}%")
    for field, acc in sorted(result.accuracy_by_field.items()):
        print(f"    {field:20s}   {acc:.1f}%")
    print(f"  Schema valid rate:     {result.schema_valid_rate:.1f}%")
    print(f"  Error rate:            {result.error_rate:.1f}%")
    print(f"  p50 latency:           {result.latency_p50_ms:.0f}ms")
    print(f"  p95 latency:           {result.latency_p95_ms:.0f}ms")
    print(f"  p99 latency:           {result.latency_p99_ms:.0f}ms")
    print(f"  Cost per request:      ${result.cost_per_request_usd:.5f}")
    print(f"  Cost per 1k success:   ${result.cost_per_1k_success_usd:.4f}")
    print(f"  Total cost:            ${result.total_cost_usd:.4f}")
    if result.errors_by_class:
        print(f"  Errors by class:")
        for cls, count in sorted(result.errors_by_class.items()):
            print(f"    {cls:20s}   {count}")
    print("=" * 60)

    # Save results
    from pathlib import Path
    Path(args.output).parent.mkdir(parents=True, exist_ok=True)
    with open(args.output, "w") as f:
        json.dump(result.model_dump(), f, indent=2)
    print(f"\nResults saved to {args.output}")


if __name__ == "__main__":
    main()
