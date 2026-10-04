#include "cppmastery/json/json_writer.hpp"

#include <charconv>
#include <cmath>

namespace cppmastery::json {

void Writer::escape(std::string& out, std::string_view s) {
    out.push_back('"');
    for (const char sc : s) {
        const auto ch = static_cast<unsigned char>(sc);
        switch (ch) {
            case '"': out += "\\\""; break;
            case '\\': out += "\\\\"; break;
            case '\b': out += "\\b"; break;
            case '\f': out += "\\f"; break;
            case '\n': out += "\\n"; break;
            case '\r': out += "\\r"; break;
            case '\t': out += "\\t"; break;
            default:
                if (ch < 0x20) {
                    static constexpr char kHex[] = "0123456789abcdef";
                    out += "\\u00";
                    out.push_back(kHex[ch >> 4]);
                    out.push_back(kHex[ch & 0x0F]);
                } else {
                    out.push_back(static_cast<char>(ch));
                }
        }
    }
    out.push_back('"');
}

void Writer::separator() {
    if (pendingKey_) {
        pendingKey_ = false;
        return;
    }
    if (!firstInScope_.empty()) {
        if (!firstInScope_.back()) out_.push_back(',');
        firstInScope_.back() = false;
    }
}

Writer& Writer::beginObject() {
    separator();
    out_.push_back('{');
    firstInScope_.push_back(true);
    return *this;
}

Writer& Writer::endObject() {
    out_.push_back('}');
    if (!firstInScope_.empty()) firstInScope_.pop_back();
    return *this;
}

Writer& Writer::beginArray() {
    separator();
    out_.push_back('[');
    firstInScope_.push_back(true);
    return *this;
}

Writer& Writer::endArray() {
    out_.push_back(']');
    if (!firstInScope_.empty()) firstInScope_.pop_back();
    return *this;
}

Writer& Writer::key(std::string_view k) {
    separator();
    escape(out_, k);
    out_.push_back(':');
    pendingKey_ = true;
    return *this;
}

Writer& Writer::value(std::string_view v) {
    separator();
    escape(out_, v);
    return *this;
}

Writer& Writer::value(bool v) {
    separator();
    out_ += v ? "true" : "false";
    return *this;
}

Writer& Writer::value(double v) {
    separator();
    if (!std::isfinite(v)) {
        out_ += "null";
        return *this;
    }
    char buf[64];
    const auto r = std::to_chars(buf, buf + sizeof buf, v);
    out_.append(buf, r.ptr);
    return *this;
}

Writer& Writer::value(long long v) {
    separator();
    char buf[32];
    const auto r = std::to_chars(buf, buf + sizeof buf, v);
    out_.append(buf, r.ptr);
    return *this;
}

Writer& Writer::value(unsigned long long v) {
    separator();
    char buf[32];
    const auto r = std::to_chars(buf, buf + sizeof buf, v);
    out_.append(buf, r.ptr);
    return *this;
}

Writer& Writer::null() {
    separator();
    out_ += "null";
    return *this;
}

}  // namespace cppmastery::json
