"""Compare eval results against baseline.

Usage:
    python -m scripts.compare_eval --baseline results/baseline.json --current results/current.json
"""

from __future__ import annotations

import argparse
import json
import sys

from src.core.schemas import EvalResult
from src.eval.compare import compare


def main() -> None:
    parser = argparse.ArgumentParser(description="Compare eval results against baseline")
    parser.add_argument("--baseline", required=True)
    parser.add_argument("--current", required=True)
    parser.add_argument("--output-markdown", default=None)
    parser.add_argument("--accuracy-threshold", type=float, default=2.0)
    parser.add_argument("--latency-threshold", type=float, default=15.0)
    parser.add_argument("--cost-threshold", type=float, default=15.0)
    args = parser.parse_args()

    with open(args.baseline) as f:
        baseline = EvalResult(**json.load(f))
    with open(args.current) as f:
        current = EvalResult(**json.load(f))

    result = compare(
        current=current,
        baseline=baseline,
        accuracy_threshold=args.accuracy_threshold,
        latency_threshold_pct=args.latency_threshold,
        cost_threshold_pct=args.cost_threshold,
    )

    verdict = "PASSED" if result.passed else "FAILED"
    report = f"## Eval Gate: {verdict}\n\n{result.table_markdown}"

    if not result.passed:
        report += "\n\n### Failures\n"
        for detail in result.details:
            report += f"- {detail}\n"

    print(report)

    if args.output_markdown:
        with open(args.output_markdown, "w") as f:
            f.write(report)
        print(f"\nReport saved to {args.output_markdown}")

    if not result.passed:
        sys.exit(1)


if __name__ == "__main__":
    main()
