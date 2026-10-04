#include "cppmastery/analysis/diagnostic.hpp"

namespace cppmastery {

std::string_view toString(Severity s) noexcept {
    switch (s) {
        case Severity::Info: return "info";
        case Severity::Warning: return "warning";
        case Severity::Error: return "error";
    }
    return "?";
}

std::string_view toString(Category c) noexcept {
    switch (c) {
        case Category::Correctness: return "correctness";
        case Category::Security: return "security";
        case Category::Memory: return "memory";
        case Category::Performance: return "performance";
        case Category::Modernization: return "modernize";
        case Category::Readability: return "readability";
        case Category::Portability: return "portability";
        case Category::Complexity: return "complexity";
    }
    return "?";
}

}  // namespace cppmastery
