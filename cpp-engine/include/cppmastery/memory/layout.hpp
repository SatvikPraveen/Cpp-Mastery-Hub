#pragma once

#include <cstddef>
#include <map>
#include <optional>
#include <string>
#include <vector>

#include "cppmastery/source_text.hpp"

namespace cppmastery {

struct TypeInfo {
    std::size_t size = 0;
    std::size_t align = 0;
};

/// Sizes and alignments of scalar and a few common library types for a target data model.
///
/// Library types are implementation-specific; the values shipped here are those of libstdc++ /
/// libc++ on LP64 and are labelled as assumptions in the output. Users may register their own
/// aggregate types via `addType`.
struct TargetABI {
    std::string name;
    std::size_t pointerSize = 8;
    std::size_t pointerAlign = 8;
    std::map<std::string, TypeInfo> types;

    [[nodiscard]] static TargetABI lp64();   ///< Linux/macOS x86-64 & AArch64 (long = 8).
    [[nodiscard]] static TargetABI llp64();  ///< Windows x64 (long = 4).
    [[nodiscard]] static TargetABI
    ilp32();  ///< 32-bit targets (pointer = 4, long double = 12 on x86).

    /// Looks a type name up after normalising whitespace and the `std::` prefix.
    [[nodiscard]] std::optional<TypeInfo> lookup(const std::string& typeName) const;
    void addType(const std::string& typeName, TypeInfo info);
};

struct FieldSpec {
    std::string name;
    std::string type;              ///< Base type name, e.g. "unsigned int", "std::string", "Foo".
    std::size_t pointerDepth = 0;  ///< Number of `*` applied to the type.
    std::size_t arrayCount = 1;    ///< Product of array dimensions; 1 for scalars.
};

struct FieldLayout {
    FieldSpec spec;
    std::size_t offset = 0;
    std::size_t size = 0;  ///< Total bytes including array elements.
    std::size_t align = 0;
    std::size_t paddingBefore = 0;
};

struct StructLayout {
    std::string name;
    std::vector<FieldLayout> fields;
    std::size_t size = 0;   ///< sizeof, including tail padding.
    std::size_t align = 0;  ///< alignof.
    std::size_t tailPadding = 0;
    std::size_t paddingBytes = 0;    ///< Sum of all padding (interior + tail).
    std::vector<std::string> notes;  ///< Assumptions or unresolved types.

    [[nodiscard]] double paddingRatio() const noexcept {
        return size == 0 ? 0.0 : static_cast<double>(paddingBytes) / static_cast<double>(size);
    }
};

/// Computes the layout of a standard-layout struct with the given field order.
///
/// Algorithm (Itanium C++ ABI §2.4 / System V): offset_i = roundUp(offset_{i-1} + size_{i-1},
/// align_i); sizeof = roundUp(last end, max align). An optional `pack` caps each field's
/// alignment as `#pragma pack(N)` would. Unknown types are given pointer size/alignment and a
/// note is appended.
[[nodiscard]] StructLayout computeLayout(const std::string& name,
                                         const std::vector<FieldSpec>& fields, const TargetABI& abi,
                                         std::optional<std::size_t> pack = std::nullopt);

struct ReorderSuggestion {
    std::vector<FieldSpec> order;  ///< Suggested declaration order.
    StructLayout layout;           ///< Layout under the suggested order.
    std::size_t bytesSaved = 0;    ///< original.size - layout.size
};

/// Proposes a field order that minimises total size.
///
/// Fields are stably sorted by decreasing alignment. Because every C++ object's size is a multiple
/// of its alignment and alignments are powers of two, this order yields zero interior padding, so
/// it is optimal (the sum of field sizes rounded up to the maximum alignment is a lower bound on
/// sizeof, and this order attains it). Ties keep the original relative order to preserve intent.
[[nodiscard]] ReorderSuggestion suggestReorder(const StructLayout& original, const TargetABI& abi,
                                               std::optional<std::size_t> pack = std::nullopt);

struct ParsedStruct {
    std::string name;
    std::vector<FieldSpec> fields;
    std::vector<std::string> skipped;  ///< Members that were not modelled (methods, bit-fields...).
};

/// Extracts `struct`/`class` definitions with their non-static data members from source.
///
/// Supported: fundamental types, qualified type names, pointers, fixed-size arrays with literal
/// bounds, nested struct references (resolved against earlier definitions when `abi` is passed
/// to computeLayout via `registerParsedStructs`). Skipped with a note: methods, bit-fields,
/// static members, references, templates with non-literal arguments.
[[nodiscard]] std::vector<ParsedStruct> parseStructs(const SourceText& source);

/// Registers the layouts of `structs` (in order) in `abi` so later structs can embed earlier ones.
/// Returns the computed layouts.
[[nodiscard]] std::vector<StructLayout> layoutAll(const std::vector<ParsedStruct>& structs,
                                                  TargetABI& abi,
                                                  std::optional<std::size_t> pack = std::nullopt);

}  // namespace cppmastery
