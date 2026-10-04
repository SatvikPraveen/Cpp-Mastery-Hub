# Sets <out_var> to the short git hash of the source tree, or "unknown".
# Builds without a .git directory (Docker contexts, source tarballs) can pass
# -DCPPMASTERY_GIT_REVISION_OVERRIDE=<sha>.
function(cppmastery_git_revision out_var)
    if(CPPMASTERY_GIT_REVISION_OVERRIDE)
        set(${out_var} "${CPPMASTERY_GIT_REVISION_OVERRIDE}" PARENT_SCOPE)
        return()
    endif()
    find_package(Git QUIET)
    set(rev "unknown")
    if(Git_FOUND)
        execute_process(
            COMMAND ${GIT_EXECUTABLE} rev-parse --short=12 HEAD
            WORKING_DIRECTORY ${CMAKE_CURRENT_SOURCE_DIR}
            OUTPUT_VARIABLE rev_out
            RESULT_VARIABLE rev_res
            OUTPUT_STRIP_TRAILING_WHITESPACE
            ERROR_QUIET)
        if(rev_res EQUAL 0 AND rev_out)
            set(rev "${rev_out}")
        endif()
    endif()
    set(${out_var} "${rev}" PARENT_SCOPE)
endfunction()
