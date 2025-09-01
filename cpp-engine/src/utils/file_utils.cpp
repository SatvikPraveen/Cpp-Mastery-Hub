// File: cpp-engine/src/utils/file_utils.cpp
// Extension: .cpp
// Location: cpp-engine/src/utils/file_utils.cpp

#include "../include/utils/file_utils.hpp"
#include "../include/utils/logger.hpp"
#include <fstream>
#include <sstream>
#include <filesystem>
#include <system_error>

namespace CppMasteryHub {
namespace Utils {

bool FileUtils::exists(const std::string& path) {
    std::error_code ec;
    return std::filesystem::exists(path, ec);
}

bool FileUtils::isFile(const std::string& path) {
    std::error_code ec;
    return std::filesystem::is_regular_file(path, ec);
}

bool FileUtils::isDirectory(const std::string& path) {
    std::error_code ec;
    return std::filesystem::is_directory(path, ec);
}

std::string FileUtils::readFile(const std::string& path) {
    std::ifstream file(path, std::ios::binary);
    if (!file.is_open()) {
        Logger::error("Failed to open file for reading: " + path);
        throw std::runtime_error("Cannot open file: " + path);
    }
    
    std::ostringstream buffer;
    buffer << file.rdbuf();
    
    if (file.bad()) {
        Logger::error("Error reading file: " + path);
        throw std::runtime_error("Error reading file: " + path);
    }
    
    return buffer.str();
}

bool FileUtils::writeFile(const std::string& path, const std::string& content) {
    try {
        // Create parent directories if they don't exist
        createDirectories(getParentPath(path));
        
        std::ofstream file(path, std::ios::binary | std::ios::trunc);
        if (!file.is_open()) {
            Logger::error("Failed to open file for writing: " + path);
            return false;
        }
        
        file << content;
        
        if (file.bad()) {
            Logger::error("Error writing to file: " + path);
            return false;
        }
        
        return true;
    } catch (const std::exception& e) {
        Logger::error("Exception writing file: " + path + " - " + e.what());
        return false;
    }
}

bool FileUtils::appendFile(const std::string& path, const std::string& content) {
    try {
        std::ofstream file(path, std::ios::binary | std::ios::app);
        if (!file.is_open()) {
            Logger::error("Failed to open file for appending: " + path);
            return false;
        }
        
        file << content;
        
        if (file.bad()) {
            Logger::error("Error appending to file: " + path);
            return false;
        }
        
        return true;
    } catch (const std::exception& e) {
        Logger::error("Exception appending to file: " + path + " - " + e.what());
        return false;
    }
}

bool FileUtils::deleteFile(const std::string& path) {
    std::error_code ec;
    bool result = std::filesystem::remove(path, ec);
    
    if (ec) {
        Logger::error("Failed to delete file: " + path + " - " + ec.message());
        return false;
    }
    
    return result;
}

bool FileUtils::copyFile(const std::string& source, const std::string& destination) {
    try {
        createDirectories(getParentPath(destination));
        
        std::error_code ec;
        std::filesystem::copy_file(source, destination, 
                                   std::filesystem::copy_options::overwrite_existing, ec);
        
        if (ec) {
            Logger::error("Failed to copy file from " + source + " to " + destination + " - " + ec.message());
            return false;
        }
        
        return true;
    } catch (const std::exception& e) {
        Logger::error("Exception copying file: " + std::string(e.what()));
        return false;
    }
}

bool FileUtils::moveFile(const std::string& source, const std::string& destination) {
    try {
        createDirectories(getParentPath(destination));
        
        std::error_code ec;
        std::filesystem::rename(source, destination, ec);
        
        if (ec) {
            Logger::error("Failed to move file from " + source + " to " + destination + " - " + ec.message());
            return false;
        }
        
        return true;
    } catch (const std::exception& e) {
        Logger::error("Exception moving file: " + std::string(e.what()));
        return false;
    }
}

size_t FileUtils::getFileSize(const std::string& path) {
    std::error_code ec;
    auto size = std::filesystem::file_size(path, ec);
    
    if (ec) {
        Logger::warn("Failed to get file size: " + path + " - " + ec.message());
        return 0;
    }
    
    return size;
}

std::chrono::system_clock::time_point FileUtils::getLastModified(const std::string& path) {
    std::error_code ec;
    auto ftime = std::filesystem::last_write_time(path, ec);
    
    if (ec) {
        Logger::warn("Failed to get last modified time: " + path + " - " + ec.message());
        return std::chrono::system_clock::time_point{};
    }
    
    // Convert file_time to system_clock time_point
    auto sctp = std::chrono::time_point_cast<std::chrono::system_clock::duration>(
        ftime - std::filesystem::file_time_type::clock::now() + std::chrono::system_clock::now());
    
    return sctp;
}

bool FileUtils::createDirectory(const std::string& path) {
    std::error_code ec;
    bool result = std::filesystem::create_directory(path, ec);
    
    if (ec && ec != std::errc::file_exists) {
        Logger::error("Failed to create directory: " + path + " - " + ec.message());
        return false;
    }
    
    return true;
}

bool FileUtils::createDirectories(const std::string& path) {
    if (path.empty()) {
        return true;
    }
    
    std::error_code ec;
    bool result = std::filesystem::create_directories(path, ec);
    
    if (ec && ec != std::errc::file_exists) {
        Logger::error("Failed to create directories: " + path + " - " + ec.message());
        return false;
    }
    
    return true;
}

bool FileUtils::deleteDirectory(const std::string& path, bool recursive) {
    std::error_code ec;
    uintmax_t removed = 0;
    
    if (recursive) {
        removed = std::filesystem::remove_all(path, ec);
    } else {
        removed = std::filesystem::remove(path, ec) ? 1 : 0;
    }
    
    if (ec) {
        Logger::error("Failed to delete directory: " + path + " - " + ec.message());
        return false;
    }
    
    return removed > 0;
}

std::vector<std::string> FileUtils::listDirectory(const std::string& path, bool recursive) {
    std::vector<std::string> files;
    std::error_code ec;
    
    try {
        if (recursive) {
            for (const auto& entry : std::filesystem::recursive_directory_iterator(path, ec)) {
                if (ec) {
                    Logger::warn("Error iterating directory: " + ec.message());
                    break;
                }
                if (entry.is_regular_file(ec)) {
                    files.push_back(entry.path().string());
                }
            }
        } else {
            for (const auto& entry : std::filesystem::directory_iterator(path, ec)) {
                if (ec) {
                    Logger::warn("Error iterating directory: " + ec.message());
                    break;
                }
                if (entry.is_regular_file(ec)) {
                    files.push_back(entry.path().string());
                }
            }
        }
    } catch (const std::exception& e) {
        Logger::error("Exception listing directory: " + path + " - " + e.what());
    }
    
    return files;
}

std::string FileUtils::getFileName(const std::string& path) {
    std::filesystem::path p(path);
    return p.filename().string();
}

std::string FileUtils::getFileExtension(const std::string& path) {
    std::filesystem::path p(path);
    return p.extension().string();
}

std::string FileUtils::getBaseName(const std::string& path) {
    std::filesystem::path p(path);
    return p.stem().string();
}

std::string FileUtils::getParentPath(const std::string& path) {
    std::filesystem::path p(path);
    return p.parent_path().string();
}

std::string FileUtils::getAbsolutePath(const std::string& path) {
    std::error_code ec;
    auto absPath = std::filesystem::absolute(path, ec);
    
    if (ec) {
        Logger::warn("Failed to get absolute path: " + path + " - " + ec.message());
        return path;
    }
    
    return absPath.string();
}

std::string FileUtils::getCurrentDirectory() {
    std::error_code ec;
    auto currentPath = std::filesystem::current_path(ec);
    
    if (ec) {
        Logger::error("Failed to get current directory: " + ec.message());
        return "";
    }
    
    return currentPath.string();
}

bool FileUtils::setCurrentDirectory(const std::string& path) {
    std::error_code ec;
    std::filesystem::current_path(path, ec);
    
    if (ec) {
        Logger::error("Failed to set current directory: " + path + " - " + ec.message());
        return false;
    }
    
    return true;
}

std::string FileUtils::joinPath(const std::string& path1, const std::string& path2) {
    std::filesystem::path p1(path1);
    std::filesystem::path p2(path2);
    return (p1 / p2).string();
}

std::string FileUtils::normalizePath(const std::string& path) {
    std::filesystem::path p(path);
    return p.lexically_normal().string();
}

bool FileUtils::isSubPath(const std::string& parent, const std::string& child) {
    std::filesystem::path parentPath = std::filesystem::absolute(parent);
    std::filesystem::path childPath = std::filesystem::absolute(child);
    
    auto mismatch = std::mismatch(parentPath.begin(), parentPath.end(),
                                  childPath.begin(), childPath.end());
    
    return mismatch.first == parentPath.end();
}

std::string FileUtils::createTempFile(const std::string& prefix, const std::string& suffix) {
    try {
        std::filesystem::path tempDir = std::filesystem::temp_directory_path();
        std::string filename = prefix + "_" + std::to_string(std::rand()) + suffix;
        std::filesystem::path tempFile = tempDir / filename;
        
        // Create an empty file
        std::ofstream file(tempFile);
        if (!file.is_open()) {
            throw std::runtime_error("Failed to create temp file");
        }
        file.close();
        
        return tempFile.string();
    } catch (const std::exception& e) {
        Logger::error("Failed to create temp file: " + std::string(e.what()));
        return "";
    }
}

std::string FileUtils::createTempDirectory(const std::string& prefix) {
    try {
        std::filesystem::path tempDir = std::filesystem::temp_directory_path();
        std::string dirname = prefix + "_" + std::to_string(std::rand());
        std::filesystem::path tempPath = tempDir / dirname;
        
        std::error_code ec;
        std::filesystem::create_directory(tempPath, ec);
        
        if (ec) {
            throw std::runtime_error("Failed to create temp directory: " + ec.message());
        }
        
        return tempPath.string();
    } catch (const std::exception& e) {
        Logger::error("Failed to create temp directory: " + std::string(e.what()));
        return "";
    }
}

bool FileUtils::hasPermission(const std::string& path, FilePermission permission) {
    std::error_code ec;
    auto perms = std::filesystem::status(path, ec).permissions();
    
    if (ec) {
        Logger::warn("Failed to check permissions: " + path + " - " + ec.message());
        return false;
    }
    
    switch (permission) {
        case FilePermission::Read:
            return (perms & std::filesystem::perms::owner_read) != std::filesystem::perms::none;
        case FilePermission::Write:
            return (perms & std::filesystem::perms::owner_write) != std::filesystem::perms::none;
        case FilePermission::Execute:
            return (perms & std::filesystem::perms::owner_exec) != std::filesystem::perms::none;
        default:
            return false;
    }
}

std::string FileUtils::getMimeType(const std::string& path) {
    std::string extension = getFileExtension(path);
    std::transform(extension.begin(), extension.end(), extension.begin(), ::tolower);
    
    static const std::unordered_map<std::string, std::string> mimeTypes = {
        {".cpp", "text/x-c++src"},
        {".cc", "text/x-c++src"},
        {".cxx", "text/x-c++src"},
        {".c++", "text/x-c++src"},
        {".hpp", "text/x-c++hdr"},
        {".hh", "text/x-c++hdr"},
        {".hxx", "text/x-c++hdr"},
        {".h++", "text/x-c++hdr"},
        {".h", "text/x-chdr"},
        {".c", "text/x-csrc"},
        {".txt", "text/plain"},
        {".md", "text/markdown"},
        {".json", "application/json"},
        {".xml", "application/xml"},
        {".html", "text/html"},
        {".css", "text/css"},
        {".js", "application/javascript"},
        {".pdf", "application/pdf"},
        {".zip", "application/zip"},
        {".tar", "application/x-tar"},
        {".gz", "application/gzip"}
    };
    
    auto it = mimeTypes.find(extension);
    return (it != mimeTypes.end()) ? it->second : "application/octet-stream";
}

size_t FileUtils::calculateDirectorySize(const std::string& path) {
    size_t totalSize = 0;
    std::error_code ec;
    
    try {
        for (const auto& entry : std::filesystem::recursive_directory_iterator(path, ec)) {
            if (ec) {
                Logger::warn("Error calculating directory size: " + ec.message());
                break;
            }
            
            if (entry.is_regular_file(ec)) {
                auto size = entry.file_size(ec);
                if (!ec) {
                    totalSize += size;
                }
            }
        }
    } catch (const std::exception& e) {
        Logger::error("Exception calculating directory size: " + path + " - " + e.what());
    }
    
    return totalSize;
}

} // namespace Utils
} // namespace CppMasteryHub