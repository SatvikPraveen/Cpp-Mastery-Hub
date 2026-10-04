#include <cstddef>
#include <cstdint>
#include <cstdlib>
#include <string>

#include "cppmastery/analysis/rule_engine.hpp"
#include "cppmastery/report/json_report.hpp"

extern "C" int LLVMFuzzerTestOneInput(const std::uint8_t* data, std::size_t size) {
    using namespace cppmastery;
    static const RuleEngine engine = RuleEngine::withBuiltinRules();
    SourceText src(std::string(reinterpret_cast<const char*>(data), size));
    AnalysisReport r = engine.analyze(src);
    if (r.summary.total() != r.diagnostics.size()) std::abort();
    const std::string json = toJson(r, &engine);
    if (json.empty() || json.front() != '{' || json.back() != '}') std::abort();
    return 0;
}
