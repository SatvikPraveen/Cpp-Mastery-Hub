# Threat model

This document records what the platform must defend against and the status of each control.
It is deliberately explicit about what is **not** implemented so that the README never
implies protection that does not exist.

## Assets

1. Integrity and availability of the host running the backend and engine.
2. Other learners' data (accounts, submissions, progress).
3. Secrets: JWT signing keys, database credentials, OAuth client secrets.

## Trust boundaries

```
Browser ──HTTPS──▶ Nginx ──▶ Backend (Express) ──▶ Analysis engine (cppmastery, stdin/HTTP)
                                   │                      ▲ untrusted source text
                                   ├──▶ PostgreSQL / Redis / MongoDB
                                   └──▶ Code execution (compile + run learner program)  ← highest risk
```

Everything a learner types is **untrusted input**: source text, usernames, forum posts,
file uploads.

## Analysis engine (`cpp-engine`)

| Threat | Control | Status |
|---|---|---|
| Crash / UB on crafted source | Total lexer; property tests over random bytes; ASan+UBSan in CI; libFuzzer harnesses with invariant aborts (one invariant violation found and fixed, see the layout model) | Implemented |
| Algorithmic DoS (super-linear time) | Lexer is O(n); bracket matching is O(n) per function; benchmarks track MB/s | Implemented; CI benchmark job is informational, not gating |
| Memory exhaustion | Token vector is O(n) in input size; adapter caps bodies at 256 KiB; backend caps JSON at 1 MiB and source at 256 KiB; nginx `client_max_body_size 1m` | Implemented |
| Code execution via the engine | Engine never compiles or runs input; no `system`, no file writes, reads only the named file or stdin | Implemented; enforced by the engine's own `security/*` rules on its sources in CI |
| Supply chain | No third-party runtime dependencies; test deps pinned by commit; digest-pinned Docker base | Implemented |

## Code execution path (backend `execution-service`)

`POST /api/code/execute` answers **501** and the engine adapter answers 501 for `/execute`; no
code path compiles or runs learner input. The design below is the acceptance bar for enabling it.

| Threat | Required control | Status |
|---|---|---|
| Arbitrary code runs on host | Compile and run in a disposable container with no network (`--network none`), read-only root FS, dropped capabilities, seccomp profile, non-root UID | **Not implemented** |
| Resource exhaustion (fork bombs, memory, disk) | `ulimit`/cgroup limits: CPU time ≤ 2 s, RSS ≤ 256 MiB, pids ≤ 32, output ≤ 64 KiB, wall-clock kill | **Not implemented** |
| Compiler as attack surface (`#include` of host files, `-fplugin`) | Fixed compiler flags, `-nostdinc` with a vendored sysroot, reject `#include` of absolute paths | **Not implemented** |
| Persistence between runs | Fresh tmpfs per run, container removed after exit | **Not implemented** |
| Side channels / timing | Out of scope for an educational platform | — |

Until these exist the compose files must not expose an execution endpoint; the analysis
features (metrics, rules, layout) are safe to expose because they never execute input.

## Web tier

| Threat | Control | Status |
|---|---|---|
| Credential stuffing / brute force | 10 failed attempts / 15 min / IP on login and registration; bcrypt cost 12; constant-time failure path (dummy hash) so responses do not reveal which emails exist | Implemented; tested |
| Token theft | Access tokens bound to a server-side session row (15 min); refresh tokens use a separate secret, rotate on every use, and reuse revokes all sessions; logout, password change and bans revoke immediately; `helmet`; CORS allow-list | Implemented; tested |
| Injection | Prisma parameterised queries (the one raw query uses tagged-template parameters); zod validation on every route body, query and path parameter | Implemented |
| XSS in forum content | Bodies are rendered as React text nodes (escaped); the frontend contains no `dangerouslySetInnerHTML`. A future Markdown renderer must sanitise its HTML output (e.g. rehype-sanitize) | Mitigated for current rendering; re-audit when Markdown rendering is added |
| Secrets in repo | `.env*` git-ignored; `.env.example` placeholders only; compose defaults are development-only strings | Implemented |
| Oversized requests to the engine | 256 KiB source cap in the backend and the adapter; subprocess timeout | Implemented |
| Account takeover via reset links | Single-use reset tokens keyed to the current password hash; one-hour expiry; generic response for unknown addresses | Implemented; tested |
| Prototype pollution through request bodies | No key-copying sanitiser; zod parses into fresh objects | Implemented |

## Reporting

See [`SECURITY.md`](../../SECURITY.md). A sandbox escape or any route from learner input to
a shell is treated as critical.
