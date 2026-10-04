#pragma once

#include <cstdint>
#include <string>
#include <string_view>
#include <vector>

namespace cppmastery::json {

/// Minimal streaming JSON writer (RFC 8259). Produces compact output with correct escaping of
/// control characters, quotes, backslashes and non-finite doubles (emitted as null).
///
/// Usage:
///   Writer w;
///   w.beginObject().key("a").value(1).key("b").beginArray().value("x").endArray().endObject();
///   std::string s = w.str();
class Writer {
public:
    Writer& beginObject();
    Writer& endObject();
    Writer& beginArray();
    Writer& endArray();
    Writer& key(std::string_view k);

    Writer& value(std::string_view v);
    Writer& value(const char* v) { return value(std::string_view{v}); }
    Writer& value(const std::string& v) { return value(std::string_view{v}); }
    Writer& value(bool v);
    Writer& value(double v);
    Writer& value(int v) { return value(static_cast<long long>(v)); }
    Writer& value(long v) { return value(static_cast<long long>(v)); }
    Writer& value(long long v);
    Writer& value(unsigned v) { return value(static_cast<unsigned long long>(v)); }
    Writer& value(unsigned long v) { return value(static_cast<unsigned long long>(v)); }
    Writer& value(unsigned long long v);
    Writer& null();

    [[nodiscard]] const std::string& str() const noexcept { return out_; }
    [[nodiscard]] std::string release() noexcept { return std::move(out_); }

    static void escape(std::string& out, std::string_view s);

private:
    void separator();
    std::string out_;
    std::vector<bool> firstInScope_;  // true until the first element of the innermost scope
    bool pendingKey_ = false;
};

}  // namespace cppmastery::json
