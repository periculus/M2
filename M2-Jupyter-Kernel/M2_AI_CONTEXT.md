# Macaulay2 (M2) Language Reference for AI Code Assistants

This document provides context for AI code completion tools (GitHub Copilot, Claude Code, Cursor, Codeium) when working with Macaulay2 code. Macaulay2 is a computer algebra system for algebraic geometry and commutative algebra.

## Syntax Quick Reference

### Assignment and Definition
```m2
x = 5                        -- simple assignment
f = x -> x^2 + 1             -- anonymous function (lambda)
f(3)                          -- function call: returns 10
g = (x, y) -> x + y          -- multi-argument function
R = QQ[x, y, z]              -- define a polynomial ring
I = ideal(x^2 - y, y^2 - z)  -- define an ideal
```

### Operators
```m2
-- Arithmetic: + - * / ^ % //
-- Comparison: < > <= >= == != === =!=
-- Logical: and or not xor
-- Assignment: = := <- -> => >>
-- Subscript: _ (binary, NOT part of identifiers!)
-- Member access: . .?
-- Hash: # #?
-- Range: .. ..<
-- Concatenation: | ||
-- Application: space (juxtaposition, e.g. "gb I" means gb(I))
```

### Control Flow
```m2
if x > 0 then x else -x

for i from 0 to 10 do print i
for i in {1,2,3} do print i
while x > 0 do (x = x - 1)

try f(x) catch err -> print err
```

### Data Structures
```m2
{1, 2, 3}          -- List (mutable)
(1, 2, 3)          -- Sequence (immutable)
[1, 2, 3]          -- Array (rarely used)
new HashTable from {a => 1, b => 2}
set {1, 2, 3}      -- Set
tally {1, 1, 2, 3} -- Tally (multiset)
```

### Comments
```m2
-- single line comment
-* block
   comment *-
```

### Strings
```m2
"hello world"       -- regular string (can span multiple lines)
/// documentation
    string ///       -- triple-slash documentation string
```

## Common Patterns

### Ring and Ideal Operations
```m2
R = QQ[x, y, z]              -- polynomial ring over rationals
I = ideal(x^2 - y*z, y^2 - x*z, z^2 - x*y)
G = gb I                      -- Groebner basis
dim I                          -- Krull dimension
codim I                        -- codimension
degree I                       -- degree of the variety
minimalPrimes I                -- minimal primes
primaryDecomposition I         -- primary decomposition
radical I                      -- radical of ideal
saturate(I, ideal(x))         -- saturation
```

### Module Operations
```m2
M = coker matrix {{x, y}, {y, z}}   -- define a module
F = res M                            -- free resolution
betti F                              -- Betti numbers
pdim M                               -- projective dimension
regularity M                         -- Castelnuovo-Mumford regularity
Ext^1(M, R^1)                        -- Ext module
Tor_1(M, N)                          -- Tor module
Hom(M, N)                            -- Hom module
```

### Matrix Operations
```m2
m = matrix {{1,2},{3,4}}     -- define a matrix
det m                         -- determinant
rank m                        -- rank
transpose m                   -- transpose
m * m                         -- multiplication
entries m                     -- nested list of entries
numrows m                     -- number of rows
numcols m                     -- number of columns
```

### List Operations
```m2
L = {1, 2, 3, 4, 5}
apply(L, i -> i^2)           -- map: {1, 4, 9, 16, 25}
select(L, i -> i > 2)        -- filter: {3, 4, 5}
scan(L, i -> print i)        -- forEach (side effects)
any(L, i -> i > 4)           -- any match: true
all(L, i -> i > 0)           -- all match: true
#L                            -- length: 5
L_0                           -- first element: 1 (0-indexed)
L_{0..2}                      -- slice: {1, 2, 3}
sort L                        -- sorted copy
unique L                      -- remove duplicates
flatten {{1,2},{3,4}}        -- flatten: {1, 2, 3, 4}
join(L, {6, 7})              -- concatenate
```

### Package Management
```m2
loadPackage "Polyhedra"       -- load a package
needsPackage "SimplicialComplexes"  -- load if not already
installPackage "PackageName"  -- install from repository
viewHelp "gb"                 -- open documentation
```

## M2 to Python Translation Table

| Python | Macaulay2 | Notes |
|--------|-----------|-------|
| `x = 5` | `x = 5` | Same syntax |
| `def f(x): return x**2` | `f = x -> x^2` | Arrow syntax, `^` not `**` |
| `lambda x: x+1` | `x -> x+1` | Arrow syntax |
| `for i in range(10):` | `for i from 0 to 9 do` | Inclusive range |
| `for x in lst:` | `for x in lst do` | Same concept |
| `if x > 0: ... else: ...` | `if x > 0 then ... else ...` | `then`/`else` keywords |
| `[x**2 for x in range(5)]` | `apply(5, i -> i^2)` | `apply` = map |
| `[x for x in L if x>0]` | `select(L, x -> x > 0)` | `select` = filter |
| `list(map(f, L))` | `apply(L, f)` | `apply` = map |
| `import pkg` | `loadPackage "Pkg"` | Package names are strings |
| `len(L)` | `#L` | Prefix `#` operator |
| `L[0]` | `L_0` | `_` is subscript operator |
| `L[1:3]` | `L_{1..2}` | Inclusive range |
| `# comment` | `-- comment` | Double dash |
| `"""docstring"""` | `/// docstring ///` | Triple slash |
| `print(x)` | `print x` | Juxtaposition (no parens needed) |
| `str(x)` | `toString x` | String conversion |
| `type(x)` | `class x` | Type query |
| `True/False` | `true/false` | Lowercase |
| `None` | `null` | Null value |
| `{}` | `new MutableHashTable` | Hash tables |
| `{1: "a"}` | `hashTable {1 => "a"}` | `=>` for key-value pairs |
| `x ** 2` | `x ^ 2` | Power operator |
| `x != y` | `x != y` or `x =!= y` | `=!=` tests non-identical |

## Key Differences from Python

1. **Juxtaposition is function call**: `f x` means `f(x)`. Parens are optional for single arguments.
2. **`_` is an operator**: `M_0` means "subscript 0 of M". It is NOT part of identifiers.
3. **`:=` for local assignment**: `x := 5` creates a local variable. `x = 5` is global.
4. **Semicolons are optional**: Statements are separated by newlines or `;`.
5. **Everything is an expression**: `if/then/else`, `for/do`, etc. return values.
6. **0-indexed**: Lists and sequences are 0-indexed like Python.
7. **Immutable by default**: Most objects are immutable. Use `Mutable*` variants for mutability.
8. **`^` is power**: Not XOR. Use `xor` for logical XOR.

## 50 Most-Used Functions

| Function | Purpose | Example |
|----------|---------|---------|
| `ideal` | Create an ideal | `ideal(x^2, y^2)` |
| `ring` | Get the ring of an object | `ring I` |
| `gb` | Groebner basis | `gb I` |
| `res` | Free resolution | `res M` |
| `dim` | Krull dimension | `dim I` |
| `codim` | Codimension | `codim I` |
| `degree` | Degree | `degree I` |
| `gens` | Generators | `gens I` |
| `mingens` | Minimal generators | `mingens I` |
| `matrix` | Create a matrix | `matrix {{1,2},{3,4}}` |
| `map` | Ring/module map | `map(R, S, {x,y})` |
| `ker` | Kernel | `ker f` |
| `coker` | Cokernel | `coker m` |
| `image` | Image | `image f` |
| `rank` | Rank | `rank M` |
| `det` | Determinant | `det m` |
| `trace` | Matrix trace | `trace m` |
| `transpose` | Transpose | `transpose m` |
| `betti` | Betti numbers | `betti res M` |
| `regularity` | Regularity | `regularity M` |
| `hilbertFunction` | Hilbert function | `hilbertFunction(3, M)` |
| `hilbertPolynomial` | Hilbert polynomial | `hilbertPolynomial M` |
| `hilbertSeries` | Hilbert series | `hilbertSeries M` |
| `primaryDecomposition` | Primary decomposition | `primaryDecomposition I` |
| `minimalPrimes` | Minimal primes | `minimalPrimes I` |
| `saturate` | Saturation | `saturate(I, J)` |
| `factor` | Factorization | `factor 120` |
| `gcd` | GCD | `gcd(12, 18)` |
| `apply` | Map function over list | `apply(L, f)` |
| `select` | Filter list | `select(L, f)` |
| `scan` | Iterate with side effects | `scan(L, print)` |
| `sort` | Sort | `sort L` |
| `unique` | Remove duplicates | `unique L` |
| `flatten` | Flatten lists | `flatten L` |
| `join` | Concatenate lists | `join(L1, L2)` |
| `tally` | Count occurrences | `tally L` |
| `print` | Print output | `print x` |
| `error` | Raise error | `error "msg"` |
| `class` | Get type | `class x` |
| `toString` | Convert to string | `toString x` |
| `substitute` | Substitution | `sub(f, {x=>1})` |
| `promote` | Promote to larger ring | `promote(1, QQ)` |
| `lift` | Lift to smaller ring | `lift(f, ZZ)` |
| `use` | Make ring variables accessible | `use R` |
| `loadPackage` | Load package | `loadPackage "Pkg"` |
| `coefficientRing` | Get coefficient ring | `coefficientRing R` |
| `numgens` | Number of generators | `numgens R` |
| `basis` | Basis in a degree | `basis(2, R)` |
| `trim` | Trim presentation | `trim M` |
| `prune` | Minimal presentation | `prune M` |

## Common Ring Types

| Type | Description | Example |
|------|-------------|---------|
| `ZZ` | Integers | `factor(120)` |
| `QQ` | Rationals | `R = QQ[x,y]` |
| `RR` | Real numbers (53-bit) | `1.5 + 2.3` |
| `CC` | Complex numbers | `ii^2 == -1` |
| `GF(p)` | Finite field | `GF(7)[x,y]` |
| `QQ[x,y,z]` | Polynomial ring | Most common |
| `QQ[x,y]/I` | Quotient ring | `QQ[x,y] / ideal(x^2)` |
| `frac R` | Fraction field | `frac(ZZ[x])` |
