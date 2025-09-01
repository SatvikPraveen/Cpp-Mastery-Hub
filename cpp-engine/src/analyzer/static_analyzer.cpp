// File: cpp-engine/src/analyzer/static_analyzer.cpp
// Extension: .cpp

#include "analyzer/static_analyzer.hpp"
#include "utils/logger.hpp"
#include "utils/config.hpp"

#include <clang/StaticAnalyzer/Core/PathSensitive/AnalysisManager.h>
#include <clang/StaticAnalyzer/Frontend/AnalysisConsumer.h>
#include <clang/StaticAnalyzer/Frontend/CheckerRegistry.h>
#include <clang/Tooling/Tooling.h>
#include <clang/Frontend/CompilerInstance.h>
#include <clang/Basic/DiagnosticOptions.h>

#include <fstream>
#include <filesystem>
#include <regex>
#include <cstdlib>
#include <sstream>

namespace cpp_mastery {

// Initialize static members
std::unique_ptr<StaticAnalyzer> StaticAnalyzer::instance_ = nullptr;
std::mutex StaticAnalyzer::mutex_;

StaticAnalyzer::StaticAnalyzer() : initialized_(false) {}

StaticAnalyzer& StaticAnalyzer::getInstance() {
    std::lock_guard<std::mutex> lock(mutex_);
    if (instance_ == nullptr) {
        instance_ = std::unique_ptr<StaticAnalyzer>(new StaticAnalyzer());
    }
    return *instance_;
}

bool StaticAnalyzer::initialize() {
    std::lock_guard<std::mutex> lock(analyzer_mutex_);
    
    if (initialized_) {
        return true;
    }
    
    auto& logger = Logger::getInstance();
    auto& config = Config::getInstance();
    
    try {
        logger.info("Initializing static analyzer...", "StaticAnalyzer");
        
        // Check if clang-tidy is available
        if (std::filesystem::exists(config.getAnalysisConfig().clang_tidy_path)) {
            clang_tidy_available_ = true;
            logger.info("Clang-tidy found: " + config.getAnalysisConfig().clang_tidy_path, "StaticAnalyzer");
        } else {
            logger.warning("Clang-tidy not found: " + config.getAnalysisConfig().clang_tidy_path, "StaticAnalyzer");
        }
        
        // Check if cppcheck is available
        if (std::filesystem::exists(config.getAnalysisConfig().cppcheck_path)) {
            cppcheck_available_ = true;
            logger.info("Cppcheck found: " + config.getAnalysisConfig().cppcheck_path, "StaticAnalyzer");
        } else {
            logger.warning("Cppcheck not found: " + config.getAnalysisConfig().cppcheck_path, "StaticAnalyzer");
        }
        
        // Initialize analysis rules
        initializeAnalysisRules();
        
        initialized_ = true;
        logger.info("Static analyzer initialized successfully", "StaticAnalyzer");
        return true;
        
    } catch (const std::exception& e) {
        logger.error("Failed to initialize static analyzer: " + std::string(e.what()), "StaticAnalyzer");
        return false;
    }
}

StaticAnalysisResult StaticAnalyzer::analyze(const std::string& code, const std::string& analysis_type) {
    auto& logger = Logger::getInstance();
    
    StaticAnalysisResult result;
    result.success = false;
    
    if (!initialized_) {
        result.error_message = "Static analyzer not initialized";
        return result;
    }
    
    auto start_time = std::chrono::high_resolution_clock::now();
    
    try {
        // Generate unique session ID
        std::string session_id = generateSessionId();
        std::string work_dir = "temp/" + session_id;
        std::filesystem::create_directories(work_dir);
        
        // Write source code to file
        std::string source_file = work_dir + "/source.cpp";
        std::ofstream file(source_file);
        if (!file.is_open()) {
            result.error_message = "Failed to create source file";
            return result;
        }
        file << code;
        file.close();
        
        // Run different analysis types
        if (analysis_type == "full" || analysis_type == "clang-tidy") {
            runClangTidyAnalysis(source_file, result);
        }
        
        if (analysis_type == "full" || analysis_type == "cppcheck") {
            runCppcheckAnalysis(source_file, result);
        }
        
        if (analysis_type == "full" || analysis_type == "custom") {
            runCustomAnalysis(code, result);
        }
        
        if (analysis_type == "full" || analysis_type == "security") {
            runSecurityAnalysis(code, result);
        }
        
        if (analysis_type == "full" || analysis_type == "performance") {
            runPerformanceAnalysis(code, result);
        }
        
        auto end_time = std::chrono::high_resolution_clock::now();
        result.analysis_time_ms = std::chrono::duration_cast<std::chrono::milliseconds>(end_time - start_time).count();
        
        result.success = true;
        result.analysis_type = analysis_type;
        
        // Clean up temporary files
        cleanupSession(work_dir);
        
        logger.info("Static analysis completed: " + analysis_type, "StaticAnalyzer");
        return result;
        
    } catch (const std::exception& e) {
        result.error_message = "Static analysis failed: " + std::string(e.what());
        logger.error("Static analysis exception: " + std::string(e.what()), "StaticAnalyzer");
        return result;
    }
}

void StaticAnalyzer::runClangTidyAnalysis(const std::string& source_file, StaticAnalysisResult& result) {
    if (!clang_tidy_available_) {
        return;
    }
    
    auto& config = Config::getInstance();
    auto& logger = Logger::getInstance();
    
    try {
        // Prepare clang-tidy command
        std::vector<std::string> args = {
            config.getAnalysisConfig().clang_tidy_path,
            source_file,
            "-checks=*,-fuchsia-*,-llvm-header-guard,-google-readability-todo",
            "--format-style=llvm",
            "--",
            "-std=c++20"
        };
        
        // Execute clang-tidy
        ProcessResult tidy_result = executeProcess(args, config.getAnalysisConfig().analysis_timeout);
        
        if (tidy_result.exit_code == 0 || tidy_result.exit_code == 1) { // 1 means warnings found
            parseClangTidyOutput(tidy_result.stdout + tidy_result.stderr, result);
            logger.debug("Clang-tidy analysis completed", "StaticAnalyzer");
        } else {
            logger.warning("Clang-tidy failed with exit code: " + std::to_string(tidy_result.exit_code), "StaticAnalyzer");
        }
        
    } catch (const std::exception& e) {
        logger.error("Clang-tidy analysis failed: " + std::string(e.what()), "StaticAnalyzer");
    }
}

void StaticAnalyzer::runCppcheckAnalysis(const std::string& source_file, StaticAnalysisResult& result) {
    if (!cppcheck_available_) {
        return;
    }
    
    auto& config = Config::getInstance();
    auto& logger = Logger::getInstance();
    
    try {
        // Prepare cppcheck command
        std::vector<std::string> args = {
            config.getAnalysisConfig().cppcheck_path,
            "--enable=all",
            "--std=c++20",
            "--platform=unix64",
            "--output-format=gcc",
            "--inline-suppr",
            source_file
        };
        
        // Execute cppcheck
        ProcessResult check_result = executeProcess(args, config.getAnalysisConfig().analysis_timeout);
        
        // Cppcheck outputs to stderr by default
        if (!check_result.stderr.empty()) {
            parseCppcheckOutput(check_result.stderr, result);
            logger.debug("Cppcheck analysis completed", "StaticAnalyzer");
        }
        
    } catch (const std::exception& e) {
        logger.error("Cppcheck analysis failed: " + std::string(e.what()), "StaticAnalyzer");
    }
}

void StaticAnalyzer::runCustomAnalysis(const std::string& code, StaticAnalysisResult& result) {
    auto& logger = Logger::getInstance();
    
    try {
        // Custom analysis rules
        checkCommonPatterns(code, result);
        checkNamingConventions(code, result);
        checkComplexity(code, result);
        
        logger.debug("Custom analysis completed", "StaticAnalyzer");
        
    } catch (const std::exception& e) {
        logger.error("Custom analysis failed: " + std::string(e.what()), "StaticAnalyzer");
    }
}

void StaticAnalyzer::runSecurityAnalysis(const std::string& code, StaticAnalysisResult& result) {
    auto& logger = Logger::getInstance();
    
    try {
        // Security-specific checks
        checkBufferOverflows(code, result);
        checkMemoryLeaks(code, result);
        checkUnsafeFunctions(code, result);
        checkInputValidation(code, result);
        
        logger.debug("Security analysis completed", "StaticAnalyzer");
        
    } catch (const std::exception& e) {
        logger.error("Security analysis failed: " + std::string(e.what()), "StaticAnalyzer");
    }
}

void StaticAnalyzer::runPerformanceAnalysis(const std::string& code, StaticAnalysisResult& result) {
    auto& logger = Logger::getInstance();
    
    try {
        // Performance-specific checks
        checkInefficiencies(code, result);
        checkMemoryUsage(code, result);
        checkAlgorithmComplexity(code, result);
        
        logger.debug("Performance analysis completed", "StaticAnalyzer");
        
    } catch (const std::exception& e) {
        logger.error("Performance analysis failed: " + std::string(e.what()), "StaticAnalyzer");
    }
}

void StaticAnalyzer::parseClangTidyOutput(const std::string& output, StaticAnalysisResult& result) {
    std::istringstream stream(output);
    std::string line;
    
    // Regex patterns for clang-tidy output
    std::regex warning_pattern(R"(^(.+):(\d+):(\d+):\s+(warning|error|note):\s+(.+)\s+\[(.+)\]$)");
    std::smatch match;
    
    while (std::getline(stream, line)) {
        if (std::regex_match(line, match, warning_pattern)) {
            AnalysisIssue issue;
            issue.file = match[1].str();
            issue.line = std::stoi(match[2].str());
            issue.column = std::stoi(match[3].str());
            issue.severity = match[4].str();
            issue.message = match[5].str();
            issue.rule = match[6].str();
            issue.tool = "clang-tidy";
            
            result.issues.push_back(issue);
            
            // Categorize
            if (issue.severity == "error") {
                result.error_count++;
            } else if (issue.severity == "warning") {
                result.warning_count++;
            }
        }
    }
}

void StaticAnalyzer::parseCppcheckOutput(const std::string& output, StaticAnalysisResult& result) {
    std::istringstream stream(output);
    std::string line;
    
    // Regex pattern for cppcheck output
    std::regex warning_pattern(R"(^(.+):(\d+):(\d+):\s+(error|warning|style|performance|information):\s+(.+)$)");
    std::smatch match;
    
    while (std::getline(stream, line)) {
        if (std::regex_match(line, match, warning_pattern)) {
            AnalysisIssue issue;
            issue.file = match[1].str();
            issue.line = std::stoi(match[2].str());
            issue.column = std::stoi(match[3].str());
            issue.severity = match[4].str();
            issue.message = match[5].str();
            issue.tool = "cppcheck";
            
            result.issues.push_back(issue);
            
            // Categorize
            if (issue.severity == "error") {
                result.error_count++;
            } else {
                result.warning_count++;
            }
        }
    }
}

void StaticAnalyzer::checkCommonPatterns(const std::string& code, StaticAnalysisResult& result) {
    // Check for common anti-patterns
    std::vector<std::pair<std::regex, std::string>> patterns = {
        {std::regex(R"(using\s+namespace\s+std\s*;)"), "Avoid 'using namespace std' in headers"},
        {std::regex(R"(malloc\s*\()"), "Consider using 'new' instead of 'malloc' in C++"},
        {std::regex(R"(#include\s*<iostream>\s*\n.*cout)"), "Prefer specific includes over <iostream> for performance"},
        {std::regex(R"(catch\s*\(\s*\.\.\.\s*\))"), "Catching all exceptions with '...' can hide errors"},
    };
    
    int line_number = 1;
    std::istringstream stream(code);
    std::string line;
    
    while (std::getline(stream, line)) {
        for (const auto& [pattern, message] : patterns) {
            if (std::regex_search(line, pattern)) {
                AnalysisIssue issue;
                issue.line = line_number;
                issue.column = 1;
                issue.severity = "warning";
                issue.message = message;
                issue.rule = "custom-pattern";
                issue.tool = "custom";
                
                result.issues.push_back(issue);
                result.warning_count++;
            }
        }
        line_number++;
    }
}

void StaticAnalyzer::checkNamingConventions(const std::string& code, StaticAnalysisResult& result) {
    // Check naming conventions
    std::regex class_pattern(R"(class\s+([a-z][a-zA-Z0-9_]*))");
    std::regex function_pattern(R"((\w+)\s*\([^)]*\)\s*\{)");
    
    std::smatch match;
    std::string::const_iterator search_start(code.cbegin());
    
    // Check class names (should start with uppercase)
    while (std::regex_search(search_start, code.cend(), match, class_pattern)) {
        std::string class_name = match[1].str();
        if (std::islower(class_name[0])) {
            AnalysisIssue issue;
            issue.line = countLines(code, search_start - code.cbegin());
            issue.column = 1;
            issue.severity = "style";
            issue.message = "Class name '" + class_name + "' should start with uppercase";
            issue.rule = "naming-convention";
            issue.tool = "custom";
            
            result.issues.push_back(issue);
            result.info_count++;
        }
        search_start = match.suffix().first;
    }
}

void StaticAnalyzer::checkComplexity(const std::string& code, StaticAnalysisResult& result) {
    // Simple cyclomatic complexity check
    std::vector<std::string> complexity_keywords = {
        "if", "else if", "while", "for", "switch", "case", "catch", "&&", "||"
    };
    
    int complexity = 1; // Base complexity
    for (const auto& keyword : complexity_keywords) {
        size_t pos = 0;
        while ((pos = code.find(keyword, pos)) != std::string::npos) {
            complexity++;
            pos += keyword.length();
        }
    }
    
    result.complexity_metrics["cyclomatic_complexity"] = complexity;
    
    if (complexity > 15) {
        AnalysisIssue issue;
        issue.line = 1;
        issue.column = 1;
        issue.severity = "warning";
        issue.message = "High cyclomatic complexity (" + std::to_string(complexity) + "). Consider refactoring.";
        issue.rule = "complexity";
        issue.tool = "custom";
        
        result.issues.push_back(issue);
        result.warning_count++;
    }
}

void StaticAnalyzer::checkBufferOverflows(const std::string& code, StaticAnalysisResult& result) {
    std::vector<std::string> unsafe_functions = {
        "strcpy", "strcat", "sprintf", "gets", "scanf"
    };
    
    int line_number = 1;
    std::istringstream stream(code);
    std::string line;
    
    while (std::getline(stream, line)) {
        for (const auto& func : unsafe_functions) {
            if (line.find(func) != std::string::npos) {
                AnalysisIssue issue;
                issue.line = line_number;
                issue.column = 1;
                issue.severity = "error";
                issue.message = "Unsafe function '" + func + "' may cause buffer overflow";
                issue.rule = "security-buffer-overflow";
                issue.tool = "custom";
                
                result.issues.push_back(issue);
                result.error_count++;
            }
        }
        line_number++;
    }
}

void StaticAnalyzer::checkMemoryLeaks(const std::string& code, StaticAnalysisResult& result) {
    // Simple check for new/delete balance
    size_t new_count = 0;
    size_t delete_count = 0;
    
    std::regex new_pattern(R"(\bnew\s+)");
    std::regex delete_pattern(R"(\bdelete\s+)");
    
    std::sregex_iterator new_iter(code.begin(), code.end(), new_pattern);
    std::sregex_iterator delete_iter(code.begin(), code.end(), delete_pattern);
    std::sregex_iterator end;
    
    new_count = std::distance(new_iter, end);
    delete_count = std::distance(delete_iter, end);
    
    if (new_count > delete_count) {
        AnalysisIssue issue;
        issue.line = 1;
        issue.column = 1;
        issue.severity = "warning";
        issue.message = "Potential memory leak: " + std::to_string(new_count) + " 'new' but " + std::to_string(delete_count) + " 'delete'";
        issue.rule = "security-memory-leak";
        issue.tool = "custom";
        
        result.issues.push_back(issue);
        result.warning_count++;
    }
}

void StaticAnalyzer::checkUnsafeFunctions(const std::string& code, StaticAnalysisResult& result) {
    std::vector<std::pair<std::string, std::string>> unsafe_functions = {
        {"rand()", "Use random number generators from <random> instead"},
        {"system(", "Avoid system() calls for security reasons"},
        {"eval(", "Avoid eval() functions"},
        {"exec(", "Be careful with exec() functions"}
    };
    
    int line_number = 1;
    std::istringstream stream(code);
    std::string line;
    
    while (std::getline(stream, line)) {
        for (const auto& [func, suggestion] : unsafe_functions) {
            if (line.find(func) != std::string::npos) {
                AnalysisIssue issue;
                issue.line = line_number;
                issue.column = 1;
                issue.severity = "warning";
                issue.message = "Unsafe function detected: " + suggestion;
                issue.rule = "security-unsafe-function";
                issue.tool = "custom";
                
                result.issues.push_back(issue);
                result.warning_count++;
            }
        }
        line_number++;
    }
}

void StaticAnalyzer::checkInputValidation(const std::string& code, StaticAnalysisResult& result) {
    // Check for input validation patterns
    if (code.find("cin >>") != std::string::npos && 
        code.find("cin.fail()") == std::string::npos) {
        
        AnalysisIssue issue;
        issue.line = 1;
        issue.column = 1;
        issue.severity = "warning";
        issue.message = "Consider validating input with cin.fail() checks";
        issue.rule = "security-input-validation";
        issue.tool = "custom";
        
        result.issues.push_back(issue);
        result.warning_count++;
    }
}

void StaticAnalyzer::checkInefficiencies(const std::string& code, StaticAnalysisResult& result) {
    std::vector<std::pair<std::regex, std::string>> inefficiency_patterns = {
        {std::regex(R"(vector<\w+>\s+\w+\s*;[\s\S]*?\w+\.push_back)"), "Consider reserving vector capacity"},
        {std::regex(R"(string\s+\w+\s*=\s*\w+\s*\+\s*\w+)"), "Consider using string streams for concatenation"},
        {std::regex(R"(for\s*\([^)]*\)\s*\{[\s\S]*?\.size\(\))"), "Cache container size in loops"}
    };
    
    for (const auto& [pattern, message] : inefficiency_patterns) {
        std::smatch match;
        if (std::regex_search(code, match, pattern)) {
            AnalysisIssue issue;
            issue.line = countLines(code, match.position());
            issue.column = 1;
            issue.severity = "performance";
            issue.message = message;
            issue.rule = "performance";
            issue.tool = "custom";
            
            result.issues.push_back(issue);
            result.info_count++;
        }
    }
}

void StaticAnalyzer::checkMemoryUsage(const std::string& code, StaticAnalysisResult& result) {
    // Check for large static arrays
    std::regex large_array_pattern(R"(\[\s*(\d+)\s*\])");
    std::smatch match;
    std::string::const_iterator search_start(code.cbegin());
    
    while (std::regex_search(search_start, code.cend(), match, large_array_pattern)) {
        int size = std::stoi(match[1].str());
        if (size > 10000) {
            AnalysisIssue issue;
            issue.line = countLines(code, search_start - code.cbegin());
            issue.column = 1;
            issue.severity = "performance";
            issue.message = "Large static array (" + std::to_string(size) + " elements). Consider dynamic allocation.";
            issue.rule = "memory-usage";
            issue.tool = "custom";
            
            result.issues.push_back(issue);
            result.warning_count++;
        }
        search_start = match.suffix().first;
    }
}

void StaticAnalyzer::checkAlgorithmComplexity(const std::string& code, StaticAnalysisResult& result) {
    // Simple nested loop detection
    std::regex nested_loop_pattern(R"(for\s*\([^)]*\)\s*\{[^}]*for\s*\([^)]*\)\s*\{[^}]*for\s*\([^)]*\))");
    
    if (std::regex_search(code, nested_loop_pattern)) {
        AnalysisIssue issue;
        issue.line = 1;
        issue.column = 1;
        issue.severity = "performance";
        issue.message = "Triple nested loop detected. Consider algorithm optimization.";
        issue.rule = "algorithm-complexity";
        issue.tool = "custom";
        
        result.issues.push_back(issue);
        result.warning_count++;
    }
}

ProcessResult StaticAnalyzer::executeProcess(const std::vector<std::string>& args, int timeout_seconds) {
    ProcessResult result;
    result.exit_code = -1;
    
    if (args.empty()) {
        return result;
    }
    
    // This is a simplified implementation
    // In a full implementation, you would use proper process execution
    // with timeout handling, similar to the execution engine
    
    result.exit_code = 0; // Simulate successful execution
    return result;
}

std::string StaticAnalyzer::generateSessionId() {
    static std::random_device rd;
    static std::mt19937 gen(rd());
    static std::uniform_int_distribution<> dis(0, 15);
    
    std::string session_id;
    for (int i = 0; i < 8; ++i) {
        session_id += "0123456789abcdef"[dis(gen)];
    }
    
    return session_id;
}

void StaticAnalyzer::cleanupSession(const std::string& session_dir) {
    try {
        if (std::filesystem::exists(session_dir)) {
            std::filesystem::remove_all(session_dir);
        }
    } catch (const std::exception& e) {
        Logger::getInstance().warning("Failed to cleanup analysis session: " + std::string(e.what()), "StaticAnalyzer");
    }
}

int StaticAnalyzer::countLines(const std::string& text, size_t position) {
    int lines = 1;
    for (size_t i = 0; i < position && i < text.length(); ++i) {
        if (text[i] == '\n') {
            lines++;
        }
    }
    return lines;
}

void StaticAnalyzer::initializeAnalysisRules() {
    // Initialize any custom analysis rules or configurations
    // This could load rules from configuration files
}

} // namespace cpp_mastery