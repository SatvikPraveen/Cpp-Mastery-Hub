# Engine evaluation — cppmastery 2.0.0 (520409529e0a)

Generated 2026-10-04 06:53:18 EDT on macOS-26.6.2-arm64-arm-64bit-Mach-O.

## Seeded-smell recall

- Expected diagnostics: **21**
- Detected: **21** (recall 100.0%)
- Non-info diagnostics on clean corpus: **0**

| File | Lines | Expected | Observed | Missing | Unexpected | Time (µs) |
|---|---:|---:|---:|---|---|---:|
| `clean/raii_vector.cpp` | 38 | 0 | 0 | – | – | 70 |
| `smells/complex_switch.cpp` | 36 | 6 | 21 | – | – | 194 |
| `smells/legacy_c_style.cpp` | 21 | 8 | 13 | – | – | 38 |
| `smells/unsafe_strcpy.cpp` | 27 | 7 | 7 | – | – | 34 |

## Layout model

All reorder suggestions are size-non-increasing: **yes**

## Throughput

| Benchmark | Time (µs) | Throughput (MB/s) |
|---|---:|---:|
| `BM_Tokenize/1` | 2.5 | 159.2 |
| `BM_Tokenize/10` | 23.3 | 134.8 |
| `BM_Tokenize/100` | 256.4 | 123.1 |
| `BM_Tokenize/1000` | 3,642.4 | 94.8 |
| `BM_Metrics/10` | 21.9 | 144.6 |
| `BM_Metrics/100` | 275.4 | 115.6 |
| `BM_Metrics/1000` | 2,996.7 | 104.7 |
| `BM_AnalyzeFull/1` | 10.3 | 38.5 |
| `BM_AnalyzeFull/10` | 83.7 | 37.7 |
| `BM_AnalyzeFull/100` | 985.3 | 32.5 |
| `BM_AnalyzeFull/1000` | 10,850.4 | 29.9 |
| `BM_AnalyzeToJson` | 2,005.2 | – |
| `BM_LayoutReorder/8` | 1.7 | – |
| `BM_LayoutReorder/64` | 10.4 | – |
| `BM_LayoutReorder/512` | 94.9 | – |

_10 logical CPUs, release build, macOS-26.6.2-arm64-arm-64bit-Mach-O; single-threaded, wall-clock time per iteration._

## Notes

- schema validation skipped (pip install jsonschema to enable)
