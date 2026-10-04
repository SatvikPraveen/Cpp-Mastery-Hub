#pragma once

#include <memory>
#include <vector>

#include "cppmastery/analysis/rule.hpp"

namespace cppmastery {

/// Instantiates every built-in rule. The set is documented in docs/research/rule-catalog.md.
///
/// Rule ids (category/name):
///   security/unsafe-c-function      security/shell-command
///   memory/raw-new-delete           memory/malloc-free
///   correctness/empty-catch         correctness/assignment-in-condition
///   correctness/float-equality
///   modernize/c-style-cast          modernize/null-macro      modernize/typedef
///   modernize/macro-constant        modernize/c-random
///   readability/using-namespace-std readability/magic-number  readability/goto
///   performance/endl
///   portability/bits-stdc++
///   complexity/high-cyclomatic      complexity/deep-nesting   complexity/long-function
[[nodiscard]] std::vector<std::unique_ptr<Rule>> makeBuiltinRules();

}  // namespace cppmastery
