#pragma once

#include <string>
#include <vector>

#include "cppmastery/analysis/rule_engine.hpp"
#include "cppmastery/lexer/token.hpp"
#include "cppmastery/memory/layout.hpp"
#include "cppmastery/metrics/metrics.hpp"

namespace cppmastery {

/// JSON serialisation of the engine's result types. Schemas live in cpp-engine/schemas/.
[[nodiscard]] std::string toJson(const CodeMetrics& m);
[[nodiscard]] std::string toJson(const AnalysisReport& r, const RuleEngine* rules = nullptr);
[[nodiscard]] std::string toJson(const StructLayout& l);
[[nodiscard]] std::string toJson(const std::vector<StructLayout>& layouts,
                                 const std::vector<ReorderSuggestion>& suggestions,
                                 const TargetABI& abi);
[[nodiscard]] std::string toJson(const std::vector<Token>& tokens);

}  // namespace cppmastery
