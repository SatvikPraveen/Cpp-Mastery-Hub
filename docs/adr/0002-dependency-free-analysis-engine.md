# ADR-0002: Dependency-free analysis engine instead of a Clang-based service

**Status:** Accepted · **Date:** 2026-10-03

## Context

The first engine design (`cpp-engine/prototype/`) wrapped Clang LibTooling, Boost, spdlog and
an HTTP library in a long-running service. It never compiled: ~15 translation units listed in
its CMake file were never written, headers and tests disagreed on namespaces, and the
dependency footprint (LLVM ≥ 14 dev packages, Conan) made CI slow and static builds
impractical. Meanwhile the platform's actual needs are modest: tokenisation, classical
metrics, syntactic smell detection and struct layout, all on small single files typed by
learners.

## Decision

Rewrite the engine as a C++20 **library with no third-party runtime dependencies**, plus a
CLI. Use a hand-written total lexer and token-grammar heuristics instead of an AST. Keep the
Clang-based design in `prototype/` as reference, not as a build target.

## Consequences

- Builds in seconds on any C++20 compiler; a static binary is ~1 MB; CI covers GCC, Clang and
  AppleClang with sanitizers on every push.
- Analyses are *syntactic*. Anything requiring types or macro expansion is approximated or
  out of scope; every rule documents its precision trade-off (ADR-0003).
- An optional Clang front end can be added later behind a CMake option without changing the
  public result types, because results are plain structs and versioned JSON (ADR-0005).
