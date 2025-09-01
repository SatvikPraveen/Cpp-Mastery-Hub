// File: cpp-engine/src/utils/logger.cpp
// Extension: .cpp

#include "utils/logger.hpp"
#include <iostream>
#include <fstream>
#include <iomanip>
#include <sstream>
#include <thread>
#include <filesystem>

namespace cpp_mastery {

// Initialize static members
std::unique_ptr<Logger> Logger::instance_ = nullptr;
std::mutex Logger::mutex_;

Logger::Logger() 
    : level_(LogLevel::INFO)
    , log_to_file_(false)
    , log_to_console_(true)
    , max_file_size_(10 * 1024 * 1024) // 10MB
    , max_backup_files_(5) {
    
    // Create logs directory if it doesn't exist
    try {
        if (!std::filesystem::exists("logs")) {
            std::filesystem::create_directories("logs");
        }
    } catch (const std::exception& e) {
        std::cerr << "Warning: Failed to create logs directory: " << e.what() << std::endl;
    }
}

Logger::~Logger() {
    if (log_file_.is_open()) {
        log_file_.close();
    }
}

Logger& Logger::getInstance() {
    std::lock_guard<std::mutex> lock(mutex_);
    if (instance_ == nullptr) {
        instance_ = std::unique_ptr<Logger>(new Logger());
    }
    return *instance_;
}

void Logger::setLevel(LogLevel level) {
    std::lock_guard<std::mutex> lock(log_mutex_);
    level_ = level;
}

void Logger::setLogFile(const std::string& filename) {
    std::lock_guard<std::mutex> lock(log_mutex_);
    
    if (log_file_.is_open()) {
        log_file_.close();
    }
    
    log_filename_ = filename;
    log_file_.open(log_filename_, std::ios::app);
    
    if (log_file_.is_open()) {
        log_to_file_ = true;
        log("Logger", LogLevel::INFO, "Log file opened: " + filename);
    } else {
        log_to_file_ = false;
        std::cerr << "Warning: Failed to open log file: " << filename << std::endl;
    }
}

void Logger::enableConsoleLogging(bool enable) {
    std::lock_guard<std::mutex> lock(log_mutex_);
    log_to_console_ = enable;
}

void Logger::enableFileLogging(bool enable) {
    std::lock_guard<std::mutex> lock(log_mutex_);
    log_to_file_ = enable;
}

void Logger::setMaxFileSize(size_t max_size) {
    std::lock_guard<std::mutex> lock(log_mutex_);
    max_file_size_ = max_size;
}

void Logger::setMaxBackupFiles(int max_backups) {
    std::lock_guard<std::mutex> lock(log_mutex_);
    max_backup_files_ = max_backups;
}

void Logger::debug(const std::string& message, const std::string& component) {
    log(component, LogLevel::DEBUG, message);
}

void Logger::info(const std::string& message, const std::string& component) {
    log(component, LogLevel::INFO, message);
}

void Logger::warning(const std::string& message, const std::string& component) {
    log(component, LogLevel::WARNING, message);
}

void Logger::error(const std::string& message, const std::string& component) {
    log(component, LogLevel::ERROR, message);
}

void Logger::log(const std::string& component, LogLevel level, const std::string& message) {
    // Check if this log level should be processed
    if (level < level_) {
        return;
    }
    
    std::lock_guard<std::mutex> lock(log_mutex_);
    
    // Format the log message
    std::string formatted_message = formatMessage(component, level, message);
    
    // Log to console
    if (log_to_console_) {
        logToConsole(level, formatted_message);
    }
    
    // Log to file
    if (log_to_file_ && log_file_.is_open()) {
        logToFile(formatted_message);
    }
}

std::string Logger::formatMessage(const std::string& component, LogLevel level, const std::string& message) {
    std::ostringstream oss;
    
    // Timestamp
    auto now = std::chrono::system_clock::now();
    auto time_t = std::chrono::system_clock::to_time_t(now);
    auto ms = std::chrono::duration_cast<std::chrono::milliseconds>(
        now.time_since_epoch()) % 1000;
    
    oss << std::put_time(std::localtime(&time_t), "%Y-%m-%d %H:%M:%S");
    oss << '.' << std::setfill('0') << std::setw(3) << ms.count();
    
    // Thread ID
    oss << " [" << std::this_thread::get_id() << "]";
    
    // Log level
    oss << " [" << levelToString(level) << "]";
    
    // Component
    if (!component.empty()) {
        oss << " [" << component << "]";
    }
    
    // Message
    oss << " " << message;
    
    return oss.str();
}

void Logger::logToConsole(LogLevel level, const std::string& message) {
    // Use different streams and colors based on log level
    switch (level) {
        case LogLevel::DEBUG:
            std::cout << "\033[36m" << message << "\033[0m" << std::endl; // Cyan
            break;
        case LogLevel::INFO:
            std::cout << message << std::endl; // Default color
            break;
        case LogLevel::WARNING:
            std::cout << "\033[33m" << message << "\033[0m" << std::endl; // Yellow
            break;
        case LogLevel::ERROR:
            std::cerr << "\033[31m" << message << "\033[0m" << std::endl; // Red
            break;
    }
}

void Logger::logToFile(const std::string& message) {
    if (!log_file_.is_open()) {
        return;
    }
    
    // Check file size and rotate if necessary
    checkAndRotateLogFile();
    
    log_file_ << message << std::endl;
    log_file_.flush();
}

void Logger::checkAndRotateLogFile() {
    if (!log_file_.is_open() || log_filename_.empty()) {
        return;
    }
    
    try {
        // Get current file size
        auto file_size = std::filesystem::file_size(log_filename_);
        
        if (file_size >= max_file_size_) {
            rotateLogFile();
        }
    } catch (const std::exception& e) {
        std::cerr << "Warning: Failed to check log file size: " << e.what() << std::endl;
    }
}

void Logger::rotateLogFile() {
    if (log_filename_.empty()) {
        return;
    }
    
    try {
        // Close current log file
        log_file_.close();
        
        // Remove oldest backup if we have too many
        std::string oldest_backup = log_filename_ + "." + std::to_string(max_backup_files_);
        if (std::filesystem::exists(oldest_backup)) {
            std::filesystem::remove(oldest_backup);
        }
        
        // Rotate existing backups
        for (int i = max_backup_files_ - 1; i >= 1; --i) {
            std::string current_backup = log_filename_ + "." + std::to_string(i);
            std::string next_backup = log_filename_ + "." + std::to_string(i + 1);
            
            if (std::filesystem::exists(current_backup)) {
                std::filesystem::rename(current_backup, next_backup);
            }
        }
        
        // Move current log to .1
        std::string first_backup = log_filename_ + ".1";
        if (std::filesystem::exists(log_filename_)) {
            std::filesystem::rename(log_filename_, first_backup);
        }
        
        // Create new log file
        log_file_.open(log_filename_, std::ios::app);
        
        if (log_file_.is_open()) {
            log("Logger", LogLevel::INFO, "Log file rotated");
        } else {
            std::cerr << "Warning: Failed to create new log file after rotation" << std::endl;
            log_to_file_ = false;
        }
        
    } catch (const std::exception& e) {
        std::cerr << "Warning: Failed to rotate log file: " << e.what() << std::endl;
        // Try to reopen the original file
        log_file_.open(log_filename_, std::ios::app);
        if (!log_file_.is_open()) {
            log_to_file_ = false;
        }
    }
}

std::string Logger::levelToString(LogLevel level) {
    switch (level) {
        case LogLevel::DEBUG:   return "DEBUG";
        case LogLevel::INFO:    return "INFO";
        case LogLevel::WARNING: return "WARN";
        case LogLevel::ERROR:   return "ERROR";
        default:                return "UNKNOWN";
    }
}

LogLevel Logger::stringToLevel(const std::string& level_str) {
    std::string upper_level = level_str;
    std::transform(upper_level.begin(), upper_level.end(), upper_level.begin(), ::toupper);
    
    if (upper_level == "DEBUG") return LogLevel::DEBUG;
    if (upper_level == "INFO")  return LogLevel::INFO;
    if (upper_level == "WARN" || upper_level == "WARNING") return LogLevel::WARNING;
    if (upper_level == "ERROR") return LogLevel::ERROR;
    
    return LogLevel::INFO; // Default
}

void Logger::flush() {
    std::lock_guard<std::mutex> lock(log_mutex_);
    
    if (log_to_console_) {
        std::cout.flush();
        std::cerr.flush();
    }
    
    if (log_to_file_ && log_file_.is_open()) {
        log_file_.flush();
    }
}

std::vector<std::string> Logger::getRecentLogs(size_t count) {
    std::lock_guard<std::mutex> lock(log_mutex_);
    
    std::vector<std::string> recent_logs;
    
    if (!log_to_file_ || log_filename_.empty()) {
        return recent_logs;
    }
    
    try {
        std::ifstream file(log_filename_);
        if (!file.is_open()) {
            return recent_logs;
        }
        
        std::deque<std::string> lines;
        std::string line;
        
        while (std::getline(file, line)) {
            lines.push_back(line);
            if (lines.size() > count) {
                lines.pop_front();
            }
        }
        
        recent_logs.assign(lines.begin(), lines.end());
        
    } catch (const std::exception& e) {
        error("Failed to read recent logs: " + std::string(e.what()), "Logger");
    }
    
    return recent_logs;
}

void Logger::clearLogs() {
    std::lock_guard<std::mutex> lock(log_mutex_);
    
    if (log_file_.is_open()) {
        log_file_.close();
    }
    
    try {
        // Remove current log file
        if (!log_filename_.empty() && std::filesystem::exists(log_filename_)) {
            std::filesystem::remove(log_filename_);
        }
        
        // Remove backup files
        for (int i = 1; i <= max_backup_files_; ++i) {
            std::string backup_file = log_filename_ + "." + std::to_string(i);
            if (std::filesystem::exists(backup_file)) {
                std::filesystem::remove(backup_file);
            }
        }
        
        // Reopen log file
        if (!log_filename_.empty()) {
            log_file_.open(log_filename_, std::ios::app);
            if (log_file_.is_open()) {
                log("Logger", LogLevel::INFO, "Log files cleared");
            }
        }
        
    } catch (const std::exception& e) {
        std::cerr << "Warning: Failed to clear log files: " << e.what() << std::endl;
    }
}

} // namespace cpp_mastery