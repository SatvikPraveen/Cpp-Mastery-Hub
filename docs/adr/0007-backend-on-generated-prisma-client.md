# ADR-0007: Backend rebuilt on the generated Prisma client, validated at the edge, tested against PostgreSQL

**Status:** Accepted · **Date:** 2026-10-04

## Context

The scaffolded backend never compiled (338 TypeScript errors). Routes mixed Mongoose idioms
with Prisma, referenced models and fields absent from the schema, imported modules that were
never written, and contained two token implementations, one of which fell back to a hard-coded
secret. A repair attempt introduced a 941-line hand-written mirror of Prisma's types to avoid
running `prisma generate`, creating a second source of truth for the data model.

## Decision

1. **The Prisma schema is the single source of truth.** Application code uses the generated
   client; `prisma generate` (which needs no database) runs as part of `type-check`, `build`
   and `test`. Migrations are generated from the schema and CI fails on drift.
2. **Validate at the edge, once.** Every route parses body, query and path parameters with zod
   through one helper; services receive typed values and never re-validate.
3. **Sessions are server-side state.** Access tokens are bound to `user_sessions` rows so that
   revocation is immediate; refresh tokens rotate and reuse revokes the user's sessions.
4. **Pure logic is separated from I/O** (quiz grading, recommendation ranking, cache keys) and
   unit-tested without a database.
5. **Mocks are not trusted for database semantics.** An end-to-end journey runs against a
   migrated PostgreSQL in CI. It found a bug the mocked tests could not: catching a unique
   violation inside a PostgreSQL transaction aborts the transaction (SQLSTATE 25P02).
6. **Features without backing infrastructure are explicit.** Code execution answers 501;
   collaboration and OAuth are behind frontend feature flags that default to off.

## Consequences

- The backend compiles under the original strict settings (`strict`,
  `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`) and lints clean.
- Contributors need the Prisma CLI (installed as a dependency) but no database for unit tests.
- Some scaffold features were removed rather than faked (follows, file uploads, MongoDB); the
  API reference lists what is deliberately not implemented.
