#include "cppmastery/analysis/rule.hpp"

namespace cppmastery {

Diagnostic Rule::make(const Token& at, std::string message, std::string suggestion) const {
    Diagnostic d = make(at.position, std::move(message), std::move(suggestion));
    d.length = at.text.size();
    return d;
}

Diagnostic Rule::make(Position at, std::string message, std::string suggestion) const {
    Diagnostic d;
    d.ruleId = std::string(id());
    d.severity = severity();
    d.category = category();
    d.position = at;
    d.message = std::move(message);
    d.suggestion = std::move(suggestion);
    d.reference = std::string(reference());
    return d;
}

}  // namespace cppmastery
