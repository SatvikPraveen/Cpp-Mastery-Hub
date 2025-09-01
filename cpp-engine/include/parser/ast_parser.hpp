// File: cpp-engine/include/parser/ast_parser.hpp
// Extension: .hpp

#pragma once

#include <string>
#include <vector>
#include <memory>
#include <mutex>
#include <random>
#include <chrono>
#include <nlohmann/json.hpp>

namespace cpp_mastery {

/**
 * @brief Result of AST parsing operation
 */
struct ParseResult {
    bool success = false;
    nlohmann::json ast_json;
    nlohmann::json tokens;
    long parse_time_ms = 0;
    std::string error_message;
};

/**
 * @brief Singleton AST parser using Clang/LLVM
 * 
 * Provides comprehensive C++ code parsing capabilities including:
 * - Abstract Syntax Tree (AST) generation
 * - Token extraction and analysis
 * - Syntax validation
 * - Code structure analysis
 */
class ASTParser {
public:
    /**
     * @brief Get the singleton instance of the AST parser
     * 
     * @return ASTParser& Reference to the AST parser instance
     */
    static ASTParser& getInstance();
    
    // Delete copy constructor and assignment operator
    ASTParser(const ASTParser&) = delete;
    ASTParser& operator=(const ASTParser&) = delete;
    
    /**
     * @brief Initialize the AST parser
     * 
     * Sets up Clang/LLVM components and validates availability.
     * 
     * @return true if initialization successful
     * @return false if initialization failed
     */
    bool initialize();
    
    /**
     * @brief Check if AST parser is initialized
     * 
     * @return true if initialized
     * @return false if not initialized
     */
    bool isInitialized() const { return initialized_; }
    
    /**
     * @brief Parse C++ source code into AST
     * 
     * @param code C++ source code to parse
     * @param include_tokens Whether to include token information
     * @return ParseResult Result containing AST JSON and metadata
     */
    ParseResult parse(const std::string& code, bool include_tokens = false);
    
    /**
     * @brief Validate C++ syntax without full parsing
     * 
     * @param code C++ source code to validate
     * @return true if syntax is valid
     * @return false if syntax errors found
     */
    bool validateSyntax(const std::string& code);
    
    /**
     * @brief Generate statistics from parsed AST
     * 
     * @param ast AST JSON data
     * @return nlohmann::json Statistics including complexity metrics
     */
    static nlohmann::json getASTStatistics(const nlohmann::json& ast);

private:
    /**
     * @brief Private constructor for singleton pattern
     */
    ASTParser();
    
    /**
     * @brief Generate tokens from source code
     * 
     * @param code Source code to tokenize
     * @return nlohmann::json Array of tokens with positions
     */
    nlohmann::json generateTokens(const std::string& code);
    
    /**
     * @brief Generate unique session ID for temporary files
     * 
     * @return std::string Unique session identifier
     */
    std::string generateSessionId();
    
    // Static members for singleton pattern
    static std::unique_ptr<ASTParser> instance_;
    static std::mutex mutex_;
    
    // Initialization state
    bool initialized_;
    
    // Thread safety
    mutable std::mutex parser_mutex_;
};

} // namespace cpp_mastery