#pragma once

#include <cstddef>
#include <cstdint>
#include <string>
#include <vector>

#include "cppmastery/lexer/token.hpp"
#include "cppmastery/source_text.hpp"

namespace cppmastery {

/// Physical line classification. Every physical line is exactly one of blank / comment / code,
/// where a line holding both code and a comment counts as code (and is also reported in `mixed`).
struct LineMetrics {
    std::size_t physical = 0;
    std::size_t blank = 0;
    std::size_t comment = 0;  ///< Comment-only lines.
    std::size_t code = 0;     ///< Lines with at least one code or preprocessor token.
    std::size_t mixed = 0;    ///< Subset of `code` that also carries a comment.
};

/// Halstead's software-science measures (Halstead, 1977).
///
/// Operand/operator classification used here (there is no canonical definition for C++):
///   - operands: identifiers that are not keywords, all literals, and the literal-like keywords
///     `true`, `false`, `nullptr`, `this`;
///   - operators: every other keyword, and every punctuator except the closing halves of bracket
///     pairs (`)`, `]`, `}`) so that each pair is counted once.
///   Comments and preprocessor directives are excluded.
struct HalsteadMetrics {
    std::size_t distinctOperators = 0;  ///< n1
    std::size_t distinctOperands = 0;   ///< n2
    std::size_t totalOperators = 0;     ///< N1
    std::size_t totalOperands = 0;      ///< N2
    double vocabulary = 0;              ///< n = n1 + n2
    double length = 0;                  ///< N = N1 + N2
    double estimatedLength = 0;         ///< N^ = n1 log2 n1 + n2 log2 n2
    double volume = 0;                  ///< V = N log2 n
    double difficulty = 0;              ///< D = (n1 / 2) * (N2 / n2)
    double effort = 0;                  ///< E = D * V
    double timeSeconds = 0;             ///< T = E / 18   (Stroud number 18)
    double deliveredBugs = 0;           ///< B = V / 3000
};

/// Per-function measures. Functions are detected syntactically from the token stream; see
/// docs/research/metrics-methodology.md for the recognition grammar and its known limitations.
struct FunctionMetrics {
    std::string name;              ///< Qualified where visible, e.g. `Foo::bar`, `operator<<`.
    Position start{};              ///< Position of the name token.
    Position bodyStart{};          ///< Position of the opening brace.
    Position end{};                ///< Position of the closing brace.
    std::size_t lines = 0;         ///< Physical lines spanned from name to closing brace.
    std::size_t parameters = 0;    ///< Top-level comma count + 1 in a non-empty parameter list.
    std::size_t statements = 0;    ///< Approximation: `;` tokens inside the body.
    std::uint32_t cyclomatic = 1;  ///< McCabe: 1 + decision keywords.
    std::uint32_t cyclomaticExtended = 1;  ///< Myers' extension: also counts `&&`, `||`, `?:`.
    std::uint32_t maxNesting = 0;          ///< Deepest block nesting relative to the body.
};

/// Maintainability Index (Oman & Hagemeister, 1992; SEI three-metric variant).
///   MI = 171 - 5.2 ln(V) - 0.23 G - 16.2 ln(LOC)
/// where V is total Halstead volume, G the sum of per-function cyclomatic complexity and LOC the
/// count of code lines. `normalized` rescales to [0, 100] as popularised by Visual Studio.
/// `withComments` adds the four-metric comment term 50 sin(sqrt(2.4 * perCM)).
struct MaintainabilityIndex {
    double raw = 0;
    double normalized = 0;
    double withComments = 0;
};

struct CodeMetrics {
    LineMetrics lines;
    HalsteadMetrics halstead;
    std::vector<FunctionMetrics> functions;
    std::size_t tokenCount = 0;         ///< Code tokens (no comments/preprocessor/EOF).
    std::size_t includeCount = 0;       ///< `#include` directives.
    std::size_t classCount = 0;         ///< `class` / `struct` / `union` definitions.
    std::uint32_t totalCyclomatic = 0;  ///< Sum over functions (0 if no function was found).
    std::uint32_t maxCyclomatic = 0;
    double meanCyclomatic = 0;
    std::uint32_t maxNesting = 0;
    double commentRatio = 0;  ///< comment lines / (code + comment lines)
    MaintainabilityIndex maintainability;
};

/// Computes every metric from an already-tokenized source (tokens must come from `source`).
[[nodiscard]] CodeMetrics computeMetrics(const SourceText& source,
                                         const std::vector<Token>& tokens);

/// Convenience overload that tokenizes first.
[[nodiscard]] CodeMetrics computeMetrics(const SourceText& source);

/// Computes Halstead measures over the given code tokens (comments/preprocessor ignored).
[[nodiscard]] HalsteadMetrics computeHalstead(const std::vector<Token>& tokens);

/// Detects function definitions in the token stream and computes per-function measures.
[[nodiscard]] std::vector<FunctionMetrics> detectFunctions(const SourceText& source,
                                                           const std::vector<Token>& tokens);

}  // namespace cppmastery
