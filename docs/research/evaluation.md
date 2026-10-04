# Evaluation protocol

The engine's claims are checked by a script, not by prose. `cpp-engine/eval/run_eval.py`
runs on every CI build and fails the build when any expectation breaks.

## Corpus

`cpp-engine/eval/corpus/` contains three groups of small, hand-written C++ programs:

| Group | Purpose | Expectation encoded as |
|---|---|---|
| `clean/` | Idiomatic modern C++ that should pass | zero `warning`/`error` diagnostics (`info` allowed) |
| `smells/` | Programs seeded with known anti-patterns | header comment `// Seeded smells: rule (xN), …` lists every expected diagnostic |
| `layout/` | Structs with known padding | every reorder suggestion must be size-non-increasing; `padded.cpp` must save 8 bytes |

The corpus is intentionally small and fully readable; each file documents what it tests. It
is a regression and precision/recall harness, not a benchmark of real-world code. Growing it
with anonymised learner submissions is future work (see ADR-0004).

## Measures

- **Recall** = detected seeded diagnostics / expected seeded diagnostics (currently 21/21).
- **Clean-corpus precision proxy** = number of non-info diagnostics on `clean/` (must be 0).
- **Totality** = every prefix of every corpus file (step 37 bytes) tokenises with the coverage
  invariant and analyses without error (`tests/property_test.cpp`).
- **Layout soundness** = no suggestion larger than the original (also fuzzed).
- **Throughput** = Google Benchmark on synthetic programs of 1–1000 functions, reported as
  MB/s for tokenize, metrics and full analysis.

## Reproducing

```bash
cd cpp-engine
cmake --preset bench && cmake --build --preset bench --parallel
python3 eval/run_eval.py --cli build/bench/cppmastery \
    --bench build/bench/benchmarks/cppmastery_bench --out ../docs/research/results
```

`pip install jsonschema` additionally validates every JSON document against
`cpp-engine/schemas/`. The committed [`results/results.md`](results/results.md) was produced by
exactly this command; CI uploads a fresh copy as a build artifact for every push.

## Threats to validity

- Seeded expectations are written by the same author as the rules; an independent corpus
  would be stronger evidence.
- Benchmarks use synthetic code with a fixed token mix; real projects have longer comments
  and more preprocessor text, both cheaper to lex.
- Timings in the committed results come from a developer laptop; CI numbers vary with runner
  load and are published as artifacts rather than compared automatically.
