// File: cpp-engine/include/utils/string_utils.hpp
// Extension: .hpp
// Location: cpp-engine/include/utils/string_utils.hpp

#pragma once

#include <string>
#include <vector>
#include <chrono>
#include <random>

namespace CppMasteryHub {
namespace Utils {

/**
 * @brief Utility class for string manipulation and formatting operations
 * 
 * This class provides a comprehensive set of static methods for common string
 * operations including trimming, case conversion, splitting, joining, and validation.
 */
class StringUtils {
public:
    // String manipulation methods
    static std::string trim(const std::string& str);
    static std::string toLower(const std::string& str);
    static std::string toUpper(const std::string& str);
    
    // String splitting and joining
    static std::vector<std::string> split(const std::string& str, char delimiter);
    static std::vector<std::string> split(const std::string& str, const std::string& delimiter);
    static std::string join(const std::vector<std::string>& strings, const std::string& delimiter);
    
    // String searching and matching
    static bool startsWith(const std::string& str, const std::string& prefix);
    static bool endsWith(const std::string& str, const std::string& suffix);
    static bool contains(const std::string& str, const std::string& substr);
    
    // String replacement
    static std::string replace(const std::string& str, const std::string& from, const std::string& to);
    static std::string replaceAll(const std::string& str, const std::string& from, const std::string& to);
    
    // String escaping and unescaping
    static std::string escape(const std::string& str);
    static std::string unescape(const std::string& str);
    
    // String validation
    static bool isDigits(const std::string& str);
    static bool isAlpha(const std::string& str);
    static bool isAlphaNumeric(const std::string& str);
    static bool isWhitespace(const std::string& str);
    static bool isValidEmail(const std::string& email);
    static bool isValidUrl(const std::string& url);
    
    // Formatting utilities
    static std::string formatBytes(size_t bytes);
    static std::string formatDuration(std::chrono::milliseconds ms);
    
    // Generation utilities
    static std::string generateRandomString(size_t length);
    static std::string generateUUID();
    
    // File and path utilities
    static std::string sanitizeFilename(const std::string& filename);
    
    // Code processing utilities
    static std::string removeComments(const std::string& code);
    static size_t countLines(const std::string& str);
    
    // String padding and truncation
    static std::string truncate(const std::string& str, size_t maxLength, const std::string& suffix = "...");
    static std::string padLeft(const std::string& str, size_t width, char padChar = ' ');
    static std::string padRight(const std::string& str, size_t width, char padChar = ' ');
    
private:
    StringUtils() = delete; // Utility class, no instantiation
};

} // namespace Utils
} // namespace CppMasteryHub