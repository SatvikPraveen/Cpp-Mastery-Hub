include(FetchContent)

if(CPPMASTERY_USE_SYSTEM_GTEST)
    find_package(GTest REQUIRED)
else()
    # Pinned by commit for reproducibility (tag v1.15.2).
    FetchContent_Declare(googletest
        GIT_REPOSITORY https://github.com/google/googletest.git
        GIT_TAG        b514bdc898e2951020cbdca1304b75f5950d1f59
        GIT_SHALLOW    FALSE)
    set(INSTALL_GTEST OFF CACHE BOOL "" FORCE)
    set(BUILD_GMOCK OFF CACHE BOOL "" FORCE)
    set(gtest_force_shared_crt ON CACHE BOOL "" FORCE)
    FetchContent_MakeAvailable(googletest)
endif()

add_executable(cppmastery_tests
    source_text_test.cpp
    lexer_test.cpp
    metrics_test.cpp
    rules_test.cpp
    layout_test.cpp
    json_test.cpp
    property_test.cpp)
target_link_libraries(cppmastery_tests PRIVATE cppmastery::core GTest::gtest_main)
cppmastery_set_warnings(cppmastery_tests ${CPPMASTERY_WARNINGS_AS_ERRORS})
cppmastery_enable_sanitizers(cppmastery_tests "${CPPMASTERY_SANITIZERS}")
if(CPPMASTERY_ENABLE_COVERAGE)
    cppmastery_enable_coverage(cppmastery_tests)
endif()
target_compile_definitions(cppmastery_tests PRIVATE
    CPPMASTERY_CORPUS_DIR="${CMAKE_CURRENT_SOURCE_DIR}/../eval/corpus")

include(GoogleTest)
gtest_discover_tests(cppmastery_tests DISCOVERY_MODE PRE_TEST)

# CLI smoke tests exercise the real binary end to end.
if(CPPMASTERY_BUILD_CLI)
    add_test(NAME cli.version COMMAND cppmastery_cli version)
    add_test(NAME cli.rules_json COMMAND cppmastery_cli rules --json)
    add_test(NAME cli.analyze_clean
             COMMAND cppmastery_cli analyze --fail-on warning "${CMAKE_CURRENT_SOURCE_DIR}/../eval/corpus/clean/raii_vector.cpp")
    add_test(NAME cli.analyze_detects_error
             COMMAND cppmastery_cli analyze "${CMAKE_CURRENT_SOURCE_DIR}/../eval/corpus/smells/unsafe_strcpy.cpp")
    set_tests_properties(cli.analyze_detects_error PROPERTIES WILL_FAIL TRUE)
    add_test(NAME cli.usage_error COMMAND cppmastery_cli)
    set_tests_properties(cli.usage_error PROPERTIES WILL_FAIL TRUE)
    add_test(NAME cli.missing_file COMMAND cppmastery_cli analyze /nonexistent/file.cpp)
    set_tests_properties(cli.missing_file PROPERTIES WILL_FAIL TRUE)
    add_test(NAME cli.layout_json
             COMMAND cppmastery_cli layout --json "${CMAKE_CURRENT_SOURCE_DIR}/../eval/corpus/layout/padded.cpp")
    set_tests_properties(cli.layout_json PROPERTIES PASS_REGULAR_EXPRESSION "\"bytes_saved\":8")

    find_package(Python3 COMPONENTS Interpreter QUIET)
    if(Python3_Interpreter_FOUND)
        add_test(NAME cli.http_adapter
                 COMMAND ${Python3_EXECUTABLE}
                         "${CMAKE_CURRENT_SOURCE_DIR}/../tools/http_adapter/test_http_adapter.py" -v)
        set_tests_properties(cli.http_adapter PROPERTIES
            ENVIRONMENT "CPPMASTERY_BIN=$<TARGET_FILE:cppmastery_cli>"
            TIMEOUT 120)
    endif()
endif()
