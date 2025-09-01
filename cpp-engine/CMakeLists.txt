# File: cpp-engine/CMakeLists.txt
# Extension: .txt

cmake_minimum_required(VERSION 3.16)
project(cpp-mastery-engine 
    VERSION 1.0.0
    DESCRIPTION "C++ Code Analysis and Execution Engine"
    LANGUAGES CXX
)

# Set C++ standard
set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

# Build configuration
set(CMAKE_BUILD_TYPE_INIT "Release")
if(NOT CMAKE_BUILD_TYPE)
    set(CMAKE_BUILD_TYPE "Release" CACHE STRING "Build type" FORCE)
endif()

# Compiler-specific options
if(CMAKE_CXX_COMPILER_ID STREQUAL "GNU" OR CMAKE_CXX_COMPILER_ID STREQUAL "Clang")
    add_compile_options(
        -Wall -Wextra -Wpedantic -Werror
        -Wno-unused-parameter
        -Wno-missing-field-initializers
        -fPIC
    )
    
    # Debug flags
    if(CMAKE_BUILD_TYPE STREQUAL "Debug")
        add_compile_options(-g -O0 -fsanitize=address -fsanitize=undefined)
        add_link_options(-fsanitize=address -fsanitize=undefined)
    else()
        add_compile_options(-O3 -DNDEBUG)
    endif()
    
    # Enable LTO for release builds
    if(CMAKE_BUILD_TYPE STREQUAL "Release")
        include(CheckIPOSupported)
        check_ipo_supported(RESULT ipo_supported OUTPUT ipo_error)
        if(ipo_supported)
            set(CMAKE_INTERPROCEDURAL_OPTIMIZATION TRUE)
        endif()
    endif()
endif()

# Platform-specific settings
if(WIN32)
    add_definitions(-DWIN32_LEAN_AND_MEAN -DNOMINMAX)
    set(CMAKE_WINDOWS_EXPORT_ALL_SYMBOLS ON)
endif()

# Find required packages
find_package(Threads REQUIRED)

# Boost libraries
set(Boost_USE_STATIC_LIBS OFF)
set(Boost_USE_MULTITHREADED ON)
find_package(Boost 1.75.0 REQUIRED COMPONENTS
    system
    filesystem
    program_options
    thread
    chrono
    regex
)

# LLVM and Clang
find_package(LLVM 14.0 REQUIRED CONFIG)
find_package(Clang REQUIRED CONFIG)

message(STATUS "Found LLVM ${LLVM_PACKAGE_VERSION}")
message(STATUS "Using LLVMConfig.cmake in: ${LLVM_DIR}")

# Add LLVM definitions and include directories
add_definitions(${LLVM_DEFINITIONS})
include_directories(${LLVM_INCLUDE_DIRS})

# LLVM libraries
llvm_map_components_to_libnames(llvm_libs
    core
    support
    option
    mcparser
    bitreader
    profiledata
    object
    analysis
    target
    transformutils
    instcombine
    aggressiveinstcombine
    ipo
    vectorize
    linker
    irreader
    passes
)

# Clang libraries
set(CLANG_LIBS
    clangBasic
    clangLex
    clangParse
    clangAST
    clangASTMatchers
    clangSema
    clangCodeGen
    clangAnalysis
    clangEdit
    clangRewrite
    clangDriver
    clangSerialization
    clangFrontend
    clangFrontendTool
    clangTooling
    clangToolingCore
    clangStaticAnalyzerCore
    clangStaticAnalyzerCheckers
    clangStaticAnalyzerFrontend
    clangFormat
)

# spdlog for logging
find_package(spdlog REQUIRED)

# nlohmann_json for JSON handling
find_package(nlohmann_json REQUIRED)

# OpenSSL for secure connections (optional)
find_package(OpenSSL)
if(OpenSSL_FOUND)
    add_definitions(-DHAVE_OPENSSL)
endif()

# Include directories
include_directories(
    ${CMAKE_CURRENT_SOURCE_DIR}/include
    ${CMAKE_CURRENT_SOURCE_DIR}/src
)

# Source files
set(SOURCES
    src/main.cpp
    src/server.cpp
    src/parser/ast_parser.cpp
    src/parser/code_parser.cpp
    src/parser/syntax_analyzer.cpp
    src/analyzer/static_analyzer.cpp
    src/analyzer/code_analyzer.cpp
    src/analyzer/performance_analyzer.cpp
    src/analyzer/metrics_calculator.cpp
    src/analyzer/security_analyzer.cpp
    src/visualizer/memory_visualizer.cpp
    src/visualizer/execution_visualizer.cpp
    src/visualizer/graph_generator.cpp
    src/visualizer/ast_visualizer.cpp
    src/compiler/code_compiler.cpp
    src/compiler/execution_engine.cpp
    src/compiler/sandbox.cpp
    src/utils/string_utils.cpp
    src/utils/file_utils.cpp
    src/utils/logger.cpp
    src/utils/config.cpp
    src/utils/security.cpp
    src/http/request_handler.cpp
    src/http/response_builder.cpp
    src/http/middleware.cpp
)

# Header files
set(HEADERS
    include/server.hpp
    include/parser/ast_parser.hpp
    include/parser/code_parser.hpp
    include/parser/syntax_analyzer.hpp
    include/analyzer/static_analyzer.hpp
    include/analyzer/code_analyzer.hpp
    include/analyzer/performance_analyzer.hpp
    include/analyzer/metrics_calculator.hpp
    include/analyzer/security_analyzer.hpp
    include/visualizer/memory_visualizer.hpp
    include/visualizer/execution_visualizer.hpp
    include/visualizer/graph_generator.hpp
    include/visualizer/ast_visualizer.hpp
    include/compiler/code_compiler.hpp
    include/compiler/execution_engine.hpp
    include/compiler/sandbox.hpp
    include/utils/string_utils.hpp
    include/utils/file_utils.hpp
    include/utils/logger.hpp
    include/utils/config.hpp
    include/utils/security.hpp
    include/http/request_handler.hpp
    include/http/response_builder.hpp
    include/http/middleware.hpp
)

# Create the main executable
add_executable(${PROJECT_NAME} ${SOURCES} ${HEADERS})

# Set target properties
set_target_properties(${PROJECT_NAME} PROPERTIES
    OUTPUT_NAME "cpp-mastery-engine"
    VERSION ${PROJECT_VERSION}
    SOVERSION ${PROJECT_VERSION_MAJOR}
)

# Link libraries
target_link_libraries(${PROJECT_NAME}
    PRIVATE
        ${llvm_libs}
        ${CLANG_LIBS}
        Boost::system
        Boost::filesystem
        Boost::program_options
        Boost::thread
        Boost::chrono
        Boost::regex
        spdlog::spdlog
        nlohmann_json::nlohmann_json
        Threads::Threads
)

# Link OpenSSL if available
if(OpenSSL_FOUND)
    target_link_libraries(${PROJECT_NAME} PRIVATE OpenSSL::SSL OpenSSL::Crypto)
endif()

# Platform-specific libraries
if(UNIX AND NOT APPLE)
    target_link_libraries(${PROJECT_NAME} PRIVATE dl rt)
elseif(APPLE)
    target_link_libraries(${PROJECT_NAME} PRIVATE dl)
elseif(WIN32)
    target_link_libraries(${PROJECT_NAME} PRIVATE ws2_32 wsock32)
endif()

# Compiler-specific definitions
target_compile_definitions(${PROJECT_NAME} PRIVATE
    LLVM_VERSION_STRING="${LLVM_PACKAGE_VERSION}"
    PROJECT_VERSION="${PROJECT_VERSION}"
    PROJECT_NAME="${PROJECT_NAME}"
)

# Install configuration
include(GNUInstallDirs)

# Install executable
install(TARGETS ${PROJECT_NAME}
    RUNTIME DESTINATION ${CMAKE_INSTALL_BINDIR}
    COMPONENT Runtime
)

# Install configuration files
install(FILES
    config/server.json
    config/compiler.json
    config/analysis.json
    DESTINATION ${CMAKE_INSTALL_SYSCONFDIR}/${PROJECT_NAME}
    COMPONENT Configuration
)

# Install systemd service file (Linux only)
if(UNIX AND NOT APPLE)
    install(FILES
        scripts/systemd/cpp-mastery-engine.service
        DESTINATION ${CMAKE_INSTALL_PREFIX}/lib/systemd/system
        COMPONENT SystemdService
        OPTIONAL
    )
endif()

# Development tools and testing
option(BUILD_TESTS "Build test suite" OFF)
option(BUILD_BENCHMARKS "Build benchmarks" OFF)
option(BUILD_DOCS "Build documentation" OFF)
option(ENABLE_COVERAGE "Enable code coverage" OFF)

# Testing
if(BUILD_TESTS)
    enable_testing()
    find_package(GTest REQUIRED)
    
    # Test sources
    set(TEST_SOURCES
        tests/test_main.cpp
        tests/parser/test_ast_parser.cpp
        tests/parser/test_code_parser.cpp
        tests/analyzer/test_static_analyzer.cpp
        tests/analyzer/test_metrics_calculator.cpp
        tests/compiler/test_code_compiler.cpp
        tests/compiler/test_execution_engine.cpp
        tests/utils/test_string_utils.cpp
        tests/utils/test_file_utils.cpp
        tests/http/test_request_handler.cpp
    )
    
    add_executable(${PROJECT_NAME}_tests ${TEST_SOURCES})
    
    target_link_libraries(${PROJECT_NAME}_tests
        PRIVATE
            ${llvm_libs}
            ${CLANG_LIBS}
            Boost::system
            Boost::filesystem
            spdlog::spdlog
            nlohmann_json::nlohmann_json
            GTest::GTest
            GTest::Main
            Threads::Threads
    )
    
    target_include_directories(${PROJECT_NAME}_tests
        PRIVATE
            ${CMAKE_CURRENT_SOURCE_DIR}/include
            ${CMAKE_CURRENT_SOURCE_DIR}/src
            ${CMAKE_CURRENT_SOURCE_DIR}/tests
    )
    
    # Add tests to CTest
    add_test(NAME ${PROJECT_NAME}_tests COMMAND ${PROJECT_NAME}_tests)
    
    # Test data files
    file(COPY tests/fixtures DESTINATION ${CMAKE_CURRENT_BINARY_DIR}/tests)
endif()

# Benchmarks
if(BUILD_BENCHMARKS)
    find_package(benchmark REQUIRED)
    
    set(BENCHMARK_SOURCES
        benchmarks/benchmark_main.cpp
        benchmarks/parser_benchmark.cpp
        benchmarks/analyzer_benchmark.cpp
        benchmarks/compiler_benchmark.cpp
    )
    
    add_executable(${PROJECT_NAME}_benchmarks ${BENCHMARK_SOURCES})
    
    target_link_libraries(${PROJECT_NAME}_benchmarks
        PRIVATE
            ${llvm_libs}
            ${CLANG_LIBS}
            Boost::system
            spdlog::spdlog
            benchmark::benchmark
            Threads::Threads
    )
    
    target_include_directories(${PROJECT_NAME}_benchmarks
        PRIVATE
            ${CMAKE_CURRENT_SOURCE_DIR}/include
            ${CMAKE_CURRENT_SOURCE_DIR}/src
    )
endif()

# Documentation
if(BUILD_DOCS)
    find_package(Doxygen)
    if(Doxygen_FOUND)
        set(DOXYGEN_INPUT ${CMAKE_CURRENT_SOURCE_DIR}/include)
        set(DOXYGEN_OUTPUT_DIRECTORY ${CMAKE_CURRENT_BINARY_DIR}/docs)
        set(DOXYGEN_GENERATE_HTML YES)
        set(DOXYGEN_GENERATE_MAN YES)
        
        doxygen_add_docs(docs
            ${CMAKE_CURRENT_SOURCE_DIR}/include
            ${CMAKE_CURRENT_SOURCE_DIR}/README.md
            COMMENT "Generate API documentation"
        )
    endif()
endif()

# Code coverage
if(ENABLE_COVERAGE AND CMAKE_CXX_COMPILER_ID STREQUAL "GNU")
    target_compile_options(${PROJECT_NAME} PRIVATE --coverage)
    target_link_options(${PROJECT_NAME} PRIVATE --coverage)
    
    find_program(GCOV_PATH gcov)
    find_program(LCOV_PATH lcov)
    find_program(GENHTML_PATH genhtml)
    
    if(GCOV_PATH AND LCOV_PATH AND GENHTML_PATH)
        add_custom_target(coverage
            COMMAND ${LCOV_PATH} --directory . --capture --output-file coverage.info
            COMMAND ${LCOV_PATH} --remove coverage.info '/usr/*' --output-file coverage.info
            COMMAND ${LCOV_PATH} --list coverage.info
            COMMAND ${GENHTML_PATH} -o coverage coverage.info
            WORKING_DIRECTORY ${CMAKE_BINARY_DIR}
            COMMENT "Generating code coverage report"
        )
    endif()
endif()

# Static analysis
find_program(CLANG_TIDY_EXE NAMES "clang-tidy")
if(CLANG_TIDY_EXE)
    set(CMAKE_CXX_CLANG_TIDY 
        ${CLANG_TIDY_EXE};
        -checks=-*,readability-*,performance-*,modernize-*,bugprone-*;
        -header-filter=.*
    )
endif()

# Packaging
set(CPACK_PACKAGE_NAME ${PROJECT_NAME})
set(CPACK_PACKAGE_VERSION ${PROJECT_VERSION})
set(CPACK_PACKAGE_DESCRIPTION_SUMMARY ${PROJECT_DESCRIPTION})
set(CPACK_PACKAGE_VENDOR "C++ Mastery Hub")
set(CPACK_PACKAGE_CONTACT "contact@cpp-mastery-hub.com")

# Platform-specific packaging
if(WIN32)
    set(CPACK_GENERATOR "ZIP;NSIS")
    set(CPACK_NSIS_DISPLAY_NAME "C++ Mastery Engine")
    set(CPACK_NSIS_PACKAGE_NAME "C++ Mastery Engine")
elseif(APPLE)
    set(CPACK_GENERATOR "ZIP;TGZ")
else()
    set(CPACK_GENERATOR "TGZ;DEB;RPM")
    set(CPACK_DEBIAN_PACKAGE_DEPENDS "libboost-all-dev, libssl-dev")
    set(CPACK_RPM_PACKAGE_REQUIRES "boost-devel, openssl-devel")
endif()

include(CPack)

# Print configuration summary
message(STATUS "")
message(STATUS "C++ Mastery Engine Configuration Summary:")
message(STATUS "  Version: ${PROJECT_VERSION}")
message(STATUS "  Build type: ${CMAKE_BUILD_TYPE}")
message(STATUS "  C++ standard: ${CMAKE_CXX_STANDARD}")
message(STATUS "  Compiler: ${CMAKE_CXX_COMPILER_ID} ${CMAKE_CXX_COMPILER_VERSION}")
message(STATUS "  LLVM version: ${LLVM_PACKAGE_VERSION}")
message(STATUS "  Boost version: ${Boost_VERSION}")
message(STATUS "  Build tests: ${BUILD_TESTS}")
message(STATUS "  Build benchmarks: ${BUILD_BENCHMARKS}")
message(STATUS "  Build documentation: ${BUILD_DOCS}")
message(STATUS "  Enable coverage: ${ENABLE_COVERAGE}")
message(STATUS "  OpenSSL found: ${OpenSSL_FOUND}")
message(STATUS "  Install prefix: ${CMAKE_INSTALL_PREFIX}")
message(STATUS "")