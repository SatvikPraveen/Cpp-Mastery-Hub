#include "cppmastery/analysis/rule_engine.hpp"

#include <algorithm>
#include <tuple>

#include "cppmastery/analysis/builtin_rules.hpp"
#include "cppmastery/lexer/lexer.hpp"

namespace cppmastery {

RuleEngine RuleEngine::withBuiltinRules() {
    RuleEngine engine;
    for (auto& r : makeBuiltinRules()) engine.addRule(std::move(r));
    return engine;
}

void RuleEngine::addRule(std::unique_ptr<Rule> rule) {
    if (rule) rules_.push_back(std::move(rule));
}

AnalysisReport RuleEngine::analyze(const SourceText& source, const AnalysisConfig& config) const {
    const auto t0 = std::chrono::steady_clock::now();
    AnalysisReport report;

    const std::vector<Token> tokens = tokenize(source);
    std::vector<const Token*> code;
    code.reserve(tokens.size());
    for (const Token& t : tokens) {
        if (!t.isComment() && t.kind != TokenKind::Preprocessor && t.kind != TokenKind::EndOfFile)
            code.push_back(&t);
    }
    report.metrics = computeMetrics(source, tokens);

    const RuleContext ctx{source, tokens, code, report.metrics, config};
    for (const auto& rule : rules_) {
        if (config.disabledRules.contains(std::string(rule->id()))) continue;
        rule->run(ctx, report.diagnostics);
        ++report.rulesRun;
    }

    std::stable_sort(report.diagnostics.begin(), report.diagnostics.end(),
                     [](const Diagnostic& a, const Diagnostic& b) {
                         return std::tie(a.position.line, a.position.column, a.ruleId) <
                                std::tie(b.position.line, b.position.column, b.ruleId);
                     });
    for (const Diagnostic& d : report.diagnostics) {
        switch (d.severity) {
            case Severity::Error: ++report.summary.errors; break;
            case Severity::Warning: ++report.summary.warnings; break;
            case Severity::Info: ++report.summary.infos; break;
        }
    }
    report.elapsed = std::chrono::duration_cast<std::chrono::microseconds>(
        std::chrono::steady_clock::now() - t0);
    return report;
}

}  // namespace cppmastery
