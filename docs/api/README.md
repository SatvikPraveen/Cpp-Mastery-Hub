# HTTP API reference

The backend serves JSON over HTTP under `/api`. This page is the contract the frontend client
(`frontend/src/services/api.ts`) is written against; the route files in
`backend/src/api/routes/` are the source of truth, and the integration and end-to-end tests in
`backend/tests/` exercise every group below.

## Conventions

**Base URL.** `http://localhost:8000/api` in development (`NEXT_PUBLIC_API_URL` is the origin,
the client appends `/api`).

**Envelope.** Successful responses are `{ "success": true, "data": … }`. Errors are:

```json
{
  "success": false,
  "message": "Invalid request",
  "code": "OPTIONAL_MACHINE_CODE",
  "details": { "issues": [{ "path": "options.maxNesting", "message": "Number must be greater than or equal to 1" }] }
}
```

`details` is present on 4xx responses that have structure (validation issues). 5xx responses
never include internal details in production.

**Authentication.** `Authorization: Bearer <access token>`. Every access token is bound to a
server-side session row; logout, password change and moderation bans revoke it immediately.
Access tokens live 15 minutes, refresh tokens 7 days and are rotated on every use. Presenting
an already-used refresh token revokes *all* of that user's sessions.

**Pagination.** List endpoints take `limit` and `offset` and return
`{ items, total, limit, offset }`.

**Limits.** JSON bodies up to 1 MiB; C++ source up to 256 KiB. A global limit of the configured
requests per 15 minutes per IP applies to `/api`; credential endpoints and analysis have tighter
limits. Exceeding a limit returns `429` with `Retry-After`.

**Status codes used.** 200, 201, 202 (accepted, processed later), 204, 400 (validation),
401 (no or invalid session), 403 (role or ownership), 404, 409 (conflict, e.g. duplicate email,
no quiz attempts left), 413, 423 (locked discussion), 429, 501 (deliberately not implemented),
502/503/504 (analysis engine failure, unavailable, timeout).

## Health

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/health` (also `/api/health`) | – | `200 {status:"ok"}` with database and engine status; `503` when the database is unreachable |

## Authentication `/api/auth`

| Method | Path | Auth | Body | Notes |
|---|---|---|---|---|
| POST | `/register` | – | `username, email, password, firstName?, lastName?` | 201 with `{user, token, refreshToken, expiresIn}`; sends a verification email |
| POST | `/login` | – | `email` (email or username), `password` | Same error for unknown user and wrong password |
| POST | `/refresh` | – | `refreshToken` | Rotates both tokens |
| POST | `/logout` | ✓ | – | Revokes the current session |
| POST | `/logout-all` | ✓ | – | Revokes every session of the user |
| GET | `/me` | ✓ | – | Current user |
| POST | `/forgot-password` | – | `email` | Always 200; emails a single-use, one-hour link |
| POST | `/reset-password` | – | `token, password` | Token stops working once the password changes |
| POST | `/verify-email` | – | `token` | Idempotent; token is bound to the current address |
| POST | `/resend-verification` | ✓ | – | |
| POST | `/change-password` | ✓ | `currentPassword, newPassword` | Revokes all sessions |

Passwords: 8–128 characters with a lowercase letter, an uppercase letter and a digit.

## Static analysis `/api/analysis`

Backed by the `cppmastery` engine; never executes code; available anonymously.

| Method | Path | Body | Response |
|---|---|---|---|
| POST | `/analyze` | `code`, `options?: {maxCyclomatic, maxNesting, maxFunctionLines, disable: ruleId[]}` | `cppmastery.analysis/1` report (diagnostics + metrics) |
| POST | `/metrics` | `code` | Metrics only |
| POST | `/layout` | `code`, `abi?: lp64 \| llp64 \| ilp32`, `pack?: 1 \| 2 \| 4 \| 8 \| 16` | `cppmastery.layout/1` report |
| GET | `/rules` | – | Rule catalogue with references |

Report schemas: `cpp-engine/schemas/*.schema.json`. Results are cached by content hash.

## Code editor `/api/code`

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/execute` | – | **501** by design until sandboxed execution exists (see the threat model) |
| POST | `/analyze` | – | Shortcut for `/api/analysis/analyze` without options |
| POST | `/visualize` | – | Struct layout for the memory view (`code, abi?`) |
| GET | `/templates` | – | Starter programs, `?difficulty=` |
| GET | `/snippets` | – | Public snippets, `?search&language&tag&limit&offset` |
| GET | `/snippets/mine` | ✓ | Own snippets including private ones |
| GET | `/snippets/recent`, `/snippets/popular` | – | |
| GET | `/snippets/:id` | optional | Private snippets return 404 to non-owners; counts a view |
| POST | `/snippets` | ✓ | `title, code, language?: cpp \| c, description?, tags?, isPublic?` |
| PATCH | `/snippets/:id` | owner | Partial update |
| DELETE | `/snippets/:id` | owner or admin | 204 |
| POST / DELETE | `/snippets/:id/like` | ✓ | Idempotent; returns the like count |

## Learning `/api/learning`

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/courses` | – | Published courses, `?difficulty&category&search&limit&offset` |
| GET | `/courses/:courseId` | optional | Lessons outline and the caller's enrolment |
| GET | `/courses/:courseId/prerequisites` | optional | With per-course completion for the caller |
| GET | `/courses/:courseId/lessons/:lessonId` | optional | Content, exercises, previous/next, progress |
| GET | `/courses/:courseId/lessons/:lessonId/quiz` | optional | Questions **without** answers; attempts used |
| POST | `/courses/:courseId/lessons/:lessonId/quiz/submit` | ✓ | `answers: {questionId: optionIndex}`; graded server-side; attempts capped |
| POST | `/courses/:courseId/enroll` | ✓ | Idempotent |
| POST | `/courses/:courseId/lessons/:lessonId/complete` | ✓ | `minutesSpent?`; idempotent; returns exact progress |
| GET | `/courses/:courseId/progress` | ✓ | Per-lesson progress |
| GET | `/progress` | ✓ | One row per enrolled course with the next unfinished lesson |
| GET | `/recommendations` | ✓ | Ranked next courses with reasons (see below) |
| POST | `/exercises/:exerciseId/submissions` | ✓ | 202; stored with static-analysis feedback; tests not run |

Recommendations are produced by a transparent lexicographic ranker
(`backend/src/services/learning/recommendations.ts`): eligible prerequisites first, then
closeness to one level above the hardest completed course, then tag overlap with completed
courses, then popularity.

## Community `/api/community`

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/categories` | – | With published post counts |
| GET | `/posts` | – | `?category&tag&search&sort=recent\|top&limit&offset`; pinned first |
| GET | `/posts/trending` | – | Most liked in the last 7 days |
| GET | `/posts/:id` | optional | Counts a view; `isLikedByUser` for signed-in callers |
| POST | `/posts` | ✓ | `title, content, categoryId?, tags?` |
| PATCH / DELETE | `/posts/:id` | author or moderator | |
| POST / DELETE | `/posts/:id/like` | ✓ | Idempotent |
| GET | `/posts/:id/comments` | – | Flat list; thread with `parentId` |
| POST | `/posts/:id/comments` | ✓ | `content, parentId?`; 423 when locked; notifies the author |
| PATCH / DELETE | `/posts/:id/comments/:commentId` | author or moderator | |
| POST | `/posts/:id/report` | ✓ | `reason`; one report per user per post |
| GET | `/leaderboard` | – | 30-day score: 5 × posts + 2 × comments + likes received |

Post and comment bodies are stored as submitted (Markdown) and must be sanitised when rendered.

## Users `/api/users` (all require authentication)

| Method | Path | Notes |
|---|---|---|
| GET / PATCH | `/me` | Own profile (includes email) |
| POST | `/me/change-password` | Same as `/api/auth/change-password` |
| DELETE | `/me` | Deactivate; requires `password` |
| GET | `/me/activity` | Recent activity |
| GET / PATCH | `/me/settings` | Theme, language, notification preferences |
| GET | `/` | Search active users, `?q&limit&offset` |
| GET | `/:userId` | Public profile (no email) |
| GET | `/:userId/snippets` | That user's public snippets |

## Notifications `/api/notifications` (authenticated)

| Method | Path | Notes |
|---|---|---|
| GET | `/` | `?unread=true&limit&offset`; includes unread count |
| GET | `/unread-count` | |
| PATCH | `/read-all`, `/:id/read` | |
| DELETE | `/:id` | |

Real-time delivery: connect Socket.IO to the backend origin with `auth: { token }`; each
authenticated socket joins `user:<id>` and receives `notification` events.

## Administration `/api/admin` (authenticated; role as noted)

| Method | Path | Role | Notes |
|---|---|---|---|
| GET | `/stats` | moderator | Platform counts |
| GET | `/users`, `/users/:userId` | moderator | `?search&role&active&limit&offset` |
| PATCH | `/users/:userId` | admin | `role?, isActive?`; only a super admin grants `SUPER_ADMIN` |
| POST | `/users/:userId/ban`, `/users/:userId/unban` | moderator | Ban revokes sessions; cannot ban a higher role |
| PATCH | `/posts/:postId` | moderator | `isPinned?, isLocked?, status?` |
| GET | `/reports` | moderator | `?status=OPEN\|ACTIONED\|DISMISSED` |
| POST | `/reports/:reportId/resolve` | moderator | `action: action\|dismiss`; actioning hides the post |
| GET | `/settings`, PUT `/settings/:key` | admin | System key/value configuration |

## Not implemented (deliberately)

| Feature | Status |
|---|---|
| Code execution | `POST /api/code/execute` returns 501 until the sandbox in `docs/research/threat-model.md` exists |
| Real-time collaborative editing | No server relay; the UI page is behind `NEXT_PUBLIC_ENABLE_COLLABORATION` |
| OAuth sign-in | No provider integration; buttons are behind `NEXT_PUBLIC_ENABLE_OAUTH` |
| Avatar upload | No object storage; profiles take an `avatarUrl` |
