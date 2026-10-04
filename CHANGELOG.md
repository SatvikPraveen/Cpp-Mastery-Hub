# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project adheres to
[Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added
- `cpp-engine` 2.0: dependency-free C++20 analysis library and CLI (lexer, metrics, rule
  engine with 20 referenced rules, memory-layout model, versioned JSON output with schemas).
- Engine verification stack: 67 GoogleTest/CTest cases including property tests, ASan/UBSan
  preset, curated gating clang-tidy profile, libFuzzer harnesses, Google Benchmark suite.
- Reproducible evaluation (`cpp-engine/eval/run_eval.py`) with a seeded-smell corpus.
- Governance and research documentation: ADRs, metrics methodology, rule catalog, threat
  model, evaluation protocol, security policy, citation metadata.
- Continuous integration for the engine (Linux GCC/Clang + macOS, sanitizers, clang-tidy,
  format check, evaluation), CodeQL, Docker build, Dependabot.

### Changed
- All commits are attributed to a single canonical identity (`.mailmap`).
- Scaffold metadata headers removed from 192 files; package manifests are valid JSON again.
- Frontend and backend manifests trimmed to the dependencies that are actually imported.
- First-generation Clang/Boost engine moved to `cpp-engine/prototype/` (reference only).

### Fixed
- `backend/package.json` Jest config used `moduleNameMapping` (ignored) instead of
  `moduleNameMapper`.

## [1.0.0] - 2025

### Added
- Initial full-stack scaffold: Next.js frontend, Express/Prisma backend, Docker Compose
  topology, documentation skeleton.
