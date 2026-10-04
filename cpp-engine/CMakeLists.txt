cmake_minimum_required(VERSION 3.21)

project(cppmastery
    VERSION 2.0.0
    DESCRIPTION "Dependency-free C++ source analysis engine: lexer, metrics, rule engine, memory layout model"
    HOMEPAGE_URL "https://github.com/SatvikPraveen/Cpp-Mastery-Hub"
    LANGUAGES CXX)

list(APPEND CMAKE_MODULE_PATH "${CMAKE_CURRENT_SOURCE_DIR}/cmake")
include(CompilerWarnings)
include(Sanitizers)
include(Coverage)
include(GitRevision)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)
set(CMAKE_EXPORT_COMPILE_COMMANDS ON)
set(CMAKE_POSITION_INDEPENDENT_CODE ON)

if(NOT CMAKE_BUILD_TYPE AND NOT CMAKE_CONFIGURATION_TYPES)
    set(CMAKE_BUILD_TYPE Release CACHE STRING "Build type" FORCE)
endif()

string(COMPARE EQUAL "${CMAKE_SOURCE_DIR}" "${CMAKE_CURRENT_SOURCE_DIR}" CPPMASTERY_IS_TOP_LEVEL)

option(CPPMASTERY_BUILD_CLI        "Build the cppmastery command-line tool"      ON)
option(CPPMASTERY_BUILD_TESTS      "Build unit and property tests (GoogleTest)" ${CPPMASTERY_IS_TOP_LEVEL})
option(CPPMASTERY_BUILD_BENCHMARKS "Build micro-benchmarks (Google Benchmark)"  OFF)
option(CPPMASTERY_BUILD_FUZZERS    "Build libFuzzer targets (clang only)"       OFF)
option(CPPMASTERY_WARNINGS_AS_ERRORS "Treat compiler warnings as errors"        ${CPPMASTERY_IS_TOP_LEVEL})
option(CPPMASTERY_ENABLE_COVERAGE  "Instrument for coverage (gcov/llvm-cov)"    OFF)
option(CPPMASTERY_USE_SYSTEM_GTEST "Use an installed GoogleTest instead of FetchContent" OFF)
set(CPPMASTERY_SANITIZERS "" CACHE STRING "Semicolon-separated sanitizers: address;undefined;thread;leak")

# ---------------------------------------------------------------------------------------------
# Core library
# ---------------------------------------------------------------------------------------------
cppmastery_git_revision(CPPMASTERY_GIT_REVISION)
configure_file(include/cppmastery/version.hpp.in
               "${CMAKE_CURRENT_BINARY_DIR}/generated/cppmastery/version.hpp" @ONLY)

add_library(cppmastery_core STATIC
    src/source_text.cpp
    src/lexer/token.cpp
    src/lexer/lexer.cpp
    src/metrics/metrics.cpp
    src/analysis/diagnostic.cpp
    src/analysis/rule.cpp
    src/analysis/rule_engine.cpp
    src/analysis/builtin_rules.cpp
    src/memory/layout.cpp
    src/json/json_writer.cpp
    src/report/json_report.cpp)
add_library(cppmastery::core ALIAS cppmastery_core)

target_include_directories(cppmastery_core
    PUBLIC
        $<BUILD_INTERFACE:${CMAKE_CURRENT_SOURCE_DIR}/include>
        $<BUILD_INTERFACE:${CMAKE_CURRENT_BINARY_DIR}/generated>
        $<INSTALL_INTERFACE:include>)
target_compile_features(cppmastery_core PUBLIC cxx_std_20)
cppmastery_set_warnings(cppmastery_core ${CPPMASTERY_WARNINGS_AS_ERRORS})
cppmastery_enable_sanitizers(cppmastery_core "${CPPMASTERY_SANITIZERS}")
if(CPPMASTERY_ENABLE_COVERAGE)
    cppmastery_enable_coverage(cppmastery_core)
endif()
set_target_properties(cppmastery_core PROPERTIES
    OUTPUT_NAME cppmastery
    VERSION ${PROJECT_VERSION}
    SOVERSION ${PROJECT_VERSION_MAJOR})

# ---------------------------------------------------------------------------------------------
# Command-line tool
# ---------------------------------------------------------------------------------------------
if(CPPMASTERY_BUILD_CLI)
    add_executable(cppmastery_cli tools/cli/main.cpp)
    target_link_libraries(cppmastery_cli PRIVATE cppmastery::core)
    cppmastery_set_warnings(cppmastery_cli ${CPPMASTERY_WARNINGS_AS_ERRORS})
    cppmastery_enable_sanitizers(cppmastery_cli "${CPPMASTERY_SANITIZERS}")
    if(CPPMASTERY_ENABLE_COVERAGE)
        cppmastery_enable_coverage(cppmastery_cli)
    endif()
    set_target_properties(cppmastery_cli PROPERTIES OUTPUT_NAME cppmastery)
endif()

# ---------------------------------------------------------------------------------------------
# Tests, benchmarks, fuzzers
# ---------------------------------------------------------------------------------------------
if(CPPMASTERY_BUILD_TESTS)
    enable_testing()
    add_subdirectory(tests)
endif()
if(CPPMASTERY_BUILD_BENCHMARKS)
    add_subdirectory(benchmarks)
endif()
if(CPPMASTERY_BUILD_FUZZERS)
    add_subdirectory(fuzz)
endif()

# ---------------------------------------------------------------------------------------------
# Install / export
# ---------------------------------------------------------------------------------------------
include(GNUInstallDirs)
include(CMakePackageConfigHelpers)

install(TARGETS cppmastery_core
    EXPORT cppmasteryTargets
    ARCHIVE DESTINATION ${CMAKE_INSTALL_LIBDIR}
    LIBRARY DESTINATION ${CMAKE_INSTALL_LIBDIR})
install(DIRECTORY include/cppmastery DESTINATION ${CMAKE_INSTALL_INCLUDEDIR}
        FILES_MATCHING PATTERN "*.hpp")
install(FILES "${CMAKE_CURRENT_BINARY_DIR}/generated/cppmastery/version.hpp"
        DESTINATION ${CMAKE_INSTALL_INCLUDEDIR}/cppmastery)
if(CPPMASTERY_BUILD_CLI)
    install(TARGETS cppmastery_cli RUNTIME DESTINATION ${CMAKE_INSTALL_BINDIR})
endif()
install(EXPORT cppmasteryTargets
    NAMESPACE cppmastery::
    DESTINATION ${CMAKE_INSTALL_LIBDIR}/cmake/cppmastery)
write_basic_package_version_file(
    "${CMAKE_CURRENT_BINARY_DIR}/cppmasteryConfigVersion.cmake"
    COMPATIBILITY SameMajorVersion)
configure_package_config_file(cmake/cppmasteryConfig.cmake.in
    "${CMAKE_CURRENT_BINARY_DIR}/cppmasteryConfig.cmake"
    INSTALL_DESTINATION ${CMAKE_INSTALL_LIBDIR}/cmake/cppmastery)
install(FILES
    "${CMAKE_CURRENT_BINARY_DIR}/cppmasteryConfig.cmake"
    "${CMAKE_CURRENT_BINARY_DIR}/cppmasteryConfigVersion.cmake"
    DESTINATION ${CMAKE_INSTALL_LIBDIR}/cmake/cppmastery)

# ---------------------------------------------------------------------------------------------
# Developer conveniences
# ---------------------------------------------------------------------------------------------
find_program(CLANG_FORMAT_EXE NAMES clang-format)
if(CLANG_FORMAT_EXE)
    file(GLOB_RECURSE CPPMASTERY_FORMAT_SOURCES CONFIGURE_DEPENDS
        ${CMAKE_CURRENT_SOURCE_DIR}/include/*.hpp
        ${CMAKE_CURRENT_SOURCE_DIR}/src/*.cpp
        ${CMAKE_CURRENT_SOURCE_DIR}/tools/*.cpp
        ${CMAKE_CURRENT_SOURCE_DIR}/tests/*.cpp
        ${CMAKE_CURRENT_SOURCE_DIR}/benchmarks/*.cpp
        ${CMAKE_CURRENT_SOURCE_DIR}/fuzz/*.cpp)
    add_custom_target(format
        COMMAND ${CLANG_FORMAT_EXE} -i ${CPPMASTERY_FORMAT_SOURCES}
        COMMENT "clang-format all engine sources")
    add_custom_target(format-check
        COMMAND ${CLANG_FORMAT_EXE} --dry-run --Werror ${CPPMASTERY_FORMAT_SOURCES}
        COMMENT "verify formatting")
endif()
