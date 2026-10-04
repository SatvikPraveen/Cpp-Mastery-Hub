if(NOT CMAKE_CXX_COMPILER_ID MATCHES "Clang")
    message(FATAL_ERROR "libFuzzer targets require clang (CPPMASTERY_BUILD_FUZZERS=ON)")
endif()

function(cppmastery_add_fuzzer name)
    add_executable(${name} ${name}.cpp)
    target_link_libraries(${name} PRIVATE cppmastery::core)
    target_compile_options(${name} PRIVATE -fsanitize=fuzzer)
    target_link_options(${name} PRIVATE -fsanitize=fuzzer)
endfunction()

cppmastery_add_fuzzer(lexer_fuzzer)
cppmastery_add_fuzzer(analyze_fuzzer)
cppmastery_add_fuzzer(layout_fuzzer)
