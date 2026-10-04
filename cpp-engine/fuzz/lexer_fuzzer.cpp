#include <cstddef>
#include <cstdint>
#include <cstdlib>
#include <string>

#include "cppmastery/lexer/lexer.hpp"

extern "C" int LLVMFuzzerTestOneInput(const std::uint8_t* data, std::size_t size) {
    using namespace cppmastery;
    SourceText src(std::string(reinterpret_cast<const char*>(data), size));
    const auto tokens = tokenize(src);
    // Invariant: tokens cover the input in order without overlap; the last is EOF.
    std::size_t cursor = 0;
    for (std::size_t i = 0; i + 1 < tokens.size(); ++i) {
        if (tokens[i].text.empty() || tokens[i].offset < cursor || tokens[i].end() > size)
            std::abort();
        cursor = tokens[i].end();
    }
    if (tokens.empty() || tokens.back().kind != TokenKind::EndOfFile) std::abort();
    return 0;
}
