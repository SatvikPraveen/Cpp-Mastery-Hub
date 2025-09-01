// File: cpp-engine/src/utils/config.cpp
// Extension: .cpp

#include "utils/config.hpp"
#include "utils/logger.hpp"
#include <nlohmann/json.hpp>
#include <fstream>
#include <iostream>
#include <filesystem>
#include <cstdlib>

using json = nlohmann::json;

namespace cpp_mastery {

// Initialize static members
std::unique_ptr<Config> Config::instance_ = nullptr;
std::mutex Config::mutex_;

Config::Config() {
    // Set default values
    setDefaults();
}

Config& Config::getInstance() {
    std::lock_guard<std::mutex> lock(mutex_);
    if (instance_ == nullptr) {
        instance_ = std::unique_ptr<Config>(new Config());
    }
    return *instance_;
}

bool Config::load(const std::string& config_file) {
    std::lock_guard<std::mutex> lock(config_mutex_);
    
    try {
        // Try to load from file first
        if (!config_file.empty() && std::filesystem::exists(config_file)) {
            if (loadFromFile(config_file)) {
                Logger::getInstance().info("Configuration loaded from file: " + config_file, "Config");
            } else {
                Logger::getInstance().warning("Failed to load config from file, using defaults", "Config");
            }
        } else {
            Logger::getInstance().info("Config file not found, using defaults: " + config_file, "Config");
        }
        
        // Override with environment variables
        loadFromEnvironment();
        
        // Validate configuration
        if (!validate()) {
            Logger::getInstance().error("Configuration validation failed", "Config");
            return false;
        }
        
        Logger::getInstance().info("Configuration loaded successfully", "Config");
        return true;
        
    } catch (const std::exception& e) {
        Logger::getInstance().error("Failed to load configuration: " + std::string(e.what()), "Config");
        return false;
    }
}

bool Config::save(const std::string& config_file) {
    std::lock_guard<std::mutex> lock(config_mutex_);
    
    try {
        json config_json = toJson();
        
        // Create directory if it doesn't exist
        std::filesystem::path file_path(config_file);
        if (file_path.has_parent_path()) {
            std::filesystem::create_directories(file_path.parent_path());
        }
        
        std::ofstream file(config_file);
        if (!file.is_open()) {
            Logger::getInstance().error("Failed to open config file for writing: " + config_file, "Config");
            return false;
        }
        
        file << config_json.dump(4);
        file.close();
        
        Logger::getInstance().info("Configuration saved to: " + config_file, "Config");
        return true;
        
    } catch (const std::exception& e) {
        Logger::getInstance().error("Failed to save configuration: " + std::string(e.what()), "Config");
        return false;
    }
}

void Config::setDefaults() {
    // Server configuration
    server_config_.host = "0.0.0.0";
    server_config_.port = 9000;
    server_config_.threads = std::thread::hardware_concurrency();
    server_config_.timeout_seconds = 30;
    server_config_.max_request_size = 10 * 1024 * 1024; // 10MB
    
    // Compiler configuration
    compiler_config_.compiler_path = "/usr/bin/g++";
    compiler_config_.clang_path = "/usr/bin/clang++";
    compiler_config_.default_compiler = "g++";
    compiler_config_.cpp_standard = "c++20";
    compiler_config_.optimization_level = "O2";
    compiler_config_.compilation_timeout = 30;
    compiler_config_.max_binary_size = 100 * 1024 * 1024; // 100MB
    
    // Execution configuration
    execution_config_.sandbox_enabled = true;
    execution_config_.execution_timeout = 10;
    execution_config_.max_memory_mb = 512;
    execution_config_.max_cpu_time = 5;
    execution_config_.max_output_size = 1024 * 1024; // 1MB
    execution_config_.docker_image = "cpp-sandbox:latest";
    
    // Analysis configuration
    analysis_config_.clang_tidy_path = "/usr/bin/clang-tidy";
    analysis_config_.cppcheck_path = "/usr/bin/cppcheck";
    analysis_config_.analysis_timeout = 60;
    analysis_config_.max_file_size = 1024 * 1024; // 1MB
    analysis_config_.enable_performance_analysis = true;
    analysis_config_.enable_security_analysis = true;
    
    // Logging configuration
    logging_config_.level = "INFO";
    logging_config_.log_to_file = true;
    logging_config_.log_to_console = true;
    logging_config_.log_file = "logs/cpp-engine.log";
    logging_config_.max_file_size = 10 * 1024 * 1024; // 10MB
    logging_config_.max_backup_files = 5;
    
    // Security configuration
    security_config_.enable_api_key = false;
    security_config_.api_key = "";
    security_config_.rate_limit_enabled = true;
    security_config_.max_requests_per_minute = 100;
    security_config_.max_requests_per_hour = 1000;
    
    // Cache configuration
    cache_config_.enable_compilation_cache = true;
    cache_config_.enable_analysis_cache = true;
    cache_config_.cache_directory = "cache";
    cache_config_.max_cache_size_mb = 1024; // 1GB
    cache_config_.cache_ttl_hours = 24;
}

bool Config::loadFromFile(const std::string& config_file) {
    try {
        std::ifstream file(config_file);
        if (!file.is_open()) {
            return false;
        }
        
        json config_json;
        file >> config_json;
        
        return fromJson(config_json);
        
    } catch (const std::exception& e) {
        Logger::getInstance().error("Error reading config file: " + std::string(e.what()), "Config");
        return false;
    }
}

void Config::loadFromEnvironment() {
    // Server configuration
    if (const char* env_host = std::getenv("CPP_ENGINE_HOST")) {
        server_config_.host = env_host;
    }
    
    if (const char* env_port = std::getenv("CPP_ENGINE_PORT")) {
        try {
            server_config_.port = std::stoi(env_port);
        } catch (...) {
            Logger::getInstance().warning("Invalid CPP_ENGINE_PORT value, using default", "Config");
        }
    }
    
    if (const char* env_threads = std::getenv("CPP_ENGINE_THREADS")) {
        try {
            server_config_.threads = std::stoi(env_threads);
        } catch (...) {
            Logger::getInstance().warning("Invalid CPP_ENGINE_THREADS value, using default", "Config");
        }
    }
    
    // Compiler configuration
    if (const char* env_compiler = std::getenv("CPP_ENGINE_COMPILER")) {
        compiler_config_.default_compiler = env_compiler;
    }
    
    if (const char* env_std = std::getenv("CPP_ENGINE_STANDARD")) {
        compiler_config_.cpp_standard = env_std;
    }
    
    // Execution configuration
    if (const char* env_sandbox = std::getenv("CPP_ENGINE_SANDBOX")) {
        execution_config_.sandbox_enabled = (std::string(env_sandbox) == "true");
    }
    
    if (const char* env_timeout = std::getenv("CPP_ENGINE_TIMEOUT")) {
        try {
            execution_config_.execution_timeout = std::stoi(env_timeout);
        } catch (...) {
            Logger::getInstance().warning("Invalid CPP_ENGINE_TIMEOUT value, using default", "Config");
        }
    }
    
    // Logging configuration
    if (const char* env_log_level = std::getenv("CPP_ENGINE_LOG_LEVEL")) {
        logging_config_.level = env_log_level;
    }
    
    if (const char* env_log_file = std::getenv("CPP_ENGINE_LOG_FILE")) {
        logging_config_.log_file = env_log_file;
    }
    
    // Security configuration
    if (const char* env_api_key = std::getenv("CPP_ENGINE_API_KEY")) {
        security_config_.enable_api_key = true;
        security_config_.api_key = env_api_key;
    }
}

bool Config::validate() {
    bool valid = true;
    
    // Validate server configuration
    if (server_config_.port < 1 || server_config_.port > 65535) {
        Logger::getInstance().error("Invalid server port: " + std::to_string(server_config_.port), "Config");
        valid = false;
    }
    
    if (server_config_.threads < 1 || server_config_.threads > 1000) {
        Logger::getInstance().error("Invalid thread count: " + std::to_string(server_config_.threads), "Config");
        valid = false;
    }
    
    // Validate compiler paths
    if (!std::filesystem::exists(compiler_config_.compiler_path)) {
        Logger::getInstance().warning("Compiler not found: " + compiler_config_.compiler_path, "Config");
    }
    
    if (!std::filesystem::exists(compiler_config_.clang_path)) {
        Logger::getInstance().warning("Clang not found: " + compiler_config_.clang_path, "Config");
    }
    
    // Validate execution limits
    if (execution_config_.execution_timeout < 1 || execution_config_.execution_timeout > 300) {
        Logger::getInstance().error("Invalid execution timeout: " + std::to_string(execution_config_.execution_timeout), "Config");
        valid = false;
    }
    
    if (execution_config_.max_memory_mb < 1 || execution_config_.max_memory_mb > 8192) {
        Logger::getInstance().error("Invalid memory limit: " + std::to_string(execution_config_.max_memory_mb), "Config");
        valid = false;
    }
    
    // Validate logging configuration
    LogLevel log_level = Logger::stringToLevel(logging_config_.level);
    if (logging_config_.level != Logger::levelToString(log_level)) {
        Logger::getInstance().warning("Invalid log level, using INFO: " + logging_config_.level, "Config");
        logging_config_.level = "INFO";
    }
    
    return valid;
}

json Config::toJson() const {
    json config_json;
    
    // Server configuration
    config_json["server"]["host"] = server_config_.host;
    config_json["server"]["port"] = server_config_.port;
    config_json["server"]["threads"] = server_config_.threads;
    config_json["server"]["timeout_seconds"] = server_config_.timeout_seconds;
    config_json["server"]["max_request_size"] = server_config_.max_request_size;
    
    // Compiler configuration
    config_json["compiler"]["compiler_path"] = compiler_config_.compiler_path;
    config_json["compiler"]["clang_path"] = compiler_config_.clang_path;
    config_json["compiler"]["default_compiler"] = compiler_config_.default_compiler;
    config_json["compiler"]["cpp_standard"] = compiler_config_.cpp_standard;
    config_json["compiler"]["optimization_level"] = compiler_config_.optimization_level;
    config_json["compiler"]["compilation_timeout"] = compiler_config_.compilation_timeout;
    config_json["compiler"]["max_binary_size"] = compiler_config_.max_binary_size;
    
    // Execution configuration
    config_json["execution"]["sandbox_enabled"] = execution_config_.sandbox_enabled;
    config_json["execution"]["execution_timeout"] = execution_config_.execution_timeout;
    config_json["execution"]["max_memory_mb"] = execution_config_.max_memory_mb;
    config_json["execution"]["max_cpu_time"] = execution_config_.max_cpu_time;
    config_json["execution"]["max_output_size"] = execution_config_.max_output_size;
    config_json["execution"]["docker_image"] = execution_config_.docker_image;
    
    // Analysis configuration
    config_json["analysis"]["clang_tidy_path"] = analysis_config_.clang_tidy_path;
    config_json["analysis"]["cppcheck_path"] = analysis_config_.cppcheck_path;
    config_json["analysis"]["analysis_timeout"] = analysis_config_.analysis_timeout;
    config_json["analysis"]["max_file_size"] = analysis_config_.max_file_size;
    config_json["analysis"]["enable_performance_analysis"] = analysis_config_.enable_performance_analysis;
    config_json["analysis"]["enable_security_analysis"] = analysis_config_.enable_security_analysis;
    
    // Logging configuration
    config_json["logging"]["level"] = logging_config_.level;
    config_json["logging"]["log_to_file"] = logging_config_.log_to_file;
    config_json["logging"]["log_to_console"] = logging_config_.log_to_console;
    config_json["logging"]["log_file"] = logging_config_.log_file;
    config_json["logging"]["max_file_size"] = logging_config_.max_file_size;
    config_json["logging"]["max_backup_files"] = logging_config_.max_backup_files;
    
    // Security configuration
    config_json["security"]["enable_api_key"] = security_config_.enable_api_key;
    config_json["security"]["rate_limit_enabled"] = security_config_.rate_limit_enabled;
    config_json["security"]["max_requests_per_minute"] = security_config_.max_requests_per_minute;
    config_json["security"]["max_requests_per_hour"] = security_config_.max_requests_per_hour;
    
    // Cache configuration
    config_json["cache"]["enable_compilation_cache"] = cache_config_.enable_compilation_cache;
    config_json["cache"]["enable_analysis_cache"] = cache_config_.enable_analysis_cache;
    config_json["cache"]["cache_directory"] = cache_config_.cache_directory;
    config_json["cache"]["max_cache_size_mb"] = cache_config_.max_cache_size_mb;
    config_json["cache"]["cache_ttl_hours"] = cache_config_.cache_ttl_hours;
    
    return config_json;
}

bool Config::fromJson(const json& config_json) {
    try {
        // Server configuration
        if (config_json.contains("server")) {
            const auto& server = config_json["server"];
            if (server.contains("host")) server_config_.host = server["host"];
            if (server.contains("port")) server_config_.port = server["port"];
            if (server.contains("threads")) server_config_.threads = server["threads"];
            if (server.contains("timeout_seconds")) server_config_.timeout_seconds = server["timeout_seconds"];
            if (server.contains("max_request_size")) server_config_.max_request_size = server["max_request_size"];
        }
        
        // Compiler configuration
        if (config_json.contains("compiler")) {
            const auto& compiler = config_json["compiler"];
            if (compiler.contains("compiler_path")) compiler_config_.compiler_path = compiler["compiler_path"];
            if (compiler.contains("clang_path")) compiler_config_.clang_path = compiler["clang_path"];
            if (compiler.contains("default_compiler")) compiler_config_.default_compiler = compiler["default_compiler"];
            if (compiler.contains("cpp_standard")) compiler_config_.cpp_standard = compiler["cpp_standard"];
            if (compiler.contains("optimization_level")) compiler_config_.optimization_level = compiler["optimization_level"];
            if (compiler.contains("compilation_timeout")) compiler_config_.compilation_timeout = compiler["compilation_timeout"];
            if (compiler.contains("max_binary_size")) compiler_config_.max_binary_size = compiler["max_binary_size"];
        }
        
        // Execution configuration
        if (config_json.contains("execution")) {
            const auto& execution = config_json["execution"];
            if (execution.contains("sandbox_enabled")) execution_config_.sandbox_enabled = execution["sandbox_enabled"];
            if (execution.contains("execution_timeout")) execution_config_.execution_timeout = execution["execution_timeout"];
            if (execution.contains("max_memory_mb")) execution_config_.max_memory_mb = execution["max_memory_mb"];
            if (execution.contains("max_cpu_time")) execution_config_.max_cpu_time = execution["max_cpu_time"];
            if (execution.contains("max_output_size")) execution_config_.max_output_size = execution["max_output_size"];
            if (execution.contains("docker_image")) execution_config_.docker_image = execution["docker_image"];
        }
        
        // Analysis configuration
        if (config_json.contains("analysis")) {
            const auto& analysis = config_json["analysis"];
            if (analysis.contains("clang_tidy_path")) analysis_config_.clang_tidy_path = analysis["clang_tidy_path"];
            if (analysis.contains("cppcheck_path")) analysis_config_.cppcheck_path = analysis["cppcheck_path"];
            if (analysis.contains("analysis_timeout")) analysis_config_.analysis_timeout = analysis["analysis_timeout"];
            if (analysis.contains("max_file_size")) analysis_config_.max_file_size = analysis["max_file_size"];
            if (analysis.contains("enable_performance_analysis")) analysis_config_.enable_performance_analysis = analysis["enable_performance_analysis"];
            if (analysis.contains("enable_security_analysis")) analysis_config_.enable_security_analysis = analysis["enable_security_analysis"];
        }
        
        // Logging configuration
        if (config_json.contains("logging")) {
            const auto& logging = config_json["logging"];
            if (logging.contains("level")) logging_config_.level = logging["level"];
            if (logging.contains("log_to_file")) logging_config_.log_to_file = logging["log_to_file"];
            if (logging.contains("log_to_console")) logging_config_.log_to_console = logging["log_to_console"];
            if (logging.contains("log_file")) logging_config_.log_file = logging["log_file"];
            if (logging.contains("max_file_size")) logging_config_.max_file_size = logging["max_file_size"];
            if (logging.contains("max_backup_files")) logging_config_.max_backup_files = logging["max_backup_files"];
        }
        
        // Security configuration
        if (config_json.contains("security")) {
            const auto& security = config_json["security"];
            if (security.contains("enable_api_key")) security_config_.enable_api_key = security["enable_api_key"];
            if (security.contains("rate_limit_enabled")) security_config_.rate_limit_enabled = security["rate_limit_enabled"];
            if (security.contains("max_requests_per_minute")) security_config_.max_requests_per_minute = security["max_requests_per_minute"];
            if (security.contains("max_requests_per_hour")) security_config_.max_requests_per_hour = security["max_requests_per_hour"];
        }
        
        // Cache configuration
        if (config_json.contains("cache")) {
            const auto& cache = config_json["cache"];
            if (cache.contains("enable_compilation_cache")) cache_config_.enable_compilation_cache = cache["enable_compilation_cache"];
            if (cache.contains("enable_analysis_cache")) cache_config_.enable_analysis_cache = cache["enable_analysis_cache"];
            if (cache.contains("cache_directory")) cache_config_.cache_directory = cache["cache_directory"];
            if (cache.contains("max_cache_size_mb")) cache_config_.max_cache_size_mb = cache["max_cache_size_mb"];
            if (cache.contains("cache_ttl_hours")) cache_config_.cache_ttl_hours = cache["cache_ttl_hours"];
        }
        
        return true;
        
    } catch (const std::exception& e) {
        Logger::getInstance().error("Error parsing configuration JSON: " + std::string(e.what()), "Config");
        return false;
    }
}

void Config::printConfiguration() const {
    auto& logger = Logger::getInstance();
    
    logger.info("=== Configuration Summary ===", "Config");
    logger.info("Server: " + server_config_.host + ":" + std::to_string(server_config_.port), "Config");
    logger.info("Threads: " + std::to_string(server_config_.threads), "Config");
    logger.info("Compiler: " + compiler_config_.default_compiler, "Config");
    logger.info("C++ Standard: " + compiler_config_.cpp_standard, "Config");
    logger.info("Sandbox: " + std::string(execution_config_.sandbox_enabled ? "enabled" : "disabled"), "Config");
    logger.info("Log Level: " + logging_config_.level, "Config");
    logger.info("========================", "Config");
}

} // namespace cpp_mastery