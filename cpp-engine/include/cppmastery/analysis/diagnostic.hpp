#pragma once

#include <cstdint>
#include <string>
#include <string_view>

#include "cppmastery/source_text.hpp"

namespace cppmastery {

enum class Severity : std::uint8_t { Info, Warning, Error };
enum class Category : std::uint8_t {
    Correctness,
    Security,
    Memory,
    Performance,
    Modernization,
    Readability,
    Portability,
    Complexity,
};

[[nodiscard]] std::string_view toString(Severity s) noexcept;
[[nodiscard]] std::string_view toString(Category c) noexcept;

struct Diagnostic {
    std::string ruleId;  ///< e.g. "memory/raw-new-delete"
    Severity severity = Severity::Warning;
    Category category = Category::Correctness;
    Position position{};
    std::size_t length = 0;  ///< Length in bytes of the flagged token (0 if not applicable).
    std::string message;
    std::string suggestion;
    std::string reference;  ///< External rationale: Core Guidelines / CERT id, or paper.
};

}  // namespace cppmastery
