# ADR-0006: Single canonical commit identity

**Status:** Accepted · **Date:** 2026-10-03

## Context

The initial history contained three spellings of the same author (a GitHub noreply address,
a handle without a space, and the canonical name). Attribution tooling, `git shortlog` and
CITATION metadata all fragment on this.

## Decision

All commits are authored and committed as `Satvik Praveen <satvikpraveen707@gmail.com>`.
History prior to this decision was rewritten once with `git filter-repo --mailmap`; a
`.mailmap` at the repository root maps the historical spellings so that any stray identity in
future is still folded for `git log`/`shortlog` consumers. Local `user.name`/`user.email`
are expected to match; a pre-commit hook may be added if drift recurs.

## Consequences

- `git shortlog -sne` reports one author.
- The one-time history rewrite changed all commit hashes; no external references to the old
  hashes existed at the time.
