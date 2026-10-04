// cppmastery — command-line front end for the analysis engine.
//
// Exit codes: 0 success, 1 analysis reported errors (or warnings with --fail-on=warning),
//             2 usage error, 3 I/O error.

#include <algorithm>
#include <charconv>
#include <cstdio>
#include <exception>
#include <fstream>
#include <iostream>
#include <iterator>
#include <optional>
#include <sstream>
#include <string>
#include <string_view>
#include <vector>

#include "cppmastery/analysis/rule_engine.hpp"
#include "cppmastery/lexer/lexer.hpp"
#include "cppmastery/memory/layout.hpp"
#include "cppmastery/metrics/metrics.hpp"
#include "cppmastery/report/json_report.hpp"
#include "cppmastery/version.hpp"

namespace {

using namespace cppmastery;

constexpr std::string_view kUsage = R"(usage: cppmastery <command> [options] [<file>|-]

commands:
  analyze   run every rule and print diagnostics (default output: text)
  metrics   print code metrics only
  layout    compute struct memory layouts and padding-minimal reorderings
  tokens    dump the token stream
  rules     list the built-in rules with references
  version   print version information

options:
  --json                 machine-readable output (schemas in cpp-engine/schemas/)
  --fail-on <sev>        exit 1 when a diagnostic of at least <sev> exists (error|warning|info|never)
                         default: error
  --max-cc <n>           cyclomatic complexity threshold (default 10)
  --max-nesting <n>      block nesting threshold (default 4)
  --max-lines <n>        function length threshold (default 60)
  --disable <rule-id>    skip a rule (repeatable)
  --abi <lp64|llp64|ilp32>   data model for 'layout' (default lp64)
  --pack <n>             emulate #pragma pack(n) for 'layout'
  -h, --help             show this message
)";

struct Options {
    std::string command;
    std::string file;
    bool json = false;
    std::string failOn = "error";
    std::string abi = "lp64";
    std::optional<std::size_t> pack;
    AnalysisConfig config;
};

int usageError(std::string_view msg) {
    std::cerr << "cppmastery: " << msg << "\n\n" << kUsage;
    return 2;
}

std::optional<std::string> readInput(const std::string& path) {
    if (path.empty() || path == "-") {
        return std::string(std::istreambuf_iterator<char>(std::cin),
                           std::istreambuf_iterator<char>());
    }
    std::ifstream in(path, std::ios::binary);
    if (!in) return std::nullopt;
    return std::string(std::istreambuf_iterator<char>(in), std::istreambuf_iterator<char>());
}

template <typename T>
bool parseNumber(std::string_view s, T& out) {
    const auto r = std::from_chars(s.data(), s.data() + s.size(), out);
    return r.ec == std::errc{} && r.ptr == s.data() + s.size();
}

std::optional<Options> parseArgs(int argc, char** argv) {
    Options o;
    std::vector<std::string_view> args(argv + 1, argv + argc);
    if (args.empty()) return std::nullopt;
    for (std::size_t i = 0; i < args.size(); ++i) {
        const std::string_view a = args[i];
        auto needValue = [&](std::string_view name) -> std::optional<std::string_view> {
            if (i + 1 >= args.size()) {
                std::cerr << "cppmastery: " << name << " requires a value\n";
                return std::nullopt;
            }
            return args[++i];
        };
        if (a == "-h" || a == "--help") {
            o.command = "help";
            return o;
        }
        if (a == "--json") {
            o.json = true;
            continue;
        }
        if (a == "--fail-on") {
            auto v = needValue(a);
            if (!v) return std::nullopt;
            o.failOn = std::string(*v);
            continue;
        }
        if (a == "--abi") {
            auto v = needValue(a);
            if (!v) return std::nullopt;
            o.abi = std::string(*v);
            continue;
        }
        if (a == "--max-cc") {
            auto v = needValue(a);
            if (!v || !parseNumber(*v, o.config.maxCyclomatic)) return std::nullopt;
            continue;
        }
        if (a == "--max-nesting") {
            auto v = needValue(a);
            if (!v || !parseNumber(*v, o.config.maxNesting)) return std::nullopt;
            continue;
        }
        if (a == "--max-lines") {
            auto v = needValue(a);
            if (!v || !parseNumber(*v, o.config.maxFunctionLines)) return std::nullopt;
            continue;
        }
        if (a == "--pack") {
            std::size_t p = 0;
            auto v = needValue(a);
            if (!v || !parseNumber(*v, p)) return std::nullopt;
            o.pack = p;
            continue;
        }
        if (a == "--disable") {
            auto v = needValue(a);
            if (!v) return std::nullopt;
            o.config.disabledRules.insert(std::string(*v));
            continue;
        }
        if (!a.empty() && a[0] == '-' && a != "-") {
            std::cerr << "cppmastery: unknown option '" << a << "'\n";
            return std::nullopt;
        }
        if (!o.command.empty() && !o.file.empty()) {
            std::cerr << "cppmastery: unexpected argument '" << a << "'\n";
            return std::nullopt;
        }
        (o.command.empty() ? o.command : o.file) = std::string(a);
    }
    if (o.command.empty()) return std::nullopt;
    return o;
}

void printText(const AnalysisReport& r, const std::string& file) {
    const std::string label = file.empty() || file == "-" ? "<stdin>" : file;
    for (const Diagnostic& d : r.diagnostics) {
        std::cout << label << ':' << d.position.line << ':' << d.position.column << ": "
                  << toString(d.severity) << ": " << d.message << " [" << d.ruleId << "]\n";
        if (!d.suggestion.empty()) std::cout << "    hint: " << d.suggestion << '\n';
    }
    const CodeMetrics& m = r.metrics;
    std::cout << "\n"
              << r.summary.errors << " error(s), " << r.summary.warnings << " warning(s), "
              << r.summary.infos << " info(s) from " << r.rulesRun << " rules in "
              << r.elapsed.count() << " us\n";
    std::cout << "lines: " << m.lines.physical << " physical, " << m.lines.code << " code, "
              << m.lines.comment << " comment, " << m.lines.blank << " blank\n";
    std::cout << "functions: " << m.functions.size() << ", cyclomatic total " << m.totalCyclomatic
              << " (max " << m.maxCyclomatic << "), max nesting " << m.maxNesting << '\n';
    std::printf("halstead volume %.1f, effort %.1f; maintainability %.1f (normalized %.1f)\n",
                m.halstead.volume, m.halstead.effort, m.maintainability.raw,
                m.maintainability.normalized);
}

bool shouldFail(const AnalysisReport& r, std::string_view failOn) {
    if (failOn == "never") return false;
    if (failOn == "info") return r.summary.total() > 0;
    if (failOn == "warning") return r.summary.errors + r.summary.warnings > 0;
    return r.summary.errors > 0;
}

int runAnalyze(const Options& o, bool metricsOnly) {
    auto text = readInput(o.file);
    if (!text) {
        std::cerr << "cppmastery: cannot read '" << o.file << "'\n";
        return 3;
    }
    const SourceText source(std::move(*text));
    if (metricsOnly) {
        const CodeMetrics m = computeMetrics(source);
        if (o.json) {
            std::cout << toJson(m) << '\n';
            return 0;
        }
        AnalysisReport r;
        r.metrics = m;
        printText(r, o.file);
        return 0;
    }
    const RuleEngine engine = RuleEngine::withBuiltinRules();
    const AnalysisReport report = engine.analyze(source, o.config);
    if (o.json)
        std::cout << toJson(report) << '\n';
    else
        printText(report, o.file);
    return shouldFail(report, o.failOn) ? 1 : 0;
}

int runLayout(const Options& o) {
    auto text = readInput(o.file);
    if (!text) {
        std::cerr << "cppmastery: cannot read '" << o.file << "'\n";
        return 3;
    }
    TargetABI abi;
    if (o.abi == "lp64") {
        abi = TargetABI::lp64();
    } else if (o.abi == "llp64") {
        abi = TargetABI::llp64();
    } else if (o.abi == "ilp32") {
        abi = TargetABI::ilp32();
    } else {
        return usageError("unknown --abi");
    }
    const SourceText source(std::move(*text));
    const auto structs = parseStructs(source);
    const auto layouts = layoutAll(structs, abi, o.pack);
    std::vector<ReorderSuggestion> suggestions;
    suggestions.reserve(layouts.size());
    const TargetABI suggestAbi = abi;
    for (const StructLayout& l : layouts)
        suggestions.push_back(suggestReorder(l, suggestAbi, o.pack));
    if (o.json) {
        std::cout << toJson(layouts, suggestions, abi) << '\n';
        return 0;
    }
    for (std::size_t i = 0; i < layouts.size(); ++i) {
        const StructLayout& l = layouts[i];
        std::cout << "struct " << l.name << ": sizeof=" << l.size << " alignof=" << l.align
                  << " padding=" << l.paddingBytes << " ("
                  << static_cast<int>(l.paddingRatio() * 100) << "%)\n";
        for (const FieldLayout& f : l.fields) {
            if (f.paddingBefore) std::cout << "    [" << f.paddingBefore << " byte(s) padding]\n";
            std::cout << "  +" << f.offset << "  " << f.spec.type
                      << std::string(f.spec.pointerDepth, '*') << ' ' << f.spec.name;
            if (f.spec.arrayCount > 1) std::cout << '[' << f.spec.arrayCount << ']';
            std::cout << "  (" << f.size << " bytes, align " << f.align << ")\n";
        }
        if (l.tailPadding) std::cout << "    [" << l.tailPadding << " byte(s) tail padding]\n";
        for (const std::string& n : l.notes) std::cout << "  note: " << n << '\n';
        if (suggestions[i].bytesSaved > 0) {
            std::cout << "  reorder to save " << suggestions[i].bytesSaved << " byte(s):";
            for (const FieldSpec& f : suggestions[i].order) std::cout << ' ' << f.name;
            std::cout << "  -> sizeof=" << suggestions[i].layout.size << '\n';
        }
    }
    return 0;
}

int runTokens(const Options& o) {
    auto text = readInput(o.file);
    if (!text) {
        std::cerr << "cppmastery: cannot read '" << o.file << "'\n";
        return 3;
    }
    const SourceText source(std::move(*text));
    const auto tokens = tokenize(source);
    if (o.json) {
        std::cout << toJson(tokens) << '\n';
        return 0;
    }
    for (const Token& t : tokens) {
        if (t.kind == TokenKind::EndOfFile) break;
        std::cout << t.position.line << ':' << t.position.column << '\t' << toString(t.kind) << '\t'
                  << t.text << '\n';
    }
    return 0;
}

int runRules(const Options& o) {
    const RuleEngine engine = RuleEngine::withBuiltinRules();
    if (o.json) {
        const AnalysisReport empty;
        std::cout << toJson(empty, &engine) << '\n';
        return 0;
    }
    for (const auto& r : engine.rules()) {
        std::cout << r->id() << "  [" << toString(r->severity()) << "]\n    " << r->description()
                  << "\n    ref: " << r->reference() << '\n';
    }
    return 0;
}

}  // namespace

int main(int argc, char** argv) try {
    auto parsed = parseArgs(argc, argv);
    if (!parsed) return usageError("missing or invalid arguments");
    const Options& o = *parsed;
    if (o.command == "help") {
        std::cout << kUsage;
        return 0;
    }
    if (o.command == "version" || o.command == "--version") {
        std::cout << "cppmastery " << kVersion << " (" << kGitRevision << ")\n";
        return 0;
    }
    if (o.command == "analyze") return runAnalyze(o, /*metricsOnly=*/false);
    if (o.command == "metrics") return runAnalyze(o, /*metricsOnly=*/true);
    if (o.command == "layout") return runLayout(o);
    if (o.command == "tokens") return runTokens(o);
    if (o.command == "rules") return runRules(o);
    return usageError("unknown command '" + o.command + "'");
} catch (const std::exception& e) {
    std::cerr << "cppmastery: fatal: " << e.what() << '\n';
    return 3;
}
