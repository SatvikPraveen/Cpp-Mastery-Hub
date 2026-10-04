#include "cppmastery/metrics/metrics.hpp"

#include <gtest/gtest.h>

#include <algorithm>
#include <cmath>
#include <string>

using namespace cppmastery;

namespace {

CodeMetrics metrics(const std::string& code) {
    SourceText s(code);
    return computeMetrics(s);
}

const FunctionMetrics* find(const CodeMetrics& m, const std::string& name) {
    for (const auto& f : m.functions) {
        if (f.name == name) return &f;
    }
    return nullptr;
}

}  // namespace

TEST(Metrics, LineClassification) {
    auto m = metrics("// header\n\nint x; // trailing\n/* multi\n   line */\nint y;\n");
    EXPECT_EQ(m.lines.physical, 6u);
    EXPECT_EQ(m.lines.comment, 3u);  // line 1, 4, 5
    EXPECT_EQ(m.lines.blank, 1u);
    EXPECT_EQ(m.lines.code, 2u);
    EXPECT_EQ(m.lines.mixed, 1u);
}

TEST(Metrics, DetectsFreeFunctionsAndCyclomatic) {
    auto m = metrics(R"(
int classify(int n) {
    if (n < 0) return -1;
    for (int i = 0; i < n; ++i) {
        while (i > 3 && n > 7) { --n; }
    }
    switch (n) { case 1: case 2: return 2; default: return 0; }
}
)");
    ASSERT_EQ(m.functions.size(), 1u);
    const auto& f = m.functions[0];
    EXPECT_EQ(f.name, "classify");
    EXPECT_EQ(f.parameters, 1u);
    // 1 + if + for + while + case + case = 6
    EXPECT_EQ(f.cyclomatic, 6u);
    EXPECT_EQ(f.cyclomaticExtended, 7u);  // + &&
    EXPECT_EQ(f.maxNesting, 2u);          // for { while { } }
    EXPECT_EQ(m.totalCyclomatic, 6u);
    EXPECT_EQ(m.maxCyclomatic, 6u);
}

TEST(Metrics, MemberFunctionsConstructorsAndOperators) {
    auto m = metrics(R"(
struct Vec {
    Vec(double x, double y) : x_(x), y_{y} {}
    Vec operator+(const Vec& o) const noexcept { return Vec(x_ + o.x_, y_ + o.y_); }
    bool operator()(int) const { return true; }
    ~Vec() {}
    double x_, y_;
};
Vec Vec_make() { return Vec(1, 2); }
auto Trail::get() -> int { return 1; }
)");
    EXPECT_NE(find(m, "Vec"), nullptr);
    EXPECT_NE(find(m, "operator+"), nullptr);
    EXPECT_NE(find(m, "operator()"), nullptr);
    EXPECT_NE(find(m, "~Vec"), nullptr);
    EXPECT_NE(find(m, "Vec_make"), nullptr);
    EXPECT_NE(find(m, "Trail::get"), nullptr);
    EXPECT_EQ(m.functions.size(), 6u);
    EXPECT_EQ(m.classCount, 1u);
    EXPECT_EQ(find(m, "Vec")->parameters, 2u);
    EXPECT_EQ(find(m, "operator()")->parameters, 1u);
}

TEST(Metrics, CallsAndControlFlowAreNotFunctions) {
    auto m = metrics(R"(
int g(int);
void f() {
    if (g(1)) { }
    while (g(2)) { }
    auto l = [](int a) { return a; };
    std::vector<int> v{1, 2};
    g(l(3));
}
)");
    ASSERT_EQ(m.functions.size(), 1u);
    EXPECT_EQ(m.functions[0].name, "f");
    // if-block, while-block and the lambda body are all depth 1; `v{1, 2}` is brace-init.
    EXPECT_EQ(m.functions[0].maxNesting, 1u);
}

TEST(Metrics, DeclarationsAreNotDefinitions) {
    auto m = metrics(
        "int a(int);\nvirtual void b() = 0;\nvoid c() = default;\nstruct S; int main() { return 0; "
        "}");
    ASSERT_EQ(m.functions.size(), 1u);
    EXPECT_EQ(m.functions[0].name, "main");
}

TEST(Metrics, HalsteadOnTinyProgram) {
    // tokens: int main ( ) { return 0 ; }
    // operators: int main? no -> operands: main, 0; operators: int ( { return ;  (closers skipped)
    auto m = metrics("int main() { return 0; }");
    EXPECT_EQ(m.halstead.totalOperands, 2u);
    EXPECT_EQ(m.halstead.distinctOperands, 2u);
    EXPECT_EQ(m.halstead.totalOperators, 5u);
    EXPECT_EQ(m.halstead.distinctOperators, 5u);
    EXPECT_NEAR(m.halstead.vocabulary, 7.0, 1e-9);
    EXPECT_NEAR(m.halstead.length, 7.0, 1e-9);
    EXPECT_NEAR(m.halstead.volume, 7.0 * std::log2(7.0), 1e-9);
    EXPECT_NEAR(m.halstead.difficulty, (5.0 / 2.0) * (2.0 / 2.0), 1e-9);
}

TEST(Metrics, MaintainabilityIndexFormula) {
    auto m = metrics("int main() { return 0; }");
    const double v = std::max(1.0, m.halstead.volume);
    const double expected = 171.0 - 5.2 * std::log(v) - 0.23 * 1.0 - 16.2 * std::log(1.0);
    EXPECT_NEAR(m.maintainability.raw, expected, 1e-9);
    EXPECT_NEAR(m.maintainability.normalized, std::clamp(expected * 100.0 / 171.0, 0.0, 100.0),
                1e-9);
    EXPECT_GE(m.maintainability.normalized, 0.0);
    EXPECT_LE(m.maintainability.normalized, 100.0);
}

TEST(Metrics, IncludesClassesAndTemplatesCounted) {
    auto m = metrics(
        "#include <vector>\n#include \"a.h\"\ntemplate <class T> struct Box { T v; };\nenum class "
        "E { A };\nclass Fwd;\nstruct X : Box<int> {};");
    EXPECT_EQ(m.includeCount, 2u);
    EXPECT_EQ(m.classCount, 2u);  // Box and X; `class T`, `enum class`, forward decl excluded
}

TEST(Metrics, TruncatedInputDoesNotCrash) {
    auto m = metrics("int f() { if (x) { while (y) {");
    ASSERT_EQ(m.functions.size(), 1u);
    EXPECT_EQ(m.functions[0].cyclomatic, 3u);
}
