# Security Policy

## Supported versions

| Component | Supported |
|---|---|
| `cpp-engine` 2.x (`main`) | Yes |
| Web application (`frontend/`, `backend/`) on `main` | Yes |
| `cpp-engine/prototype` | No (reference only, not built) |

## Reporting a vulnerability

Please **do not** open a public issue for security problems.

Use GitHub's private vulnerability reporting on this repository
(*Security → Report a vulnerability*), or email **satvikpraveen707@gmail.com** with the
subject line `[Cpp-Mastery-Hub security]`. Include a minimal reproducer, the commit hash
you tested, and the impact you believe it has.

You will receive an acknowledgement within 72 hours and a resolution target within 14 days
for high-severity issues. Credit is given in the changelog unless you ask otherwise.

## Scope and threat model

The analysis engine processes **untrusted source text** supplied by learners. It is designed
to be total over arbitrary bytes (see the property tests and fuzzers in `cpp-engine/`), but
any crash, hang, or unbounded memory growth triggered by crafted input is in scope.

The web backend's code-execution path (compiling and running learner programs) is the
highest-value target. The documented threat model and the controls that are and are not yet
implemented live in [`docs/research/threat-model.md`](docs/research/threat-model.md). A
sandbox escape, resource-limit bypass, or any path by which learner input reaches a shell is
in scope and treated as critical.

Out of scope: vulnerabilities in third-party dependencies that are already public and have a
fixed version available (please open a normal issue or a Dependabot-style PR instead), and
findings that require a compromised developer machine.

## Hardening practices in this repository

- Engine: `-Werror` with an extensive warning set, clang-tidy gating, ASan/UBSan in CI,
  libFuzzer harnesses, no third-party runtime dependencies.
- Containers: digest-pinned base images, non-root users, single static binary for the engine.
- Supply chain: Dependabot for npm, GitHub Actions and Docker; GitHub Actions pinned by major
  version with CodeQL on every push.
