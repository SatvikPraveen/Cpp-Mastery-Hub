#include "cppmastery/lexer/lexer.hpp"

#include <gtest/gtest.h>

#include <string>
#include <vector>

using namespace cppmastery;

namespace {

std::vector<Token> lex(const std::string& code, LexOptions o = {}) {
    static std::vector<SourceText> keepAlive;  // tokens view into the source
    keepAlive.emplace_back(code);
    return tokenize(keepAlive.back(), o);
}

std::vector<std::string> kinds(const std::vector<Token>& ts) {
    std::vector<std::string> out;
    for (const Token& t : ts) {
        if (t.kind != TokenKind::EndOfFile) out.emplace_back(toString(t.kind));
    }
    return out;
}

std::vector<std::string> texts(const std::vector<Token>& ts) {
    std::vector<std::string> out;
    for (const Token& t : ts) {
        if (t.kind != TokenKind::EndOfFile) out.emplace_back(t.text);
    }
    return out;
}

}  // namespace

TEST(Lexer, EmptyInputYieldsOnlyEof) {
    auto ts = lex("");
    ASSERT_EQ(ts.size(), 1u);
    EXPECT_EQ(ts[0].kind, TokenKind::EndOfFile);
}

TEST(Lexer, KeywordsAndIdentifiers) {
    auto ts = lex("int main_1 return returned");
    EXPECT_EQ(kinds(ts),
              (std::vector<std::string>{"keyword", "identifier", "keyword", "identifier"}));
}

TEST(Lexer, Punctuators) {
    auto ts = lex("a<<=b;c->*d;e<=>f;g...h;i::j;k->l;m>>=n;");
    std::vector<std::string> puncts;
    for (const Token& t : ts) {
        if (t.kind == TokenKind::Punctuator && t.text != ";") puncts.emplace_back(t.text);
    }
    EXPECT_EQ(puncts, (std::vector<std::string>{"<<=", "->*", "<=>", "...", "::", "->", ">>="}));
}

TEST(Lexer, NumericLiterals) {
    auto ts = lex("42 0x1F 0b1010 1'000'000 3.14 1e-9 0x1.8p3 1.f 10u 100ULL .5");
    EXPECT_EQ(kinds(ts), (std::vector<std::string>{"integer", "integer", "integer", "integer",
                                                   "floating", "floating", "floating", "floating",
                                                   "integer", "integer", "floating"}));
    EXPECT_EQ(texts(ts)[3], "1'000'000");
    EXPECT_EQ(texts(ts)[6], "0x1.8p3");
}

TEST(Lexer, RangeOperatorIsNotAFloat) {
    auto ts = lex("1...2");
    EXPECT_EQ(kinds(ts), (std::vector<std::string>{"integer", "punctuator", "integer"}));
}

TEST(Lexer, StringAndCharLiterals) {
    auto ts = lex(R"(u8"héllo" L'x' "esc\"aped" 'a' "sv"sv)");
    EXPECT_EQ(kinds(ts), (std::vector<std::string>{"string", "char", "string", "char", "string"}));
    EXPECT_EQ(texts(ts)[4], "\"sv\"sv");
}

TEST(Lexer, RawStringWithDelimiterAndEmbeddedQuotes) {
    // `)xyz"` must not terminate a string whose delimiter is `xy`; only `)xy"` does.
    auto ts = lex("R\"xy(a \" ) )x )xyz\" b)xy\" + 1");
    ASSERT_GE(ts.size(), 3u);
    EXPECT_EQ(ts[0].kind, TokenKind::StringLiteral);
    EXPECT_EQ(ts[0].text, "R\"xy(a \" ) )x )xyz\" b)xy\"");
    EXPECT_EQ(ts[1].text, "+");
    EXPECT_EQ(ts[2].text, "1");
}

TEST(Lexer, MultilineRawString) {
    auto ts = lex("auto s = R\"(line1\nline2)\";\nint x;");
    EXPECT_EQ(ts[3].kind, TokenKind::StringLiteral);
    EXPECT_EQ(ts[5].text, "int");
    EXPECT_EQ(ts[5].position.line, 3u);
}

TEST(Lexer, CommentsAreTokensByDefault) {
    auto ts = lex("a // line\n/* block\n */ b");
    EXPECT_EQ(kinds(ts), (std::vector<std::string>{"identifier", "line_comment", "block_comment",
                                                   "identifier"}));
    auto stripped = lex("a // line\n/* block */ b", LexOptions{.keepComments = false});
    EXPECT_EQ(kinds(stripped), (std::vector<std::string>{"identifier", "identifier"}));
}

TEST(Lexer, PreprocessorDirectiveWithContinuationAndComment) {
    auto ts = lex("#define X(a) \\\n  (a) // c\nint y;");
    ASSERT_EQ(ts[0].kind, TokenKind::Preprocessor);
    EXPECT_EQ(ts[0].text, "#define X(a) \\\n  (a) // c");
    EXPECT_EQ(ts[1].text, "int");
    EXPECT_EQ(ts[1].position.line, 3u);
}

TEST(Lexer, HashNotAtLineStartIsPunctuator) {
    auto ts = lex("a # b");
    EXPECT_EQ(kinds(ts), (std::vector<std::string>{"identifier", "punctuator", "identifier"}));
}

TEST(Lexer, UnterminatedLiteralsDoNotSwallowFile) {
    auto ts = lex("\"oops\nint x;");
    EXPECT_EQ(ts[0].kind, TokenKind::Unknown);
    EXPECT_EQ(ts[1].text, "int");
    auto c = lex("/* never closed\nint y;");
    EXPECT_EQ(c[0].kind, TokenKind::Unknown);
    EXPECT_EQ(c[1].kind, TokenKind::EndOfFile);
}

TEST(Lexer, UnknownBytesAreGroupedAndNeverDropped) {
    auto ts = lex("a \xC3\xA9\xE2\x82\xAC b");
    EXPECT_EQ(kinds(ts), (std::vector<std::string>{"identifier", "unknown", "identifier"}));
    EXPECT_EQ(ts[1].text.size(), 5u);
}

TEST(Lexer, PositionsAreOneBased) {
    auto ts = lex("ab\n  cd");
    EXPECT_EQ(ts[0].position, (Position{1, 1}));
    EXPECT_EQ(ts[1].position, (Position{2, 3}));
}
