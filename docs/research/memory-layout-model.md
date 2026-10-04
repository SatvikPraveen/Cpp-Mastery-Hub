# Memory layout model

`cppmastery layout` turns a `struct`/`class` definition into byte offsets, padding and a
size-optimal field order. Learners see *why* `sizeof` is larger than the sum of the members
and what reordering achieves.

## Layout algorithm

For standard-layout aggregates on Itanium C++ ABI targets (System V x86-64, AArch64) and the
Microsoft x64 ABI, the rule is identical:

```
offset₀ = 0
offsetᵢ = roundUp(offsetᵢ₋₁ + sizeᵢ₋₁, alignᵢ)
sizeof  = roundUp(offsetₙ₋₁ + sizeₙ₋₁, max alignᵢ)          (1 for an empty aggregate)
alignof = max alignᵢ
```

`#pragma pack(N)` is emulated by capping every `alignᵢ` at N. Arrays contribute
`count · size` with the element's alignment. Pointers use the target's pointer size regardless
of pointee.

## Data models

| Model | `long` | pointer | `long double` | `wchar_t` | Typical targets |
|---|---:|---:|---:|---:|---|
| `lp64` | 8 | 8 | 16 (align 16) | 4 | Linux, macOS, *BSD on x86-64 and AArch64 |
| `llp64` | 4 | 8 | 8 | 2 | Windows x64 (MSVC, MinGW-w64) |
| `ilp32` | 4 | 4 | 12 (align 4) | 4 | 32-bit x86 Linux |

Standard-library types (`std::string`, `std::vector`, smart pointers, …) are modelled with
their libstdc++/libc++ sizes on the given data model (e.g. `string` = 4 pointers, `vector` =
3 pointers). They are *assumptions*, reported as notes in the output, because the standard
does not fix them. Unknown types are given pointer size and alignment with a note.

## Reordering: claim and proof

**Claim.** Stably sorting fields by non-increasing alignment yields the minimum possible
`sizeof` for the given set of fields under the algorithm above.

**Proof.** Let A = max alignᵢ and S = Σ sizeᵢ. Any layout has `sizeof ≥ roundUp(S, A)`: the
fields occupy S bytes and `sizeof` is a multiple of A. In the sorted order, each field's
alignment divides every earlier field's alignment (alignments are powers of two and
non-increasing), and every C++ object's size is a multiple of its alignment. By induction the
running end offset after field *i* is a multiple of alignᵢ, hence also of alignᵢ₊₁ ≤ alignᵢ,
so no interior padding is ever inserted. The end offset is therefore exactly S, and
`sizeof = roundUp(S, A)`, meeting the lower bound. ∎

Stability keeps the original relative order among equal alignments so the suggestion looks
like the author's struct, not a shuffle. Under `#pragma pack` the same argument holds with
the capped alignments.

What the reorder does **not** consider: cache-line locality, hot/cold field grouping,
bit-field packing, and ABI compatibility of a public struct. The CLI reports `bytes_saved`;
the decision remains the author's.

## Parsing scope

Recognised members: fundamental and qualified type names, pointers, fixed-size arrays with
literal bounds, nested aggregates defined earlier in the same input, default member
initialisers. Skipped with a note: methods and constructors, `static` members, bit-fields,
references, `using`/`typedef`, nested type definitions, arrays with non-literal bounds.

Verification: `tests/layout_test.cpp` covers the classic 24→16 byte example, pack emulation,
the three data models, nested resolution and the never-worse invariant; `fuzz/layout_fuzzer.cpp`
aborts if a suggested order is ever larger than the original.
