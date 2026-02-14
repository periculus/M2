# M2 Lezer Grammar Development Guide
Last verified: 2026-02-10 | M2 1.25.06 | JupyterLab 4.4.5 | Node 25.1.0 | Lezer 1.4.x
Source of truth for: grammar architecture, juxtaposition, token rules, validation

## Architecture

- Expression-oriented Lezer grammar in `codemirror-lang-m2/src/m2.grammar`
- 28 precedence levels derived from M2's `binding.d` (lines 215-371)
- Highest: `member` (`.`), `subscript` (`_`, `#`). Lowest: `comma`
- `@top Program` is a sequence of semicolon-separated expressions
- `expression` is an `@isGroup` containing ~30 alternatives (atoms + compound expressions)

## Keyword Mechanisms

- `@specialize` via `kw<term>`: ALWAYS replaces Identifier with keyword (used for `and`, `or`, `xor`)
- `@extend` via `ckw<term>`: Falls back to Identifier if grammar doesn't expect keyword (used for `if`, `then`, `else`, `do`, `for`, `while`, `try`, `catch`, `new`, `of`, `from`, `to`, `in`, `when`, `by`, `not`, `load`, `use`, `export`, `symbol`, `global`, `local`, `time`, `elapsedTime`, `shield`, `debug`, `needs`, `return`, `break`, `continue`, `throw`, `threadLocal`)
- WHY ckw for most: M2 allows `not Function := ...`, `new Class from ...` -- keywords used as identifiers in method installations
- 80+ types, 90+ builtins, 12 constants use `@specialize` on Identifier

## The Juxtaposition Lesson (CRITICAL -- hard-won knowledge)

M2 uses space-application: `gb I`, `print x`, `flatten entries M`. This is impossible in a pure LR parser because `expr expr` is infinitely ambiguous with binary operators.

**What was tried and failed:**
1. `Application { expr expr }` -- generator eliminates it (ambiguous)
2. External tokenizer with zero-width `Jux` token -- parser state never expects it
3. GLR markers `~name` -- too greedy, swallows `f(x)` and `x+y`

**What works:**
```
JuxtapositionExpr { expression !jux juxArg }
juxArg { Identifier | Type | Builtin | Constant | Number | String | TripleString | Boolean | Null }
```
Restrict RHS to atoms only. This avoids ambiguity with binary operators while handling most real-world patterns. `CallExpr` (parens/braces/brackets) has higher precedence via `!call`.

Also: keyword-specific rules (`LoadExpr`, `UseExpr`, etc.) with `ckw<>` so keywords can appear as identifiers.

## Token Precedence (order matters!)

In `@tokens { @precedence { ... } }`, longer/more-specific tokens must come first:
```
"...", "..<", "..", ".?", "."    -- ... before .. before .
"===>" , "===" , "==>" , "=="   -- longest first
"^**", "^>=", "^>", "^<=", "^<", "^~", "^*", "^!", "^"
```
If you add a new multi-character operator, place it before its prefixes.

## Number Literals

```
Number {
  @digit+ ("." @digit*)? ("p" @digit+)? ($[eE] $[\-+]? @digit+)? |
  "." @digit+ ("p" @digit+)? ($[eE] $[\-+]? @digit+)?
}
```
Supports: `42`, `3.14`, `.5`, `1.` (trailing dot), `1p111` (precision), `1e-10` (scientific), `1.5p100e20` (combined).

### LeadingDotNumber (parser-level disambiguation)

M2 uses `.` for both leading-dot numbers (`.4`, `.5e-3`) and member access (`C.0`, `M.cache`). These are ambiguous at the token level. The grammar resolves this with a parser-level rule:

```
LeadingDotNumber { "." Number }
```

At expression start, the parser shifts `"."` into `LeadingDotNumber`. After an expression, LR shift/reduce preference makes `"."` shift into `BinaryExpression` for member access. So `.4` becomes `LeadingDotNumber` and `C.0` becomes `BinaryExpression`. This avoids any tokenizer-level tricks or external tokenizers.

## How to Add New Types/Builtins/Constants

1. Edit `codemirror-lang-m2/src/m2.grammar`
2. Add the name to the appropriate `@specialize` block (Type, Builtin, or Constant)
3. If it's a new CATEGORY (not type/builtin/constant), also update `highlight.js` to map the new node name to a lezer tag
4. Compile: `npx lezer-generator src/m2.grammar -o src/parser.js`
5. Run corpus test: `node test/test_corpus.js`
6. Copy to extension: `cp src/parser.js src/parser.terms.js ../src/parser/`

## How to Validate

```fish
cd M2-Jupyter-Kernel/codemirror-lang-m2
npx lezer-generator src/m2.grammar -o src/parser.js   # must succeed
node test/test_corpus.js                                # target: <1% error rate
node test/analyze_errors.js                             # detailed breakdown
```
```bash
# Same commands work in bash
```

## OperatorSymbol Token

M2 allows `symbol *`, `global ==`, etc. — scope keywords followed by bare operators. These can't be parsed as expressions (operators need operands). The grammar handles this with a built-in `OperatorSymbol` token in `@tokens` that matches scope keyword + horizontal whitespace + operator as a single token, using Lezer's longest-match rule to beat `Identifier`.

Key constraints:
- **Horizontal whitespace only**: Uses `$[ \t]*` (NOT `@whitespace*`) to prevent matching across newlines
- **No standalone `-`**: Excluded because it conflicts with `--` (LineComment) and `-*` (BlockComment). Multi-char operators with `-` (`->`, `|-`, `<-`) still work.
- `symbol -` (bare minus as operator symbol) remains an error — acceptable since `-` can start a unary expression

## Known Limitations

| Pattern | Example | Fixability | Notes |
|---------|---------|------------|-------|
| `symbol -` (bare minus) | `symbol -, Thing, Thing` | Won't fix | `-` conflicts with `--`/`-*` comments |
| Raw SimpleDoc markup | `Schubert2/doc.m2` | Not fixable | 187 files excluded from corpus test |
| LaTeX in doc strings | `$\PP^n$` | Not fixable | Inside `///` strings |
| `$` in identifiers | `$Failed` | Won't fix | Rare, causes cascading |

## Regression Fixtures

These patterns MUST parse without errors (run `node test/test_fixtures.js`):
```
try f() catch g()              -- try/catch
symbol *                       -- OperatorSymbol token
symbol ==                      -- OperatorSymbol multi-char
(symbol **, Matrix, Matrix)    -- OperatorSymbol in tuple context
1.5p100e20                     -- number formats
f(x, y,)                      -- trailing comma
gb I                           -- juxtaposition
not x                          -- not as ckw
for i from 0 to 10 do f(i)    -- for loop
{a, b, c}                     -- list
x_0 .. x_n                    -- subscript + range
/// doc string ///             -- triple string
if x then y else z             -- if/then/else
```

Boundary guards (must NOT produce OperatorSymbol):
```
symbol\n*x                     -- cross-line: symbol is identifier, *x is unary
symbol --comment               -- comment: symbol is identifier, -- is LineComment
symbol -* block *-             -- block comment: symbol is keyword, -* is BlockComment
```

Expected error: `symbol -` (bare minus — excluded from OperatorSymbol to avoid comment conflicts).

## M2 Reference Files

- Operator precedence: `M2/Macaulay2/d/binding.d` (lines 215-371)
- Bison grammar: `M2/Macaulay2/c/grammar.y`
- Symbol dictionary: `M2/Macaulay2/editors/vim/m2.vim.dict` (1763 symbols)
- Error analysis: `codemirror-lang-m2/PARSING_ERROR_ANALYSIS.md`

## Key Rule: Underscore is an OPERATOR

`_` is NOT part of identifiers in M2. It is the subscript operator. `x_0` is `x` subscript `0`.
Identifier chars: `[a-zA-Z][a-zA-Z0-9'$]*` plus Unicode ranges.
