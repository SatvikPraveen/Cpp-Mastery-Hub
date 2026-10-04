# ADR-0004: Verification stack

**Status:** Accepted · **Date:** 2026-10-03

## Context

The engine consumes arbitrary bytes from learners. Unit tests alone cannot establish that it
never crashes, and a README claim of "80 % coverage" is meaningless without the tests
existing.

## Decision

Layer the following, all runnable locally via CMake presets and all gating in CI except where
marked:

1. Unit tests (GoogleTest) for each module.
2. Property tests: lexer coverage/ordering invariants on random bytes; prefix-truncation
   stability of every corpus file; full-pipeline totality.
3. End-to-end CTest cases that run the real CLI and assert exit codes.
4. ASan + UBSan build of the whole test suite.
5. clang-tidy with a curated, documented check set and `WarningsAsErrors: '*'`; strict
   compiler warnings as errors on GCC, Clang and MSVC.
6. libFuzzer harnesses with invariant aborts (60 s smoke per target in CI; longer runs
   locally).
7. A seeded-smell evaluation (`eval/run_eval.py`) gating recall and clean-corpus precision.
8. Benchmarks (informational; uploaded as artifacts, not compared automatically).

## Consequences

- Adding a rule requires a seeded corpus example or the evaluation does not exercise it.
- The clang-tidy profile lists every disabled check with a reason; silently disabling checks
  is not accepted in review.
- Coverage percentages are not quoted anywhere; the layers above are the claim.
