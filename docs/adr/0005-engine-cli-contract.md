# ADR-0005: Engine exposes a CLI with versioned JSON; HTTP is a thin adapter

**Status:** Accepted · **Date:** 2026-10-03

## Context

The prototype embedded an HTTP server in the engine. That couples the analysis library to a
network stack, enlarges the attack surface of the component that handles untrusted input, and
makes the engine hard to use from scripts, editors or CI.

## Decision

- The engine's public contract is `cppmastery <command> --json`, reading a file or stdin and
  writing JSON described by `cpp-engine/schemas/*.schema.json`. Each document carries a
  `schema` field (`cppmastery.analysis/1`, `cppmastery.layout/1`); breaking changes bump it.
- Exit codes are part of the contract: 0 ok, 1 findings at/above `--fail-on`, 2 usage,
  3 I/O or internal.
- The web backend invokes the engine as a subprocess with a timeout and a body-size cap, or
  through a separate thin HTTP adapter that does nothing but spawn the CLI. The adapter is
  not part of the library.

## Consequences

- The engine is usable in editors, pre-commit hooks and CI without the platform.
- The backend's current `CPP_ENGINE_URL/execute` call targets an endpoint that does not
  exist in this engine; it stays disabled until the sandbox in the threat model exists.
