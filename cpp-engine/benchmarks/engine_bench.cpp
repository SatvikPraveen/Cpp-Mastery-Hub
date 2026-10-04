// Micro-benchmarks for the engine's hot paths. Run via `cmake --preset bench && cmake --build
// --preset bench && ./build/bench/benchmarks/cppmastery_bench --benchmark_format=json`.
// eval/run_eval.py consumes the JSON to produce the throughput table in docs/research/.

#include <benchmark/benchmark.h>

#include <string>

#include "cppmastery/analysis/rule_engine.hpp"
#include "cppmastery/lexer/lexer.hpp"
#include "cppmastery/memory/layout.hpp"
#include "cppmastery/metrics/metrics.hpp"
#include "cppmastery/report/json_report.hpp"

using namespace cppmastery;

namespace {

// Deterministic synthetic program: `n` functions with realistic token mix.
std::string synthesize(int functions) {
    std::string s = "#include <vector>\n#include <string>\nnamespace bench {\n";
    for (int i = 0; i < functions; ++i) {
        s += "int fn" + std::to_string(i) +
             "(const std::vector<int>& v, int k) {\n"
             "    int acc = 0; // accumulate\n"
             "    for (std::size_t j = 0; j < v.size(); ++j) {\n"
             "        if (v[j] % 2 == 0 && k > 3) { acc += v[j] * 3; } else { acc -= 1; }\n"
             "    }\n"
             "    auto s = std::string(\"x\") + R\"(raw)\";\n"
             "    return acc + static_cast<int>(s.size()) + 0x1F;\n}\n";
    }
    s += "}  // namespace bench\n";
    return s;
}

void BM_Tokenize(benchmark::State& state) {
    const SourceText src(synthesize(static_cast<int>(state.range(0))));
    for (auto _ : state) {
        auto tokens = tokenize(src);
        benchmark::DoNotOptimize(tokens.data());
    }
    state.SetBytesProcessed(static_cast<int64_t>(state.iterations()) *
                            static_cast<int64_t>(src.size()));
    state.counters["tokens"] = static_cast<double>(tokenize(src).size());
}
BENCHMARK(BM_Tokenize)->Arg(1)->Arg(10)->Arg(100)->Arg(1000);

void BM_Metrics(benchmark::State& state) {
    const SourceText src(synthesize(static_cast<int>(state.range(0))));
    const auto tokens = tokenize(src);
    for (auto _ : state) {
        auto m = computeMetrics(src, tokens);
        benchmark::DoNotOptimize(m.functions.data());
    }
    state.SetBytesProcessed(static_cast<int64_t>(state.iterations()) *
                            static_cast<int64_t>(src.size()));
}
BENCHMARK(BM_Metrics)->Arg(10)->Arg(100)->Arg(1000);

void BM_AnalyzeFull(benchmark::State& state) {
    const SourceText src(synthesize(static_cast<int>(state.range(0))));
    const RuleEngine engine = RuleEngine::withBuiltinRules();
    for (auto _ : state) {
        auto r = engine.analyze(src);
        benchmark::DoNotOptimize(r.diagnostics.data());
    }
    state.SetBytesProcessed(static_cast<int64_t>(state.iterations()) *
                            static_cast<int64_t>(src.size()));
    state.counters["lines"] = static_cast<double>(src.lineCount());
}
BENCHMARK(BM_AnalyzeFull)->Arg(1)->Arg(10)->Arg(100)->Arg(1000);

void BM_AnalyzeToJson(benchmark::State& state) {
    const SourceText src(synthesize(100));
    const RuleEngine engine = RuleEngine::withBuiltinRules();
    for (auto _ : state) {
        auto json = toJson(engine.analyze(src), &engine);
        benchmark::DoNotOptimize(json.data());
    }
}
BENCHMARK(BM_AnalyzeToJson);

void BM_LayoutReorder(benchmark::State& state) {
    std::vector<FieldSpec> fields;
    for (int i = 0; i < state.range(0); ++i) {
        const char* types[] = {"char", "int", "double", "short", "long long", "bool"};
        fields.push_back({"f" + std::to_string(i), types[i % 6]});
    }
    const TargetABI abi = TargetABI::lp64();
    for (auto _ : state) {
        auto l = computeLayout("S", fields, abi);
        auto s = suggestReorder(l, abi);
        benchmark::DoNotOptimize(s.bytesSaved);
    }
}
BENCHMARK(BM_LayoutReorder)->Arg(8)->Arg(64)->Arg(512);

}  // namespace
