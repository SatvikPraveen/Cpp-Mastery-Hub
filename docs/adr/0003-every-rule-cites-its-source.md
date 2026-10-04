# ADR-0003: Every rule and metric cites its source

**Status:** Accepted · **Date:** 2026-10-03

## Context

A teaching tool that says "don't do this" without saying why trains compliance, not
understanding. Metric tools also disagree silently on definitions (which operators count for
Halstead, whether `&&` adds cyclomatic complexity), making numbers incomparable.

## Decision

- Every `Rule` must return a non-empty `reference()` naming a C++ Core Guidelines item, a
  CERT rule, a CWE, or a paper. The test suite enforces this.
- Every metric's formula and the engine's operationalisation choices are written in
  `docs/research/metrics-methodology.md` before the code is merged.
- Where the literature offers variants, the engine reports both (e.g. `cyclomatic` and
  `cyclomatic_extended`) rather than picking one silently.

## Consequences

- Rule proposals need must-flag and must-not-flag examples plus a citation (issue template).
- Some popular checks are excluded because no defensible reference exists for them as
  *errors*; they can still be `info`.
