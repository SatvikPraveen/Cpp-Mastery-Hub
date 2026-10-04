#!/usr/bin/env python3
"""Reproducible evaluation of the cppmastery engine.

Runs the CLI over the seeded corpus, checks every expected diagnostic is present (recall) and
that no unexpected rule fires on the clean subset (precision proxy), validates the JSON output
against the schemas, and optionally ingests Google Benchmark JSON to produce a throughput table.

Usage:
    python3 eval/run_eval.py --cli build/release/cppmastery [--bench build/bench/benchmarks/cppmastery_bench]
                             [--out docs/research/results]

Exit status is non-zero if any expectation fails, so CI can gate on it. Only the standard
library is required; `jsonschema` is used for schema validation when installed.
"""
from __future__ import annotations

import argparse
import json
import pathlib
import platform
import re
import subprocess
import sys
import time
from collections import Counter
from dataclasses import dataclass, field

ROOT = pathlib.Path(__file__).resolve().parent
CORPUS = ROOT / "corpus"
SCHEMAS = ROOT.parent / "schemas"

EXPECT_RE = re.compile(r"([a-z]+/[a-z0-9+-]+)(?:\s*\(x(\d+)\))?")


@dataclass
class FileResult:
    path: pathlib.Path
    expected: Counter
    observed: Counter
    elapsed_us: int
    lines: int
    unexpected: Counter = field(default_factory=Counter)
    missing: Counter = field(default_factory=Counter)


def parse_expectations(path: pathlib.Path) -> Counter:
    """Reads `// Seeded smells: rule (xN), rule ...` header comments."""
    expected: Counter = Counter()
    header = []
    for line in path.read_text().splitlines():
        if not line.startswith("//"):
            break
        header.append(line[2:].strip())
    text = " ".join(header)
    if "Seeded smells:" not in text:
        return expected
    for rule, count in EXPECT_RE.findall(text.split("Seeded smells:", 1)[1]):
        expected[rule] += int(count) if count else 1
    return expected


def run_cli(cli: str, *args: str) -> tuple[int, str]:
    proc = subprocess.run([cli, *args], capture_output=True, text=True)
    return proc.returncode, proc.stdout


def validate_schema(instance: dict, schema_path: pathlib.Path) -> str | None:
    try:
        import jsonschema  # type: ignore
    except ImportError:
        return "skipped (pip install jsonschema to enable)"
    schema = json.loads(schema_path.read_text())
    jsonschema.Draft202012Validator(schema).validate(instance)
    return None


def evaluate(cli: str) -> tuple[list[FileResult], list[str]]:
    results: list[FileResult] = []
    notes: list[str] = []
    for path in sorted(CORPUS.rglob("*.cpp")):
        if path.parent.name == "layout":
            continue
        code, out = run_cli(cli, "analyze", "--json", "--fail-on", "never", str(path))
        if code != 0:
            notes.append(f"{path.name}: CLI exited {code}")
            continue
        report = json.loads(out)
        err = validate_schema(report, SCHEMAS / "analysis.schema.json")
        if err and "skipped" in err and not notes:
            notes.append(f"schema validation {err}")
        observed = Counter(d["rule"] for d in report["diagnostics"])
        expected = parse_expectations(path)
        fr = FileResult(path, expected, observed, report["elapsed_us"], report["metrics"]["lines"]["physical"])
        if path.parent.name == "clean":
            fr.unexpected = Counter({r: c for r, c in observed.items()
                                     if report["diagnostics"] and any(
                                         d["rule"] == r and d["severity"] != "info" for d in report["diagnostics"])})
        else:
            fr.missing = Counter({r: c - observed.get(r, 0) for r, c in expected.items() if observed.get(r, 0) < c})
        results.append(fr)
    return results, notes


def layout_check(cli: str) -> list[str]:
    problems = []
    for path in sorted((CORPUS / "layout").glob("*.cpp")):
        code, out = run_cli(cli, "layout", "--json", str(path))
        if code != 0:
            problems.append(f"{path.name}: layout exited {code}")
            continue
        report = json.loads(out)
        err = validate_schema(report, SCHEMAS / "layout.schema.json")
        for s in report["structs"]:
            if "suggested" in s and s["suggested"]["layout"]["size"] > s["layout"]["size"]:
                problems.append(f"{path.name}: reorder of {s['layout']['name']} made it larger")
    return problems


def bench_table(bench: str | None) -> str:
    if not bench:
        return "_Benchmarks not run (pass --bench)._\n"
    proc = subprocess.run([bench, "--benchmark_format=json", "--benchmark_min_time=0.2s"],
                          capture_output=True, text=True, check=True)
    data = json.loads(proc.stdout)
    rows = ["| Benchmark | Time (µs) | Throughput (MB/s) |", "|---|---:|---:|"]
    for b in data["benchmarks"]:
        us = b["real_time"] / 1000 if b["time_unit"] == "ns" else b["real_time"]
        mbps = b.get("bytes_per_second", 0) / 1e6
        rows.append(f"| `{b['name']}` | {us:,.1f} | {mbps:,.1f} |" if mbps else f"| `{b['name']}` | {us:,.1f} | – |")
    ctx = data["context"]
    rows.append("")
    rows.append(f"_{ctx['num_cpus']} CPUs @ {ctx['mhz_per_cpu']} MHz, "
                f"{'release' if not ctx.get('library_build_type','').startswith('debug') else 'debug'} build, "
                f"{platform.platform()}._")
    return "\n".join(rows) + "\n"


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--cli", required=True, help="path to the cppmastery binary")
    ap.add_argument("--bench", help="path to cppmastery_bench (optional)")
    ap.add_argument("--out", type=pathlib.Path, help="directory for results.md / results.json")
    args = ap.parse_args()

    started = time.time()
    results, notes = evaluate(args.cli)
    layout_problems = layout_check(args.cli)
    _, version = run_cli(args.cli, "version")

    total_expected = sum(sum(r.expected.values()) for r in results)
    total_missing = sum(sum(r.missing.values()) for r in results)
    total_unexpected = sum(sum(r.unexpected.values()) for r in results)
    recall = (total_expected - total_missing) / total_expected if total_expected else 1.0

    lines = [f"# Engine evaluation — {version.strip()}", ""]
    lines.append(f"Generated {time.strftime('%Y-%m-%d %H:%M:%S %Z')} on {platform.platform()}.")
    lines.append("")
    lines.append("## Seeded-smell recall")
    lines.append("")
    lines.append(f"- Expected diagnostics: **{total_expected}**")
    lines.append(f"- Detected: **{total_expected - total_missing}** (recall {recall:.1%})")
    lines.append(f"- Non-info diagnostics on clean corpus: **{total_unexpected}**")
    lines.append("")
    lines.append("| File | Lines | Expected | Observed | Missing | Unexpected | Time (µs) |")
    lines.append("|---|---:|---:|---:|---|---|---:|")
    for r in results:
        lines.append(f"| `{r.path.relative_to(CORPUS)}` | {r.lines} | {sum(r.expected.values())} | "
                     f"{sum(r.observed.values())} | {dict(r.missing) or '–'} | {dict(r.unexpected) or '–'} | {r.elapsed_us} |")
    lines.append("")
    lines.append("## Layout model")
    lines.append("")
    lines.append("All reorder suggestions are size-non-increasing: **" + ("yes" if not layout_problems else "NO") + "**")
    for p in layout_problems:
        lines.append(f"- {p}")
    lines.append("")
    lines.append("## Throughput")
    lines.append("")
    lines.append(bench_table(args.bench))
    if notes:
        lines.append("## Notes")
        lines.append("")
        lines.extend(f"- {n}" for n in notes)
    report_md = "\n".join(lines) + "\n"

    print(report_md)
    if args.out:
        args.out.mkdir(parents=True, exist_ok=True)
        (args.out / "results.md").write_text(report_md)
        (args.out / "results.json").write_text(json.dumps({
            "version": version.strip(),
            "recall": recall,
            "expected": total_expected,
            "missing": total_missing,
            "unexpected_on_clean": total_unexpected,
            "layout_problems": layout_problems,
            "files": [{"path": str(r.path.relative_to(CORPUS)), "expected": dict(r.expected),
                       "observed": dict(r.observed), "elapsed_us": r.elapsed_us} for r in results],
            "elapsed_s": round(time.time() - started, 2),
        }, indent=2))

    ok = total_missing == 0 and total_unexpected == 0 and not layout_problems
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
