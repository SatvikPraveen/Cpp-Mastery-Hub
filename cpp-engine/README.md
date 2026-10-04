# cppmastery engine

A dependency-free C++20 library and command-line tool that turns C++ source text into
structured, citable feedback: a token stream, software metrics with published formulas, rule
diagnostics that point at the guideline they enforce, and a memory-layout model with a
provably padding-minimal field reordering.

It is the analysis backend of C++ Mastery Hub, but it is also usable on its own: the library
has no third-party dependencies, builds in a few seconds, and ships with unit, property and
sanitizer-clean test suites, micro-benchmarks, libFuzzer harnesses and a reproducible
evaluation script.

```
$ cppmastery analyze eval/corpus/smells/unsafe_strcpy.cpp
eval/corpus/smells/unsafe_strcpy.cpp:5:1: warning: 'using namespace std;' at file scope. [readability/using-namespace-std]
    hint: Qualify names (std::cout) or scope the directive to a function.
eval/corpus/smells/unsafe_strcpy.cpp:13:17: warning: Raw 'new' expression. [memory/raw-new-delete]
    hint: Prefer std::make_unique / std::make_shared or a container.
eval/corpus/smells/unsafe_strcpy.cpp:14:5: error: Call to unsafe C function 'strcpy'. [security/unsafe-c-function]
    hint: Prefer std::string / std::string_view, std::snprintf, std::strtok_r or std::array with bounds checks.
...
2 error(s), 4 warning(s), 1 info(s) from 20 rules in 221 us
```

## Components

| Module | Header | What it does |
|---|---|---|
| Source map | `cppmastery/source_text.hpp` | Line table with O(log n) offset → line/column mapping. |
| Lexer | `cppmastery/lexer/lexer.hpp` | Total, single-pass C++20 tokenizer: raw strings, digit separators, hex floats, UD-literals, all multi-char punctuators. Never fails; malformed input yields `Unknown` tokens that still cover the input exactly once. |
| Metrics | `cppmastery/metrics/metrics.hpp` | Line classification, Halstead measures, McCabe and extended cyclomatic complexity per function, block nesting, Maintainability Index (SEI and normalized). |
| Rule engine | `cppmastery/analysis/rule_engine.hpp` | 20 built-in rules in 8 categories; every rule carries a C++ Core Guidelines / CERT / CWE / paper reference. Thresholds and rule disabling are configurable. |
| Memory layout | `cppmastery/memory/layout.hpp` | Parses `struct`/`class` definitions, computes Itanium-ABI offsets and padding for LP64 / LLP64 / ILP32, emulates `#pragma pack`, and proposes a size-optimal reorder. |
| JSON | `cppmastery/report/json_report.hpp` | Versioned, schema-validated JSON for every result type (`schemas/`). |

The methodology behind each metric and rule, including the function-recognition grammar and
its known limitations, is documented in
[`docs/research/metrics-methodology.md`](../docs/research/metrics-methodology.md) and
[`docs/research/rule-catalog.md`](../docs/research/rule-catalog.md).

## Build

Requirements: CMake ≥ 3.21 (presets need 3.25), Ninja, and a C++20 compiler (GCC ≥ 11,
Clang ≥ 14, AppleClang ≥ 14, MSVC 19.3x). GoogleTest and Google Benchmark are fetched at
pinned commits; set `-DCPPMASTERY_USE_SYSTEM_GTEST=ON` to use an installed copy.

```bash
cmake --workflow --preset dev          # Debug build + 70 tests (GoogleTest + CLI + HTTP adapter)
cmake --workflow --preset asan-ubsan   # same tests under Address/UB sanitizers
cmake --preset release && cmake --build --preset release
./build/release/cppmastery analyze path/to/file.cpp --json | jq .summary
```

Other presets: `tsan`, `coverage`, `bench` (Google Benchmark) and `fuzz` (libFuzzer, clang
only). `cmake --build --preset dev --target format-check` verifies formatting against
`.clang-format`; the curated `.clang-tidy` profile is gating in CI.

## Command-line interface

```
cppmastery <command> [options] [<file>|-]

analyze   run every rule and print diagnostics      metrics   print code metrics only
layout    struct layouts + padding-minimal reorder  tokens    dump the token stream
rules     list built-in rules with references       version   print version information

--json              machine-readable output         --fail-on error|warning|info|never
--max-cc N          cyclomatic threshold (10)       --max-nesting N (4)   --max-lines N (60)
--disable RULE_ID   skip a rule (repeatable)        --abi lp64|llp64|ilp32   --pack N
```

Exit codes: `0` success, `1` diagnostics at or above `--fail-on`, `2` usage error, `3` I/O or
internal error. Reading from stdin (`-`) lets the web backend stream editor contents without
touching disk.

## Library use

```cmake
find_package(cppmastery 2 REQUIRED)          # after `cmake --install`
target_link_libraries(my_tool PRIVATE cppmastery::core)
```

```cpp
#include <cppmastery/analysis/rule_engine.hpp>
#include <cppmastery/report/json_report.hpp>

cppmastery::SourceText source(readFile(path));
const auto engine = cppmastery::RuleEngine::withBuiltinRules();
const auto report = engine.analyze(source);
std::cout << cppmastery::toJson(report);
```

Add a rule by deriving from `cppmastery::Rule` and calling `engine.addRule(...)`; rules are
stateless, const and must be total over any token stream.

## Verification

| Layer | Mechanism | Where |
|---|---|---|
| Unit | GoogleTest, 58 focused tests | `tests/*_test.cpp` |
| Property | Lexer coverage/ordering invariants over 2 000 random byte strings; prefix-truncation stability of every corpus file; pipeline totality | `tests/property_test.cpp` |
| End-to-end | CTest drives the real CLI (including expected-failure exit codes) and the HTTP adapter | `tests/CMakeLists.txt`, `tools/http_adapter/test_http_adapter.py` |
| Memory safety | ASan + UBSan preset, run in CI on every push | `CMakePresets.json` |
| Fuzzing | libFuzzer targets for lexer, analyzer and layout parser with abort-on-invariant; one real invariant violation found and fixed (see `docs/research/memory-layout-model.md`) | `fuzz/` |
| Static analysis | clang-tidy with `WarningsAsErrors: '*'` on a curated check set; `-Wall -Wextra -Wpedantic -Wconversion … -Werror` | `.clang-tidy`, `cmake/CompilerWarnings.cmake` |
| Evaluation | Seeded-smell corpus with recall / clean-corpus precision, JSON-schema validation, benchmark ingestion | `eval/run_eval.py` |

## HTTP adapter

`tools/http_adapter/cppmastery_http.py` exposes the CLI over HTTP for the web backend
(ADR-0005). It uses only the Python standard library, spawns the CLI per request with a body
cap (`CPPMASTERY_MAX_BODY`, default 256 KiB) and a timeout (`CPPMASTERY_TIMEOUT`, default 5 s),
validates every option, and holds no state.

| Endpoint | Maps to |
|---|---|
| `GET /health`, `GET /version` | `cppmastery version` |
| `GET /rules` | `cppmastery rules --json` |
| `POST /analyze` `{code, config?}` | `cppmastery analyze --json --fail-on never -` |
| `POST /metrics` `{code}` | `cppmastery metrics --json -` |
| `POST /layout` `{code, abi?, pack?}` | `cppmastery layout --json -` |
| `POST /tokens` `{code}` | `cppmastery tokens --json -` |
| `POST /execute` | **501**, by design (no sandbox; see the threat model) |

## Docker

```bash
docker build --build-arg GIT_REVISION=$(git rev-parse --short=12 HEAD) -t cppmastery-engine .
docker run --rm -p 9000:9000 cppmastery-engine                                   # HTTP adapter
echo 'int main(){ char b[8]; gets(b); }' | docker run --rm -i cppmastery-engine analyze -   # CLI
```

The image builds from a digest-pinned Debian base, runs the entire test suite and the
evaluation script during `docker build`, and ships a statically linked binary plus the adapter,
running as an unprivileged user with a healthcheck.

## Layout

```
cpp-engine/
├── include/cppmastery/   public headers (one directory per module)
├── src/                  implementation
├── tools/cli/            command-line front end
├── tools/http_adapter/   stdlib HTTP wrapper around the CLI (+ end-to-end test)
├── tests/                GoogleTest suites + CTest CLI tests
├── benchmarks/           Google Benchmark micro-benchmarks
├── fuzz/                 libFuzzer harnesses
├── eval/                 corpus + run_eval.py (reproducible results)
├── schemas/              JSON Schema for every output format
├── cmake/                warnings, sanitizers, coverage, git revision, package config
└── prototype/            first-generation Clang-based design (not built; see its README)
```
