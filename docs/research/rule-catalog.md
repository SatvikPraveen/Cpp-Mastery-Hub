# Rule catalog

Every rule shipped by the engine, generated from `cppmastery rules --json` at engine version 2.0.0.
Each rule carries an external reference so that a learner can read the rationale rather than take
the tool's word for it. Detection is purely syntactic (token-level); the *Precision notes* column
records the deliberate false-negative/false-positive trade-offs. Proposals for new rules use the
*Analysis rule proposal* issue template and must supply must-flag and must-not-flag examples.

| Rule id | Severity | Reference | Description |
|---|---|---|---|
| `security/unsafe-c-function` | error | CERT C STR31-C, MSC24-C; CWE-120 | Calls to C library functions that cannot be used without risking buffer overflow. |
| `security/shell-command` | warning | CERT C++ ENV33-C; CWE-78 | Spawning a shell from user-reachable code enables command injection. |
| `memory/raw-new-delete` | warning | C++ Core Guidelines R.11, R.20 | Explicit new/delete transfers ownership manually and is a frequent source of leaks. |
| `memory/malloc-free` | warning | C++ Core Guidelines R.10 | C allocation functions bypass constructors/destructors and type safety. |
| `correctness/empty-catch` | warning | CERT C++ ERR56-CPP; Core Guidelines E.31 | An empty handler silently discards the exception and the failure it reports. |
| `correctness/assignment-in-condition` | warning | CERT C EXP45-C; MISRA C++ 6-2-1 | 'if (x = v)' is almost always a typo for 'if (x == v)'. |
| `correctness/float-equality` | warning | Goldberg 1991; CERT C FLP02-C | Exact comparison against a floating-point literal is usually unreliable. |
| `modernize/c-style-cast` | warning | C++ Core Guidelines ES.49 | C-style casts hide which of static/const/reinterpret conversion is intended. |
| `modernize/null-macro` | info | C++ Core Guidelines ES.47 | NULL is an integer constant; nullptr is typed. |
| `modernize/typedef` | info | C++ Core Guidelines T.43 | Alias declarations read left-to-right and work with templates. |
| `modernize/macro-constant` | info | C++ Core Guidelines ES.31, Enum.1 | Object-like macros holding literals have no type or scope. |
| `modernize/c-random` | info | CERT C++ MSC50-CPP, MSC51-CPP | rand() has poor statistical quality and an unspecified period. |
| `readability/using-namespace-std` | warning | C++ Core Guidelines SF.6, SF.7 | A global using-directive for std pollutes every translation unit that includes the file. |
| `readability/magic-number` | info | C++ Core Guidelines ES.45 | Unnamed numeric literals obscure intent. |
| `readability/goto` | warning | C++ Core Guidelines ES.76; Dijkstra 1968 | goto defeats structured control flow. |
| `performance/endl` | info | C++ Core Guidelines SL.io.50 | std::endl flushes the stream on every use. |
| `portability/bits-stdc++` | warning | C++ Core Guidelines SF.12 | <bits/stdc++.h> is a libstdc++ internal header; it is not portable and slows builds. |
| `complexity/high-cyclomatic` | warning | McCabe 1976 (threshold 10) | Functions above the cyclomatic threshold are harder to test exhaustively. |
| `complexity/deep-nesting` | warning | Linux kernel coding style, ch. 1 (indentation) | Deeply nested blocks are hard to follow. |
| `complexity/long-function` | warning | C++ Core Guidelines F.3 | Long functions usually do more than one thing. |

## Detection logic and precision notes

### `security/unsafe-c-function`

**Detects.** Identifier in {gets, strcpy, strcat, sprintf, vsprintf, strtok, tmpnam, getwd, alloca} immediately followed by `(`, not preceded by `.`/`->`.

**Precision notes.** A member function that happens to share the name is not flagged. `strncpy`/`snprintf` are deliberately *not* flagged: they are bounded.

### `security/shell-command`

**Detects.** Call of `system` or `popen`.

**Precision notes.** `exec*`/`posix_spawn` are not flagged; they take argument vectors and are the suggested replacement.

### `memory/raw-new-delete`

**Detects.** Keyword `new` or `delete` not preceded by `operator` (operator overloads) or `=` (`= delete`).

**Precision notes.** Placement new is flagged (it still implies manual lifetime).

### `memory/malloc-free`

**Detects.** Call of `malloc`, `calloc`, `realloc` or `free`.

**Precision notes.** Member calls excluded as above.

### `correctness/empty-catch`

**Detects.** `catch ( … ) { }` with nothing between the braces.

**Precision notes.** A handler containing only a comment is still *empty* at the token level and is flagged; the hint asks for an explicit comment *and* a narrowed type.

### `correctness/assignment-in-condition`

**Detects.** `if (` or `while (` followed directly by an identifier and a single `=`.

**Precision notes.** The narrow shape keeps precision high; `if (auto v = f(); v)` and `if ((x = f()))` are not flagged.

### `correctness/float-equality`

**Detects.** `==` or `!=` whose immediate left or right operand is a floating literal.

**Precision notes.** Comparisons between two variables are not flagged (no type information).

### `modernize/c-style-cast`

**Detects.** `(` [const] fundamental-type-keyword+ [`*`|`&`]* `)` followed by an identifier, literal, `(`, unary `-`/`*`/`&` or `this`; not preceded by `sizeof`/`alignof`/`decltype`/an identifier.

**Precision notes.** Only built-in type spellings are recognised, so `(Foo*)p` is not flagged; the trade-off favours precision.

### `modernize/null-macro`

**Detects.** Identifier `NULL`.

**Precision notes.** —

### `modernize/typedef`

**Detects.** Keyword `typedef`.

**Precision notes.** —

### `modernize/macro-constant`

**Detects.** Object-like `#define NAME literal` where the replacement is a numeric, string or char literal with no parentheses.

**Precision notes.** Function-like macros and expression macros are not flagged.

### `modernize/c-random`

**Detects.** Call of `rand` or `srand`.

**Precision notes.** —

### `readability/using-namespace-std`

**Detects.** `using namespace std` at brace depth 0.

**Precision notes.** Function-scoped directives are allowed.

### `readability/magic-number`

**Detects.** Integer or floating literal, except: allow-listed values (default 0, 1, -1, 2); `case` labels; array bounds (`[N]`); template arguments after `<`; `return N`; initialisers of `constexpr`/`const`/enumerator declarations.

**Precision notes.** Allow-list is configurable (`AnalysisConfig::allowedMagicNumbers`).

### `readability/goto`

**Detects.** Keyword `goto`.

**Precision notes.** —

### `performance/endl`

**Detects.** Identifier `endl` (qualified or not).

**Precision notes.** —

### `portability/bits-stdc++`

**Detects.** Preprocessor directive containing `bits/stdc++.h`.

**Precision notes.** —

### `complexity/high-cyclomatic`

**Detects.** Per-function McCabe complexity > `maxCyclomatic` (default 10).

**Precision notes.** Uses the *unextended* count (decision keywords only); see methodology.

### `complexity/deep-nesting`

**Detects.** Per-function block nesting > `maxNesting` (default 4).

**Precision notes.** Brace-initialisers and lambda bodies are not counted as nesting.

### `complexity/long-function`

**Detects.** Per-function physical lines > `maxFunctionLines` (default 60).

**Precision notes.** Measured from the name token to the closing brace.

## Severity semantics

| Severity | Meaning | Default CLI effect |
|---|---|---|
| `error` | Memory-unsafe or exploitable construct; the program should not ship. | exit code 1 |
| `warning` | Likely defect, ownership hazard or maintainability risk. | exit 1 only with `--fail-on warning` |
| `info` | Modernisation or style opportunity. | never fails |

## Counts by category

| Category | Rules |
|---|---:|
| complexity | 3 |
| correctness | 3 |
| memory | 2 |
| modernize | 5 |
| performance | 1 |
| portability | 1 |
| readability | 3 |
| security | 2 |
