# Copilot Instructions for Macaulay2 (M2)

When generating or completing Macaulay2 code, follow these rules:

1. **Juxtaposition is function application**: `f x` means `f(x)`. Parentheses are optional for single arguments. Write `gb I` not `gb(I)`.

2. **`_` is a subscript operator**, NOT part of identifiers. `M_0` means "element 0 of M". Never use `_` in variable names.

3. **Use `^` for power** (not `**`): `x^2 + y^3`

4. **Comments use `--`** (not `#`): `-- this is a comment`

5. **Arrow functions**: `f = x -> x^2 + 1` (not `def` or `lambda`)

6. **Control flow uses keywords**: `if x > 0 then x else -x` (requires `then` and `else`)

7. **For loops**: `for i from 0 to n do (...)` (inclusive range, requires `do`)

8. **Ring definitions**: `R = QQ[x, y, z]` — polynomial ring over rationals

9. **Ideals**: `I = ideal(x^2 - y, y^2 - z)` — use `ideal()` function

10. **`:=` for local variables**, `=` for global assignment

See `M2_AI_CONTEXT.md` in this repository for comprehensive M2 syntax reference, Python translation table, and the 50 most-used functions.
