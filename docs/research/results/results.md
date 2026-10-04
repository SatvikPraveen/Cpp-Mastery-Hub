# Engine evaluation — cppmastery 2.0.0 (f3f32c26cea7)

Generated 2026-10-03 22:01:37 EDT on macOS-26.6.2-arm64-arm-64bit-Mach-O.

## Seeded-smell recall

- Expected diagnostics: **21**
- Detected: **21** (recall 100.0%)
- Non-info diagnostics on clean corpus: **0**

| File | Lines | Expected | Observed | Missing | Unexpected | Time (µs) |
|---|---:|---:|---:|---|---|---:|
| `clean/raii_vector.cpp` | 38 | 0 | 0 | – | – | 151 |
| `smells/complex_switch.cpp` | 36 | 6 | 21 | – | – | 74 |
| `smells/legacy_c_style.cpp` | 21 | 8 | 13 | – | – | 38 |
| `smells/unsafe_strcpy.cpp` | 27 | 7 | 7 | – | – | 47 |

## Layout model

All reorder suggestions are size-non-increasing: **yes**

## Throughput

| Benchmark | Time (µs) | Throughput (MB/s) |
|---|---:|---:|
| `BM_Tokenize/1` | 2.0 | 187.3 |
| `BM_Tokenize/10` | 20.7 | 149.7 |
| `BM_Tokenize/100` | 220.6 | 138.0 |
| `BM_Tokenize/1000` | 2,496.2 | 122.0 |
| `BM_Metrics/10` | 20.3 | 156.7 |
| `BM_Metrics/100` | 223.3 | 136.1 |
| `BM_Metrics/1000` | 2,595.8 | 117.2 |
| `BM_AnalyzeFull/1` | 9.7 | 42.7 |
| `BM_AnalyzeFull/10` | 71.4 | 43.4 |
| `BM_AnalyzeFull/100` | 750.4 | 40.5 |
| `BM_AnalyzeFull/1000` | 8,875.7 | 35.7 |
| `BM_AnalyzeToJson` | 1,193.9 | – |
| `BM_LayoutReorder/8` | 2.2 | – |
| `BM_LayoutReorder/64` | 16.7 | – |
| `BM_LayoutReorder/512` | 136.7 | – |

_10 logical CPUs, release build, macOS-26.6.2-arm64-arm-64bit-Mach-O; single-threaded, wall-clock time per iteration._

## Notes

- schema validation skipped (pip install jsonschema to enable)
