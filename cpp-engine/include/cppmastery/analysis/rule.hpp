#pragma once

#include <cstddef>
#include <cstdint>
#include <set>
#include <string>
#include <string_view>
#include <vector>

#include "cppmastery/analysis/diagnostic.hpp"
#include "cppmastery/lexer/token.hpp"
#include "cppmastery/metrics/metrics.hpp"
#include "cppmastery/source_text.hpp"

namespace cppmastery {

/// Tunable thresholds and switches shared by all rules.
struct AnalysisConfig {
    std::uint32_t maxCyclomatic = 10;  ///< McCabe's original recommendation.
    std::uint32_t maxNesting = 4;
    std::size_t maxFunctionLines = 60;
    std::vector<long long> allowedMagicNumbers{0, 1, -1, 2};
    std::set<std::string> disabledRules;  ///< Rule ids to skip.
};

/// Everything a rule may inspect. `tokens` is the full stream (comments and preprocessor kept,
/// EndOfFile last); `code` is the filtered view with only code tokens, in the same order.
struct RuleContext {
    const SourceText& source;
    const std::vector<Token>& tokens;
    const std::vector<const Token*>& code;
    const CodeMetrics& metrics;
    const AnalysisConfig& config;
};

/// A stateless check. Implementations must be thread-safe (they are const) and total: they may
/// not throw on any input the lexer accepts.
class Rule {
public:
    virtual ~Rule() = default;

    [[nodiscard]] virtual std::string_view id() const noexcept = 0;
    [[nodiscard]] virtual std::string_view description() const noexcept = 0;
    [[nodiscard]] virtual Category category() const noexcept = 0;
    [[nodiscard]] virtual Severity severity() const noexcept = 0;
    /// Citation that motivates the rule (C++ Core Guidelines item, CERT id, paper).
    [[nodiscard]] virtual std::string_view reference() const noexcept = 0;

    virtual void run(const RuleContext& ctx, std::vector<Diagnostic>& out) const = 0;

protected:
    /// Helper that fills the boilerplate fields from the rule's own metadata.
    [[nodiscard]] Diagnostic make(const Token& at, std::string message,
                                  std::string suggestion = {}) const;
    [[nodiscard]] Diagnostic make(Position at, std::string message,
                                  std::string suggestion = {}) const;
};

}  // namespace cppmastery
