#include "cppmastery/analysis/builtin_rules.hpp"

#include <algorithm>
#include <array>
#include <charconv>
#include <string>

namespace cppmastery {

namespace {

// ---------------------------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------------------------

/// Is code[i] an identifier immediately followed by '(' (i.e. a call or declarator)?
bool isCallOf(const std::vector<const Token*>& c, std::size_t i, std::string_view name) {
    const bool memberCall = i > 0 && (c[i - 1]->isPunct(".") || c[i - 1]->isPunct("->"));
    return c[i]->is(TokenKind::Identifier, name) && i + 1 < c.size() && c[i + 1]->isPunct("(") &&
           !memberCall;
}

/// Strips a `std::` qualifier look-behind: true if c[i] is preceded by `std ::`.
bool precededByStd(const std::vector<const Token*>& c, std::size_t i) {
    return i >= 2 && c[i - 1]->isPunct("::") && c[i - 2]->is(TokenKind::Identifier, "std");
}

/// Base class that lets each rule be declared with a compact metadata block.
template <typename Derived>
class RuleBase : public Rule {
public:
    [[nodiscard]] std::string_view id() const noexcept override { return Derived::kId; }
    [[nodiscard]] std::string_view description() const noexcept override {
        return Derived::kDescription;
    }
    [[nodiscard]] Category category() const noexcept override { return Derived::kCategory; }
    [[nodiscard]] Severity severity() const noexcept override { return Derived::kSeverity; }
    [[nodiscard]] std::string_view reference() const noexcept override {
        return Derived::kReference;
    }
};

// ---------------------------------------------------------------------------------------------
// security/*
// ---------------------------------------------------------------------------------------------

struct UnsafeCFunction final : RuleBase<UnsafeCFunction> {
    static constexpr std::string_view kId = "security/unsafe-c-function";
    static constexpr std::string_view kDescription =
        "Calls to C library functions that cannot be used without risking buffer overflow.";
    static constexpr Category kCategory = Category::Security;
    static constexpr Severity kSeverity = Severity::Error;
    static constexpr std::string_view kReference = "CERT C STR31-C, MSC24-C; CWE-120";

    static constexpr std::array<std::string_view, 9> kNames{
        "gets", "strcpy", "strcat", "sprintf", "vsprintf", "strtok", "tmpnam", "getwd", "alloca"};

    void run(const RuleContext& ctx, std::vector<Diagnostic>& out) const override {
        const auto& c = ctx.code;
        for (std::size_t i = 0; i < c.size(); ++i) {
            for (const std::string_view n : kNames) {
                if (isCallOf(c, i, n)) {
                    out.push_back(make(*c[i], "Call to unsafe C function '" + std::string(n) + "'.",
                                       "Prefer std::string / std::string_view, std::snprintf, "
                                       "std::strtok_r or std::array with bounds checks."));
                }
            }
        }
    }
};

struct ShellCommand final : RuleBase<ShellCommand> {
    static constexpr std::string_view kId = "security/shell-command";
    static constexpr std::string_view kDescription =
        "Spawning a shell from user-reachable code enables command injection.";
    static constexpr Category kCategory = Category::Security;
    static constexpr Severity kSeverity = Severity::Warning;
    static constexpr std::string_view kReference = "CERT C++ ENV33-C; CWE-78";

    void run(const RuleContext& ctx, std::vector<Diagnostic>& out) const override {
        const auto& c = ctx.code;
        for (std::size_t i = 0; i < c.size(); ++i) {
            if (isCallOf(c, i, "system") || isCallOf(c, i, "popen")) {
                out.push_back(make(*c[i],
                                   "Call to '" + std::string(c[i]->text) + "' spawns a shell.",
                                   "Use posix_spawn/execve with an argument vector and validate "
                                   "every argument, or avoid subprocesses entirely."));
            }
        }
    }
};

// ---------------------------------------------------------------------------------------------
// memory/*
// ---------------------------------------------------------------------------------------------

struct RawNewDelete final : RuleBase<RawNewDelete> {
    static constexpr std::string_view kId = "memory/raw-new-delete";
    static constexpr std::string_view kDescription =
        "Explicit new/delete transfers ownership manually and is a frequent source of leaks.";
    static constexpr Category kCategory = Category::Memory;
    static constexpr Severity kSeverity = Severity::Warning;
    static constexpr std::string_view kReference = "C++ Core Guidelines R.11, R.20";

    void run(const RuleContext& ctx, std::vector<Diagnostic>& out) const override {
        const auto& c = ctx.code;
        for (std::size_t i = 0; i < c.size(); ++i) {
            if (c[i]->isKeyword("new")) {
                // `operator new` definitions and `= new`-less placement forms are still flagged
                // because the rule is about ownership, but skip `new` inside `operator new`.
                if (i > 0 && c[i - 1]->isKeyword("operator")) continue;
                out.push_back(make(*c[i], "Raw 'new' expression.",
                                   "Prefer std::make_unique / std::make_shared or a container."));
            } else if (c[i]->isKeyword("delete")) {
                if (i > 0 && (c[i - 1]->isKeyword("operator") || c[i - 1]->isPunct("="))) continue;
                out.push_back(make(*c[i], "Raw 'delete' expression.",
                                   "Let a smart pointer or container own the object (RAII)."));
            }
        }
    }
};

struct MallocFree final : RuleBase<MallocFree> {
    static constexpr std::string_view kId = "memory/malloc-free";
    static constexpr std::string_view kDescription =
        "C allocation functions bypass constructors/destructors and type safety.";
    static constexpr Category kCategory = Category::Memory;
    static constexpr Severity kSeverity = Severity::Warning;
    static constexpr std::string_view kReference = "C++ Core Guidelines R.10";

    void run(const RuleContext& ctx, std::vector<Diagnostic>& out) const override {
        const auto& c = ctx.code;
        for (std::size_t i = 0; i < c.size(); ++i) {
            for (const std::string_view n : {"malloc", "calloc", "realloc", "free"}) {
                if (isCallOf(c, i, n)) {
                    out.push_back(
                        make(*c[i], "Call to '" + std::string(n) + "'.",
                             "Use std::vector, std::unique_ptr<T[]> or another RAII owner."));
                }
            }
        }
    }
};

// ---------------------------------------------------------------------------------------------
// correctness/*
// ---------------------------------------------------------------------------------------------

struct EmptyCatch final : RuleBase<EmptyCatch> {
    static constexpr std::string_view kId = "correctness/empty-catch";
    static constexpr std::string_view kDescription =
        "An empty handler silently discards the exception and the failure it reports.";
    static constexpr Category kCategory = Category::Correctness;
    static constexpr Severity kSeverity = Severity::Warning;
    static constexpr std::string_view kReference = "CERT C++ ERR56-CPP; Core Guidelines E.31";

    void run(const RuleContext& ctx, std::vector<Diagnostic>& out) const override {
        const auto& c = ctx.code;
        for (std::size_t i = 0; i + 1 < c.size(); ++i) {
            if (!c[i]->isKeyword("catch") || !c[i + 1]->isPunct("(")) continue;
            int depth = 0;
            std::size_t k = i + 1;
            for (; k < c.size(); ++k) {
                if (c[k]->isPunct("("))
                    ++depth;
                else if (c[k]->isPunct(")") && --depth == 0)
                    break;
            }
            if (k + 2 < c.size() && c[k + 1]->isPunct("{") && c[k + 2]->isPunct("}")) {
                out.push_back(make(*c[i], "Empty catch block swallows the exception.",
                                   "Handle, log, or rethrow; if ignoring is intentional, say so "
                                   "in a comment and narrow the exception type."));
            }
        }
    }
};

struct AssignmentInCondition final : RuleBase<AssignmentInCondition> {
    static constexpr std::string_view kId = "correctness/assignment-in-condition";
    static constexpr std::string_view kDescription =
        "'if (x = v)' is almost always a typo for 'if (x == v)'.";
    static constexpr Category kCategory = Category::Correctness;
    static constexpr Severity kSeverity = Severity::Warning;
    static constexpr std::string_view kReference = "CERT C EXP45-C; MISRA C++ 6-2-1";

    void run(const RuleContext& ctx, std::vector<Diagnostic>& out) const override {
        const auto& c = ctx.code;
        for (std::size_t i = 0; i + 3 < c.size(); ++i) {
            if ((c[i]->isKeyword("if") || c[i]->isKeyword("while")) && c[i + 1]->isPunct("(") &&
                c[i + 2]->is(TokenKind::Identifier) && c[i + 3]->isPunct("=")) {
                out.push_back(make(*c[i + 3], "Assignment used as a condition.",
                                   "Did you mean '=='? If the assignment is intentional, use a "
                                   "C++17 init-statement: if (auto v = ...; v) { ... }"));
            }
        }
    }
};

struct FloatEquality final : RuleBase<FloatEquality> {
    static constexpr std::string_view kId = "correctness/float-equality";
    static constexpr std::string_view kDescription =
        "Exact comparison against a floating-point literal is usually unreliable.";
    static constexpr Category kCategory = Category::Correctness;
    static constexpr Severity kSeverity = Severity::Warning;
    static constexpr std::string_view kReference = "Goldberg 1991; CERT C FLP02-C";

    void run(const RuleContext& ctx, std::vector<Diagnostic>& out) const override {
        const auto& c = ctx.code;
        for (std::size_t i = 1; i + 1 < c.size(); ++i) {
            if (!(c[i]->isPunct("==") || c[i]->isPunct("!="))) continue;
            if (c[i - 1]->is(TokenKind::FloatingLiteral) ||
                c[i + 1]->is(TokenKind::FloatingLiteral)) {
                out.push_back(make(*c[i], "Floating-point value compared for exact equality.",
                                   "Compare with a tolerance: std::fabs(a - b) <= eps * "
                                   "std::max(std::fabs(a), std::fabs(b))."));
            }
        }
    }
};

// ---------------------------------------------------------------------------------------------
// modernize/*
// ---------------------------------------------------------------------------------------------

struct CStyleCast final : RuleBase<CStyleCast> {
    static constexpr std::string_view kId = "modernize/c-style-cast";
    static constexpr std::string_view kDescription =
        "C-style casts hide which of static/const/reinterpret conversion is intended.";
    static constexpr Category kCategory = Category::Modernization;
    static constexpr Severity kSeverity = Severity::Warning;
    static constexpr std::string_view kReference = "C++ Core Guidelines ES.49";

    void run(const RuleContext& ctx, std::vector<Diagnostic>& out) const override {
        const auto& c = ctx.code;
        for (std::size_t i = 0; i + 2 < c.size(); ++i) {
            if (!c[i]->isPunct("(")) continue;
            // Only fundamental-type spellings are recognised to keep precision high:
            //   ( [const] type-keyword+ [*|&]* ) operand
            std::size_t k = i + 1;
            bool sawType = false;
            while (k < c.size() && c[k]->is(TokenKind::Keyword) &&
                   (isFundamentalTypeKeyword(c[k]->text) || c[k]->text == "const")) {
                sawType = sawType || isFundamentalTypeKeyword(c[k]->text);
                ++k;
            }
            while (k < c.size() && (c[k]->isPunct("*") || c[k]->isPunct("&"))) ++k;
            if (!sawType || k >= c.size() || !c[k]->isPunct(")") || k + 1 >= c.size()) continue;
            const Token& operand = *c[k + 1];
            const bool operandLike = operand.is(TokenKind::Identifier) || operand.isLiteral() ||
                                     operand.isPunct("(") || operand.isPunct("-") ||
                                     operand.isPunct("*") || operand.isPunct("&") ||
                                     operand.isKeyword("this");
            // Exclude declarations such as `int (*fp)(int)` and `sizeof(int)`.
            const bool afterSizeof =
                i > 0 && (c[i - 1]->isKeyword("sizeof") || c[i - 1]->isKeyword("alignof") ||
                          c[i - 1]->is(TokenKind::Identifier) || c[i - 1]->isKeyword("decltype"));
            if (operandLike && !afterSizeof) {
                out.push_back(make(*c[i], "C-style cast.",
                                   "Use static_cast<T>(...) (or the narrowest named cast that "
                                   "compiles)."));
            }
        }
    }
};

struct NullMacro final : RuleBase<NullMacro> {
    static constexpr std::string_view kId = "modernize/null-macro";
    static constexpr std::string_view kDescription =
        "NULL is an integer constant; nullptr is typed.";
    static constexpr Category kCategory = Category::Modernization;
    static constexpr Severity kSeverity = Severity::Info;
    static constexpr std::string_view kReference = "C++ Core Guidelines ES.47";

    void run(const RuleContext& ctx, std::vector<Diagnostic>& out) const override {
        for (const Token* t : ctx.code) {
            if (t->is(TokenKind::Identifier, "NULL"))
                out.push_back(make(*t, "Use of NULL.", "Replace with nullptr."));
        }
    }
};

struct TypedefRule final : RuleBase<TypedefRule> {
    static constexpr std::string_view kId = "modernize/typedef";
    static constexpr std::string_view kDescription =
        "Alias declarations read left-to-right and work with templates.";
    static constexpr Category kCategory = Category::Modernization;
    static constexpr Severity kSeverity = Severity::Info;
    static constexpr std::string_view kReference = "C++ Core Guidelines T.43";

    void run(const RuleContext& ctx, std::vector<Diagnostic>& out) const override {
        for (const Token* t : ctx.code) {
            if (t->isKeyword("typedef"))
                out.push_back(make(*t, "typedef declaration.", "Prefer 'using Name = Type;'."));
        }
    }
};

struct MacroConstant final : RuleBase<MacroConstant> {
    static constexpr std::string_view kId = "modernize/macro-constant";
    static constexpr std::string_view kDescription =
        "Object-like macros holding literals have no type or scope.";
    static constexpr Category kCategory = Category::Modernization;
    static constexpr Severity kSeverity = Severity::Info;
    static constexpr std::string_view kReference = "C++ Core Guidelines ES.31, Enum.1";

    void run(const RuleContext& ctx, std::vector<Diagnostic>& out) const override {
        for (const Token& t : ctx.tokens) {
            if (t.kind != TokenKind::Preprocessor) continue;
            std::string_view s = t.text.substr(1);
            auto skipWs = [&] { s.remove_prefix(std::min(s.find_first_not_of(" \t"), s.size())); };
            skipWs();
            if (!s.starts_with("define")) continue;
            s.remove_prefix(6);
            skipWs();
            // Name must be followed by whitespace (function-like macros have '(' attached).
            const std::size_t nameEnd = s.find_first_of(" \t(");
            if (nameEnd == std::string_view::npos || s[nameEnd] == '(') continue;
            s.remove_prefix(nameEnd);
            skipWs();
            if (s.empty()) continue;
            const bool numeric = (s[0] >= '0' && s[0] <= '9') ||
                                 (s[0] == '-' && s.size() > 1 && s[1] >= '0' && s[1] <= '9') ||
                                 s[0] == '"' || s[0] == '\'';
            if (numeric && s.find_first_of("()") == std::string_view::npos) {
                out.push_back(make(t.position, "Macro used to define a constant.",
                                   "Use 'inline constexpr auto Name = value;' or an enum class."));
            }
        }
    }
};

struct CRandom final : RuleBase<CRandom> {
    static constexpr std::string_view kId = "modernize/c-random";
    static constexpr std::string_view kDescription =
        "rand() has poor statistical quality and an unspecified period.";
    static constexpr Category kCategory = Category::Modernization;
    static constexpr Severity kSeverity = Severity::Info;
    static constexpr std::string_view kReference = "CERT C++ MSC50-CPP, MSC51-CPP";

    void run(const RuleContext& ctx, std::vector<Diagnostic>& out) const override {
        const auto& c = ctx.code;
        for (std::size_t i = 0; i < c.size(); ++i) {
            if (isCallOf(c, i, "rand") || isCallOf(c, i, "srand")) {
                out.push_back(make(*c[i], "Use of C random number facility.",
                                   "Use <random>: std::mt19937 seeded from std::random_device "
                                   "with a distribution object."));
            }
        }
    }
};

// ---------------------------------------------------------------------------------------------
// readability/*
// ---------------------------------------------------------------------------------------------

struct UsingNamespaceStd final : RuleBase<UsingNamespaceStd> {
    static constexpr std::string_view kId = "readability/using-namespace-std";
    static constexpr std::string_view kDescription =
        "A global using-directive for std pollutes every translation unit that includes the file.";
    static constexpr Category kCategory = Category::Readability;
    static constexpr Severity kSeverity = Severity::Warning;
    static constexpr std::string_view kReference = "C++ Core Guidelines SF.6, SF.7";

    void run(const RuleContext& ctx, std::vector<Diagnostic>& out) const override {
        const auto& c = ctx.code;
        int depth = 0;
        for (std::size_t i = 0; i + 2 < c.size(); ++i) {
            if (c[i]->isPunct("{"))
                ++depth;
            else if (c[i]->isPunct("}"))
                depth = std::max(0, depth - 1);
            if (depth == 0 && c[i]->isKeyword("using") && c[i + 1]->isKeyword("namespace") &&
                c[i + 2]->is(TokenKind::Identifier, "std")) {
                out.push_back(
                    make(*c[i], "'using namespace std;' at file scope.",
                         "Qualify names (std::cout) or scope the directive to a function."));
            }
        }
    }
};

struct MagicNumber final : RuleBase<MagicNumber> {
    static constexpr std::string_view kId = "readability/magic-number";
    static constexpr std::string_view kDescription = "Unnamed numeric literals obscure intent.";
    static constexpr Category kCategory = Category::Readability;
    static constexpr Severity kSeverity = Severity::Info;
    static constexpr std::string_view kReference = "C++ Core Guidelines ES.45";

    static bool parseInteger(std::string_view text, long long& value) {
        std::string digits;
        digits.reserve(text.size());
        int base = 10;
        std::size_t i = 0;
        if (text.size() > 1 && text[0] == '0' && (text[1] == 'x' || text[1] == 'X')) {
            base = 16;
            i = 2;
        } else if (text.size() > 1 && text[0] == '0' && (text[1] == 'b' || text[1] == 'B')) {
            base = 2;
            i = 2;
        } else if (text.size() > 1 && text[0] == '0') {
            base = 8;
            i = 1;
        }
        for (; i < text.size(); ++i) {
            const char ch = text[i];
            if (ch == '\'') continue;
            const bool ok = (base == 16) ? std::isxdigit(static_cast<unsigned char>(ch)) != 0
                                         : (ch >= '0' && ch < '0' + std::min(base, 10));
            if (!ok) break;  // suffix
            digits.push_back(ch);
        }
        if (digits.empty()) {
            value = 0;
            return true;
        }
        const auto r = std::from_chars(digits.data(), digits.data() + digits.size(), value, base);
        return r.ec == std::errc{} && r.ptr == digits.data() + digits.size();
    }

    void run(const RuleContext& ctx, std::vector<Diagnostic>& out) const override {
        const auto& c = ctx.code;
        for (std::size_t i = 0; i < c.size(); ++i) {
            const Token& t = *c[i];
            if (!(t.is(TokenKind::IntegerLiteral) || t.is(TokenKind::FloatingLiteral))) continue;
            if (i > 0 && (c[i - 1]->isKeyword("case") || c[i - 1]->isPunct("[") ||
                          c[i - 1]->isKeyword("return") || c[i - 1]->isPunct("<")))
                continue;
            // Named constant definition: `constexpr T name = 42;` or `enum { A = 3 }`.
            if (i >= 2 && c[i - 1]->isPunct("=") && c[i - 2]->is(TokenKind::Identifier)) {
                bool named = false;
                for (std::size_t k = i - 2; k > 0 && k + 8 > i; --k) {
                    if (c[k - 1]->isKeyword("constexpr") || c[k - 1]->isKeyword("const") ||
                        c[k - 1]->isKeyword("enum") || c[k - 1]->isPunct("{") ||
                        c[k - 1]->isPunct(",")) {
                        named = true;
                        break;
                    }
                    if (c[k - 1]->isPunct(";")) break;
                }
                if (named) continue;
            }
            if (t.is(TokenKind::IntegerLiteral)) {
                long long v = 0;
                if (parseInteger(t.text, v)) {
                    const bool negative =
                        i > 0 && c[i - 1]->isPunct("-") &&
                        (i < 2 || !(c[i - 2]->is(TokenKind::Identifier) || c[i - 2]->isLiteral() ||
                                    c[i - 2]->isPunct(")")));
                    if (negative) v = -v;
                    const auto& allowed = ctx.config.allowedMagicNumbers;
                    if (std::find(allowed.begin(), allowed.end(), v) != allowed.end()) continue;
                }
            }
            out.push_back(make(t, "Magic number '" + std::string(t.text) + "'.",
                               "Give it a name: inline constexpr auto kMeaningfulName = ...;"));
        }
    }
};

struct GotoRule final : RuleBase<GotoRule> {
    static constexpr std::string_view kId = "readability/goto";
    static constexpr std::string_view kDescription = "goto defeats structured control flow.";
    static constexpr Category kCategory = Category::Readability;
    static constexpr Severity kSeverity = Severity::Warning;
    static constexpr std::string_view kReference = "C++ Core Guidelines ES.76; Dijkstra 1968";

    void run(const RuleContext& ctx, std::vector<Diagnostic>& out) const override {
        for (const Token* t : ctx.code) {
            if (t->isKeyword("goto"))
                out.push_back(make(*t, "goto statement.",
                                   "Restructure with loops, early returns, or RAII for cleanup."));
        }
    }
};

// ---------------------------------------------------------------------------------------------
// performance/*
// ---------------------------------------------------------------------------------------------

struct EndlRule final : RuleBase<EndlRule> {
    static constexpr std::string_view kId = "performance/endl";
    static constexpr std::string_view kDescription = "std::endl flushes the stream on every use.";
    static constexpr Category kCategory = Category::Performance;
    static constexpr Severity kSeverity = Severity::Info;
    static constexpr std::string_view kReference = "C++ Core Guidelines SL.io.50";

    void run(const RuleContext& ctx, std::vector<Diagnostic>& out) const override {
        const auto& c = ctx.code;
        for (std::size_t i = 0; i < c.size(); ++i) {
            if (c[i]->is(TokenKind::Identifier, "endl") &&
                (precededByStd(c, i) || i == 0 || !c[i - 1]->isPunct("::"))) {
                out.push_back(make(*c[i], "std::endl forces a flush.",
                                   "Write '\\n' and call std::flush only where needed."));
            }
        }
    }
};

// ---------------------------------------------------------------------------------------------
// portability/*
// ---------------------------------------------------------------------------------------------

struct BitsStdcpp final : RuleBase<BitsStdcpp> {
    static constexpr std::string_view kId = "portability/bits-stdc++";
    static constexpr std::string_view kDescription =
        "<bits/stdc++.h> is a libstdc++ internal header; it is not portable and slows builds.";
    static constexpr Category kCategory = Category::Portability;
    static constexpr Severity kSeverity = Severity::Warning;
    static constexpr std::string_view kReference = "C++ Core Guidelines SF.12";

    void run(const RuleContext& ctx, std::vector<Diagnostic>& out) const override {
        for (const Token& t : ctx.tokens) {
            if (t.kind == TokenKind::Preprocessor &&
                t.text.find("bits/stdc++.h") != std::string_view::npos) {
                out.push_back(make(t.position, "Include of <bits/stdc++.h>.",
                                   "Include only the standard headers you use."));
            }
        }
    }
};

// ---------------------------------------------------------------------------------------------
// complexity/*
// ---------------------------------------------------------------------------------------------

struct HighCyclomatic final : RuleBase<HighCyclomatic> {
    static constexpr std::string_view kId = "complexity/high-cyclomatic";
    static constexpr std::string_view kDescription =
        "Functions above the cyclomatic threshold are harder to test exhaustively.";
    static constexpr Category kCategory = Category::Complexity;
    static constexpr Severity kSeverity = Severity::Warning;
    static constexpr std::string_view kReference = "McCabe 1976 (threshold 10)";

    void run(const RuleContext& ctx, std::vector<Diagnostic>& out) const override {
        for (const FunctionMetrics& f : ctx.metrics.functions) {
            if (f.cyclomatic > ctx.config.maxCyclomatic) {
                out.push_back(make(f.start,
                                   "Function '" + f.name + "' has cyclomatic complexity " +
                                       std::to_string(f.cyclomatic) + " (limit " +
                                       std::to_string(ctx.config.maxCyclomatic) + ").",
                                   "Extract helpers, replace nested conditionals with early "
                                   "returns, or table-drive the decision."));
            }
        }
    }
};

struct DeepNesting final : RuleBase<DeepNesting> {
    static constexpr std::string_view kId = "complexity/deep-nesting";
    static constexpr std::string_view kDescription = "Deeply nested blocks are hard to follow.";
    static constexpr Category kCategory = Category::Complexity;
    static constexpr Severity kSeverity = Severity::Warning;
    static constexpr std::string_view kReference = "Linux kernel coding style, ch. 1 (indentation)";

    void run(const RuleContext& ctx, std::vector<Diagnostic>& out) const override {
        for (const FunctionMetrics& f : ctx.metrics.functions) {
            if (f.maxNesting > ctx.config.maxNesting) {
                out.push_back(
                    make(f.start,
                         "Function '" + f.name + "' nests blocks " + std::to_string(f.maxNesting) +
                             " deep (limit " + std::to_string(ctx.config.maxNesting) + ").",
                         "Invert conditions to return early or extract the inner block."));
            }
        }
    }
};

struct LongFunction final : RuleBase<LongFunction> {
    static constexpr std::string_view kId = "complexity/long-function";
    static constexpr std::string_view kDescription =
        "Long functions usually do more than one thing.";
    static constexpr Category kCategory = Category::Complexity;
    static constexpr Severity kSeverity = Severity::Warning;
    static constexpr std::string_view kReference = "C++ Core Guidelines F.3";

    void run(const RuleContext& ctx, std::vector<Diagnostic>& out) const override {
        for (const FunctionMetrics& f : ctx.metrics.functions) {
            if (f.lines > ctx.config.maxFunctionLines) {
                out.push_back(make(f.start,
                                   "Function '" + f.name + "' spans " + std::to_string(f.lines) +
                                       " lines (limit " +
                                       std::to_string(ctx.config.maxFunctionLines) + ").",
                                   "Split it into named steps."));
            }
        }
    }
};

}  // namespace

std::vector<std::unique_ptr<Rule>> makeBuiltinRules() {
    std::vector<std::unique_ptr<Rule>> rules;
    rules.push_back(std::make_unique<UnsafeCFunction>());
    rules.push_back(std::make_unique<ShellCommand>());
    rules.push_back(std::make_unique<RawNewDelete>());
    rules.push_back(std::make_unique<MallocFree>());
    rules.push_back(std::make_unique<EmptyCatch>());
    rules.push_back(std::make_unique<AssignmentInCondition>());
    rules.push_back(std::make_unique<FloatEquality>());
    rules.push_back(std::make_unique<CStyleCast>());
    rules.push_back(std::make_unique<NullMacro>());
    rules.push_back(std::make_unique<TypedefRule>());
    rules.push_back(std::make_unique<MacroConstant>());
    rules.push_back(std::make_unique<CRandom>());
    rules.push_back(std::make_unique<UsingNamespaceStd>());
    rules.push_back(std::make_unique<MagicNumber>());
    rules.push_back(std::make_unique<GotoRule>());
    rules.push_back(std::make_unique<EndlRule>());
    rules.push_back(std::make_unique<BitsStdcpp>());
    rules.push_back(std::make_unique<HighCyclomatic>());
    rules.push_back(std::make_unique<DeepNesting>());
    rules.push_back(std::make_unique<LongFunction>());
    return rules;
}

}  // namespace cppmastery
