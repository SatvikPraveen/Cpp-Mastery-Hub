#pragma once

#include <chrono>
#include <cstddef>
#include <memory>
#include <vector>

#include "cppmastery/analysis/rule.hpp"

namespace cppmastery {

struct AnalysisSummary {
    std::size_t errors = 0;
    std::size_t warnings = 0;
    std::size_t infos = 0;
    [[nodiscard]] std::size_t total() const noexcept { return errors + warnings + infos; }
};

struct AnalysisReport {
    CodeMetrics metrics;
    std::vector<Diagnostic> diagnostics;  ///< Sorted by position, then rule id.
    AnalysisSummary summary;
    std::chrono::microseconds elapsed{0};
    std::size_t rulesRun = 0;
};

/// Owns a set of rules and runs them over a source unit.
class RuleEngine {
public:
    RuleEngine() = default;
    ~RuleEngine() = default;
    RuleEngine(const RuleEngine&) = delete;
    RuleEngine& operator=(const RuleEngine&) = delete;
    RuleEngine(RuleEngine&&) noexcept = default;
    RuleEngine& operator=(RuleEngine&&) noexcept = default;

    /// An engine pre-populated with every rule in `builtin_rules.hpp`.
    [[nodiscard]] static RuleEngine withBuiltinRules();

    void addRule(std::unique_ptr<Rule> rule);
    [[nodiscard]] const std::vector<std::unique_ptr<Rule>>& rules() const noexcept {
        return rules_;
    }

    [[nodiscard]] AnalysisReport analyze(const SourceText& source,
                                         const AnalysisConfig& config = {}) const;

private:
    std::vector<std::unique_ptr<Rule>> rules_;
};

}  // namespace cppmastery
