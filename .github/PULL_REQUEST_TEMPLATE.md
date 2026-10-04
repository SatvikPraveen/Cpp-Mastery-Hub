## Summary

<!-- What changes and why. Link the issue or ADR this implements. -->

## Component

- [ ] cpp-engine (library / CLI)
- [ ] frontend
- [ ] backend
- [ ] docs / research
- [ ] infrastructure (Docker, CI)

## Verification

<!-- Paste the commands you ran and their result. -->

- [ ] `cmake --workflow --preset dev` passes (engine changes)
- [ ] `cmake --workflow --preset asan-ubsan` passes (engine changes touching parsing or memory)
- [ ] `python3 cpp-engine/eval/run_eval.py --cli …` recall unchanged or improved (rule changes)
- [ ] New rule or metric is documented in `docs/research/` with its reference
- [ ] `CHANGELOG.md` updated under *Unreleased*

## Checklist

- [ ] Commit messages follow Conventional Commits
- [ ] No new third-party dependency added to `cpp-engine` (by design it has none)
