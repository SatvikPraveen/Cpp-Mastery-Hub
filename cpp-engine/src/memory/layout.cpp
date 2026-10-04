#include "cppmastery/memory/layout.hpp"

#include <algorithm>
#include <charconv>
#include <numeric>

#include "cppmastery/lexer/lexer.hpp"

namespace cppmastery {

namespace {

std::size_t roundUp(std::size_t value, std::size_t align) noexcept {
    if (align == 0) return value;
    return (value + align - 1) / align * align;
}

std::string normaliseTypeName(const std::string& name) {
    // Collapse whitespace and drop a leading std::.
    std::string out;
    out.reserve(name.size());
    bool pendingSpace = false;
    for (const char ch : name) {
        if (ch == ' ' || ch == '\t' || ch == '\n') {
            pendingSpace = !out.empty();
            continue;
        }
        if (pendingSpace) {
            out.push_back(' ');
            pendingSpace = false;
        }
        out.push_back(ch);
    }
    if (out.starts_with("std::")) out.erase(0, 5);
    // Canonical spellings for integer type synonyms.
    static const std::pair<const char*, const char*> kSynonyms[] = {
        {"unsigned", "unsigned int"},
        {"signed", "int"},
        {"signed int", "int"},
        {"short int", "short"},
        {"unsigned short int", "unsigned short"},
        {"long int", "long"},
        {"unsigned long int", "unsigned long"},
        {"long long int", "long long"},
        {"unsigned long long int", "unsigned long long"},
        {"signed char", "char"},
        {"int8_t", "char"},
        {"uint8_t", "unsigned char"},
        {"int16_t", "short"},
        {"uint16_t", "unsigned short"},
        {"int32_t", "int"},
        {"uint32_t", "unsigned int"},
        {"int64_t", "long long"},
        {"uint64_t", "unsigned long long"},
        {"size_t", "unsigned long"},
        {"ptrdiff_t", "long"},
        {"intptr_t", "long"},
        {"uintptr_t", "unsigned long"},
    };
    for (const auto& [from, to] : kSynonyms) {
        if (out == from) return to;
    }
    return out;
}

TargetABI baseAbi(std::string abiName, std::size_t ptr, std::size_t longSize,
                  std::size_t longDouble, std::size_t longDoubleAlign) {
    TargetABI abi;
    abi.name = std::move(abiName);
    abi.pointerSize = ptr;
    abi.pointerAlign = ptr;
    abi.types = {
        {"bool", {1, 1}},
        {"char", {1, 1}},
        {"unsigned char", {1, 1}},
        {"char8_t", {1, 1}},
        {"char16_t", {2, 2}},
        {"char32_t", {4, 4}},
        {"wchar_t", {4, 4}},
        {"short", {2, 2}},
        {"unsigned short", {2, 2}},
        {"int", {4, 4}},
        {"unsigned int", {4, 4}},
        {"long", {longSize, longSize}},
        {"unsigned long", {longSize, longSize}},
        {"long long", {8, std::min<std::size_t>(8, ptr)}},
        {"unsigned long long", {8, std::min<std::size_t>(8, ptr)}},
        {"float", {4, 4}},
        {"double", {8, std::min<std::size_t>(8, ptr)}},
        {"long double", {longDouble, longDoubleAlign}},
        // Library types (libstdc++/libc++ on the given data model; flagged as assumptions).
        {"string", {ptr * 4, ptr}},
        {"string_view", {ptr * 2, ptr}},
        {"vector", {ptr * 3, ptr}},
        {"unique_ptr", {ptr, ptr}},
        {"shared_ptr", {ptr * 2, ptr}},
        {"weak_ptr", {ptr * 2, ptr}},
        {"function", {ptr * 4, ptr}},
        {"optional", {0, 0}},
        {"any", {ptr * 2, ptr}},
        {"map", {ptr * 6, ptr}},
        {"set", {ptr * 6, ptr}},
        {"unordered_map", {ptr * 7, ptr}},
        {"unordered_set", {ptr * 7, ptr}},
        {"deque", {ptr * 10, ptr}},
        {"list", {ptr * 3, ptr}},
        {"atomic<int>", {4, 4}},
        {"atomic<bool>", {1, 1}},
        {"mutex", {ptr == 8 ? 40u : 24u, ptr}},
        {"thread", {ptr, ptr}},
    };
    abi.types.erase("optional");  // size depends on T; left unresolved on purpose
    if (longSize == 4 && ptr == 8) {
        // LLP64 (MSVC): wchar_t is 2 bytes and long double is 8.
        abi.types["wchar_t"] = {2, 2};
        abi.types["mutex"] = {80, 8};
    }
    return abi;
}

}  // namespace

TargetABI TargetABI::lp64() {
    return baseAbi("lp64", 8, 8, 16, 16);
}
TargetABI TargetABI::llp64() {
    return baseAbi("llp64", 8, 4, 8, 8);
}
TargetABI TargetABI::ilp32() {
    return baseAbi("ilp32", 4, 4, 12, 4);
}

std::optional<TypeInfo> TargetABI::lookup(const std::string& typeName) const {
    std::string key = normaliseTypeName(typeName);
    // Strip leading cv-qualifiers (they never affect layout).
    for (bool stripped = true; stripped;) {
        stripped = false;
        for (const std::string_view q : {"const ", "volatile "}) {
            if (key.starts_with(q)) {
                key.erase(0, q.size());
                stripped = true;
            }
        }
    }
    if (const auto it = types.find(key); it != types.end()) return it->second;
    // Library templates are modelled generically (vector<int> -> vector).
    const std::size_t lt = key.find('<');
    if (lt != std::string::npos) {
        if (const auto it = types.find(key.substr(0, lt)); it != types.end()) return it->second;
    }
    return std::nullopt;
}

void TargetABI::addType(const std::string& typeName, TypeInfo info) {
    types[normaliseTypeName(typeName)] = info;
}

StructLayout computeLayout(const std::string& name, const std::vector<FieldSpec>& fields,
                           const TargetABI& abi, std::optional<std::size_t> pack) {
    StructLayout layout;
    layout.name = name;
    std::size_t offset = 0;
    std::size_t maxAlign = 1;

    for (const FieldSpec& f : fields) {
        FieldLayout fl;
        fl.spec = f;
        TypeInfo info;
        if (f.pointerDepth > 0) {
            info = {abi.pointerSize, abi.pointerAlign};
        } else if (auto found = abi.lookup(f.type)) {
            info = *found;
            if (!abi.types.contains(normaliseTypeName(f.type))) {
                layout.notes.push_back("'" + f.type + "' modelled as its primary template (" +
                                       std::to_string(info.size) + " bytes).");
            }
        } else {
            info = {abi.pointerSize, abi.pointerAlign};
            layout.notes.push_back("Unknown type '" + f.type + "' for field '" + f.name +
                                   "'; assumed pointer-sized.");
        }
        if (info.align == 0) info.align = 1;
        if (pack && *pack > 0) info.align = std::min(info.align, *pack);

        fl.align = info.align;
        fl.size = info.size * std::max<std::size_t>(1, f.arrayCount);
        const std::size_t aligned = roundUp(offset, fl.align);
        fl.paddingBefore = aligned - offset;
        fl.offset = aligned;
        offset = aligned + fl.size;
        maxAlign = std::max(maxAlign, fl.align);
        layout.paddingBytes += fl.paddingBefore;
        layout.fields.push_back(std::move(fl));
    }

    layout.align = maxAlign;
    layout.size = fields.empty() ? 1 : roundUp(offset, maxAlign);  // empty struct has sizeof 1
    layout.tailPadding = layout.size - offset;
    if (fields.empty()) layout.tailPadding = 0;
    layout.paddingBytes += layout.tailPadding;
    return layout;
}

ReorderSuggestion suggestReorder(const StructLayout& original) {
    // Reorder the fields' *resolved* sizes and alignments. Re-resolving type names here would be
    // wrong: a struct registered after this layout was computed (a later redefinition, or a
    // self-reference resolved as pointer-sized) could change size between the two computations.
    std::vector<std::size_t> idx(original.fields.size());
    std::iota(idx.begin(), idx.end(), 0);
    std::stable_sort(idx.begin(), idx.end(), [&](std::size_t a, std::size_t b) {
        return original.fields[a].align > original.fields[b].align;
    });

    ReorderSuggestion s;
    StructLayout& out = s.layout;
    out.name = original.name;
    out.notes = original.notes;
    std::size_t offset = 0;
    std::size_t maxAlign = 1;
    for (const std::size_t i : idx) {
        FieldLayout field = original.fields[i];
        const std::size_t aligned = roundUp(offset, field.align);
        field.paddingBefore = aligned - offset;
        field.offset = aligned;
        offset = aligned + field.size;
        maxAlign = std::max(maxAlign, field.align);
        out.paddingBytes += field.paddingBefore;
        s.order.push_back(field.spec);
        out.fields.push_back(std::move(field));
    }
    out.align = maxAlign;
    out.size = out.fields.empty() ? 1 : roundUp(offset, maxAlign);
    out.tailPadding = out.fields.empty() ? 0 : out.size - offset;
    out.paddingBytes += out.tailPadding;
    s.bytesSaved = original.size > out.size ? original.size - out.size : 0;
    return s;
}

std::vector<ParsedStruct> parseStructs(const SourceText& source) {
    const std::vector<Token> all = tokenize(source);
    std::vector<const Token*> c;
    for (const Token& t : all) {
        if (!t.isComment() && t.kind != TokenKind::Preprocessor && t.kind != TokenKind::EndOfFile)
            c.push_back(&t);
    }
    std::vector<ParsedStruct> out;

    for (std::size_t i = 0; i + 2 < c.size(); ++i) {
        if (!(c[i]->isKeyword("struct") || c[i]->isKeyword("class"))) continue;
        if (i > 0 &&
            (c[i - 1]->isKeyword("enum") || c[i - 1]->isPunct("<") || c[i - 1]->isPunct(",")))
            continue;
        if (!c[i + 1]->is(TokenKind::Identifier)) continue;

        // Find the body brace, skipping `final` and a base-clause.
        std::size_t b = i + 2;
        while (b < c.size() && !c[b]->isPunct("{") && !c[b]->isPunct(";")) ++b;
        if (b >= c.size() || !c[b]->isPunct("{")) continue;

        ParsedStruct ps;
        ps.name = std::string(c[i + 1]->text);

        // Walk members at depth 1.
        std::size_t k = b + 1;
        int depth = 1;
        std::vector<const Token*> decl;
        auto flushDecl = [&]() {
            if (decl.empty()) return;
            std::vector<const Token*> d = std::move(decl);
            decl.clear();
            // Access specifiers and friend/using/typedef/static are skipped.
            if (d.size() == 2 && d[1]->isPunct(":")) return;  // public: etc. handled below
            if (d.front()->isKeyword("static") || d.front()->isKeyword("friend") ||
                d.front()->isKeyword("using") || d.front()->isKeyword("typedef") ||
                d.front()->isKeyword("template") || d.front()->isKeyword("virtual") ||
                d.front()->isKeyword("enum") || d.front()->isKeyword("struct") ||
                d.front()->isKeyword("class")) {
                ps.skipped.push_back(std::string(d.front()->text) + " member");
                return;
            }
            // Methods contain '(' before the terminating ';'.
            for (const Token* t : d) {
                if (t->isPunct("(")) {
                    ps.skipped.emplace_back("method/constructor");
                    return;
                }
            }
            // Bit-fields: `type name : width`.
            for (std::size_t q = 1; q < d.size(); ++q) {
                if (d[q]->isPunct(":")) {
                    ps.skipped.emplace_back("bit-field");
                    return;
                }
            }
            // Split declarators on ',' : `int a, *b, c[3];`
            // Type is everything before the first declarator name.
            std::size_t nameIdx = d.size();
            for (std::size_t q = 0; q < d.size(); ++q) {
                const bool nextIsDeclEnd = q + 1 == d.size() || d[q + 1]->isPunct(",") ||
                                           d[q + 1]->isPunct("[") || d[q + 1]->isPunct("=") ||
                                           d[q + 1]->isPunct("{");
                if (d[q]->is(TokenKind::Identifier) && nextIsDeclEnd && q > 0) {
                    nameIdx = q;
                    break;
                }
            }
            if (nameIdx == d.size() || nameIdx == 0) {
                ps.skipped.emplace_back("unparsed member");
                return;
            }
            // Type tokens: from 0 up to the first '*' / '&' preceding the name.
            std::size_t typeEnd = nameIdx;
            while (typeEnd > 0 && (d[typeEnd - 1]->isPunct("*") || d[typeEnd - 1]->isPunct("&"))) {
                if (d[typeEnd - 1]->isPunct("&")) {
                    ps.skipped.emplace_back("reference member");
                    return;
                }
                --typeEnd;
            }
            std::string type;
            for (std::size_t q = 0; q < typeEnd; ++q) {
                const bool wordBoundary =
                    !type.empty() &&
                    ((d[q]->is(TokenKind::Identifier) &&
                      (d[q - 1]->is(TokenKind::Identifier) || d[q - 1]->is(TokenKind::Keyword))) ||
                     (d[q]->is(TokenKind::Keyword) && !d[q - 1]->isPunct("::") &&
                      !d[q - 1]->isPunct("<")));
                if (wordBoundary) type.push_back(' ');
                type += std::string(d[q]->text);
            }
            for (const std::string_view drop : {"const ", "volatile ", "mutable "}) {
                if (type.starts_with(drop)) type.erase(0, drop.size());
            }
            // Iterate declarators.
            std::size_t q = typeEnd;
            while (q < d.size()) {
                FieldSpec f;
                f.type = type;
                while (q < d.size() && d[q]->isPunct("*")) {
                    ++f.pointerDepth;
                    ++q;
                }
                if (q >= d.size() || !d[q]->is(TokenKind::Identifier)) break;
                f.name = std::string(d[q]->text);
                ++q;
                while (q + 2 < d.size() + 1 && q < d.size() && d[q]->isPunct("[")) {
                    if (q + 2 < d.size() && d[q + 1]->is(TokenKind::IntegerLiteral) &&
                        d[q + 2]->isPunct("]")) {
                        std::size_t n = 0;
                        std::from_chars(d[q + 1]->text.data(),
                                        d[q + 1]->text.data() + d[q + 1]->text.size(), n);
                        f.arrayCount *= std::max<std::size_t>(1, n);
                        q += 3;
                    } else {
                        ps.skipped.push_back("array '" + f.name + "' with non-literal bound");
                        return;
                    }
                }
                // Default member initialiser: skip to ',' at depth 0.
                if (q < d.size() && (d[q]->isPunct("=") || d[q]->isPunct("{"))) {
                    int dd = 0;
                    while (q < d.size()) {
                        if (d[q]->isPunct("{") || d[q]->isPunct("("))
                            ++dd;
                        else if (d[q]->isPunct("}") || d[q]->isPunct(")"))
                            --dd;
                        else if (d[q]->isPunct(",") && dd == 0)
                            break;
                        ++q;
                    }
                }
                ps.fields.push_back(std::move(f));
                if (q < d.size() && d[q]->isPunct(","))
                    ++q;
                else
                    break;
            }
        };

        for (; k < c.size(); ++k) {
            const Token& t = *c[k];
            if (t.isPunct("{")) {
                ++depth;
                decl.push_back(&t);
                continue;
            }
            if (t.isPunct("}")) {
                if (--depth == 0) break;
                decl.push_back(&t);
                // A nested struct/function body ended; `};` follows for types.
                continue;
            }
            if (depth > 1) {
                decl.push_back(&t);
                continue;
            }
            if (t.isPunct(";")) {
                flushDecl();
                continue;
            }
            if (t.isPunct(":") && decl.size() == 1 &&
                (decl[0]->isKeyword("public") || decl[0]->isKeyword("private") ||
                 decl[0]->isKeyword("protected"))) {
                decl.clear();
                continue;
            }
            decl.push_back(&t);
        }
        flushDecl();
        // Ignore anything that is not a plausible aggregate (e.g. `struct X;` or garbage).
        if (k < c.size()) out.push_back(std::move(ps));
        i = k;
    }
    return out;
}

std::vector<StructLayout> layoutAll(const std::vector<ParsedStruct>& structs, TargetABI& abi,
                                    std::optional<std::size_t> pack) {
    std::vector<StructLayout> out;
    for (const ParsedStruct& s : structs) {
        StructLayout l = computeLayout(s.name, s.fields, abi, pack);
        for (const std::string& sk : s.skipped) l.notes.push_back("Skipped " + sk + ".");
        abi.addType(s.name, {l.size, l.align});
        out.push_back(std::move(l));
    }
    return out;
}

}  // namespace cppmastery
