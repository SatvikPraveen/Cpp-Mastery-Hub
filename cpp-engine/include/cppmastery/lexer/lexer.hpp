#pragma once

#include <vector>

#include "cppmastery/lexer/token.hpp"
#include "cppmastery/source_text.hpp"

namespace cppmastery {

struct LexOptions {
    bool keepComments = true;      ///< Emit LineComment / BlockComment tokens.
    bool keepPreprocessor = true;  ///< Emit Preprocessor tokens (otherwise directives are skipped).
};

/// A single-pass, allocation-free C++ tokenizer.
///
/// Design goals, in priority order:
///   1. Total: every input (including malformed or binary data) produces a token stream that
///      covers the input exactly once with no gaps other than whitespace. Unterminated literals
///      and comments are reported as `Unknown` / partial tokens rather than failures.
///   2. Faithful on well-formed C++20: raw strings with custom delimiters, encoding prefixes,
///      digit separators, hex floats, user-defined literal suffixes, and all multi-character
///      punctuators (longest match, including `<=>` and `->*`).
///   3. Fast: O(n) with a small constant; the tokens view into the source rather than copying.
///
/// Non-goals: preprocessing (macros are not expanded), trigraphs, and universal-character-names
/// in identifiers (they are lexed as `Unknown`). Alternative tokens like `and` are keywords.
class Lexer {
public:
    explicit Lexer(const SourceText& source, LexOptions options = {}) noexcept;

    /// Returns the next token; after the end, returns EndOfFile repeatedly.
    [[nodiscard]] Token next();

    /// Tokenizes the remainder of the input. The final element is always an EndOfFile token.
    [[nodiscard]] std::vector<Token> tokenize();

private:
    [[nodiscard]] char peek(std::size_t ahead = 0) const noexcept;
    [[nodiscard]] bool atEnd() const noexcept { return pos_ >= text_.size(); }
    [[nodiscard]] bool atLineStart() const noexcept;
    void skipWhitespace() noexcept;
    [[nodiscard]] Token make(TokenKind kind, std::size_t start) const;

    [[nodiscard]] Token lexPreprocessor(std::size_t start);
    [[nodiscard]] Token lexLineComment(std::size_t start);
    [[nodiscard]] Token lexBlockComment(std::size_t start);
    [[nodiscard]] Token lexNumber(std::size_t start);
    [[nodiscard]] Token lexIdentifierOrPrefixedLiteral(std::size_t start);
    [[nodiscard]] Token lexRawString(std::size_t start);
    [[nodiscard]] Token lexQuoted(std::size_t start, char quote, TokenKind kind);
    [[nodiscard]] Token lexPunctuator(std::size_t start);

    const SourceText* source_;
    std::string_view text_;
    std::size_t pos_ = 0;
    LexOptions options_;
};

/// Convenience wrapper around Lexer::tokenize.
[[nodiscard]] std::vector<Token> tokenize(const SourceText& source, LexOptions options = {});

}  // namespace cppmastery
