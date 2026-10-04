#pragma once

#include <cstddef>
#include <cstdint>
#include <string>
#include <string_view>
#include <vector>

namespace cppmastery {

/// A 1-based line/column position inside a source file.
struct Position {
    std::uint32_t line = 1;
    std::uint32_t column = 1;

    friend constexpr bool operator==(const Position&, const Position&) = default;
};

/// Immutable view over a unit of source text with O(log n) offset -> position mapping.
///
/// The line table is built once at construction. Both `\n` and `\r\n` are accepted as
/// line terminators; a trailing newline does not create an extra empty line.
class SourceText {
public:
    SourceText() = default;
    explicit SourceText(std::string text);

    [[nodiscard]] std::string_view text() const noexcept { return text_; }
    [[nodiscard]] std::size_t size() const noexcept { return text_.size(); }
    [[nodiscard]] bool empty() const noexcept { return text_.empty(); }

    /// Number of physical lines. An empty document has zero lines.
    [[nodiscard]] std::size_t lineCount() const noexcept;

    /// Byte offset of the first character of a 1-based line. Precondition: 1 <= line <=
    /// lineCount().
    [[nodiscard]] std::size_t lineStart(std::size_t line) const;

    /// Content of a 1-based line without its terminator.
    [[nodiscard]] std::string_view line(std::size_t line) const;

    /// Maps a byte offset (0 <= offset <= size()) to a 1-based position. Columns count bytes.
    [[nodiscard]] Position positionAt(std::size_t offset) const;

private:
    std::string text_;
    std::vector<std::size_t> lineStarts_;  // lineStarts_[i] = offset of line i+1
};

}  // namespace cppmastery
