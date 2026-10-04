#include "cppmastery/report/json_report.hpp"

#include "cppmastery/json/json_writer.hpp"
#include "cppmastery/version.hpp"

namespace cppmastery {

namespace {

void writePosition(json::Writer& w, const Position& p) {
    w.beginObject().key("line").value(p.line).key("column").value(p.column).endObject();
}

void writeMetrics(json::Writer& w, const CodeMetrics& m) {
    w.beginObject();
    w.key("lines")
        .beginObject()
        .key("physical")
        .value(m.lines.physical)
        .key("code")
        .value(m.lines.code)
        .key("comment")
        .value(m.lines.comment)
        .key("blank")
        .value(m.lines.blank)
        .key("mixed")
        .value(m.lines.mixed)
        .endObject();
    w.key("tokens").value(m.tokenCount);
    w.key("includes").value(m.includeCount);
    w.key("classes").value(m.classCount);
    w.key("comment_ratio").value(m.commentRatio);
    const HalsteadMetrics& h = m.halstead;
    w.key("halstead")
        .beginObject()
        .key("n1")
        .value(h.distinctOperators)
        .key("n2")
        .value(h.distinctOperands)
        .key("N1")
        .value(h.totalOperators)
        .key("N2")
        .value(h.totalOperands)
        .key("vocabulary")
        .value(h.vocabulary)
        .key("length")
        .value(h.length)
        .key("estimated_length")
        .value(h.estimatedLength)
        .key("volume")
        .value(h.volume)
        .key("difficulty")
        .value(h.difficulty)
        .key("effort")
        .value(h.effort)
        .key("time_seconds")
        .value(h.timeSeconds)
        .key("delivered_bugs")
        .value(h.deliveredBugs)
        .endObject();
    w.key("cyclomatic")
        .beginObject()
        .key("total")
        .value(m.totalCyclomatic)
        .key("max")
        .value(m.maxCyclomatic)
        .key("mean")
        .value(m.meanCyclomatic)
        .endObject();
    w.key("max_nesting").value(m.maxNesting);
    w.key("maintainability")
        .beginObject()
        .key("raw")
        .value(m.maintainability.raw)
        .key("normalized")
        .value(m.maintainability.normalized)
        .key("with_comments")
        .value(m.maintainability.withComments)
        .endObject();
    w.key("functions").beginArray();
    for (const FunctionMetrics& f : m.functions) {
        w.beginObject().key("name").value(f.name);
        w.key("start");
        writePosition(w, f.start);
        w.key("end");
        writePosition(w, f.end);
        w.key("lines")
            .value(f.lines)
            .key("parameters")
            .value(f.parameters)
            .key("statements")
            .value(f.statements)
            .key("cyclomatic")
            .value(f.cyclomatic)
            .key("cyclomatic_extended")
            .value(f.cyclomaticExtended)
            .key("max_nesting")
            .value(f.maxNesting)
            .endObject();
    }
    w.endArray();
    w.endObject();
}

void writeLayout(json::Writer& w, const StructLayout& l) {
    w.beginObject()
        .key("name")
        .value(l.name)
        .key("size")
        .value(l.size)
        .key("align")
        .value(l.align)
        .key("padding_bytes")
        .value(l.paddingBytes)
        .key("tail_padding")
        .value(l.tailPadding)
        .key("padding_ratio")
        .value(l.paddingRatio());
    w.key("fields").beginArray();
    for (const FieldLayout& f : l.fields) {
        w.beginObject()
            .key("name")
            .value(f.spec.name)
            .key("type")
            .value(f.spec.type)
            .key("pointer_depth")
            .value(f.spec.pointerDepth)
            .key("array_count")
            .value(f.spec.arrayCount)
            .key("offset")
            .value(f.offset)
            .key("size")
            .value(f.size)
            .key("align")
            .value(f.align)
            .key("padding_before")
            .value(f.paddingBefore)
            .endObject();
    }
    w.endArray();
    w.key("notes").beginArray();
    for (const std::string& n : l.notes) w.value(n);
    w.endArray();
    w.endObject();
}

}  // namespace

std::string toJson(const CodeMetrics& m) {
    json::Writer w;
    writeMetrics(w, m);
    return w.release();
}

std::string toJson(const AnalysisReport& r, const RuleEngine* rules) {
    json::Writer w;
    w.beginObject();
    w.key("schema").value("cppmastery.analysis/1");
    w.key("engine")
        .beginObject()
        .key("version")
        .value(kVersion)
        .key("revision")
        .value(kGitRevision)
        .endObject();
    w.key("elapsed_us").value(static_cast<long long>(r.elapsed.count()));
    w.key("rules_run").value(r.rulesRun);
    w.key("summary")
        .beginObject()
        .key("errors")
        .value(r.summary.errors)
        .key("warnings")
        .value(r.summary.warnings)
        .key("infos")
        .value(r.summary.infos)
        .key("total")
        .value(r.summary.total())
        .endObject();
    w.key("diagnostics").beginArray();
    for (const Diagnostic& d : r.diagnostics) {
        w.beginObject()
            .key("rule")
            .value(d.ruleId)
            .key("severity")
            .value(toString(d.severity))
            .key("category")
            .value(toString(d.category));
        w.key("position");
        writePosition(w, d.position);
        w.key("length")
            .value(d.length)
            .key("message")
            .value(d.message)
            .key("suggestion")
            .value(d.suggestion)
            .key("reference")
            .value(d.reference)
            .endObject();
    }
    w.endArray();
    w.key("metrics");
    writeMetrics(w, r.metrics);
    if (rules != nullptr) {
        w.key("rules").beginArray();
        for (const auto& rule : rules->rules()) {
            w.beginObject()
                .key("id")
                .value(rule->id())
                .key("description")
                .value(rule->description())
                .key("category")
                .value(toString(rule->category()))
                .key("severity")
                .value(toString(rule->severity()))
                .key("reference")
                .value(rule->reference())
                .endObject();
        }
        w.endArray();
    }
    w.endObject();
    return w.release();
}

std::string toJson(const StructLayout& l) {
    json::Writer w;
    writeLayout(w, l);
    return w.release();
}

std::string toJson(const std::vector<StructLayout>& layouts,
                   const std::vector<ReorderSuggestion>& suggestions, const TargetABI& abi) {
    json::Writer w;
    w.beginObject().key("schema").value("cppmastery.layout/1");
    w.key("abi")
        .beginObject()
        .key("name")
        .value(abi.name)
        .key("pointer_size")
        .value(abi.pointerSize)
        .endObject();
    w.key("structs").beginArray();
    for (std::size_t i = 0; i < layouts.size(); ++i) {
        w.beginObject().key("layout");
        writeLayout(w, layouts[i]);
        if (i < suggestions.size()) {
            w.key("suggested").beginObject().key("bytes_saved").value(suggestions[i].bytesSaved);
            w.key("layout");
            writeLayout(w, suggestions[i].layout);
            w.endObject();
        }
        w.endObject();
    }
    w.endArray().endObject();
    return w.release();
}

std::string toJson(const std::vector<Token>& tokens) {
    json::Writer w;
    w.beginArray();
    for (const Token& t : tokens) {
        if (t.kind == TokenKind::EndOfFile) continue;
        w.beginObject()
            .key("kind")
            .value(toString(t.kind))
            .key("text")
            .value(t.text)
            .key("offset")
            .value(t.offset)
            .key("line")
            .value(t.position.line)
            .key("column")
            .value(t.position.column)
            .endObject();
    }
    w.endArray();
    return w.release();
}

}  // namespace cppmastery
