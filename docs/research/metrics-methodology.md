# Metrics methodology

This document defines every number the engine reports, cites the formula's origin, and states
the engine's own operationalisation choices, which is where most "metric" tools differ silently.
All definitions are implemented in `cpp-engine/src/metrics/metrics.cpp` and checked by
`cpp-engine/tests/metrics_test.cpp`.

## 1. Token model

Metrics are computed over the token stream of the lexer (`cppmastery/lexer/lexer.hpp`), not
over an AST. Consequences, stated up front:

- Macros are **not** expanded. A `#define` is one `Preprocessor` token; its body is never
  analysed as code.
- Templates, overloads and types are **not** resolved. Anything that needs type information
  (e.g. "is this a floating-point variable?") is approximated by literal spelling.
- The lexer is *total*: any byte sequence tokenises. Metrics therefore exist for incomplete
  programs, which is the normal state of an editor buffer.

"Code tokens" below means tokens that are not comments, preprocessor directives or EOF.

## 2. Line classification

Each physical line (`\n` or `\r\n` terminated; a trailing newline does not add a line) is
assigned exactly one class by marking the line span of every token:

| Class | Condition |
|---|---|
| `code` | at least one code **or preprocessor** token touches the line |
| `comment` | no code token, at least one comment token |
| `blank` | neither |

`mixed` additionally counts the subset of `code` lines that also carry a comment. Multi-line
block comments and raw-string literals mark every line they span. `comment_ratio` is
`(comment + mixed) / (code + comment)`.

## 3. Halstead measures (Halstead, 1977)

There is no normative operator/operand partition for C++. The engine uses:

- **Operands:** identifiers that are not keywords; all literals; the literal-like keywords
  `true`, `false`, `nullptr`, `this`.
- **Operators:** all other keywords; every punctuator **except** `)`, `]`, `}` so that a
  bracket pair counts once.

From the distinct/total counts (n₁, n₂, N₁, N₂):

| Measure | Formula |
|---|---|
| Vocabulary | n = n₁ + n₂ |
| Length | N = N₁ + N₂ |
| Estimated length | N̂ = n₁ log₂ n₁ + n₂ log₂ n₂ |
| Volume | V = N log₂ n |
| Difficulty | D = (n₁ / 2) · (N₂ / n₂) |
| Effort | E = D · V |
| Time | T = E / 18 s (Stroud number) |
| Delivered bugs | B = V / 3000 |

Halstead's constants (18, 3000) are reported for comparability with other tools, not because
the engine asserts their predictive validity; the empirical support is weak (Fenton & Bieman,
*Software Metrics*, 3rd ed., ch. 8).

## 4. Function recognition

Functions are found with a token grammar rather than a parser. A definition is recognised at
every `(` whose preceding token resolves to a name and whose matching `)` is followed by a
*trailer* that ends in `{`:

```
name      := [~] Identifier ( '::' Identifier )*          -- qualified, destructors
           | 'operator' punctuator | 'operator' '(' ')' | 'operator' '[' ']'
trailer   := ( const | volatile | noexcept[(…)] | override | final | throw(…) | requires(…)
             | try | '&' | '&&' | '->' type-tokens | '[[' … ']]' )*  ( ':' mem-init-list )?  '{'
mem-init  := qualified-name ( '(' … ')' | '{' … '}' ) [ '...' ]  ( ',' mem-init )*
```

Rejections: a trailer that meets `;`, `=`, `,`, `)`, `?` or `.` (declarations, `= default`,
`= 0`, calls in expressions); a name preceded by `.`/`->` (member calls); control keywords
(they are `Keyword` tokens, not identifiers); lambdas (`]` precedes `(`).

Known limitations, verified by tests: function-like macro invocations followed by a block
(`TEST(a, b) { … }`) are reported as functions named after the macro, which is desirable for
test frameworks; function template *specialisations* with explicit arguments (`f<int>(…) {`)
are not recognised; nested functions are impossible in C++, so lambdas contribute to the
enclosing function.

Per function the engine reports `lines` (name to closing brace), `parameters` (top-level
commas + 1, with `()` and `(void)` as 0), `statements` (`;` tokens in the body).

## 5. Cyclomatic complexity (McCabe, 1976)

`cyclomatic` = 1 + number of tokens in the body that are one of `if`, `for`, `while`, `case`,
`catch`. This is the control-flow-graph definition v(G) = e − n + 2 for structured code where
each of these keywords adds one edge. `else`, `default` and `do` are not counted (the loop's
`while` already is).

`cyclomatic_extended` additionally counts `&&`, `||`, `and`, `or` and `?` (Myers, 1977), which
treats each short-circuit operand as a decision. Tools disagree on which variant they call
"cyclomatic complexity"; the engine reports both and uses the unextended value for the
`complexity/high-cyclomatic` rule so that McCabe's threshold of 10 keeps its original meaning.

File-level values: `total` (sum), `max`, `mean` over detected functions.

## 6. Nesting depth

`max_nesting` is the deepest brace depth inside a function body relative to the body itself,
**excluding** braces that are part of an initialiser (`= {…}`, `f({…})`, `return {…}`,
`T{…}`, `v{…}`) and lambda bodies (`](…) {…}`). This approximates "control-structure nesting"
without a parser; a bare block `{ … }` counts as one level.

## 7. Maintainability Index (Oman & Hagemeister, 1992)

```
MI_raw           = 171 − 5.2 ln V − 0.23 G − 16.2 ln LOC
MI_normalized    = clamp(MI_raw · 100 / 171, 0, 100)              -- Visual Studio convention
MI_with_comments = MI_raw + 50 sin(√(2.4 · perCM))                 -- SEI four-metric form
```

with V = total Halstead volume, G = `cyclomatic.total`, LOC = `lines.code`, perCM =
`comment_ratio · 100`. Logarithms are guarded with `max(1, ·)`. The normalised form is what
the platform shows learners; the raw form is kept for comparison with the literature.

The MI's coefficients were fitted on HP Pascal/C systems in 1991 and it has well-known
weaknesses (Welker, 2001; Counsell et al., 2015). It is presented as a *relative* signal
across versions of the same file, never as an absolute quality grade.

## 8. Other counts

- `includes`: `#include` directives.
- `classes`: `class`/`struct`/`union` keywords that begin a definition (followed by `{`
  before `;`), excluding `enum class`, `template <class T>`, `friend class X;` and
  elaborated type specifiers such as `struct Foo* p;`.
- `tokens`: code tokens.

## 9. Reproducibility

`eval/run_eval.py` recomputes every metric on the seeded corpus and fails CI if a
seeded diagnostic disappears or a non-info diagnostic appears on the clean corpus. Results for
the current commit are published in [`results/results.md`](results/results.md).

## References

- T. J. McCabe. *A Complexity Measure.* IEEE TSE SE-2(4), 1976. doi:10.1109/TSE.1976.233837
- G. J. Myers. *An extension to the cyclomatic measure of program complexity.* SIGPLAN Notices 12(10), 1977.
- M. H. Halstead. *Elements of Software Science.* Elsevier, 1977.
- P. Oman, J. Hagemeister. *Metrics for assessing a software system's maintainability.* ICSM 1992. doi:10.1109/ICSM.1992.242525
- K. D. Welker. *The Software Maintainability Index Revisited.* CrossTalk, Aug 2001.
- S. Counsell et al. *Re-visiting the 'Maintainability Index' Metric from an Object-Oriented Perspective.* SEAA 2015.
- N. Fenton, J. Bieman. *Software Metrics: A Rigorous and Practical Approach.* 3rd ed., CRC Press, 2014.
