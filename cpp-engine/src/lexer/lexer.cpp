#include "cppmastery/lexer/lexer.hpp"

#include <array>
#include <cctype>

namespace cppmastery {

namespace {

constexpr bool isIdentStart(char c) noexcept {
    return (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || c == '_' || c == '$';
}
constexpr bool isIdentChar(char c) noexcept {
    return isIdentStart(c) || (c >= '0' && c <= '9');
}
constexpr bool isDigit(char c) noexcept {
    return c >= '0' && c <= '9';
}
constexpr bool isHexDigit(char c) noexcept {
    return isDigit(c) || (c >= 'a' && c <= 'f') || (c >= 'A' && c <= 'F');
}
constexpr bool isSpace(char c) noexcept {
    return c == ' ' || c == '\t' || c == '\n' || c == '\r' || c == '\f' || c == '\v';
}

// Longest-match punctuator table, ordered by length descending within the search.
constexpr std::array<std::string_view, 5> kPunct3{"<<=", ">>=", "->*", "...", "<=>"};
constexpr std::array<std::string_view, 24> kPunct2{
    "::", "->", "++", "--", "<<", ">>", "<=", ">=", "==", "!=", "&&", "||",
    "+=", "-=", "*=", "/=", "%=", "&=", "|=", "^=", "##", ".*", "<:", ":>",
};
constexpr std::string_view kPunct1 = "{}[]()<>;:?.+-*/%^&|~!=,#\\@`";

bool isEncodingPrefix(std::string_view s) noexcept {
    return s == "u8" || s == "u" || s == "U" || s == "L";
}

}  // namespace

Lexer::Lexer(const SourceText& source, LexOptions options) noexcept
    : source_(&source), text_(source.text()), options_(options) {}

char Lexer::peek(std::size_t ahead) const noexcept {
    const std::size_t i = pos_ + ahead;
    return i < text_.size() ? text_[i] : '\0';
}

bool Lexer::atLineStart() const noexcept {
    // Only horizontal whitespace may precede a '#' for it to begin a directive.
    std::size_t i = pos_;
    while (i > 0) {
        const char c = text_[i - 1];
        if (c == '\n') return true;
        if (c != ' ' && c != '\t') return false;
        --i;
    }
    return true;
}

void Lexer::skipWhitespace() noexcept {
    while (!atEnd() && isSpace(text_[pos_])) ++pos_;
}

Token Lexer::make(TokenKind kind, std::size_t start) const {
    Token t;
    t.kind = kind;
    t.text = text_.substr(start, pos_ - start);
    t.offset = start;
    t.position = source_->positionAt(start);
    return t;
}

Token Lexer::next() {
    for (;;) {
        skipWhitespace();
        if (atEnd()) {
            Token eof;
            eof.kind = TokenKind::EndOfFile;
            eof.offset = text_.size();
            eof.text = text_.substr(text_.size(), 0);
            eof.position = source_->positionAt(text_.size());
            return eof;
        }
        const std::size_t start = pos_;
        const char c = text_[pos_];

        if (c == '#' && atLineStart()) {
            Token t = lexPreprocessor(start);
            if (options_.keepPreprocessor) return t;
            continue;
        }
        if (c == '/' && peek(1) == '/') {
            Token t = lexLineComment(start);
            if (options_.keepComments) return t;
            continue;
        }
        if (c == '/' && peek(1) == '*') {
            Token t = lexBlockComment(start);
            if (options_.keepComments) return t;
            continue;
        }
        if (isDigit(c) || (c == '.' && isDigit(peek(1)))) return lexNumber(start);
        if (isIdentStart(c)) return lexIdentifierOrPrefixedLiteral(start);
        if (c == '"') return lexQuoted(start, '"', TokenKind::StringLiteral);
        if (c == '\'') return lexQuoted(start, '\'', TokenKind::CharLiteral);
        return lexPunctuator(start);
    }
}

std::vector<Token> Lexer::tokenize() {
    std::vector<Token> out;
    out.reserve(text_.size() / 4 + 1);
    for (;;) {
        const Token t = next();
        out.push_back(t);
        if (t.kind == TokenKind::EndOfFile) break;
    }
    return out;
}

Token Lexer::lexPreprocessor(std::size_t start) {
    // Consume to end of line, honouring backslash-newline continuations and skipping over
    // comments so a "//" inside a directive does not terminate it early.
    while (!atEnd()) {
        const char c = text_[pos_];
        if (c == '\\') {
            if (peek(1) == '\n') {
                pos_ += 2;
                continue;
            }
            if (peek(1) == '\r' && peek(2) == '\n') {
                pos_ += 3;
                continue;
            }
            ++pos_;
            continue;
        }
        if (c == '\n') break;
        if (c == '/' && peek(1) == '*') {
            pos_ += 2;
            while (!atEnd() && (text_[pos_] != '*' || peek(1) != '/')) ++pos_;
            if (!atEnd()) pos_ += 2;
            continue;
        }
        if (c == '/' && peek(1) == '/') {
            while (!atEnd() && text_[pos_] != '\n') ++pos_;
            break;
        }
        ++pos_;
    }
    return make(TokenKind::Preprocessor, start);
}

Token Lexer::lexLineComment(std::size_t start) {
    while (!atEnd() && text_[pos_] != '\n') {
        // A backslash-newline continues a line comment (rare but legal).
        if (text_[pos_] == '\\' && peek(1) == '\n')
            pos_ += 2;
        else
            ++pos_;
    }
    return make(TokenKind::LineComment, start);
}

Token Lexer::lexBlockComment(std::size_t start) {
    pos_ += 2;
    while (!atEnd()) {
        if (text_[pos_] == '*' && peek(1) == '/') {
            pos_ += 2;
            return make(TokenKind::BlockComment, start);
        }
        ++pos_;
    }
    // Unterminated: report what we have as Unknown so callers can diagnose it.
    return make(TokenKind::Unknown, start);
}

Token Lexer::lexNumber(std::size_t start) {
    bool floating = false;
    bool hex = false;
    auto consumeWhile = [&](auto pred) {
        while (!atEnd() && (pred(text_[pos_]) || text_[pos_] == '\'')) ++pos_;
    };
    const char prefix = peek(1);
    if (text_[pos_] == '0' && (prefix == 'x' || prefix == 'X')) {
        hex = true;
        pos_ += 2;
        consumeWhile([](char ch) { return isHexDigit(ch); });
    } else if (text_[pos_] == '0' && (prefix == 'b' || prefix == 'B')) {
        pos_ += 2;
        consumeWhile([](char ch) { return ch == '0' || ch == '1'; });
    } else {
        consumeWhile([](char ch) { return isDigit(ch); });
    }
    // Fraction.
    if (!atEnd() && text_[pos_] == '.' && peek(1) != '.') {
        floating = true;
        ++pos_;
        while (!atEnd() &&
               ((hex ? isHexDigit(text_[pos_]) : isDigit(text_[pos_])) || text_[pos_] == '\''))
            ++pos_;
    }
    // Exponent: e/E for decimal, p/P for hex floats.
    const char e = peek();
    if ((!hex && (e == 'e' || e == 'E')) || (hex && (e == 'p' || e == 'P'))) {
        const char s = peek(1);
        if (isDigit(s) || ((s == '+' || s == '-') && isDigit(peek(2)))) {
            floating = true;
            pos_ += (s == '+' || s == '-') ? 2 : 1;
            while (!atEnd() && isDigit(text_[pos_])) ++pos_;
        }
    }
    // Suffix (u, l, ll, f, z, user-defined ...). Any identifier characters directly attached.
    while (!atEnd() && isIdentChar(text_[pos_])) ++pos_;
    return make(floating ? TokenKind::FloatingLiteral : TokenKind::IntegerLiteral, start);
}

Token Lexer::lexIdentifierOrPrefixedLiteral(std::size_t start) {
    while (!atEnd() && isIdentChar(text_[pos_])) ++pos_;
    const std::string_view word = text_.substr(start, pos_ - start);

    // Encoding prefixes and raw strings: u8R"(...)", LR"...", u"..", L'x'.
    if (!atEnd()) {
        const char q = text_[pos_];
        if (q == '"' || q == '\'') {
            if (isEncodingPrefix(word)) {
                return lexQuoted(start, q,
                                 q == '"' ? TokenKind::StringLiteral : TokenKind::CharLiteral);
            }
            if (q == '"' && (word == "R" || (word.size() > 1 && word.back() == 'R' &&
                                             isEncodingPrefix(word.substr(0, word.size() - 1))))) {
                return lexRawString(start);
            }
        }
    }
    return make(isKeyword(word) ? TokenKind::Keyword : TokenKind::Identifier, start);
}

Token Lexer::lexRawString(std::size_t start) {
    // pos_ is at the opening quote. Grammar: R"delim( ... )delim"
    ++pos_;  // '"'
    const std::size_t delimStart = pos_;
    while (!atEnd() && text_[pos_] != '(' && text_[pos_] != '\n' && pos_ - delimStart <= 16) ++pos_;
    if (atEnd() || text_[pos_] != '(') {
        // Malformed raw string: consume to end of line as Unknown.
        while (!atEnd() && text_[pos_] != '\n') ++pos_;
        return make(TokenKind::Unknown, start);
    }
    const std::string_view delim = text_.substr(delimStart, pos_ - delimStart);
    ++pos_;  // '('
    for (;;) {
        const std::size_t close = text_.find(')', pos_);
        if (close == std::string_view::npos) {
            pos_ = text_.size();
            return make(TokenKind::Unknown, start);
        }
        pos_ = close + 1;
        if (text_.substr(pos_, delim.size()) == delim && pos_ + delim.size() < text_.size() &&
            text_[pos_ + delim.size()] == '"') {
            pos_ += delim.size() + 1;
            while (!atEnd() && isIdentChar(text_[pos_])) ++pos_;  // ud-suffix
            return make(TokenKind::StringLiteral, start);
        }
    }
}

Token Lexer::lexQuoted(std::size_t start, char quote, TokenKind kind) {
    ++pos_;  // opening quote
    while (!atEnd()) {
        const char c = text_[pos_];
        if (c == '\\') {
            pos_ += (pos_ + 1 < text_.size()) ? std::size_t{2} : std::size_t{1};
            continue;
        }
        if (c == '\n') {
            // Unterminated literal: do not swallow the rest of the file.
            return make(TokenKind::Unknown, start);
        }
        ++pos_;
        if (c == quote) {
            while (!atEnd() && isIdentChar(text_[pos_])) ++pos_;  // ud-suffix, e.g. "abc"sv
            return make(kind, start);
        }
    }
    return make(TokenKind::Unknown, start);
}

Token Lexer::lexPunctuator(std::size_t start) {
    const std::string_view rest = text_.substr(pos_);
    for (const std::string_view p : kPunct3) {
        if (rest.substr(0, 3) == p) {
            pos_ += 3;
            return make(TokenKind::Punctuator, start);
        }
    }
    for (const std::string_view p : kPunct2) {
        if (rest.substr(0, 2) == p) {
            pos_ += 2;
            return make(TokenKind::Punctuator, start);
        }
    }
    if (kPunct1.find(rest[0]) != std::string_view::npos) {
        pos_ += 1;
        return make(TokenKind::Punctuator, start);
    }
    // Unknown byte (UTF-8 lead/continuation bytes, control characters...). Consume a maximal run
    // of such bytes so that binary input does not produce one token per byte.
    while (!atEnd()) {
        const char c = text_[pos_];
        if (isSpace(c) || isIdentStart(c) || isDigit(c) || c == '"' || c == '\'' ||
            kPunct1.find(c) != std::string_view::npos)
            break;
        ++pos_;
    }
    if (pos_ == start) ++pos_;  // defensive: always make progress
    return make(TokenKind::Unknown, start);
}

std::vector<Token> tokenize(const SourceText& source, LexOptions options) {
    return Lexer(source, options).tokenize();
}

}  // namespace cppmastery
