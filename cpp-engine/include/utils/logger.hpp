// File: cpp-engine/include/utils/logger.hpp
// Extension: .hpp

#pragma once

#include <string>
#include <fstream>
#include <mutex>
#include <memory>
#include <vector>
#include <deque>
#include <chrono>
#include <algorithm>
#include <filesystem>

namespace cpp_mastery {

/**
 * @brief Log levels for the logging system
 */
enum class LogLevel {
    DEBUG = 0,
    INFO = 1,
    WARNING = 2,
    ERROR = 3
};

/**
 * @brief Thread-safe singleton logger class
 * 
 * Provides comprehensive logging functionality with support for:
 * - Multiple log levels (DEBUG, INFO, WARNING, ERROR)
 * - Console and file logging
 * - Log file rotation
 * - Colored console output
 * - Thread-safe operations
 */
class Logger {
public:
    /**
     * @brief Get the singleton instance of the logger
     * 
     * @return Logger& Reference to the logger instance
     */
    static Logger& getInstance();
    
    // Delete copy constructor and assignment operator
    Logger(const Logger&) = delete;
    Logger& operator=(const Logger&) = delete;
    
    /**
     * @brief Destructor
     */
    ~Logger();
    
    /**
     * @brief Set the minimum log level
     * 
     * @param level Minimum log level to process
     */
    void setLevel(LogLevel level);
    
    /**
     * @brief Get the current log level
     * 
     * @return LogLevel Current minimum log level
     */
    LogLevel getLevel() const { return level_; }
    
    /**
     * @brief Set the log file path and enable file logging
     * 
     * @param filename Path to the log file
     */
    void setLogFile(const std::string& filename);
    
    /**
     * @brief Enable or disable console logging
     * 
     * @param enable True to enable, false to disable
     */
    void enableConsoleLogging(bool enable);
    
    /**
     * @brief Enable or disable file logging
     * 
     * @param enable True to enable, false to disable
     */
    void enableFileLogging(bool enable);
    
    /**
     * @brief Set maximum log file size before rotation
     * 
     * @param max_size Maximum file size in bytes
     */
    void setMaxFileSize(size_t max_size);
    
    /**
     * @brief Set maximum number of backup log files
     * 
     * @param max_backups Maximum number of backup files to keep
     */
    void setMaxBackupFiles(int max_backups);
    
    /**
     * @brief Log a debug message
     * 
     * @param message Log message
     * @param component Component name (optional)
     */
    void debug(const std::string& message, const std::string& component = "");
    
    /**
     * @brief Log an info message
     * 
     * @param message Log message
     * @param component Component name (optional)
     */
    void info(const std::string& message, const std::string& component = "");
    
    /**
     * @brief Log a warning message
     * 
     * @param message Log message
     * @param component Component name (optional)
     */
    void warning(const std::string& message, const std::string& component = "");
    
    /**
     * @brief Log an error message
     * 
     * @param message Log message
     * @param component Component name (optional)
     */
    void error(const std::string& message, const std::string& component = "");
    
    /**
     * @brief Log a message with specified level and component
     * 
     * @param component Component name
     * @param level Log level
     * @param message Log message
     */
    void log(const std::string& component, LogLevel level, const std::string& message);
    
    /**
     * @brief Flush all log outputs
     */
    void flush();
    
    /**
     * @brief Get recent log entries from file
     * 
     * @param count Number of recent entries to retrieve
     * @return std::vector<std::string> Recent log entries
     */
    std::vector<std::string> getRecentLogs(size_t count = 100);
    
    /**
     * @brief Clear all log files
     */
    void clearLogs();
    
    /**
     * @brief Convert log level to string
     * 
     * @param level Log level
     * @return std::string String representation of log level
     */
    static std::string levelToString(LogLevel level);
    
    /**
     * @brief Convert string to log level
     * 
     * @param level_str String representation of log level
     * @return LogLevel Corresponding log level
     */
    static LogLevel stringToLevel(const std::string& level_str);

private:
    /**
     * @brief Private constructor for singleton pattern
     */
    Logger();
    
    /**
     * @brief Format log message with timestamp, thread ID, level, and component
     * 
     * @param component Component name
     * @param level Log level
     * @param message Log message
     * @return std::string Formatted log message
     */
    std::string formatMessage(const std::string& component, LogLevel level, const std::string& message);
    
    /**
     * @brief Log message to console with appropriate coloring
     * 
     * @param level Log level
     * @param message Formatted log message
     */
    void logToConsole(LogLevel level, const std::string& message);
    
    /**
     * @brief Log message to file
     * 
     * @param message Formatted log message
     */
    void logToFile(const std::string& message);
    
    /**
     * @brief Check log file size and rotate if necessary
     */
    void checkAndRotateLogFile();
    
    /**
     * @brief Rotate log file when it exceeds maximum size
     */
    void rotateLogFile();
    
    // Static members for singleton pattern
    static std::unique_ptr<Logger> instance_;
    static std::mutex mutex_;
    
    // Configuration
    LogLevel level_;
    bool log_to_file_;
    bool log_to_console_;
    size_t max_file_size_;
    int max_backup_files_;
    
    // File handling
    std::string log_filename_;
    std::ofstream log_file_;
    
    // Thread safety
    mutable std::mutex log_mutex_;
};

// Convenience macros for logging
#define LOG_DEBUG(msg) cpp_mastery::Logger::getInstance().debug(msg, __FUNCTION__)
#define LOG_INFO(msg) cpp_mastery::Logger::getInstance().info(msg, __FUNCTION__)
#define LOG_WARNING(msg) cpp_mastery::Logger::getInstance().warning(msg, __FUNCTION__)
#define LOG_ERROR(msg) cpp_mastery::Logger::getInstance().error(msg, __FUNCTION__)

// Component-specific logging macros
#define LOG_DEBUG_C(component, msg) cpp_mastery::Logger::getInstance().debug(msg, component)
#define LOG_INFO_C(component, msg) cpp_mastery::Logger::getInstance().info(msg, component)
#define LOG_WARNING_C(component, msg) cpp_mastery::Logger::getInstance().warning(msg, component)
#define LOG_ERROR_C(component, msg) cpp_mastery::Logger::getInstance().error(msg, component)

} // namespace cpp_mastery