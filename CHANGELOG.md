# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project adheres to
[Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added
- `cpp-engine` 2.0: dependency-free C++20 analysis library and CLI (total lexer, Halstead /
  McCabe / Maintainability Index metrics, 20 referenced rules, struct-layout model with an
  optimal reordering, versioned JSON with schemas) and a stdlib HTTP adapter.
- Engine verification: 70 GoogleTest/CTest cases including property tests, ASan/UBSan,
  gating clang-tidy, libFuzzer harnesses, Google Benchmark, seeded-corpus evaluation.
- Backend: session-bound authentication with refresh rotation and reuse detection, email
  verification, single-use password reset, server-graded quizzes, prerequisite-aware course
  recommendations, idempotent likes, post reports and moderation, real-time notifications,
  typed engine client with caching, Prisma migrations and seed.
- Tests: 64 backend unit/integration/contract tests, an end-to-end learner journey on
  PostgreSQL with the real engine, 25 frontend tests.
- Research documentation (metrics methodology, rule catalogue, layout model, threat model,
  evaluation protocol), ADR-0001 to ADR-0007, accurate API reference and architecture guide.
- CI: engine matrix, sanitizers, static analysis, fuzzing; web type-check/lint/test/build;
  PostgreSQL e2e with drift check; CodeQL; image builds and GHCR publishing; Dependabot.
- Governance: security policy, code of conduct, citation metadata, issue and PR templates.

### Changed
- All commits attributed to one canonical identity (`.mailmap`).
- Compose files rebuilt: required secrets, migration service, internal-only engine,
  hardened containers, nginx single origin; Mailpit in the development stack.
- Frontend API client and types now mirror the backend contract; Monaco loaded at runtime.

### Fixed
- 338 backend and 497 frontend TypeScript errors; invalid JSON manifests; broken ESLint config.
- Refresh tokens were signed with the access secret; sessions survived password changes; a
  code path fell back to the secret `your-secret-key`; snippet IDs were validated as UUIDs
  although the schema issues CUIDs.
- `.gitignore` excluded core engine sources (`*.cmake`, `analysis/`, `metrics/`).
- Layout reordering could exceed the original size for self-referential or redefined structs
  (found by libFuzzer).

### Removed
- Unbuildable Clang/Boost engine (kept as reference in `cpp-engine/prototype/`), unused
  dependencies, fictional deploy scripts and API docs, the unused MongoDB service, a
  conflicting `init.sql`, and an HTML-escaping input sanitiser that would corrupt C++ source.

## [1.0.0] - 2025

### Added
- Initial full-stack scaffold: Next.js frontend, Express/Prisma backend, Docker Compose
  topology, documentation skeleton.
