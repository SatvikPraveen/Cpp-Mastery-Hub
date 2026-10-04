#include <gtest/gtest.h>

#include <limits>

#include "cppmastery/analysis/rule_engine.hpp"
#include "cppmastery/json/json_writer.hpp"
#include "cppmastery/report/json_report.hpp"

using namespace cppmastery;

TEST(JsonWriter, NestedStructuresAndCommas) {
    json::Writer w;
    w.beginObject()
        .key("a")
        .value(1)
        .key("b")
        .beginArray()
        .value("x")
        .value(true)
        .null()
        .endArray()
        .key("c")
        .beginObject()
        .endObject()
        .endObject();
    EXPECT_EQ(w.str(), R"({"a":1,"b":["x",true,null],"c":{}})");
}

TEST(JsonWriter, Escaping) {
    json::Writer w;
    w.value(std::string_view("q\"b\\n\n\t\x01"));
    EXPECT_EQ(w.str(), R"("q\"b\\n\n\t\u0001")");
}

TEST(JsonWriter, Numbers) {
    json::Writer w;
    w.beginArray()
        .value(-5)
        .value(3.5)
        .value(std::numeric_limits<double>::infinity())
        .value(1234567890123ULL)
        .endArray();
    EXPECT_EQ(w.str(), "[-5,3.5,null,1234567890123]");
}

TEST(JsonReport, AnalysisReportHasSchemaAndCounts) {
    SourceText s("int main() { goto x; x: return 0; }");
    RuleEngine e = RuleEngine::withBuiltinRules();
    std::string out = toJson(e.analyze(s), &e);
    EXPECT_NE(out.find("\"schema\":\"cppmastery.analysis/1\""), std::string::npos);
    EXPECT_NE(out.find("\"rule\":\"readability/goto\""), std::string::npos);
    EXPECT_NE(out.find("\"rules\":[{"), std::string::npos);
    EXPECT_NE(out.find("\"maintainability\":{"), std::string::npos);
    // Balanced braces as a cheap structural check.
    long depth = 0;
    bool inString = false;
    for (std::size_t i = 0; i < out.size(); ++i) {
        const char ch = out[i];
        if (ch == '"' && (i == 0 || out[i - 1] != '\\')) inString = !inString;
        if (inString) continue;
        if (ch == '{' || ch == '[') ++depth;
        if (ch == '}' || ch == ']') --depth;
        ASSERT_GE(depth, 0);
    }
    EXPECT_EQ(depth, 0);
}

TEST(JsonReport, LayoutReport) {
    TargetABI abi = TargetABI::lp64();
    StructLayout l = computeLayout("S", {{"a", "char"}, {"b", "int"}}, abi);
    std::string out = toJson(l);
    EXPECT_NE(out.find("\"size\":8"), std::string::npos);
    EXPECT_NE(out.find("\"padding_before\":3"), std::string::npos);
}
