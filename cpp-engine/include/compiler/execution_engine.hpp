// File: cpp-engine/include/compiler/execution_engine.hpp
// Extension: .hpp

#pragma once

#include <string>
#include <vector>
#include <memory>
#include <mutex>
#include <nlohmann/json.hpp>

namespace cpp_mastery {

/**
 * @brief Result of code compilation
 */
struct CompilationResult {
    bool success = false;
    std::string executable_path;
    long compilation_time_ms = 0;
    std::vector<std::string> warnings;
    std::vector<std::string> errors;
    std::string compiler_output;
};

/**
 * @brief Result of code execution
 */
struct ExecutionResult {
    bool success = false;
    int exit_code = 0;
    std::string stdout;
    std::string stderr;
    long execution_time_ms = 0;
    long memory_usage_kb = 0;
    long cpu_time_ms = 0;
    std::string error_message;
};

/**
 * @brief Process execution result
 */
struct ProcessResult {
    int exit_code = -1;
    std::string stdout;
    std::string stderr;
    long memory_usage_kb = 0;
    long cpu_time_ms = 0;
};

/**
 * @brief Singleton execution engine for C++ code compilation and execution
 * 
 * Provides secure compilation and execution of C++ code with support for:
 * - Multiple compilers (GCC, Clang)
 * - Sandboxed execution using Docker
 * - Resource limiting (memory, CPU, time)
 * - Comprehensive error reporting
 */
class ExecutionEngine {
public:
    /**
     * @brief Get the singleton instance of the execution engine
     * 
     * @return ExecutionEngine& Reference to the execution engine instance
     */
    static ExecutionEngine& getInstance();
    
    // Delete copy constructor and assignment operator
    ExecutionEngine(const ExecutionEngine&) = delete;
    ExecutionEngine& operator=(const ExecutionEngine&) = delete;
    
    /**
     * @brief Initialize the execution engine
     * 
     * Sets up compilers, validates environment, and prepares sandbox.
     * 
     * @return true if initialization successful
     * @return false if initialization failed
     */
    bool initialize();
    
    /**
     * @brief Check if execution engine is initialized
     * 
     * @return true if initialized
     * @return false if not initialized
     */
    bool isInitialized() const { return initialized_; }
    
    /**
     * @brief Compile C++ source code
     * 
     * @param code C++ source code to compile
     * @param options Compilation options (compiler, flags, optimization, etc.)
     * @return CompilationResult Result of compilation including errors and warnings
     */
    CompilationResult compile(const std::string& code, const nlohmann::json& options = nlohmann::json{});
    
    /**
     * @brief Execute C++ code (compile and run)
     * 
     * @param code C++ source code to execute
     * @param input Standard input for the program
     * @param options Execution options (compiler, flags, limits, etc.)
     * @return ExecutionResult Result of execution including output and metrics
     */
    ExecutionResult execute(const std::string& code, const std::string& input = "", const nlohmann::json& options = nlohmann::json{});

private:
    /**
     * @brief Private constructor for singleton pattern
     */
    ExecutionEngine();
    
    /**
     * @brief Create necessary directories for operation
     */
    void createDirectories();
    
    /**
     * @brief Validate that required compilers are available
     * 
     * @return true if compilers are available
     * @return false if compilers are missing
     */
    bool validateCompilers();
    
    /**
     * @brief Initialize Docker sandbox environment
     * 
     * @return true if Docker is available and configured
     * @return false if Docker setup failed
     */
    bool initializeDocker();
    
    /**
     * @brief Test compilation with a simple program
     * 
     * @return true if test compilation successful
     * @return false if test compilation failed
     */
    bool testCompilation();
    
    /**
     * @brief Generate unique session ID for temporary files
     * 
     * @return std::string Unique session identifier
     */
    std::string generateSessionId();
    
    /**
     * @brief Build compilation command with specified options
     * 
     * @param source_file Path to source file
     * @param output_file Path to output executable
     * @param compiler Compiler to use (g++, clang++)
     * @param standard C++ standard (c++11, c++14, c++17, c++20, etc.)
     * @param optimization Optimization level (O0, O1, O2, O3, Os)
     * @param debug_info Include debug information
     * @param extra_flags Additional compiler flags
     * @return std::vector<std::string> Command line arguments
     */
    std::vector<std::string> buildCompileCommand(
        const std::string& source_file,
        const std::string& output_file,
        const std::string& compiler,
        const std::string& standard,
        const std::string& optimization,
        bool debug_info,
        const std::vector<std::string>& extra_flags
    );
    
    /**
     * @brief Execute a process with timeout and capture output
     * 
     * @param args Command line arguments
     * @param timeout_seconds Maximum execution time in seconds
     * @return ProcessResult Result of process execution
     */
    ProcessResult executeProcess(const std::vector<std::string>& args, int timeout_seconds);
    
    /**
     * @brief Execute program in Docker sandbox
     * 
     * @param executable_path Path to compiled executable
     * @param input Standard input for the program
     * @param options Execution options
     * @return ProcessResult Result of sandboxed execution
     */
    ProcessResult executeInSandbox(const std::string& executable_path, const std::string& input, const nlohmann::json& options);
    
    /**
     * @brief Execute program directly (without sandbox)
     * 
     * @param executable_path Path to compiled executable
     * @param input Standard input for the program
     * @param options Execution options
     * @return ProcessResult Result of direct execution
     */
    ProcessResult executeDirectly(const std::string& executable_path, const std::string& input, const nlohmann::json& options);
    
    /**
     * @brief Parse compiler output for warnings and errors
     * 
     * @param compiler_output Raw compiler output
     * @param warnings Vector to store parsed warnings
     * @param errors Vector to store parsed errors
     */
    void parseCompilerMessages(const std::string& compiler_output, std::vector<std::string>& warnings, std::vector<std::string>& errors);
    
    /**
     * @brief Clean up temporary files for a session
     * 
     * @param session_dir Session directory to clean up
     */
    void cleanupSession(const std::string& session_dir);
    
    // Static members for singleton pattern
    static std::unique_ptr<ExecutionEngine> instance_;
    static std::mutex mutex_;
    
    // Initialization state
    bool initialized_;
    
    // Thread safety
    mutable std::mutex engine_mutex_;
};

} // namespace cpp_mastery