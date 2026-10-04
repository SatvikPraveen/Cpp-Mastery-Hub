#include "cppmastery/source_text.hpp"

#include <algorithm>
#include <utility>

namespace cppmastery {

SourceText::SourceText(std::string text) : text_(std::move(text)) {
    if (text_.empty()) return;
    lineStarts_.push_back(0);
    for (std::size_t i = 0; i < text_.size(); ++i) {
        if (text_[i] == '\n' && i + 1 < text_.size()) lineStarts_.push_back(i + 1);
    }
}

std::size_t SourceText::lineCount() const noexcept {
    return lineStarts_.size();
}

std::size_t SourceText::lineStart(std::size_t line) const {
    return lineStarts_.at(line - 1);
}

std::string_view SourceText::line(std::size_t line) const {
    const std::size_t start = lineStart(line);
    std::size_t end = (line < lineStarts_.size()) ? lineStarts_[line] : text_.size();
    // Strip the terminator ("\n" or "\r\n").
    if (end > start && text_[end - 1] == '\n') --end;
    if (end > start && text_[end - 1] == '\r') --end;
    return std::string_view{text_}.substr(start, end - start);
}

Position SourceText::positionAt(std::size_t offset) const {
    if (lineStarts_.empty()) return Position{1, 1};
    offset = std::min(offset, text_.size());
    // Last line whose start is <= offset.
    auto it = std::upper_bound(lineStarts_.begin(), lineStarts_.end(), offset);
    const auto index = static_cast<std::size_t>(std::distance(lineStarts_.begin(), it)) - 1;
    return Position{static_cast<std::uint32_t>(index + 1),
                    static_cast<std::uint32_t>(offset - lineStarts_[index] + 1)};
}

}  // namespace cppmastery
