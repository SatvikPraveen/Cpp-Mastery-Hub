# ADR-0001: Record architecture decisions

**Status:** Accepted · **Date:** 2026-10-03

## Context

The repository started as a generated scaffold with ambitious claims (LLVM integration,
sandboxed execution, 80 % coverage) and no record of which were implemented, planned or
abandoned. Readers could not tell design from aspiration.

## Decision

Significant decisions are written as ADRs in `docs/adr/`, numbered sequentially, with
Context / Decision / Consequences sections. Documentation elsewhere (README, research notes)
links to the ADR instead of restating the rationale. A decision is superseded, never edited.

## Consequences

- Reviewers can trace why the code looks the way it does.
- Claims in the README must be backed by an ADR or by a test; unbacked claims are removed.
