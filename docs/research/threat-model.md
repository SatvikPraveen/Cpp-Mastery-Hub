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
| Crash / UB on crafted source | Total lexer; property tests over random bytes; ASan+UBSan in CI; libFuzzer harnesses with invariant aborts | Implemented |
| Algorithmic DoS (super-linear time) | Lexer is O(n); bracket matching is O(n) per function; benchmarks track MB/s | Implemented; CI benchmark job is informational, not gating |
| Memory exhaustion | Token vector is O(n) in input size; backend must cap request body (see below) | Engine: by construction. Backend cap: **pending** |
| Code execution via the engine | Engine never compiles or runs input; no `system`, no file writes, reads only the named file or stdin | Implemented; enforced by the engine's own `security/*` rules on its sources in CI |
| Supply chain | No third-party runtime dependencies; test deps pinned by commit; digest-pinned Docker base | Implemented |

## Code execution path (backend `execution-service`)

The present scaffold forwards code to `CPP_ENGINE_URL/execute`. The engine in this repository
**does not implement `/execute`**; the execution path is therefore non-functional, not merely
unsafe. The design below is the acceptance bar for enabling it.

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
| Credential stuffing / brute force | `express-rate-limit` on auth routes; bcrypt cost 12 | Present in scaffold; limits need tuning |
| Token theft | Short-lived access JWT (15 min) + refresh rotation; `helmet` headers; CORS allow-list | Present in scaffold |
| Injection | Prisma parameterised queries; `zod`/`joi` validation at route boundary | Present in scaffold; coverage not audited |
| XSS in forum content | Must sanitise rendered Markdown/HTML server-side | **Not audited** |
| Secrets in repo | `.env*` git-ignored; `.env.example` placeholders only; compose defaults are development-only strings | Implemented |
| Oversized requests to the engine | Body-size cap (recommend 256 KiB) before invoking the engine | **Pending** |

## Reporting

See [`SECURITY.md`](../../SECURITY.md). A sandbox escape or any route from learner input to
a shell is treated as critical.
