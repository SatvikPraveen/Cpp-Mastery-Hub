// File: cpp-engine/src/compiler/execution_engine.cpp
// Extension: .cpp

#include "compiler/execution_engine.hpp"
#include "utils/logger.hpp"
#include "utils/config.hpp"
#include <filesystem>
#include <fstream>
#include <sstream>
#include <chrono>
#include <random>
#include <regex>
#include <cstdlib>
#include <sys/wait.h>
#include <sys/resource.h>
#include <unistd.h>
#include <signal.h>

namespace cpp_mastery {

// Initialize static members
std::unique_ptr<ExecutionEngine> ExecutionEngine::instance_ = nullptr;
std::mutex ExecutionEngine::mutex_;

ExecutionEngine::ExecutionEngine() 
    : initialized_(false) {
}

ExecutionEngine& ExecutionEngine::getInstance() {
    std::lock_guard<std::mutex> lock(mutex_);
    if (instance_ == nullptr) {
        instance_ = std::unique_ptr<ExecutionEngine>(new ExecutionEngine());
    }
    return *instance_;
}

bool ExecutionEngine::initialize() {
    std::lock_guard<std::mutex> lock(engine_mutex_);
    
    if (initialized_) {
        return true;
    }
    
    auto& logger = Logger::getInstance();
    auto& config = Config::getInstance();
    
    try {
        logger.info("Initializing execution engine...", "ExecutionEngine");
        
        // Create necessary directories
        createDirectories();
        
        // Validate compiler availability
        if (!validateCompilers()) {
            logger.error("Compiler validation failed", "ExecutionEngine");
            return false;
        }
        
        // Initialize Docker if sandbox is enabled
        if (config.getExecutionConfig().sandbox_enabled) {
            if (!initializeDocker()) {
                logger.warning("Docker initialization failed, disabling sandbox", "ExecutionEngine");
                // Continue without sandbox for development
            }
        }
        
        // Test compilation with a simple program
        if (!testCompilation()) {
            logger.error("Test compilation failed", "ExecutionEngine");
            return false;
        }
        
        initialized_ = true;
        logger.info("Execution engine initialized successfully", "ExecutionEngine");
        return true;
        
    } catch (const std::exception& e) {
        logger.error("Failed to initialize execution engine: " + std::string(e.what()), "ExecutionEngine");
        return false;
    }
}

CompilationResult ExecutionEngine::compile(const std::string& code, const nlohmann::json& options) {
    auto& logger = Logger::getInstance();
    auto& config = Config::getInstance();
    
    CompilationResult result;
    result.success = false;
    
    auto start_time = std::chrono::high_resolution_clock::now();
    
    try {
        // Generate unique session ID
        std::string session_id = generateSessionId();
        std::string work_dir = "temp/" + session_id;
        
        // Create working directory
        std::filesystem::create_directories(work_dir);
        
        // Write source code to file
        std::string source_file = work_dir + "/main.cpp";
        std::ofstream file(source_file);
        if (!file.is_open()) {
            result.errors.push_back("Failed to create source file");
            return result;
        }
        file << code;
        file.close();
        
        // Parse compilation options
        std::string compiler = options.value("compiler", config.getCompilerConfig().default_compiler);
        std::string standard = options.value("standard", config.getCompilerConfig().cpp_standard);
        std::string optimization = options.value("optimization", config.getCompilerConfig().optimization_level);
        bool debug_info = options.value("debug", false);
        std::vector<std::string> extra_flags;
        
        if (options.contains("flags") && options["flags"].is_array()) {
            for (const auto& flag : options["flags"]) {
                extra_flags.push_back(flag.get<std::string>());
            }
        }
        
        // Build compilation command
        std::vector<std::string> compile_args = buildCompileCommand(
            source_file, work_dir + "/main", compiler, standard, optimization, debug_info, extra_flags
        );
        
        // Execute compilation
        ProcessResult compile_result = executeProcess(compile_args, config.getCompilerConfig().compilation_timeout);
        
        auto end_time = std::chrono::high_resolution_clock::now();
        result.compilation_time_ms = std::chrono::duration_cast<std::chrono::milliseconds>(end_time - start_time).count();
        
        result.compiler_output = compile_result.stderr + compile_result.stdout;
        
        if (compile_result.exit_code == 0) {
            result.success = true;
            result.executable_path = work_dir + "/main";
            
            // Parse warnings from compiler output
            parseCompilerMessages(result.compiler_output, result.warnings, result.errors);
            
            logger.info("Compilation successful for session: " + session_id, "ExecutionEngine");
        } else {
            result.success = false;
            parseCompilerMessages(result.compiler_output, result.warnings, result.errors);
            
            logger.info("Compilation failed for session: " + session_id, "ExecutionEngine");
        }
        
        return result;
        
    } catch (const std::exception& e) {
        result.errors.push_back("Internal compilation error: " + std::string(e.what()));
        logger.error("Compilation exception: " + std::string(e.what()), "ExecutionEngine");
        return result;
    }
}

ExecutionResult ExecutionEngine::execute(const std::string& code, const std::string& input, const nlohmann::json& options) {
    auto& logger = Logger::getInstance();
    auto& config = Config::getInstance();
    
    ExecutionResult result;
    result.success = false;
    
    try {
        // First compile the code
        CompilationResult compile_result = compile(code, options);
        
        if (!compile_result.success) {
            result.success = false;
            result.error_message = "Compilation failed";
            // Copy compilation errors
            for (const auto& error : compile_result.errors) {
                result.error_message += "\n" + error;
            }
            return result;
        }
        
        // Execute the compiled program
        auto start_time = std::chrono::high_resolution_clock::now();
        
        ProcessResult exec_result;
        if (config.getExecutionConfig().sandbox_enabled) {
            exec_result = executeInSandbox(compile_result.executable_path, input, options);
        } else {
            exec_result = executeDirectly(compile_result.executable_path, input, options);
        }
        
        auto end_time = std::chrono::high_resolution_clock::now();
        result.execution_time_ms = std::chrono::duration_cast<std::chrono::milliseconds>(end_time - start_time).count();
        
        result.success = (exec_result.exit_code == 0);
        result.exit_code = exec_result.exit_code;
        result.stdout = exec_result.stdout;
        result.stderr = exec_result.stderr;
        result.memory_usage_kb = exec_result.memory_usage_kb;
        result.cpu_time_ms = exec_result.cpu_time_ms;
        
        if (!result.success && result.stderr.empty()) {
            result.error_message = "Program exited with code " + std::to_string(result.exit_code);
        }
        
        // Clean up temporary files
        cleanupSession(std::filesystem::path(compile_result.executable_path).parent_path().string());
        
        logger.info("Execution completed with exit code: " + std::to_string(result.exit_code), "ExecutionEngine");
        
        return result;
        
    } catch (const std::exception& e) {
        result.error_message = "Internal execution error: " + std::string(e.what());
        logger.error("Execution exception: " + std::string(e.what()), "ExecutionEngine");
        return result;
    }
}

void ExecutionEngine::createDirectories() {
    std::vector<std::string> directories = {
        "temp",
        "cache",
        "logs"
    };
    
    for (const auto& dir : directories) {
        if (!std::filesystem::exists(dir)) {
            std::filesystem::create_directories(dir);
        }
    }
}

bool ExecutionEngine::validateCompilers() {
    auto& config = Config::getInstance();
    auto& logger = Logger::getInstance();
    
    // Check g++
    if (!std::filesystem::exists(config.getCompilerConfig().compiler_path)) {
        logger.error("G++ compiler not found: " + config.getCompilerConfig().compiler_path, "ExecutionEngine");
        return false;
    }
    
    // Check clang++
    if (!std::filesystem::exists(config.getCompilerConfig().clang_path)) {
        logger.warning("Clang++ not found: " + config.getCompilerConfig().clang_path, "ExecutionEngine");
    }
    
    return true;
}

bool ExecutionEngine::initializeDocker() {
    auto& logger = Logger::getInstance();
    
    try {
        // Check if Docker is available
        ProcessResult docker_check = executeProcess({"docker", "--version"}, 5);
        
        if (docker_check.exit_code != 0) {
            logger.warning("Docker not available", "ExecutionEngine");
            return false;
        }
        
        // Check if our sandbox image exists
        auto& config = Config::getInstance();
        ProcessResult image_check = executeProcess({
            "docker", "images", "-q", config.getExecutionConfig().docker_image
        }, 5);
        
        if (image_check.stdout.empty()) {
            logger.warning("Docker sandbox image not found: " + config.getExecutionConfig().docker_image, "ExecutionEngine");
            // Could build the image here or use a default one
            return false;
        }
        
        logger.info("Docker sandbox initialized", "ExecutionEngine");
        return true;
        
    } catch (const std::exception& e) {
        logger.error("Docker initialization failed: " + std::string(e.what()), "ExecutionEngine");
        return false;
    }
}

bool ExecutionEngine::testCompilation() {
    auto& logger = Logger::getInstance();
    
    try {
        std::string test_code = R"(
#include <iostream>
int main() {
    std::cout << "Hello, World!" << std::endl;
    return 0;
}
)";
        
        nlohmann::json options;
        CompilationResult result = compile(test_code, options);
        
        if (!result.success) {
            logger.error("Test compilation failed", "ExecutionEngine");
            return false;
        }
        
        logger.info("Test compilation successful", "ExecutionEngine");
        return true;
        
    } catch (const std::exception& e) {
        logger.error("Test compilation exception: " + std::string(e.what()), "ExecutionEngine");
        return false;
    }
}

std::string ExecutionEngine::generateSessionId() {
    std::random_device rd;
    std::mt19937 gen(rd());
    std::uniform_int_distribution<> dis(0, 15);
    
    std::string session_id;
    for (int i = 0; i < 16; ++i) {
        session_id += "0123456789abcdef"[dis(gen)];
    }
    
    return session_id;
}

std::vector<std::string> ExecutionEngine::buildCompileCommand(
    const std::string& source_file,
    const std::string& output_file, 
    const std::string& compiler,
    const std::string& standard,
    const std::string& optimization,
    bool debug_info,
    const std::vector<std::string>& extra_flags) {
    
    auto& config = Config::getInstance();
    
    std::vector<std::string> args;
    
    // Compiler path
    if (compiler == "clang++") {
        args.push_back(config.getCompilerConfig().clang_path);
    } else {
        args.push_back(config.getCompilerConfig().compiler_path);
    }
    
    // Standard
    args.push_back("-std=" + standard);
    
    // Optimization
    args.push_back("-" + optimization);
    
    // Debug info
    if (debug_info) {
        args.push_back("-g");
    }
    
    // Common flags
    args.push_back("-Wall");
    args.push_back("-Wextra");
    args.push_back("-pedantic");
    
    // Extra flags
    for (const auto& flag : extra_flags) {
        args.push_back(flag);
    }
    
    // Source and output
    args.push_back(source_file);
    args.push_back("-o");
    args.push_back(output_file);
    
    return args;
}

ProcessResult ExecutionEngine::executeProcess(const std::vector<std::string>& args, int timeout_seconds) {
    ProcessResult result;
    result.exit_code = -1;
    
    if (args.empty()) {
        return result;
    }
    
    // Convert args to char* array
    std::vector<char*> c_args;
    for (const auto& arg : args) {
        c_args.push_back(const_cast<char*>(arg.c_str()));
    }
    c_args.push_back(nullptr);
    
    int stdout_pipe[2], stderr_pipe[2];
    
    if (pipe(stdout_pipe) == -1 || pipe(stderr_pipe) == -1) {
        return result;
    }
    
    pid_t pid = fork();
    if (pid == -1) {
        close(stdout_pipe[0]); close(stdout_pipe[1]);
        close(stderr_pipe[0]); close(stderr_pipe[1]);
        return result;
    }
    
    if (pid == 0) {
        // Child process
        close(stdout_pipe[0]);
        close(stderr_pipe[0]);
        
        dup2(stdout_pipe[1], STDOUT_FILENO);
        dup2(stderr_pipe[1], STDERR_FILENO);
        
        close(stdout_pipe[1]);
        close(stderr_pipe[1]);
        
        execvp(c_args[0], c_args.data());
        exit(127); // execvp failed
    } else {
        // Parent process
        close(stdout_pipe[1]);
        close(stderr_pipe[1]);
        
        // Set alarm for timeout
        alarm(timeout_seconds);
        
        int status;
        pid_t wait_result = waitpid(pid, &status, 0);
        
        alarm(0); // Cancel alarm
        
        if (wait_result == -1) {
            // Timeout or other error
            kill(pid, SIGTERM);
            waitpid(pid, nullptr, 0);
            result.exit_code = -1;
        } else {
            result.exit_code = WEXITSTATUS(status);
        }
        
        // Read output
        char buffer[4096];
        ssize_t bytes_read;
        
        while ((bytes_read = read(stdout_pipe[0], buffer, sizeof(buffer) - 1)) > 0) {
            buffer[bytes_read] = '\0';
            result.stdout += buffer;
        }
        
        while ((bytes_read = read(stderr_pipe[0], buffer, sizeof(buffer) - 1)) > 0) {
            buffer[bytes_read] = '\0';
            result.stderr += buffer;
        }
        
        close(stdout_pipe[0]);
        close(stderr_pipe[0]);
    }
    
    return result;
}

ProcessResult ExecutionEngine::executeInSandbox(const std::string& executable_path, const std::string& input, const nlohmann::json& options) {
    auto& config = Config::getInstance();
    
    std::vector<std::string> docker_args = {
        "docker", "run", "--rm", "-i",
        "--memory=" + std::to_string(config.getExecutionConfig().max_memory_mb) + "m",
        "--cpus=" + std::to_string(config.getExecutionConfig().max_cpu_time),
        "--network=none",
        "--user=nobody",
        "-v", std::filesystem::absolute(executable_path) + ":/app/program:ro",
        config.getExecutionConfig().docker_image,
        "/app/program"
    };
    
    // TODO: Implement proper Docker execution with input handling
    // For now, fall back to direct execution
    return executeDirectly(executable_path, input, options);
}

ProcessResult ExecutionEngine::executeDirectly(const std::string& executable_path, const std::string& input, const nlohmann::json& options) {
    auto& config = Config::getInstance();
    
    std::vector<std::string> args = {executable_path};
    
    ProcessResult result = executeProcess(args, config.getExecutionConfig().execution_timeout);
    
    // TODO: Implement proper input handling and resource monitoring
    // This is a simplified implementation
    
    return result;
}

void ExecutionEngine::parseCompilerMessages(const std::string& compiler_output, std::vector<std::string>& warnings, std::vector<std::string>& errors) {
    std::istringstream stream(compiler_output);
    std::string line;
    
    while (std::getline(stream, line)) {
        if (line.find("warning:") != std::string::npos) {
            warnings.push_back(line);
        } else if (line.find("error:") != std::string::npos) {
            errors.push_back(line);
        }
    }
}

void ExecutionEngine::cleanupSession(const std::string& session_dir) {
    try {
        if (std::filesystem::exists(session_dir)) {
            std::filesystem::remove_all(session_dir);
        }
    } catch (const std::exception& e) {
        Logger::getInstance().warning("Failed to cleanup session: " + std::string(e.what()), "ExecutionEngine");
    }
}

} // namespace cpp_mastery