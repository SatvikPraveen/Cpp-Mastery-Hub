#include "cppmastery/metrics/metrics.hpp"

#include <algorithm>
#include <cmath>
#include <string_view>
#include <unordered_set>

#include "cppmastery/lexer/lexer.hpp"

namespace cppmastery {

namespace {

using TokenPtrs = std::vector<const Token*>;

TokenPtrs codeTokens(const std::vector<Token>& tokens) {
    TokenPtrs out;
    out.reserve(tokens.size());
    for (const Token& t : tokens) {
        switch (t.kind) {
            case TokenKind::LineComment:
            case TokenKind::BlockComment:
            case TokenKind::Preprocessor:
            case TokenKind::EndOfFile: break;
            default: out.push_back(&t);
        }
    }
    return out;
}

/// Index of the token matching the opener at `open` (same kind of bracket), or npos.
std::size_t matchBracket(const TokenPtrs& c, std::size_t open, std::string_view openText,
                         std::string_view closeText) {
    int depth = 0;
    for (std::size_t i = open; i < c.size(); ++i) {
        if (c[i]->isPunct(openText))
            ++depth;
        else if (c[i]->isPunct(closeText) && --depth == 0)
            return i;
    }
    return static_cast<std::size_t>(-1);
}

constexpr std::size_t kNpos = static_cast<std::size_t>(-1);

bool isTrailerKeyword(std::string_view k) noexcept {
    return k == "const" || k == "volatile" || k == "noexcept" || k == "override" || k == "final" ||
           k == "throw" || k == "requires" || k == "try" || k == "mutable" || k == "constexpr" ||
           k == "auto" || k == "typename" || k == "decltype" || k == "unsigned" || k == "signed" ||
           k == "long" || k == "short" || k == "int" || k == "char" || k == "bool" || k == "void" ||
           k == "double" || k == "float" || k == "wchar_t" || k == "char8_t" || k == "char16_t" ||
           k == "char32_t";
}

/// Skips a (possibly qualified, possibly templated) name starting at i. Returns index after it.
std::size_t skipQualifiedName(const TokenPtrs& c, std::size_t i) {
    while (i < c.size()) {
        if (c[i]->is(TokenKind::Identifier) || c[i]->isPunct("::") ||
            (c[i]->is(TokenKind::Keyword) && isTrailerKeyword(c[i]->text))) {
            ++i;
        } else if (c[i]->isPunct("<")) {
            int depth = 0;
            while (i < c.size()) {
                if (c[i]->isPunct("<"))
                    ++depth;
                else if (c[i]->isPunct(">"))
                    --depth;
                else if (c[i]->isPunct(">>"))
                    depth -= 2;
                ++i;
                if (depth <= 0) break;
            }
        } else {
            break;
        }
    }
    return i;
}

/// Given the index of a ')' closing a parameter list, finds the body '{' or returns npos.
std::size_t findBodyBrace(const TokenPtrs& c, std::size_t closeParen) {
    std::size_t t = closeParen + 1;
    while (t < c.size()) {
        const Token& tok = *c[t];
        if (tok.isPunct("{")) return t;
        if (tok.isPunct(";") || tok.isPunct("=") || tok.isPunct(",") || tok.isPunct(")") ||
            tok.isPunct("?") || tok.isPunct(".") || tok.isPunct("->*"))
            return kNpos;
        if (tok.isPunct(":")) {
            // Constructor member-initializer list.
            ++t;
            for (;;) {
                t = skipQualifiedName(c, t);
                if (t >= c.size()) return kNpos;
                const bool paren = c[t]->isPunct("(");
                if (!paren && !c[t]->isPunct("{")) return kNpos;
                t = paren ? matchBracket(c, t, "(", ")") : matchBracket(c, t, "{", "}");
                if (t == kNpos || t + 1 >= c.size()) return kNpos;
                ++t;
                if (c[t]->isPunct("...")) ++t;  // pack expansion in a mem-initializer
                if (t >= c.size()) return kNpos;
                if (c[t]->isPunct(",")) {
                    ++t;
                    continue;
                }
                if (c[t]->isPunct("{")) return t;
                return kNpos;
            }
        }
        if (tok.isPunct("(")) {
            t = matchBracket(c, t, "(", ")");
            if (t == kNpos) return kNpos;
            ++t;
            continue;
        }
        if (tok.isPunct("[")) {  // attributes such as [[nodiscard]]
            t = matchBracket(c, t, "[", "]");
            if (t == kNpos) return kNpos;
            ++t;
            continue;
        }
        if (tok.is(TokenKind::Keyword) && !isTrailerKeyword(tok.text)) return kNpos;
        if (tok.is(TokenKind::Keyword) || tok.is(TokenKind::Identifier) || tok.isPunct("::") ||
            tok.isPunct("&") || tok.isPunct("&&") || tok.isPunct("*") || tok.isPunct("->") ||
            tok.isPunct("<") || tok.isPunct(">") || tok.isPunct(">>") || tok.isPunct("...")) {
            ++t;
            continue;
        }
        return kNpos;
    }
    return kNpos;
}

/// Resolves the function name ending at token index `j` (the token before '('). Returns the index
/// of the first name token in `nameStart`, or npos if this is not a plausible function name.
std::string resolveName(const TokenPtrs& c, std::size_t j, std::size_t& nameStart,
                        std::size_t& paramOpen) {
    nameStart = kNpos;
    const Token& t = *c[j];
    std::string name;

    if (t.isKeyword("operator")) {
        // operator()(...) : the '(' we matched is the operator symbol itself.
        if (j + 2 < c.size() && c[j + 1]->isPunct("(") && c[j + 2]->isPunct(")") &&
            j + 3 < c.size() && c[j + 3]->isPunct("(")) {
            name = "operator()";
            paramOpen = j + 3;
            nameStart = j;
        }
        return name;
    }
    if (t.is(TokenKind::Punctuator) && j >= 1) {
        // operator<<(...), operator==(...), operator[](...)
        if (c[j - 1]->isKeyword("operator")) {
            name = "operator" + std::string(t.text);
            nameStart = j - 1;
        } else if (t.isPunct("]") && j >= 2 && c[j - 1]->isPunct("[") &&
                   c[j - 2]->isKeyword("operator")) {
            name = "operator[]";
            nameStart = j - 2;
        }
        return name;
    }
    if (!t.is(TokenKind::Identifier)) return name;

    name = std::string(t.text);
    nameStart = j;
    // Reject member calls: obj.f(...) / p->f(...)
    if (j >= 1 && (c[j - 1]->isPunct(".") || c[j - 1]->isPunct("->"))) {
        nameStart = kNpos;
        return {};
    }
    // Destructor ~Foo
    if (j >= 1 && c[j - 1]->isPunct("~")) {
        name.insert(0, "~");
        nameStart = j - 1;
    }
    // Qualification A::B::name
    std::size_t k = nameStart;
    while (k >= 2 && c[k - 1]->isPunct("::") && c[k - 2]->is(TokenKind::Identifier)) {
        name.insert(0, std::string(c[k - 2]->text) + "::");
        k -= 2;
    }
    nameStart = k;
    return name;
}

std::size_t countParameters(const TokenPtrs& c, std::size_t open, std::size_t close) {
    if (close <= open + 1) return 0;
    if (close == open + 2 && c[open + 1]->isKeyword("void")) return 0;
    std::size_t params = 1;
    int paren = 0;
    int angle = 0;
    int brace = 0;
    for (std::size_t i = open + 1; i < close; ++i) {
        const Token& t = *c[i];
        if (t.isPunct("("))
            ++paren;
        else if (t.isPunct(")"))
            --paren;
        else if (t.isPunct("{"))
            ++brace;
        else if (t.isPunct("}"))
            --brace;
        else if (t.isPunct("<"))
            ++angle;
        else if (t.isPunct(">") || t.isPunct(">>"))
            angle = std::max(0, angle - (t.isPunct(">") ? 1 : 2));
        else if (t.isPunct(",") && paren == 0 && angle == 0 && brace == 0)
            ++params;
    }
    return params;
}

bool isBraceInitContext(const TokenPtrs& c, std::size_t braceIdx) {
    if (braceIdx == 0) return false;
    const Token& p = *c[braceIdx - 1];
    return p.isPunct("=") || p.isPunct("(") || p.isPunct(",") || p.isPunct("{") ||
           p.isKeyword("return") || p.is(TokenKind::Identifier) || p.isPunct(">") || p.isPunct("]");
}

}  // namespace

std::vector<FunctionMetrics> detectFunctions(const SourceText& source,
                                             const std::vector<Token>& tokens) {
    const TokenPtrs c = codeTokens(tokens);
    std::vector<FunctionMetrics> out;

    std::size_t i = 1;
    while (i < c.size()) {
        if (!c[i]->isPunct("(")) {
            ++i;
            continue;
        }

        std::size_t nameStart = kNpos;
        std::size_t paramOpen = i;
        std::string name = resolveName(c, i - 1, nameStart, paramOpen);
        if (nameStart == kNpos || name.empty()) {
            ++i;
            continue;
        }

        const std::size_t paramClose = matchBracket(c, paramOpen, "(", ")");
        if (paramClose == kNpos) break;

        const std::size_t body = findBodyBrace(c, paramClose);
        if (body == kNpos) {
            ++i;
            continue;
        }

        std::size_t bodyEnd = matchBracket(c, body, "{", "}");
        if (bodyEnd == kNpos) bodyEnd = c.size() - 1;  // truncated input

        FunctionMetrics fm;
        fm.name = std::move(name);
        fm.start = c[nameStart]->position;
        fm.bodyStart = c[body]->position;
        fm.end = c[bodyEnd]->position;
        fm.lines = static_cast<std::size_t>(fm.end.line) - fm.start.line + 1;
        fm.parameters = countParameters(c, paramOpen, paramClose);

        std::uint32_t depth = 0;
        for (std::size_t k = body + 1; k < bodyEnd; ++k) {
            const Token& t = *c[k];
            if (t.is(TokenKind::Keyword)) {
                if (t.text == "if" || t.text == "for" || t.text == "while" || t.text == "case" ||
                    t.text == "catch") {
                    ++fm.cyclomatic;
                    ++fm.cyclomaticExtended;
                } else if (t.text == "and" || t.text == "or") {
                    ++fm.cyclomaticExtended;
                }
            } else if (t.isPunct("&&") || t.isPunct("||") || t.isPunct("?")) {
                ++fm.cyclomaticExtended;
            } else if (t.isPunct(";")) {
                ++fm.statements;
            } else if (t.isPunct("{")) {
                if (!isBraceInitContext(c, k)) {
                    ++depth;
                    fm.maxNesting = std::max(fm.maxNesting, depth);
                } else {
                    // Balance the init-brace without counting it.
                    const std::size_t close = matchBracket(c, k, "{", "}");
                    if (close != kNpos && close < bodyEnd) k = close;
                }
            } else if (t.isPunct("}")) {
                if (depth > 0) --depth;
            }
        }
        out.push_back(std::move(fm));
        i = bodyEnd + 1;
    }
    (void)source;
    return out;
}

HalsteadMetrics computeHalstead(const std::vector<Token>& tokens) {
    HalsteadMetrics h;
    std::unordered_set<std::string_view> operators;
    std::unordered_set<std::string_view> operands;
    for (const Token& t : tokens) {
        switch (t.kind) {
            case TokenKind::Identifier:
            case TokenKind::IntegerLiteral:
            case TokenKind::FloatingLiteral:
            case TokenKind::CharLiteral:
            case TokenKind::StringLiteral:
                ++h.totalOperands;
                operands.insert(t.text);
                break;
            case TokenKind::Keyword:
                if (t.text == "true" || t.text == "false" || t.text == "nullptr" ||
                    t.text == "this") {
                    ++h.totalOperands;
                    operands.insert(t.text);
                } else {
                    ++h.totalOperators;
                    operators.insert(t.text);
                }
                break;
            case TokenKind::Punctuator:
                if (t.text == ")" || t.text == "]" || t.text == "}") break;
                ++h.totalOperators;
                operators.insert(t.text);
                break;
            default: break;
        }
    }
    h.distinctOperators = operators.size();
    h.distinctOperands = operands.size();
    const auto n1 = static_cast<double>(h.distinctOperators);
    const auto n2 = static_cast<double>(h.distinctOperands);
    h.vocabulary = n1 + n2;
    h.length = static_cast<double>(h.totalOperators + h.totalOperands);
    h.estimatedLength = (n1 > 0 ? n1 * std::log2(n1) : 0.0) + (n2 > 0 ? n2 * std::log2(n2) : 0.0);
    h.volume = h.vocabulary > 0 ? h.length * std::log2(h.vocabulary) : 0.0;
    h.difficulty = n2 > 0 ? (n1 / 2.0) * (static_cast<double>(h.totalOperands) / n2) : 0.0;
    h.effort = h.difficulty * h.volume;
    h.timeSeconds = h.effort / 18.0;
    h.deliveredBugs = h.volume / 3000.0;
    return h;
}

CodeMetrics computeMetrics(const SourceText& source, const std::vector<Token>& tokens) {
    CodeMetrics m;
    const std::size_t lineCount = source.lineCount();
    std::vector<std::uint8_t> hasCode(lineCount + 2, 0);
    std::vector<std::uint8_t> hasComment(lineCount + 2, 0);

    for (const Token& t : tokens) {
        if (t.kind == TokenKind::EndOfFile) continue;
        const std::uint32_t first = t.position.line;
        const std::uint32_t last = source.positionAt(t.end() == 0 ? 0 : t.end() - 1).line;
        std::vector<std::uint8_t>& mark = t.isComment() ? hasComment : hasCode;
        for (std::uint32_t l = first; l <= last && l <= lineCount; ++l) mark[l] = 1;

        if (t.kind == TokenKind::Preprocessor) {
            const std::string_view body = t.text.substr(1);
            const std::size_t ws = body.find_first_not_of(" \t");
            if (ws != std::string_view::npos && body.substr(ws).starts_with("include")) {
                ++m.includeCount;
            }
        } else if (!t.isComment()) {
            ++m.tokenCount;
        }
    }

    m.lines.physical = lineCount;
    for (std::size_t l = 1; l <= lineCount; ++l) {
        if (hasCode[l] != 0) {
            ++m.lines.code;
            if (hasComment[l] != 0) ++m.lines.mixed;
        } else if (hasComment[l] != 0) {
            ++m.lines.comment;
        } else {
            ++m.lines.blank;
        }
    }

    // Class/struct/union definitions.
    const TokenPtrs c = codeTokens(tokens);
    for (std::size_t i = 0; i < c.size(); ++i) {
        const Token& t = *c[i];
        if (!(t.isKeyword("class") || t.isKeyword("struct") || t.isKeyword("union"))) continue;
        if (i > 0 && (c[i - 1]->isKeyword("enum") || c[i - 1]->isPunct("<") ||
                      c[i - 1]->isPunct(",") || c[i - 1]->isKeyword("friend")))
            continue;
        for (std::size_t k = i + 1; k < c.size(); ++k) {
            if (c[k]->isPunct("{")) {
                ++m.classCount;
                break;
            }
            if (c[k]->isPunct(";") || c[k]->isPunct("(") || c[k]->isPunct(")") ||
                c[k]->isPunct("=") || c[k]->isPunct("*") || c[k]->isPunct("&"))
                break;
        }
    }

    m.halstead = computeHalstead(tokens);
    m.functions = detectFunctions(source, tokens);
    for (const FunctionMetrics& f : m.functions) {
        m.totalCyclomatic += f.cyclomatic;
        m.maxCyclomatic = std::max(m.maxCyclomatic, f.cyclomatic);
        m.maxNesting = std::max(m.maxNesting, f.maxNesting);
    }
    m.meanCyclomatic = m.functions.empty() ? 0.0
                                           : static_cast<double>(m.totalCyclomatic) /
                                                 static_cast<double>(m.functions.size());

    const auto commentLines = static_cast<double>(m.lines.comment + m.lines.mixed);
    const double documented =
        static_cast<double>(m.lines.code) + static_cast<double>(m.lines.comment);
    m.commentRatio = documented > 0 ? commentLines / documented : 0.0;

    const double v = std::max(1.0, m.halstead.volume);
    const auto g = static_cast<double>(m.totalCyclomatic);
    const double loc = std::max(1.0, static_cast<double>(m.lines.code));
    const double raw = 171.0 - 5.2 * std::log(v) - 0.23 * g - 16.2 * std::log(loc);
    const double perCM = m.commentRatio * 100.0;
    m.maintainability.raw = raw;
    m.maintainability.normalized = std::clamp(raw * 100.0 / 171.0, 0.0, 100.0);
    m.maintainability.withComments = raw + 50.0 * std::sin(std::sqrt(2.4 * perCM));
    return m;
}

CodeMetrics computeMetrics(const SourceText& source) {
    return computeMetrics(source, tokenize(source));
}

}  // namespace cppmastery
