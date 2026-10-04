#include "cppmastery/memory/layout.hpp"

#include <gtest/gtest.h>

#include <algorithm>

using namespace cppmastery;

TEST(Layout, ClassicPaddingExample) {
    TargetABI abi = TargetABI::lp64();
    StructLayout l =
        computeLayout("S", {{"a", "char"}, {"b", "int"}, {"c", "char"}, {"d", "double"}}, abi);
    EXPECT_EQ(l.size, 24u);
    EXPECT_EQ(l.align, 8u);
    EXPECT_EQ(l.fields[1].offset, 4u);
    EXPECT_EQ(l.fields[1].paddingBefore, 3u);
    EXPECT_EQ(l.fields[3].offset, 16u);
    EXPECT_EQ(l.paddingBytes, 24u - 14u);

    ReorderSuggestion s = suggestReorder(l);
    EXPECT_EQ(s.layout.size, 16u);
    EXPECT_EQ(s.bytesSaved, 8u);
    EXPECT_EQ(s.order[0].name, "d");  // highest alignment first, stable otherwise
    EXPECT_EQ(s.order[1].name, "b");
    EXPECT_EQ(s.order[2].name, "a");
    EXPECT_EQ(s.order[3].name, "c");
}

TEST(Layout, ReorderIsNeverWorse) {
    TargetABI abi = TargetABI::lp64();
    std::vector<FieldSpec> fields{
        {"a", "short"}, {"b", "long double"}, {"c", "bool"}, {"d", "int"}, {"e", "char", 0, 3}};
    StructLayout l = computeLayout("T", fields, abi);
    ReorderSuggestion s = suggestReorder(l);
    EXPECT_LE(s.layout.size, l.size);
    // Lower bound: sum of sizes rounded up to max alignment.
    std::size_t sum = 0;
    for (const auto& f : l.fields) sum += f.size;
    const std::size_t lower = (sum + l.align - 1) / l.align * l.align;
    EXPECT_EQ(s.layout.size, lower);
}

TEST(Layout, PointersArraysAndPack) {
    TargetABI abi = TargetABI::lp64();
    StructLayout l =
        computeLayout("P", {{"c", "char"}, {"p", "Foo", 1}, {"arr", "int", 0, 3}}, abi);
    EXPECT_EQ(l.fields[1].size, 8u);
    EXPECT_EQ(l.fields[1].offset, 8u);
    EXPECT_EQ(l.fields[2].size, 12u);
    EXPECT_EQ(l.size, 32u);

    StructLayout packed = computeLayout("P", {{"c", "char"}, {"i", "int"}}, abi, 1);
    EXPECT_EQ(packed.size, 5u);
    EXPECT_EQ(packed.align, 1u);
}

TEST(Layout, DataModelsDiffer) {
    EXPECT_EQ(TargetABI::lp64().lookup("long")->size, 8u);
    EXPECT_EQ(TargetABI::llp64().lookup("long")->size, 4u);
    EXPECT_EQ(TargetABI::ilp32().pointerSize, 4u);
    EXPECT_EQ(TargetABI::lp64().lookup("std::uint32_t")->size, 4u);
    EXPECT_EQ(TargetABI::lp64().lookup("unsigned")->size, 4u);
    EXPECT_EQ(TargetABI::lp64().lookup("std::vector<int>")->size, 24u);
    EXPECT_FALSE(TargetABI::lp64().lookup("Mystery").has_value());
}

TEST(Layout, EmptyStructHasSizeOne) {
    StructLayout l = computeLayout("E", {}, TargetABI::lp64());
    EXPECT_EQ(l.size, 1u);
    EXPECT_EQ(l.paddingBytes, 0u);
}

TEST(Layout, ParseStructsFromSource) {
    SourceText s(R"(
struct Inner { int a; char b; };
class Outer final : public Base {
public:
    Outer() = default;
    void method(int x) const;
    static int counter;
    bool flag;
    Inner inner;
    double* ptr;
    char name[8];
    int bits : 3;
    unsigned int u = 5, v{6};
    std::vector<int> items;
private:
    long long big;
};
struct Fwd;
)");
    auto parsed = parseStructs(s);
    ASSERT_EQ(parsed.size(), 2u);
    EXPECT_EQ(parsed[0].name, "Inner");
    ASSERT_EQ(parsed[0].fields.size(), 2u);
    EXPECT_EQ(parsed[1].name, "Outer");
    std::vector<std::string> names;
    for (const auto& f : parsed[1].fields) names.push_back(f.name);
    EXPECT_EQ(names,
              (std::vector<std::string>{"flag", "inner", "ptr", "name", "u", "v", "items", "big"}));
    EXPECT_EQ(parsed[1].fields[2].pointerDepth, 1u);
    EXPECT_EQ(parsed[1].fields[3].arrayCount, 8u);
    EXPECT_EQ(parsed[1].fields[4].type, "unsigned int");
    EXPECT_GE(parsed[1].skipped.size(), 3u);  // ctor, method, static, bit-field

    TargetABI abi = TargetABI::lp64();
    auto layouts = layoutAll(parsed, abi);
    ASSERT_EQ(layouts.size(), 2u);
    EXPECT_EQ(layouts[0].size, 8u);
    EXPECT_EQ(layouts[1].fields[1].size, 8u);  // Inner resolved from the earlier definition
    EXPECT_EQ(layouts[1].fields[1].align, 4u);
}

// Regression for a libFuzzer finding: re-resolving type names during reordering made the
// suggestion larger than the original for self-referential or redefined structs.
TEST(Layout, ReorderUsesResolvedSizesForSelfReferenceAndRedefinition) {
    SourceText s(R"(
struct S { char c; S inner; };
struct T { char c; int x; };
struct U { T t; char d; };
struct T { double big; char c; };
)");
    TargetABI abi = TargetABI::lp64();
    const auto layouts = layoutAll(parseStructs(s), abi);
    ASSERT_EQ(layouts.size(), 4u);
    for (const StructLayout& l : layouts) {
        const ReorderSuggestion r = suggestReorder(l);
        EXPECT_LE(r.layout.size, l.size) << l.name;
        ASSERT_EQ(r.layout.fields.size(), l.fields.size());
        std::size_t sum = 0;
        for (const FieldLayout& f : l.fields) sum += f.size;
        EXPECT_EQ(r.layout.size, (sum + l.align - 1) / l.align * l.align) << l.name;
    }
}

TEST(Layout, ReorderPreservesPackedAlignment) {
    const TargetABI abi = TargetABI::lp64();
    const StructLayout packed =
        computeLayout("P", {{"c", "char"}, {"d", "double"}, {"s", "short"}}, abi, 2);
    const ReorderSuggestion r = suggestReorder(packed);
    EXPECT_EQ(r.layout.align, 2u);
    EXPECT_LE(r.layout.size, packed.size);
    EXPECT_EQ(r.layout.size, 12u);  // 8 + 2 + 1 -> 11, rounded to 2
}
