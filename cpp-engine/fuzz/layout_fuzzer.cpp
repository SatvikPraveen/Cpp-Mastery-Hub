#include <cstddef>
#include <cstdint>
#include <cstdlib>
#include <string>

#include "cppmastery/memory/layout.hpp"

extern "C" int LLVMFuzzerTestOneInput(const std::uint8_t* data, std::size_t size) {
    using namespace cppmastery;
    SourceText src(std::string(reinterpret_cast<const char*>(data), size));
    TargetABI abi = TargetABI::lp64();
    for (const StructLayout& l : layoutAll(parseStructs(src), abi)) {
        ReorderSuggestion s = suggestReorder(l, abi);
        if (s.layout.size > l.size) std::abort();  // reorder must never be worse
    }
    return 0;
}
