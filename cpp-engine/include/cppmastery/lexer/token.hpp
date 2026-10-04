#pragma once

#include <cstddef>
#include <cstdint>
#include <string_view>

#include "cppmastery/source_text.hpp"

namespace cppmastery {

enum class TokenKind : std::uint8_t {
    Identifier,
    Keyword,
    IntegerLiteral,
    FloatingLiteral,
    CharLiteral,
    StringLiteral,
    Punctuator,
    Preprocessor,  ///< A full preprocessor directive, including continuation lines.
    LineComment,
    BlockComment,
    Unknown,  ///< Any byte sequence the lexer could not classify (never dropped silently).
    EndOfFile,
};

[[nodiscard]] std::string_view toString(TokenKind kind) noexcept;

/// True for the 90-odd reserved words of C++20 plus the alternative tokens (`and`, `or`, ...).
[[nodiscard]] bool isKeyword(std::string_view text) noexcept;

/// True for keywords that name fundamental types (`int`, `unsigned`, `char8_t`, ...).
[[nodiscard]] bool isFundamentalTypeKeyword(std::string_view text) noexcept;

struct Token {
    TokenKind kind = TokenKind::EndOfFile;
    std::string_view text;   ///< View into the owning SourceText.
    std::size_t offset = 0;  ///< Byte offset of the first character.
    Position position{};     ///< 1-based line/column of the first character.

    [[nodiscard]] bool is(TokenKind k) const noexcept { return kind == k; }
    [[nodiscard]] bool is(TokenKind k, std::string_view t) const noexcept {
        return kind == k && text == t;
    }
    [[nodiscard]] bool isPunct(std::string_view t) const noexcept {
        return kind == TokenKind::Punctuator && text == t;
    }
    [[nodiscard]] bool isKeyword(std::string_view t) const noexcept {
        return kind == TokenKind::Keyword && text == t;
    }
    [[nodiscard]] bool isComment() const noexcept {
        return kind == TokenKind::LineComment || kind == TokenKind::BlockComment;
    }
    [[nodiscard]] bool isLiteral() const noexcept {
        return kind == TokenKind::IntegerLiteral || kind == TokenKind::FloatingLiteral ||
               kind == TokenKind::CharLiteral || kind == TokenKind::StringLiteral;
    }
    [[nodiscard]] std::size_t end() const noexcept { return offset + text.size(); }
};

}  // namespace cppmastery
