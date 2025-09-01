// File: cpp-engine/include/analyzer/static_analyzer.hpp
// Extension: .hpp

#pragma once

#include <string>
#include <vector>
#include <memory>
#include <mutex>
#include <unordered_map>
#include <nlohmann/json.hpp>

namespace cpp_mastery {

/**
 * @brief Analysis issue found by static analyzer
 */
struct AnalysisIssue {
    std::string file;
    int line = 0;
    int column = 0;
    std::string severity;     // error, warning, info, style, performance
    std::string message;
    std::string rule;
    std::string tool;         // clang-tidy, cppcheck, custom
    nlohmann::json metadata;
};

/**
 * @brief Process execution result for external tools
 */
struct ProcessResult {
    int exit_code = -1;
    std::string stdout;
    std::string stderr;
};

/**
 * @brief Result of static analysis operation
 */
struct StaticAnalysisResult {
    bool success = false;
    std::string analysis_type;
    std::vector<AnalysisIssue> issues;
    std::unordered_map<std::string, int> complexity_metrics;
    long analysis_time_ms = 0;
    int error_count = 0;
    int warning_count = 0;
    int info_count = 0;
    std::string error_message;
    nlohmann::json metadata;
};

/**
 * @brief Singleton static analyzer for C++ code
 * 
 * Provides comprehensive static analysis capabilities including:
 * - Clang-Tidy integration for modern C++ best practices
 * - Cppcheck integration for additional bug detection
 * - Custom analysis rules for specific patterns
 * - Security vulnerability detection
 * - Performance analysis and optimization suggestions
 * - Code complexity metrics
 */
class StaticAnalyzer {
public:
    /**
     * @brief Get the singleton instance of the static analyzer
     * 
     * @return StaticAnalyzer& Reference to the static analyzer instance
     */
    static StaticAnalyzer& getInstance();
    
    // Delete copy constructor and assignment operator
    StaticAnalyzer(const StaticAnalyzer&) = delete;
    StaticAnalyzer& operator=(const StaticAnalyzer&) = delete;
    
    /**
     * @brief Initialize the static analyzer
     * 
     * Sets up external tools, validates availability, and loads analysis rules.
     * 
     * @return true if initialization successful
     * @return false if initialization failed
     */
    bool initialize();
    
    /**
     * @brief Check if static analyzer is initialized
     * 
     * @return true if initialized
     * @return false if not initialized
     */
    bool isInitialized() const { return initialized_; }
    
    /**
     * @brief Perform static analysis on C++ source code
     * 
     * @param code C++ source code to analyze
     * @param analysis_type Type of analysis (full, clang-tidy, cppcheck, custom, security, performance)
     * @return StaticAnalysisResult Result containing all found issues and metrics
     */
    StaticAnalysisResult analyze(const std::string& code, const std::string& analysis_type = "full");

private:
    /**
     * @brief Private constructor for singleton pattern
     */
    StaticAnalyzer();
    
    /**
     * @brief Initialize analysis rules and configurations
     */
    void initializeAnalysisRules();
    
    /**
     * @brief Run Clang-Tidy analysis
     * 
     * @param source_file Path to source file
     * @param result Result object to populate
     */
    void runClangTidyAnalysis(const std::string& source_file, StaticAnalysisResult& result);
    
    /**
     * @brief Run Cppcheck analysis
     * 
     * @param source_file Path to source file
     * @param result Result object to populate
     */
    void runCppcheckAnalysis(const std::string& source_file, StaticAnalysisResult& result);
    
    /**
     * @brief Run custom analysis rules
     * 
     * @param code Source code
     * @param result Result object to populate
     */
    void runCustomAnalysis(const std::string& code, StaticAnalysisResult& result);
    
    /**
     * @brief Run security-focused analysis
     * 
     * @param code Source code
     * @param result Result object to populate
     */
    void runSecurityAnalysis(const std::string& code, StaticAnalysisResult& result);
    
    /**
     * @brief Run performance-focused analysis
     * 
     * @param code Source code
     * @param result Result object to populate
     */
    void runPerformanceAnalysis(const std::string& code, StaticAnalysisResult& result);
    
    /**
     * @brief Parse Clang-Tidy output and extract issues
     * 
     * @param output Raw Clang-Tidy output
     * @param result Result object to populate
     */
    void parseClangTidyOutput(const std::string& output, StaticAnalysisResult& result);
    
    /**
     * @brief Parse Cppcheck output and extract issues
     * 
     * @param output Raw Cppcheck output
     * @param result Result object to populate
     */
    void parseCppcheckOutput(const std::string& output, StaticAnalysisResult& result);
    
    /**
     * @brief Check for common anti-patterns and code smells
     * 
     * @param code Source code
     * @param result Result object to populate
     */
    void checkCommonPatterns(const std::string& code, StaticAnalysisResult& result);
    
    /**
     * @brief Check naming conventions
     * 
     * @param code Source code
     * @param result Result object to populate
     */
    void checkNamingConventions(const std::string& code, StaticAnalysisResult& result);
    
    /**
     * @brief Check code complexity metrics
     * 
     * @param code Source code
     * @param result Result object to populate
     */
    void checkComplexity(const std::string& code, StaticAnalysisResult& result);
    
    /**
     * @brief Check for potential buffer overflow vulnerabilities
     * 
     * @param code Source code
     * @param result Result object to populate
     */
    void checkBufferOverflows(const std::string& code, StaticAnalysisResult& result);
    
    /**
     * @brief Check for potential memory leaks
     * 
     * @param code Source code
     * @param result Result object to populate
     */
    void checkMemoryLeaks(const std::string& code, StaticAnalysisResult& result);
    
    /**
     * @brief Check for usage of unsafe functions
     * 
     * @param code Source code
     * @param result Result object to populate
     */
    void checkUnsafeFunctions(const std::string& code, StaticAnalysisResult& result);
    
    /**
     * @brief Check for proper input validation
     * 
     * @param code Source code
     * @param result Result object to populate
     */
    void checkInputValidation(const std::string& code, StaticAnalysisResult& result);
    
    /**
     * @brief Check for performance inefficiencies
     * 
     * @param code Source code
     * @param result Result object to populate
     */
    void checkInefficiencies(const std::string& code, StaticAnalysisResult& result);
    
    /**
     * @brief Check memory usage patterns
     * 
     * @param code Source code
     * @param result Result object to populate
     */
    void checkMemoryUsage(const std::string& code, StaticAnalysisResult& result);
    
    /**
     * @brief Check algorithm complexity
     * 
     * @param code Source code
     * @param result Result object to populate
     */
    void checkAlgorithmComplexity(const std::string& code, StaticAnalysisResult& result);
    
    /**
     * @brief Execute external process with timeout
     * 
     * @param args Command line arguments
     * @param timeout_seconds Maximum execution time
     * @return ProcessResult Result of process execution
     */
    ProcessResult executeProcess(const std::vector<std::string>& args, int timeout_seconds);
    
    /**
     * @brief Generate unique session ID
     * 
     * @return std::string Unique session identifier
     */
    std::string generateSessionId();
    
    /**
     * @brief Clean up temporary files for a session
     * 
     * @param session_dir Session directory to clean up
     */
    void cleanupSession(const std::string& session_dir);
    
    /**
     * @brief Count line number at given position in text
     * 
     * @param text Source text
     * @param position Character position
     * @return int Line number (1-based)
     */
    int countLines(const std::string& text, size_t position);
    
    // Static members for singleton pattern
    static std::unique_ptr<StaticAnalyzer> instance_;
    static std::mutex mutex_;
    
    // Initialization state
    bool initialized_;
    bool clang_tidy_available_ = false;
    bool cppcheck_available_ = false;
    
    // Thread safety
    mutable std::mutex analyzer_mutex_;
};

} // namespace cpp_mastery