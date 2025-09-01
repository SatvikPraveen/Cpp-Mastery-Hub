// File: cpp-engine/include/utils/config.hpp
// Extension: .hpp

#pragma once

#include <string>
#include <memory>
#include <mutex>
#include <thread>

// Forward declaration
namespace nlohmann {
    class json;
}

namespace cpp_mastery {

/**
 * @brief Server configuration structure
 */
struct ServerConfig {
    std::string host;
    int port;
    size_t threads;
    int timeout_seconds;
    size_t max_request_size;
};

/**
 * @brief Compiler configuration structure
 */
struct CompilerConfig {
    std::string compiler_path;
    std::string clang_path;
    std::string default_compiler;
    std::string cpp_standard;
    std::string optimization_level;
    int compilation_timeout;
    size_t max_binary_size;
};

/**
 * @brief Execution configuration structure
 */
struct ExecutionConfig {
    bool sandbox_enabled;
    int execution_timeout;
    int max_memory_mb;
    int max_cpu_time;
    size_t max_output_size;
    std::string docker_image;
};

/**
 * @brief Analysis configuration structure
 */
struct AnalysisConfig {
    std::string clang_tidy_path;
    std::string cppcheck_path;
    int analysis_timeout;
    size_t max_file_size;
    bool enable_performance_analysis;
    bool enable_security_analysis;
};

/**
 * @brief Logging configuration structure
 */
struct LoggingConfig {
    std::string level;
    bool log_to_file;
    bool log_to_console;
    std::string log_file;
    size_t max_file_size;
    int max_backup_files;
};

/**
 * @brief Security configuration structure
 */
struct SecurityConfig {
    bool enable_api_key;
    std::string api_key;
    bool rate_limit_enabled;
    int max_requests_per_minute;
    int max_requests_per_hour;
};

/**
 * @brief Cache configuration structure
 */
struct CacheConfig {
    bool enable_compilation_cache;
    bool enable_analysis_cache;
    std::string cache_directory;
    size_t max_cache_size_mb;
    int cache_ttl_hours;
};

/**
 * @brief Singleton configuration manager
 * 
 * Handles loading, saving, and managing all application configuration.
 * Supports configuration from files, environment variables, and runtime updates.
 */
class Config {
public:
    /**
     * @brief Get the singleton instance of the configuration manager
     * 
     * @return Config& Reference to the configuration instance
     */
    static Config& getInstance();
    
    // Delete copy constructor and assignment operator
    Config(const Config&) = delete;
    Config& operator=(const Config&) = delete;
    
    /**
     * @brief Load configuration from file and environment variables
     * 
     * @param config_file Path to configuration file (optional)
     * @return true if configuration loaded successfully
     * @return false if configuration loading failed
     */
    bool load(const std::string& config_file = "config/server.json");
    
    /**
     * @brief Save current configuration to file
     * 
     * @param config_file Path to save configuration file
     * @return true if configuration saved successfully
     * @return false if configuration saving failed
     */
    bool save(const std::string& config_file = "config/server.json");
    
    /**
     * @brief Validate current configuration
     * 
     * @return true if configuration is valid
     * @return false if configuration has errors
     */
    bool validate();
    
    /**
     * @brief Print current configuration summary
     */
    void printConfiguration() const;
    
    // Configuration getters (const reference for thread safety)
    
    /**
     * @brief Get server configuration
     * 
     * @return const ServerConfig& Server configuration
     */
    const ServerConfig& getServerConfig() const { return server_config_; }
    
    /**
     * @brief Get compiler configuration
     * 
     * @return const CompilerConfig& Compiler configuration
     */
    const CompilerConfig& getCompilerConfig() const { return compiler_config_; }
    
    /**
     * @brief Get execution configuration
     * 
     * @return const ExecutionConfig& Execution configuration
     */
    const ExecutionConfig& getExecutionConfig() const { return execution_config_; }
    
    /**
     * @brief Get analysis configuration
     * 
     * @return const AnalysisConfig& Analysis configuration
     */
    const AnalysisConfig& getAnalysisConfig() const { return analysis_config_; }
    
    /**
     * @brief Get logging configuration
     * 
     * @return const LoggingConfig& Logging configuration
     */
    const LoggingConfig& getLoggingConfig() const { return logging_config_; }
    
    /**
     * @brief Get security configuration
     * 
     * @return const SecurityConfig& Security configuration
     */
    const SecurityConfig& getSecurityConfig() const { return security_config_; }
    
    /**
     * @brief Get cache configuration
     * 
     * @return const CacheConfig& Cache configuration
     */
    const CacheConfig& getCacheConfig() const { return cache_config_; }
    
    // Configuration setters (thread-safe with mutex)
    
    /**
     * @brief Update server configuration
     * 
     * @param config New server configuration
     */
    void setServerConfig(const ServerConfig& config) {
        std::lock_guard<std::mutex> lock(config_mutex_);
        server_config_ = config;
    }
    
    /**
     * @brief Update compiler configuration
     * 
     * @param config New compiler configuration
     */
    void setCompilerConfig(const CompilerConfig& config) {
        std::lock_guard<std::mutex> lock(config_mutex_);
        compiler_config_ = config;
    }
    
    /**
     * @brief Update execution configuration
     * 
     * @param config New execution configuration
     */
    void setExecutionConfig(const ExecutionConfig& config) {
        std::lock_guard<std::mutex> lock(config_mutex_);
        execution_config_ = config;
    }
    
    /**
     * @brief Update analysis configuration
     * 
     * @param config New analysis configuration
     */
    void setAnalysisConfig(const AnalysisConfig& config) {
        std::lock_guard<std::mutex> lock(config_mutex_);
        analysis_config_ = config;
    }
    
    /**
     * @brief Update logging configuration
     * 
     * @param config New logging configuration
     */
    void setLoggingConfig(const LoggingConfig& config) {
        std::lock_guard<std::mutex> lock(config_mutex_);
        logging_config_ = config;
    }
    
    /**
     * @brief Update security configuration
     * 
     * @param config New security configuration
     */
    void setSecurityConfig(const SecurityConfig& config) {
        std::lock_guard<std::mutex> lock(config_mutex_);
        security_config_ = config;
    }
    
    /**
     * @brief Update cache configuration
     * 
     * @param config New cache configuration
     */
    void setCacheConfig(const CacheConfig& config) {
        std::lock_guard<std::mutex> lock(config_mutex_);
        cache_config_ = config;
    }

private:
    /**
     * @brief Private constructor for singleton pattern
     */
    Config();
    
    /**
     * @brief Set default configuration values
     */
    void setDefaults();
    
    /**
     * @brief Load configuration from JSON file
     * 
     * @param config_file Path to configuration file
     * @return true if file loaded successfully
     * @return false if file loading failed
     */
    bool loadFromFile(const std::string& config_file);
    
    /**
     * @brief Load configuration from environment variables
     */
    void loadFromEnvironment();
    
    /**
     * @brief Convert configuration to JSON
     * 
     * @return nlohmann::json JSON representation of configuration
     */
    nlohmann::json toJson() const;
    
    /**
     * @brief Load configuration from JSON
     * 
     * @param config_json JSON configuration data
     * @return true if JSON parsed successfully
     * @return false if JSON parsing failed
     */
    bool fromJson(const nlohmann::json& config_json);
    
    // Static members for singleton pattern
    static std::unique_ptr<Config> instance_;
    static std::mutex mutex_;
    
    // Configuration data
    ServerConfig server_config_;
    CompilerConfig compiler_config_;
    ExecutionConfig execution_config_;
    AnalysisConfig analysis_config_;
    LoggingConfig logging_config_;
    SecurityConfig security_config_;
    CacheConfig cache_config_;
    
    // Thread safety
    mutable std::mutex config_mutex_;
};

} // namespace cpp_mastery