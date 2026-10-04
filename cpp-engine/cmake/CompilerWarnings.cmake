# Strict, portable warning set. Call: cppmastery_set_warnings(<target> <as_errors:BOOL>)
function(cppmastery_set_warnings target as_errors)
    set(gcc_clang
        -Wall -Wextra -Wpedantic
        -Wshadow -Wconversion -Wsign-conversion -Wold-style-cast -Wcast-align
        -Wunused -Woverloaded-virtual -Wnon-virtual-dtor
        -Wdouble-promotion -Wformat=2 -Wimplicit-fallthrough
        -Wmisleading-indentation)
    set(gcc_only
        -Wduplicated-cond -Wduplicated-branches -Wlogical-op -Wuseless-cast)
    set(msvc /W4 /permissive- /w14640 /w14265 /w14062)

    if(CMAKE_CXX_COMPILER_ID MATCHES "Clang")
        target_compile_options(${target} PRIVATE ${gcc_clang})
        if(as_errors)
            target_compile_options(${target} PRIVATE -Werror)
        endif()
    elseif(CMAKE_CXX_COMPILER_ID STREQUAL "GNU")
        target_compile_options(${target} PRIVATE ${gcc_clang} ${gcc_only})
        # GCC 12 emits false -Wrestrict diagnostics from inside libstdc++'s char_traits at -O2
        # (GCC bug 105329). -Wnull-dereference is omitted for the same reason: on GCC it fires
        # on standard-library and GoogleTest internals rather than on project code.
        if(CMAKE_CXX_COMPILER_VERSION VERSION_LESS 13)
            target_compile_options(${target} PRIVATE -Wno-restrict)
        endif()
        if(as_errors)
            target_compile_options(${target} PRIVATE -Werror)
        endif()
    elseif(MSVC)
        target_compile_options(${target} PRIVATE ${msvc})
        if(as_errors)
            target_compile_options(${target} PRIVATE /WX)
        endif()
    endif()
endfunction()
