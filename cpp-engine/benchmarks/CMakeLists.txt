include(FetchContent)
FetchContent_Declare(benchmark
    GIT_REPOSITORY https://github.com/google/benchmark.git
    GIT_TAG        12235e24652fc7f809373e7c11a5f73c5763fc4c  # v1.9.1
    GIT_SHALLOW    FALSE)
set(BENCHMARK_ENABLE_TESTING OFF CACHE BOOL "" FORCE)
set(BENCHMARK_ENABLE_GTEST_TESTS OFF CACHE BOOL "" FORCE)
set(BENCHMARK_ENABLE_INSTALL OFF CACHE BOOL "" FORCE)
FetchContent_MakeAvailable(benchmark)

add_executable(cppmastery_bench engine_bench.cpp)
target_link_libraries(cppmastery_bench PRIVATE cppmastery::core benchmark::benchmark_main)
target_compile_definitions(cppmastery_bench PRIVATE
    CPPMASTERY_CORPUS_DIR="${CMAKE_CURRENT_SOURCE_DIR}/../eval/corpus")
