# Contributing

Thank you for considering a contribution. This document describes how the repository is
actually built, tested and reviewed; if something here disagrees with the code, the code
wins and this file has a bug.

## Ground rules

- Every change goes through a pull request against `main` and must pass CI (`engine`, `web`,
  `codeql`, `docker` workflows as applicable).
- Commits follow [Conventional Commits](https://www.conventionalcommits.org/)
  (`feat(engine): …`, `fix(backend): …`, `docs: …`, `ci: …`). One logical change per commit.
- Architectural decisions are recorded as ADRs in `docs/adr/` **before** the implementing PR
  is merged. See `docs/adr/README.md`.
- Claims in documentation must be backed by a test, a script or an ADR. Do not add numbers
  (coverage, speed, counts) that CI does not produce.

## Repository map

| Path | What | Toolchain |
|---|---|---|
| `cpp-engine/` | Analysis engine library + CLI + HTTP adapter | CMake ≥ 3.25, C++20, Python 3 (adapter, eval) |
| `backend/` | REST/WebSocket API | Node ≥ 18, TypeScript, Express, Prisma |
| `frontend/` | Web client | Node ≥ 18, Next.js 14, Tailwind |
| `docs/research/` | Methodology, rule catalog, threat model, evaluation results | Markdown |
| `docs/adr/` | Architecture decision records | Markdown |
| `docker/`, `docker-compose*.yml` | Local and production topology | Docker Compose v2 |

## Engine (`cpp-engine/`)

```bash
cd cpp-engine
cmake --workflow --preset dev            # Debug build + full test suite (GoogleTest + CTest)
cmake --workflow --preset asan-ubsan     # same under Address/UB sanitizers
cmake --build --preset dev --target format-check   # clang-format
clang-tidy -p build/dev $(find src tools -name '*.cpp')   # gating profile in .clang-tidy
python3 eval/run_eval.py --cli build/dev/cppmastery      # seeded-smell recall / precision
```

Conventions:

- **No third-party runtime dependencies.** Test and benchmark dependencies are fetched at
  pinned commits. A PR that adds a runtime dependency needs an ADR.
- **Rules cite their source.** A new `Rule` must return a non-empty `reference()` and be
  documented in `docs/research/rule-catalog.md` with its detection logic and precision
  trade-offs. Add a seeded example to `eval/corpus/smells/` (header comment
  `// Seeded smells: rule (xN)`) and, if relevant, a must-not-flag case to `eval/corpus/clean/`.
- **Rules are total and stateless.** They may not throw on any token stream; the property
  tests and fuzzers will find it if they do.
- **Metrics have written definitions.** Changes to a formula or its operationalisation update
  `docs/research/metrics-methodology.md` in the same PR.
- Style: `.clang-format` (Google base, 4 spaces, 100 columns), names as configured in
  `.clang-tidy` (`camelBack` functions, `CamelCase` types, `kConstant`, `member_`).

## Web tiers (`backend/`, `frontend/`)

```bash
npm ci --ignore-scripts                   # workspaces: installs both tiers
npm run type-check                        # tsc --noEmit in both workspaces
npm run lint
npm test --workspace backend
npm test --workspace frontend
npm run build --workspace frontend
```

- Do not weaken `tsconfig` strictness. Avoid `any`/`@ts-ignore`; when unavoidable, leave a
  one-line justification.
- Dependencies must be imported somewhere; unused packages are removed. Run
  `npm ls --workspace <tier>` and grep before adding.
- Environment variables are declared in `backend/src/config/index.ts` (zod schema) and
  mirrored in `backend/.env.example`; add both.
- Anything that makes learner-submitted code reach a compiler or a shell is blocked until the
  controls in `docs/research/threat-model.md` exist. Analysis-only features are fine.

## Documentation

- `README.md` is the front page: short, factual, linking to the deeper documents.
- Research-style documents live in `docs/research/`; keep formulas, assumptions and threats to
  validity explicit. Cite sources (see `CITATION.cff` for the reference format).

## Reporting issues

Use the issue templates. Security problems go through `SECURITY.md`, never a public issue.

## Licence

By contributing you agree that your contributions are licensed under the MIT licence in
`LICENSE`.
