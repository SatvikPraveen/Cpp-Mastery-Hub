#include "cppmastery/lexer/token.hpp"

#include <algorithm>
#include <array>

namespace cppmastery {

namespace {

// Sorted so that std::binary_search can be used.
constexpr std::array<std::string_view, 97> kKeywords{
    "__attribute__",
    "alignas",
    "alignof",
    "and",
    "and_eq",
    "asm",
    "auto",
    "bitand",
    "bitor",
    "bool",
    "break",
    "case",
    "catch",
    "char",
    "char16_t",
    "char32_t",
    "char8_t",
    "class",
    "co_await",
    "co_return",
    "co_yield",
    "compl",
    "concept",
    "const",
    "const_cast",
    "consteval",
    "constexpr",
    "constinit",
    "continue",
    "decltype",
    "default",
    "delete",
    "do",
    "double",
    "dynamic_cast",
    "else",
    "enum",
    "explicit",
    "export",
    "extern",
    "false",
    "final",
    "float",
    "for",
    "friend",
    "goto",
    "if",
    "import",
    "inline",
    "int",
    "long",
    "module",
    "mutable",
    "namespace",
    "new",
    "noexcept",
    "not",
    "not_eq",
    "nullptr",
    "operator",
    "or",
    "or_eq",
    "override",
    "private",
    "protected",
    "public",
    "register",
    "reinterpret_cast",
    "requires",
    "return",
    "short",
    "signed",
    "sizeof",
    "static",
    "static_assert",
    "static_cast",
    "struct",
    "switch",
    "template",
    "this",
    "thread_local",
    "throw",
    "true",
    "try",
    "typedef",
    "typeid",
    "typename",
    "union",
    "unsigned",
    "using",
    "virtual",
    "void",
    "volatile",
    "wchar_t",
    "while",
    "xor",
    "xor_eq",
};

constexpr std::array<std::string_view, 14> kFundamental{
    "bool", "char", "char16_t", "char32_t", "char8_t",  "double", "float",
    "int",  "long", "short",    "signed",   "unsigned", "void",   "wchar_t",
};

static_assert(std::is_sorted(kKeywords.begin(), kKeywords.end()),
              "keyword table must be sorted for binary search");
static_assert(std::is_sorted(kFundamental.begin(), kFundamental.end()));

}  // namespace

std::string_view toString(TokenKind kind) noexcept {
    switch (kind) {
        case TokenKind::Identifier: return "identifier";
        case TokenKind::Keyword: return "keyword";
        case TokenKind::IntegerLiteral: return "integer";
        case TokenKind::FloatingLiteral: return "floating";
        case TokenKind::CharLiteral: return "char";
        case TokenKind::StringLiteral: return "string";
        case TokenKind::Punctuator: return "punctuator";
        case TokenKind::Preprocessor: return "preprocessor";
        case TokenKind::LineComment: return "line_comment";
        case TokenKind::BlockComment: return "block_comment";
        case TokenKind::Unknown: return "unknown";
        case TokenKind::EndOfFile: return "eof";
    }
    return "?";
}

bool isKeyword(std::string_view text) noexcept {
    return std::binary_search(kKeywords.begin(), kKeywords.end(), text);
}

bool isFundamentalTypeKeyword(std::string_view text) noexcept {
    return std::binary_search(kFundamental.begin(), kFundamental.end(), text);
}

}  // namespace cppmastery
