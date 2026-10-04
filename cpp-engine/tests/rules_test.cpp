#include <gtest/gtest.h>

#include <algorithm>
#include <set>
#include <string>

#include "cppmastery/analysis/builtin_rules.hpp"
#include "cppmastery/analysis/rule_engine.hpp"

using namespace cppmastery;

namespace {

const RuleEngine& engine() {
    static RuleEngine e = RuleEngine::withBuiltinRules();
    return e;
}

std::vector<std::string> rulesFired(const std::string& code, AnalysisConfig cfg = {}) {
    SourceText s(code);
    AnalysisReport r = engine().analyze(s, cfg);
    std::vector<std::string> ids;
    for (const auto& d : r.diagnostics) ids.push_back(d.ruleId);
    return ids;
}

bool fired(const std::vector<std::string>& ids, std::string_view rule) {
    return std::find(ids.begin(), ids.end(), rule) != ids.end();
}

std::size_t count(const std::vector<std::string>& ids, std::string_view rule) {
    return static_cast<std::size_t>(std::count(ids.begin(), ids.end(), rule));
}

}  // namespace

TEST(Rules, CatalogHasUniqueIdsAndReferences) {
    auto rules = makeBuiltinRules();
    EXPECT_EQ(rules.size(), 20u);
    std::set<std::string_view> ids;
    for (const auto& r : rules) {
        EXPECT_TRUE(ids.insert(r->id()).second) << "duplicate id " << r->id();
        EXPECT_FALSE(r->description().empty());
        EXPECT_FALSE(r->reference().empty()) << r->id();
        EXPECT_NE(r->id().find('/'), std::string_view::npos);
    }
}

TEST(Rules, CleanModernCodeProducesNoWarnings) {
    SourceText s(R"(
#include <memory>
#include <string>
#include <vector>

namespace demo {

class Counter {
public:
    explicit Counter(int start) : value_(start) {}
    void add(int delta) noexcept { value_ += delta; }
    [[nodiscard]] int value() const noexcept { return value_; }

private:
    int value_;
};

inline constexpr int kLimit = 100;

std::unique_ptr<Counter> make() { return std::make_unique<Counter>(0); }

}  // namespace demo

int main() {
    auto c = demo::make();
    for (int i = 0; i < demo::kLimit; ++i) c->add(1);
    return c->value() == demo::kLimit ? 0 : 1;
}
)");
    AnalysisReport r = engine().analyze(s);
    EXPECT_EQ(r.summary.errors, 0u);
    EXPECT_EQ(r.summary.warnings, 0u) << [&] {
        std::string all;
        for (const auto& d : r.diagnostics)
            all += d.ruleId + " @" + std::to_string(d.position.line) + "\n";
        return all;
    }();
}

TEST(Rules, UnsafeCFunctionIsAnError) {
    auto ids =
        rulesFired("#include <cstring>\nvoid f(char* d, const char* s) { strcpy(d, s); gets(d); }");
    EXPECT_EQ(count(ids, "security/unsafe-c-function"), 2u);
    SourceText s("void f(char* d, const char* s) { strcpy(d, s); }");
    EXPECT_EQ(engine().analyze(s).summary.errors, 1u);
}

TEST(Rules, MemberNamedStrcpyIsNotFlagged) {
    auto ids = rulesFired("void f(Obj& o) { o.strcpy(1); o->gets(); }");
    EXPECT_FALSE(fired(ids, "security/unsafe-c-function"));
}

TEST(Rules, ShellCommand) {
    EXPECT_TRUE(
        fired(rulesFired("int main() { return system(\"ls\"); }"), "security/shell-command"));
}

TEST(Rules, RawNewDeleteAndMalloc) {
    auto ids =
        rulesFired("void f() { int* p = new int(3); delete p; void* q = malloc(4); free(q); }");
    EXPECT_EQ(count(ids, "memory/raw-new-delete"), 2u);
    EXPECT_EQ(count(ids, "memory/malloc-free"), 2u);
    auto ok = rulesFired("struct S { S() = delete; void* operator new(std::size_t); };");
    EXPECT_FALSE(fired(ok, "memory/raw-new-delete"));
}

TEST(Rules, EmptyCatch) {
    EXPECT_TRUE(fired(rulesFired("void f() { try { g(); } catch (const std::exception&) {} }"),
                      "correctness/empty-catch"));
    EXPECT_FALSE(fired(rulesFired("void f() { try { g(); } catch (...) { log(); } }"),
                       "correctness/empty-catch"));
}

TEST(Rules, AssignmentInCondition) {
    EXPECT_TRUE(fired(rulesFired("void f(int x) { if (x = 5) {} }"),
                      "correctness/assignment-in-condition"));
    EXPECT_FALSE(fired(rulesFired("void f(int x) { if (x == 5) {} if (auto v = g(); v) {} }"),
                       "correctness/assignment-in-condition"));
}

TEST(Rules, FloatEquality) {
    EXPECT_TRUE(
        fired(rulesFired("bool f(double d) { return d == 0.1; }"), "correctness/float-equality"));
    EXPECT_FALSE(
        fired(rulesFired("bool f(int d) { return d == 1; }"), "correctness/float-equality"));
}

TEST(Rules, CStyleCastPrecision) {
    auto ids = rulesFired(
        "void f(double d, void* p) { int a = (int)d; char* c = (char*)p; int b = (unsigned "
        "long)(d); }");
    EXPECT_EQ(count(ids, "modernize/c-style-cast"), 3u);
    auto ok = rulesFired(
        "void f() { int (*fp)(int); auto n = sizeof(int); std::vector<int> v(int(3)); }");
    EXPECT_FALSE(fired(ok, "modernize/c-style-cast"));
}

TEST(Rules, ModernizeInfos) {
    auto ids = rulesFired(
        "#define MAX 10\n#define SQ(x) ((x)*(x))\ntypedef int I;\nint* p = NULL;\nint r = rand();");
    EXPECT_EQ(count(ids, "modernize/macro-constant"), 1u);
    EXPECT_TRUE(fired(ids, "modernize/typedef"));
    EXPECT_TRUE(fired(ids, "modernize/null-macro"));
    EXPECT_TRUE(fired(ids, "modernize/c-random"));
}

TEST(Rules, UsingNamespaceStdOnlyAtFileScope) {
    EXPECT_TRUE(
        fired(rulesFired("using namespace std;\nint x;"), "readability/using-namespace-std"));
    EXPECT_FALSE(
        fired(rulesFired("void f() { using namespace std; }"), "readability/using-namespace-std"));
}

TEST(Rules, MagicNumbersRespectAllowListAndNamedConstants) {
    auto ids = rulesFired(R"(
constexpr int kMax = 42;
enum E { A = 7, B = 9 };
int f(int n) {
    switch (n) { case 3: return 0; }
    int arr[16];
    return n * 60 + arr[2] - 1;
}
)");
    // 42 and 7/9 are named constants, 3 is a case label, 16 is an array bound, 2 and 1 are
    // allow-listed; only 60 remains.
    EXPECT_EQ(count(ids, "readability/magic-number"), 1u);
}

TEST(Rules, GotoEndlBits) {
    auto ids = rulesFired(
        "#include <bits/stdc++.h>\nvoid f() { std::cout << 1 << std::endl; goto done; done: ; }");
    EXPECT_TRUE(fired(ids, "readability/goto"));
    EXPECT_TRUE(fired(ids, "performance/endl"));
    EXPECT_TRUE(fired(ids, "portability/bits-stdc++"));
}

TEST(Rules, ComplexityThresholdsAreConfigurable) {
    std::string code = "void f(int n) {\n";
    for (int i = 0; i < 12; ++i) code += "  if (n == " + std::to_string(i) + ") n++;\n";
    code += "}\n";
    EXPECT_TRUE(fired(rulesFired(code), "complexity/high-cyclomatic"));
    AnalysisConfig relaxed;
    relaxed.maxCyclomatic = 50;
    EXPECT_FALSE(fired(rulesFired(code, relaxed), "complexity/high-cyclomatic"));

    AnalysisConfig strictNesting;
    strictNesting.maxNesting = 1;
    EXPECT_TRUE(fired(rulesFired("void g() { if (a) { if (b) { } } }", strictNesting),
                      "complexity/deep-nesting"));

    AnalysisConfig shortFn;
    shortFn.maxFunctionLines = 2;
    EXPECT_TRUE(fired(rulesFired("void h() {\n\n\n\n}", shortFn), "complexity/long-function"));
}

TEST(Rules, DisabledRulesAreSkipped) {
    AnalysisConfig cfg;
    cfg.disabledRules.insert("readability/goto");
    SourceText s("void f() { goto x; x: ; }");
    AnalysisReport r = engine().analyze(s, cfg);
    EXPECT_FALSE(fired(
        [&] {
            std::vector<std::string> v;
            for (auto& d : r.diagnostics) v.push_back(d.ruleId);
            return v;
        }(),
        "readability/goto"));
    EXPECT_EQ(r.rulesRun, 19u);
}

TEST(Rules, DiagnosticsAreSortedAndSummarised) {
    SourceText s("void f() {\n  goto a;\n  a: int* p = new int;\n  strcpy(p, p);\n}");
    AnalysisReport r = engine().analyze(s);
    ASSERT_GE(r.diagnostics.size(), 3u);
    for (std::size_t i = 1; i < r.diagnostics.size(); ++i) {
        EXPECT_LE(r.diagnostics[i - 1].position.line, r.diagnostics[i].position.line);
    }
    EXPECT_EQ(r.summary.total(), r.diagnostics.size());
    EXPECT_EQ(r.summary.errors, 1u);
}
