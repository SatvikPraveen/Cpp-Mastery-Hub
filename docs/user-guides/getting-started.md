# Getting started

This guide takes you from a fresh clone to a running platform with a seeded course, then
through the main things a learner can do. Every command here is exercised by CI.

## 1. Prerequisites

| Tool | Version | Needed for |
|---|---|---|
| Docker + Compose v2 | 24+ | the full stack (option A) |
| Node.js + npm | 18 or 20 | backend and frontend (option B) |
| CMake, Ninja, a C++20 compiler | CMake 3.25+, GCC 11+/Clang 14+/AppleClang 14+ | the analysis engine (option B) |
| Python | 3.9+ | engine HTTP adapter, evaluation script |
| PostgreSQL | 14+ (16 tested) | option B, or use the compose service |

## 2a. Run everything with Docker

```bash
git clone https://github.com/SatvikPraveen/Cpp-Mastery-Hub.git
cd Cpp-Mastery-Hub
cp .env.example .env                 # then replace every "change-me" / "replace-with" value
docker compose up -d --build         # postgres, redis, engine, backend, frontend, nginx
docker compose exec backend npx prisma migrate deploy
docker compose exec backend npm run db:seed
```

Open http://localhost:3000. The API is at http://localhost:8000/api and the engine adapter at
http://localhost:9000.

Generate secrets with `openssl rand -hex 32`; the backend refuses to start if `JWT_SECRET`,
`JWT_REFRESH_SECRET` or `SESSION_SECRET` is shorter than 32 characters.

## 2b. Run the parts natively (development)

```bash
# Engine: build, test, and serve the HTTP adapter on :9000
cd cpp-engine
cmake --workflow --preset dev
CPPMASTERY_BIN=$PWD/build/dev/cppmastery python3 tools/http_adapter/cppmastery_http.py &
cd ..

# Database (or point DATABASE_URL at an existing PostgreSQL)
docker run -d --name cmh-pg -e POSTGRES_PASSWORD=dev -e POSTGRES_DB=cppmastery -p 5432:5432 postgres:16-alpine

# Backend on :8000
npm ci --ignore-scripts
cp backend/.env.example backend/.env    # set DATABASE_URL and the three secrets
cd backend
npx prisma migrate deploy && npm run db:seed
npm run dev &
cd ..

# Frontend on :3000
cp frontend/.env.example frontend/.env.local
npm run dev --workspace frontend
```

## 3. First steps as a learner

1. **Register** at `/auth/register`. In development without SMTP the verification link is
   written to the backend log; open it to verify your address.
2. **Browse courses** at `/learn`. The seed provides *Resource Management in Modern C++*
   with three lessons, a quiz and an exercise.
3. **Enrol and work through lessons.** Progress is the fraction of published lessons you have
   completed; the dashboard shows the next unfinished lesson for each course.
4. **Take the quiz** on the last lesson. Answers are graded on the server; you get per-question
   feedback and a limited number of attempts.
5. **Open the editor** at `/code`. Write C++ and run *Analyze*: you get diagnostics, each
   citing the guideline it enforces, plus metrics (cyclomatic complexity, Halstead volume,
   maintainability). Use the memory-layout view on a struct to see padding and an optimal
   field order.
6. **Save snippets**, make them public, and share them in the **community** forum.
7. **Check recommendations** on the dashboard: each suggested course comes with the reason it
   was ranked there.

> Running programs is intentionally disabled. The *Run* action reports that execution needs a
> sandbox; see `docs/research/threat-model.md` for what that sandbox must provide.

## 4. Using the engine on its own

```bash
cpp-engine/build/dev/cppmastery analyze path/to/file.cpp
cpp-engine/build/dev/cppmastery layout --abi llp64 path/to/structs.hpp
cpp-engine/build/dev/cppmastery rules
```

Add `--json` for machine-readable output (schemas in `cpp-engine/schemas/`).

## 5. Running the tests

```bash
cmake --workflow --preset dev                    # in cpp-engine/: 70 engine tests
npm test --workspace backend                     # 64 backend tests (unit, integration, contract)
npm test --workspace frontend                    # 25 frontend tests
E2E_DATABASE_URL=postgresql://… npm run test:e2e --workspace backend   # learner journey on PostgreSQL
```

## Troubleshooting

| Symptom | Cause and fix |
|---|---|
| Backend exits with "Missing or invalid environment variables" | A required variable is unset or a secret is under 32 characters; compare with `backend/.env.example` |
| Analysis returns 503 | The engine adapter is not running or `CPP_ENGINE_URL` is wrong |
| `prisma` errors about a missing client | Run `npx prisma generate` in `backend/` (the `type-check`, `build` and `test` scripts do this) |
| Frontend requests 404 | `NEXT_PUBLIC_API_URL` must be the backend origin without `/api` |
