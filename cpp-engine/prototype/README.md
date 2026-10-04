# Prototype engine (retained for reference, not built)

This directory holds the first-generation engine design: an HTTP service wrapping Clang
tooling (`libclang`/LibTooling), Boost and spdlog, with separate parser, analyzer, visualizer
and sandbox modules.

It is **not part of the default build** and does not compile as-is:

- `CMakeLists.txt` lists ~15 translation units that were planned but never written
  (`code_parser.cpp`, `sandbox.cpp`, `http/*.cpp`, …).
- Headers and tests disagree on the namespace (`cpp_mastery` vs `CppMasteryHub`) and on
  object lifetime (singletons vs `std::make_unique`).
- It requires LLVM ≥ 14 development packages, which rules out lightweight CI runners and
  reproducible static builds.

The production engine lives one level up (`cpp-engine/`): a dependency-free C++20 library
with a hand-written lexer, metric calculators, a rule engine and a memory-layout model, plus
a CLI. Its design decisions, and why the Clang-based design was shelved, are recorded in
[`docs/adr/0002-dependency-free-analysis-engine.md`](../../docs/adr/0002-dependency-free-analysis-engine.md).

The prototype is kept so the Clang-based ideas (AST-accurate analysis, sandboxed execution via
`fork`/`setrlimit`, memory visualisation from DWARF) can be revived as an optional
`CPPMASTERY_ENABLE_CLANG_FRONTEND` component once the core API has stabilised.
