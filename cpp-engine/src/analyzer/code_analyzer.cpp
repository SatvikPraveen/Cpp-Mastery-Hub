// File: cpp-engine/src/analyzer/code_analyzer.cpp
// Extension: .cpp (C++ Source File)

#include "../include/analyzer/code_analyzer.hpp"
#include "../include/utils/logger.hpp"
#include "../include/utils/string_utils.hpp"
#include <algorithm>
#include <regex>
#include <unordered_set>
#include <unordered_map>
#include <fstream>
#include <chrono>

namespace cpp_analyzer {

CodeAnalyzer::CodeAnalyzer() : logger_(Logger::getInstance()) {
    initializeRules();
    logger_.info("CodeAnalyzer initialized with " + std::to_string(analysis_rules_.size()) + " rules");
}

CodeAnalyzer::~CodeAnalyzer() = default;

void CodeAnalyzer::initializeRules() {
    // Memory management rules
    analysis_rules_.emplace_back(AnalysisRule{
        "memory_leak_potential",
        "Potential memory leak: 'new' without corresponding 'delete'",
        RuleSeverity::HIGH,
        RuleCategory::MEMORY_MANAGEMENT,
        [](const std::string& code) -> std::vector<RuleViolation> {
            std::vector<RuleViolation> violations;
            std::regex new_pattern(R"(\bnew\s+(?:\w+(?:\s*\*)*|\w+\s*\[.*?\]|\(\s*\w+.*?\)))");
            std::regex delete_pattern(R"(\bdelete(?:\s*\[\])?\s+\w+)");
            
            auto new_matches = std::sregex_iterator(code.begin(), code.end(), new_pattern);
            auto new_end = std::sregex_iterator();
            auto delete_matches = std::sregex_iterator(code.begin(), code.end(), delete_pattern);
            auto delete_end = std::sregex_iterator();
            
            size_t new_count = std::distance(new_matches, new_end);
            size_t delete_count = std::distance(delete_matches, delete_end);
            
            if (new_count > delete_count) {
                for (auto it = new_matches; it != new_end; ++it) {
                    auto match = *it;
                    violations.push_back({
                        StringUtils::getLineNumber(code, match.position()),
                        static_cast<unsigned>(match.position() - StringUtils::getLineStart(code, match.position())),
                        "Potential memory leak detected"
                    });
                }
            }
            return violations;
        }
    });

    // Performance rules
    analysis_rules_.emplace_back(AnalysisRule{
        "inefficient_string_concatenation",
        "Inefficient string concatenation in loop",
        RuleSeverity::MEDIUM,
        RuleCategory::PERFORMANCE,
        [](const std::string& code) -> std::vector<RuleViolation> {
            std::vector<RuleViolation> violations;
            std::regex pattern(R"(for\s*\([^}]*\+\=.*string|while\s*\([^}]*\+\=.*string)");
            
            auto matches = std::sregex_iterator(code.begin(), code.end(), pattern);
            auto end = std::sregex_iterator();
            
            for (auto it = matches; it != end; ++it) {
                auto match = *it;
                violations.push_back({
                    StringUtils::getLineNumber(code, match.position()),
                    static_cast<unsigned>(match.position() - StringUtils::getLineStart(code, match.position())),
                    "Consider using stringstream or reserve() for better performance"
                });
            }
            return violations;
        }
    });

    // Style rules
    analysis_rules_.emplace_back(AnalysisRule{
        "naming_convention",
        "Variable naming convention violation",
        RuleSeverity::LOW,
        RuleCategory::STYLE,
        [](const std::string& code) -> std::vector<RuleViolation> {
            std::vector<RuleViolation> violations;
            std::regex pattern(R"(\b(?:int|double|float|char|bool|string|auto)\s+([A-Z][a-zA-Z0-9_]*)\s*[=;])");
            
            auto matches = std::sregex_iterator(code.begin(), code.end(), pattern);
            auto end = std::sregex_iterator();
            
            for (auto it = matches; it != end; ++it) {
                auto match = *it;
                std::string var_name = match[1].str();
                if (var_name[0] >= 'A' && var_name[0] <= 'Z') {
                    violations.push_back({
                        StringUtils::getLineNumber(code, match.position()),
                        static_cast<unsigned>(match.position() - StringUtils::getLineStart(code, match.position())),
                        "Variable names should start with lowercase letter: " + var_name
                    });
                }
            }
            return violations;
        }
    });

    // Security rules
    analysis_rules_.emplace_back(AnalysisRule{
        "unsafe_function_usage",
        "Usage of unsafe C functions",
        RuleSeverity::HIGH,
        RuleCategory::SECURITY,
        [](const std::string& code) -> std::vector<RuleViolation> {
            std::vector<RuleViolation> violations;
            std::vector<std::string> unsafe_functions = {
                "strcpy", "strcat", "sprintf", "gets", "scanf"
            };
            
            for (const auto& func : unsafe_functions) {
                std::regex pattern("\\b" + func + "\\s*\\(");
                auto matches = std::sregex_iterator(code.begin(), code.end(), pattern);
                auto end = std::sregex_iterator();
                
                for (auto it = matches; it != end; ++it) {
                    auto match = *it;
                    violations.push_back({
                        StringUtils::getLineNumber(code, match.position()),
                        static_cast<unsigned>(match.position() - StringUtils::getLineStart(code, match.position())),
                        "Unsafe function '" + func + "' - consider safer alternatives"
                    });
                }
            }
            return violations;
        }
    });

    // Best practices rules
    analysis_rules_.emplace_back(AnalysisRule{
        "missing_const_correctness",
        "Missing const correctness",
        RuleSeverity::MEDIUM,
        RuleCategory::BEST_PRACTICES,
        [](const std::string& code) -> std::vector<RuleViolation> {
            std::vector<RuleViolation> violations;
            std::regex pattern(R"((\w+)\s*\&\s*(\w+)\s*\)(?!\s*const))");
            
            auto matches = std::sregex_iterator(code.begin(), code.end(), pattern);
            auto end = std::sregex_iterator();
            
            for (auto it = matches; it != end; ++it) {
                auto match = *it;
                violations.push_back({
                    StringUtils::getLineNumber(code, match.position()),
                    static_cast<unsigned>(match.position() - StringUtils::getLineStart(code, match.position())),
                    "Consider making reference parameter const if not modified"
                });
            }
            return violations;
        }
    });

    // Modern C++ rules
    analysis_rules_.emplace_back(AnalysisRule{
        "prefer_auto",
        "Consider using auto for type deduction",
        RuleSeverity::LOW,
        RuleCategory::MODERN_CPP,
        [](const std::string& code) -> std::vector<RuleViolation> {
            std::vector<RuleViolation> violations;
            std::regex pattern(R"(std::\w+(?:<[^>]+>)*\s+(\w+)\s*=\s*std::\w+(?:<[^>]+>)*\s*\()");
            
            auto matches = std::sregex_iterator(code.begin(), code.end(), pattern);
            auto end = std::sregex_iterator();
            
            for (auto it = matches; it != end; ++it) {
                auto match = *it;
                violations.push_back({
                    StringUtils::getLineNumber(code, match.position()),
                    static_cast<unsigned>(match.position() - StringUtils::getLineStart(code, match.position())),
                    "Consider using 'auto' for type deduction"
                });
            }
            return violations;
        }
    });
}

AnalysisResult CodeAnalyzer::analyzeCode(const std::string& code, const AnalysisOptions& options) {
    auto start_time = std::chrono::high_resolution_clock::now();
    
    AnalysisResult result;
    result.success = false;

    try {
        logger_.info("Starting code analysis for " + std::to_string(code.length()) + " characters");

        // Basic metrics
        result.metrics = calculateMetrics(code);
        
        // Apply analysis rules
        for (const auto& rule : analysis_rules_) {
            if (shouldApplyRule(rule, options)) {
                auto violations = rule.check_function(code);
                for (auto& violation : violations) {
                    AnalysisIssue issue;
                    issue.rule_id = rule.id;
                    issue.message = rule.description + ": " + violation.message;
                    issue.severity = rule.severity;
                    issue.category = rule.category;
                    issue.line = violation.line;
                    issue.column = violation.column;
                    issue.suggestion = generateSuggestion(rule, violation);
                    
                    result.issues.push_back(issue);
                }
            }
        }

        // Generate complexity analysis
        result.complexity = analyzeComplexity(code);

        // Generate suggestions
        result.suggestions = generateSuggestions(code, result.issues);

        // Calculate overall score
        result.overall_score = calculateOverallScore(result);

        result.success = true;
        logger_.info("Code analysis completed with " + std::to_string(result.issues.size()) + " issues found");

    } catch (const std::exception& e) {
        result.error_message = "Exception during analysis: " + std::string(e.what());
        logger_.error("Exception in analyzeCode: " + std::string(e.what()));
    }

    auto end_time = std::chrono::high_resolution_clock::now();
    auto duration = std::chrono::duration_cast<std::chrono::milliseconds>(end_time - start_time);
    result.analysis_time_ms = duration.count();

    return result;
}

CodeMetrics CodeAnalyzer::calculateMetrics(const std::string& code) {
    CodeMetrics metrics = {};
    
    std::istringstream stream(code);
    std::string line;
    bool in_multiline_comment = false;
    
    while (std::getline(stream, line)) {
        metrics.total_lines++;
        
        // Trim whitespace
        std::string trimmed = StringUtils::trim(line);
        
        if (trimmed.empty()) {
            metrics.blank_lines++;
            continue;
        }
        
        // Check for comments
        if (in_multiline_comment) {
            metrics.comment_lines++;
            if (trimmed.find("*/") != std::string::npos) {
                in_multiline_comment = false;
            }
            continue;
        }
        
        if (trimmed.find("/*") != std::string::npos) {
            metrics.comment_lines++;
            in_multiline_comment = (trimmed.find("*/") == std::string::npos);
            continue;
        }
        
        if (trimmed.substr(0, 2) == "//") {
            metrics.comment_lines++;
            continue;
        }
        
        metrics.code_lines++;
        
        // Count functions
        if (std::regex_search(trimmed, std::regex(R"(\w+\s+\w+\s*\([^)]*\)\s*\{?)"))) {
            metrics.function_count++;
        }
        
        // Count classes
        if (std::regex_search(trimmed, std::regex(R"(\b(?:class|struct)\s+\w+)"))) {
            metrics.class_count++;
        }
        
        // Count complexity indicators
        std::vector<std::string> complexity_keywords = {
            "if", "else", "while", "for", "switch", "case", "catch", "&&", "||"
        };
        
        for (const auto& keyword : complexity_keywords) {
            size_t pos = 0;
            while ((pos = trimmed.find(keyword, pos)) != std::string::npos) {
                metrics.complexity_indicators++;
                pos += keyword.length();
            }
        }
    }
    
    // Calculate derived metrics
    if (metrics.total_lines > 0) {
        metrics.comment_ratio = static_cast<double>(metrics.comment_lines) / metrics.total_lines;
    }
    
    if (metrics.code_lines > 0) {
        metrics.complexity_density = static_cast<double>(metrics.complexity_indicators) / metrics.code_lines;
    }
    
    return metrics;
}

ComplexityAnalysis CodeAnalyzer::analyzeComplexity(const std::string& code) {
    ComplexityAnalysis complexity = {};
    
    // Calculate cyclomatic complexity
    complexity.cyclomatic_complexity = calculateCyclomaticComplexity(code);
    
    // Calculate cognitive complexity
    complexity.cognitive_complexity = calculateCognitiveComplexity(code);
    
    // Calculate nesting depth
    complexity.max_nesting_depth = calculateMaxNestingDepth(code);
    
    // Calculate maintainability index (simplified version)
    complexity.maintainability_index = calculateMaintainabilityIndex(code);
    
    return complexity;
}

unsigned CodeAnalyzer::calculateCyclomaticComplexity(const std::string& code) {
    unsigned complexity = 1; // Base complexity
    
    std::vector<std::string> decision_points = {
        "if", "while", "for", "case", "catch", "&&", "||", "?"
    };
    
    for (const auto& keyword : decision_points) {
        std::regex pattern("\\b" + keyword + "\\b");
        auto matches = std::sregex_iterator(code.begin(), code.end(), pattern);
        auto end = std::sregex_iterator();
        complexity += std::distance(matches, end);
    }
    
    return complexity;
}

unsigned CodeAnalyzer::calculateCognitiveComplexity(const std::string& code) {
    unsigned complexity = 0;
    unsigned nesting_level = 0;
    
    std::istringstream stream(code);
    std::string line;
    
    while (std::getline(stream, line)) {
        std::string trimmed = StringUtils::trim(line);
        
        // Track nesting level
        for (char c : line) {
            if (c == '{') nesting_level++;
            else if (c == '}') nesting_level = (nesting_level > 0) ? nesting_level - 1 : 0;
        }
        
        // Add complexity for control structures
        std::vector<std::string> cognitive_keywords = {"if", "while", "for", "switch", "catch"};
        for (const auto& keyword : cognitive_keywords) {
            if (trimmed.find(keyword) != std::string::npos) {
                complexity += 1 + nesting_level;
            }
        }
        
        // Add complexity for logical operators
        size_t pos = 0;
        while ((pos = trimmed.find("&&", pos)) != std::string::npos || 
               (pos = trimmed.find("||", pos)) != std::string::npos) {
            complexity++;
            pos += 2;
        }
    }
    
    return complexity;
}

unsigned CodeAnalyzer::calculateMaxNestingDepth(const std::string& code) {
    unsigned max_depth = 0;
    unsigned current_depth = 0;
    
    for (char c : code) {
        if (c == '{') {
            current_depth++;
            max_depth = std::max(max_depth, current_depth);
        } else if (c == '}') {
            current_depth = (current_depth > 0) ? current_depth - 1 : 0;
        }
    }
    
    return max_depth;
}

double CodeAnalyzer::calculateMaintainabilityIndex(const std::string& code) {
    CodeMetrics metrics = calculateMetrics(code);
    unsigned cyclomatic = calculateCyclomaticComplexity(code);
    
    // Simplified maintainability index calculation
    double halstead_volume = std::log2(metrics.code_lines + 1) * (metrics.code_lines + 1);
    double maintainability = 171 - 5.2 * std::log(halstead_volume) - 0.23 * cyclomatic - 16.2 * std::log(metrics.code_lines + 1);
    
    return std::max(0.0, std::min(100.0, maintainability));
}

std::vector<AnalysisSuggestion> CodeAnalyzer::generateSuggestions(const std::string& code, const std::vector<AnalysisIssue>& issues) {
    std::vector<AnalysisSuggestion> suggestions;
    
    // Group issues by category
    std::unordered_map<RuleCategory, std::vector<AnalysisIssue>> issues_by_category;
    for (const auto& issue : issues) {
        issues_by_category[issue.category].push_back(issue);
    }
    
    // Generate category-specific suggestions
    for (const auto& [category, category_issues] : issues_by_category) {
        if (category_issues.size() >= 3) { // Only suggest if there are multiple issues
            AnalysisSuggestion suggestion;
            suggestion.type = SuggestionType::REFACTORING;
            suggestion.confidence = 0.8;
            
            switch (category) {
                case RuleCategory::MEMORY_MANAGEMENT:
                    suggestion.description = "Consider using smart pointers (std::unique_ptr, std::shared_ptr) for automatic memory management";
                    suggestion.before_code = "int* ptr = new int(42);";
                    suggestion.after_code = "std::unique_ptr<int> ptr = std::make_unique<int>(42);";
                    break;
                    
                case RuleCategory::PERFORMANCE:
                    suggestion.description = "Multiple performance issues detected. Consider profiling and optimizing hot paths";
                    suggestion.confidence = 0.6;
                    break;
                    
                case RuleCategory::STYLE:
                    suggestion.description = "Consider using a code formatter like clang-format for consistent style";
                    suggestion.confidence = 0.9;
                    break;
                    
                case RuleCategory::SECURITY:
                    suggestion.description = "Security issues detected. Consider using safer alternatives and input validation";
                    suggestion.confidence = 0.95;
                    break;
                    
                default:
                    continue;
            }
            
            suggestions.push_back(suggestion);
        }
    }
    
    return suggestions;
}

bool CodeAnalyzer::shouldApplyRule(const AnalysisRule& rule, const AnalysisOptions& options) {
    // Check if rule category is enabled
    if (options.disabled_categories.find(rule.category) != options.disabled_categories.end()) {
        return false;
    }
    
    // Check if specific rule is disabled
    if (options.disabled_rules.find(rule.id) != options.disabled_rules.end()) {
        return false;
    }
    
    // Check severity filter
    return static_cast<int>(rule.severity) >= static_cast<int>(options.min_severity);
}

std::string CodeAnalyzer::generateSuggestion(const AnalysisRule& rule, const RuleViolation& violation) {
    std::unordered_map<std::string, std::string> suggestion_templates = {
        {"memory_leak_potential", "Consider using smart pointers or RAII patterns"},
        {"inefficient_string_concatenation", "Use std::stringstream or std::string::reserve()"},
        {"naming_convention", "Follow camelCase for variables, PascalCase for classes"},
        {"unsafe_function_usage", "Use safer alternatives like strncpy, snprintf"},
        {"missing_const_correctness", "Add const qualifier where appropriate"},
        {"prefer_auto", "Use auto for type deduction to improve readability"}
    };
    
    auto it = suggestion_templates.find(rule.id);
    return (it != suggestion_templates.end()) ? it->second : "Review and improve this code";
}

double CodeAnalyzer::calculateOverallScore(const AnalysisResult& result) {
    double base_score = 100.0;
    
    // Deduct points for issues based on severity
    for (const auto& issue : result.issues) {
        switch (issue.severity) {
            case RuleSeverity::HIGH:
                base_score -= 10.0;
                break;
            case RuleSeverity::MEDIUM:
                base_score -= 5.0;
                break;
            case RuleSeverity::LOW:
                base_score -= 1.0;
                break;
        }
    }
    
    // Factor in complexity
    if (result.complexity.cyclomatic_complexity > 10) {
        base_score -= (result.complexity.cyclomatic_complexity - 10) * 2.0;
    }
    
    if (result.complexity.max_nesting_depth > 4) {
        base_score -= (result.complexity.max_nesting_depth - 4) * 3.0;
    }
    
    // Ensure score is between 0 and 100
    return std::max(0.0, std::min(100.0, base_score));
}

} // namespace cpp_analyzer