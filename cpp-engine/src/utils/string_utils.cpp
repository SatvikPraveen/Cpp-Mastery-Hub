// File: cpp-engine/src/utils/string_utils.cpp
// Extension: .cpp
// Location: cpp-engine/src/utils/string_utils.cpp

#include "../include/utils/string_utils.hpp"
#include <algorithm>
#include <cctype>
#include <sstream>
#include <regex>
#include <iomanip>

namespace CppMasteryHub {
namespace Utils {

std::string StringUtils::trim(const std::string& str) {
    size_t start = str.find_first_not_of(" \t\n\r\f\v");
    if (start == std::string::npos) {
        return "";
    }
    
    size_t end = str.find_last_not_of(" \t\n\r\f\v");
    return str.substr(start, end - start + 1);
}

std::string StringUtils::toLower(const std::string& str) {
    std::string result = str;
    std::transform(result.begin(), result.end(), result.begin(),
                   [](unsigned char c) { return std::tolower(c); });
    return result;
}

std::string StringUtils::toUpper(const std::string& str) {
    std::string result = str;
    std::transform(result.begin(), result.end(), result.begin(),
                   [](unsigned char c) { return std::toupper(c); });
    return result;
}

std::vector<std::string> StringUtils::split(const std::string& str, char delimiter) {
    std::vector<std::string> tokens;
    std::stringstream ss(str);
    std::string token;
    
    while (std::getline(ss, token, delimiter)) {
        tokens.push_back(token);
    }
    
    return tokens;
}

std::vector<std::string> StringUtils::split(const std::string& str, const std::string& delimiter) {
    std::vector<std::string> tokens;
    size_t start = 0;
    size_t end = str.find(delimiter);
    
    while (end != std::string::npos) {
        tokens.push_back(str.substr(start, end - start));
        start = end + delimiter.length();
        end = str.find(delimiter, start);
    }
    
    tokens.push_back(str.substr(start));
    return tokens;
}

std::string StringUtils::join(const std::vector<std::string>& strings, const std::string& delimiter) {
    if (strings.empty()) {
        return "";
    }
    
    std::ostringstream oss;
    oss << strings[0];
    
    for (size_t i = 1; i < strings.size(); ++i) {
        oss << delimiter << strings[i];
    }
    
    return oss.str();
}

bool StringUtils::startsWith(const std::string& str, const std::string& prefix) {
    return str.length() >= prefix.length() && 
           str.compare(0, prefix.length(), prefix) == 0;
}

bool StringUtils::endsWith(const std::string& str, const std::string& suffix) {
    return str.length() >= suffix.length() && 
           str.compare(str.length() - suffix.length(), suffix.length(), suffix) == 0;
}

bool StringUtils::contains(const std::string& str, const std::string& substr) {
    return str.find(substr) != std::string::npos;
}

std::string StringUtils::replace(const std::string& str, const std::string& from, const std::string& to) {
    std::string result = str;
    size_t pos = 0;
    
    while ((pos = result.find(from, pos)) != std::string::npos) {
        result.replace(pos, from.length(), to);
        pos += to.length();
    }
    
    return result;
}

std::string StringUtils::replaceAll(const std::string& str, const std::string& from, const std::string& to) {
    return replace(str, from, to);
}

std::string StringUtils::escape(const std::string& str) {
    std::string result;
    result.reserve(str.size() * 1.1); // Reserve some extra space
    
    for (char c : str) {
        switch (c) {
            case '\n':
                result += "\\n";
                break;
            case '\t':
                result += "\\t";
                break;
            case '\r':
                result += "\\r";
                break;
            case '\\':
                result += "\\\\";
                break;
            case '"':
                result += "\\\"";
                break;
            case '\'':
                result += "\\'";
                break;
            default:
                result += c;
                break;
        }
    }
    
    return result;
}

std::string StringUtils::unescape(const std::string& str) {
    std::string result;
    result.reserve(str.size());
    
    for (size_t i = 0; i < str.size(); ++i) {
        if (str[i] == '\\' && i + 1 < str.size()) {
            switch (str[i + 1]) {
                case 'n':
                    result += '\n';
                    ++i;
                    break;
                case 't':
                    result += '\t';
                    ++i;
                    break;
                case 'r':
                    result += '\r';
                    ++i;
                    break;
                case '\\':
                    result += '\\';
                    ++i;
                    break;
                case '"':
                    result += '"';
                    ++i;
                    break;
                case '\'':
                    result += '\'';
                    ++i;
                    break;
                default:
                    result += str[i];
                    break;
            }
        } else {
            result += str[i];
        }
    }
    
    return result;
}

bool StringUtils::isDigits(const std::string& str) {
    return !str.empty() && std::all_of(str.begin(), str.end(), ::isdigit);
}

bool StringUtils::isAlpha(const std::string& str) {
    return !str.empty() && std::all_of(str.begin(), str.end(), ::isalpha);
}

bool StringUtils::isAlphaNumeric(const std::string& str) {
    return !str.empty() && std::all_of(str.begin(), str.end(), ::isalnum);
}

bool StringUtils::isWhitespace(const std::string& str) {
    return std::all_of(str.begin(), str.end(), ::isspace);
}

std::string StringUtils::formatBytes(size_t bytes) {
    const char* units[] = {"B", "KB", "MB", "GB", "TB"};
    const size_t numUnits = sizeof(units) / sizeof(units[0]);
    
    double size = static_cast<double>(bytes);
    size_t unitIndex = 0;
    
    while (size >= 1024.0 && unitIndex < numUnits - 1) {
        size /= 1024.0;
        unitIndex++;
    }
    
    std::ostringstream oss;
    oss << std::fixed << std::setprecision(2) << size << " " << units[unitIndex];
    return oss.str();
}

std::string StringUtils::formatDuration(std::chrono::milliseconds ms) {
    auto totalMs = ms.count();
    
    if (totalMs < 1000) {
        return std::to_string(totalMs) + "ms";
    }
    
    auto seconds = totalMs / 1000;
    auto remainingMs = totalMs % 1000;
    
    if (seconds < 60) {
        std::ostringstream oss;
        oss << std::fixed << std::setprecision(3) << (static_cast<double>(totalMs) / 1000.0) << "s";
        return oss.str();
    }
    
    auto minutes = seconds / 60;
    auto remainingSeconds = seconds % 60;
    
    if (minutes < 60) {
        return std::to_string(minutes) + "m " + std::to_string(remainingSeconds) + "s";
    }
    
    auto hours = minutes / 60;
    auto remainingMinutes = minutes % 60;
    
    return std::to_string(hours) + "h " + std::to_string(remainingMinutes) + "m";
}

std::string StringUtils::generateRandomString(size_t length) {
    const std::string charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    std::string result;
    result.reserve(length);
    
    std::random_device rd;
    std::mt19937 gen(rd());
    std::uniform_int_distribution<> dis(0, charset.size() - 1);
    
    for (size_t i = 0; i < length; ++i) {
        result += charset[dis(gen)];
    }
    
    return result;
}

std::string StringUtils::generateUUID() {
    std::random_device rd;
    std::mt19937 gen(rd());
    std::uniform_int_distribution<> dis(0, 15);
    std::uniform_int_distribution<> dis2(8, 11);
    
    std::ostringstream oss;
    oss << std::hex;
    
    for (int i = 0; i < 8; i++) {
        oss << dis(gen);
    }
    oss << "-";
    
    for (int i = 0; i < 4; i++) {
        oss << dis(gen);
    }
    oss << "-4";
    
    for (int i = 0; i < 3; i++) {
        oss << dis(gen);
    }
    oss << "-";
    
    oss << dis2(gen);
    for (int i = 0; i < 3; i++) {
        oss << dis(gen);
    }
    oss << "-";
    
    for (int i = 0; i < 12; i++) {
        oss << dis(gen);
    }
    
    return oss.str();
}

bool StringUtils::isValidEmail(const std::string& email) {
    const std::regex emailRegex(R"(^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$)");
    return std::regex_match(email, emailRegex);
}

bool StringUtils::isValidUrl(const std::string& url) {
    const std::regex urlRegex(R"(^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$)");
    return std::regex_match(url, urlRegex);
}

std::string StringUtils::sanitizeFilename(const std::string& filename) {
    std::string result = filename;
    
    // Remove or replace invalid characters
    const std::string invalidChars = "<>:\"/\\|?*";
    for (char c : invalidChars) {
        result = replace(result, std::string(1, c), "_");
    }
    
    // Remove control characters
    result.erase(
        std::remove_if(result.begin(), result.end(), 
                      [](unsigned char c) { return c < 32; }),
        result.end()
    );
    
    // Trim whitespace
    result = trim(result);
    
    // Ensure it's not empty
    if (result.empty()) {
        result = "unnamed_file";
    }
    
    return result;
}

std::string StringUtils::removeComments(const std::string& code) {
    std::string result;
    result.reserve(code.size());
    
    bool inSingleLineComment = false;
    bool inMultiLineComment = false;
    bool inString = false;
    bool inChar = false;
    
    for (size_t i = 0; i < code.size(); ++i) {
        char current = code[i];
        char next = (i + 1 < code.size()) ? code[i + 1] : '\0';
        
        if (inString) {
            result += current;
            if (current == '"' && (i == 0 || code[i - 1] != '\\')) {
                inString = false;
            }
        } else if (inChar) {
            result += current;
            if (current == '\'' && (i == 0 || code[i - 1] != '\\')) {
                inChar = false;
            }
        } else if (inSingleLineComment) {
            if (current == '\n') {
                inSingleLineComment = false;
                result += current;
            }
        } else if (inMultiLineComment) {
            if (current == '*' && next == '/') {
                inMultiLineComment = false;
                ++i; // Skip the '/'
            }
        } else {
            if (current == '"') {
                inString = true;
                result += current;
            } else if (current == '\'') {
                inChar = true;
                result += current;
            } else if (current == '/' && next == '/') {
                inSingleLineComment = true;
                ++i; // Skip the second '/'
            } else if (current == '/' && next == '*') {
                inMultiLineComment = true;
                ++i; // Skip the '*'
            } else {
                result += current;
            }
        }
    }
    
    return result;
}

size_t StringUtils::countLines(const std::string& str) {
    return std::count(str.begin(), str.end(), '\n') + 1;
}

std::string StringUtils::truncate(const std::string& str, size_t maxLength, const std::string& suffix) {
    if (str.length() <= maxLength) {
        return str;
    }
    
    if (maxLength <= suffix.length()) {
        return suffix.substr(0, maxLength);
    }
    
    return str.substr(0, maxLength - suffix.length()) + suffix;
}

std::string StringUtils::padLeft(const std::string& str, size_t width, char padChar) {
    if (str.length() >= width) {
        return str;
    }
    
    return std::string(width - str.length(), padChar) + str;
}

std::string StringUtils::padRight(const std::string& str, size_t width, char padChar) {
    if (str.length() >= width) {
        return str;
    }
    
    return str + std::string(width - str.length(), padChar);
}

} // namespace Utils
} // namespace CppMasteryHub