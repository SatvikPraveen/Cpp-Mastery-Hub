// File: cpp-engine/include/utils/file_utils.hpp
// Extension: .hpp
// Location: cpp-engine/include/utils/file_utils.hpp

#pragma once

#include <string>
#include <vector>
#include <chrono>
#include <unordered_map>

namespace CppMasteryHub {
namespace Utils {

/**
 * @brief Enumeration for file permissions
 */
enum class FilePermission {
    Read,
    Write,
    Execute
};

/**
 * @brief Utility class for file and directory operations
 * 
 * This class provides a comprehensive set of static methods for file system
 * operations including reading, writing, copying, moving, and directory management.
 */
class FileUtils {
public:
    // File existence and type checking
    static bool exists(const std::string& path);
    static bool isFile(const std::string& path);
    static bool isDirectory(const std::string& path);
    
    // File reading and writing
    static std::string readFile(const std::string& path);
    static bool writeFile(const std::string& path, const std::string& content);
    static bool appendFile(const std::string& path, const std::string& content);
    
    // File operations
    static bool deleteFile(const std::string& path);
    static bool copyFile(const std::string& source, const std::string& destination);
    static bool moveFile(const std::string& source, const std::string& destination);
    
    // File information
    static size_t getFileSize(const std::string& path);
    static std::chrono::system_clock::time_point getLastModified(const std::string& path);
    
    // Directory operations
    static bool createDirectory(const std::string& path);
    static bool createDirectories(const std::string& path);
    static bool deleteDirectory(const std::string& path, bool recursive = false);
    static std::vector<std::string> listDirectory(const std::string& path, bool recursive = false);
    
    // Path manipulation
    static std::string getFileName(const std::string& path);
    static std::string getFileExtension(const std::string& path);
    static std::string getBaseName(const std::string& path);
    static std::string getParentPath(const std::string& path);
    static std::string getAbsolutePath(const std::string& path);
    static std::string joinPath(const std::string& path1, const std::string& path2);
    static std::string normalizePath(const std::string& path);
    
    // Current directory operations
    static std::string getCurrentDirectory();
    static bool setCurrentDirectory(const std::string& path);
    
    // Path validation
    static bool isSubPath(const std::string& parent, const std::string& child);
    
    // Temporary file operations
    static std::string createTempFile(const std::string& prefix = "temp", const std::string& suffix = ".tmp");
    static std::string createTempDirectory(const std::string& prefix = "temp");
    
    // Permission checking
    static bool hasPermission(const std::string& path, FilePermission permission);
    
    // MIME type detection
    static std::string getMimeType(const std::string& path);
    
    // Directory size calculation
    static size_t calculateDirectorySize(const std::string& path);
    
private:
    FileUtils() = delete; // Utility class, no instantiation
};

} // namespace Utils
} // namespace CppMasteryHub