# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Macaulay2 is a software system for research in algebraic geometry and commutative algebra. It consists of a computational engine (C++), an interpreter (custom language), and an extensive package ecosystem. The system is designed for mathematical research and provides sophisticated algorithms for polynomial computations, algebraic geometry, and related fields.

## Build Commands

### Prerequisites for ARM64 macOS
```bash
# Install dependencies via Homebrew (use arch -arm64 prefix)
arch -arm64 brew install cmake ninja autoconf automake libtool
arch -arm64 brew install gmp mpfr flint ntl gdbm openblas mpfi
arch -arm64 brew install tbb bdw-gc boost readline
```

### CMake Build Process
```bash
# Configure build (from repository root)
cd M2
arch -arm64 cmake -GNinja -S . -B BUILD/cmake \
  -DCMAKE_BUILD_TYPE=Release \
  -DCMAKE_OSX_ARCHITECTURES=arm64 \
  -DBOOST_ROOT=/opt/homebrew \
  -DBoost_NO_BOOST_CMAKE=ON \
  -DCMAKE_PREFIX_PATH="/opt/homebrew;/usr/local"

# Build external libraries first
arch -arm64 cmake --build BUILD/cmake --target build-libraries

# Build main system
arch -arm64 cmake --build BUILD/cmake --target M2-binary --parallel 12

# Optional: build specific components
arch -arm64 cmake --build BUILD/cmake --target M2-engine --parallel 12
arch -arm64 cmake --build BUILD/cmake --target M2-interpreter --parallel 12
```

### Traditional Make (if using autotools)
```bash
./autogen.sh
./configure
make
```

## Testing Commands

### CMake/CTest
```bash
# Run all tests
ctest

# List available tests
ctest -N

# Run tests matching pattern
ctest -R <pattern>

# Run tests in parallel
ctest -j4

# Rerun failed tests with verbose output
ctest --rerun-failed -V
```

### Package Testing
```bash
# Test all packages
cmake --build BUILD/cmake --target check-packages

# Test specific package
cmake --build BUILD/cmake --target check-PACKAGENAME

# Install packages (prerequisite for testing)
cmake --build BUILD/cmake --target install-packages
```

### Traditional Make Testing
```bash
make check
```

## High-Level Architecture

### Core Components

1. **SCC Compiler (`M2/Macaulay2/c/`)**: Custom compiler that translates `.d` files (a domain-specific language) to C++. Written in C using Yacc/Bison for parsing.

2. **Interpreter (`M2/Macaulay2/d/`)**: High-level interpreter written in the custom `.d` language. Contains ~80 `.d` files implementing the M2 language runtime, type system, and user interface.

3. **Computational Engine (`M2/Macaulay2/e/`)**: High-performance C++ kernel with 150+ source files implementing core mathematical algorithms including:
   - Ring arithmetic (integers, rationals, finite fields, polynomial rings)
   - Matrix operations and linear algebra  
   - Gröbner basis computations (`gb-*.cpp`)
   - Resolution computations (`res-*.cpp`)
   - Monomial ideals and orderings

4. **Core Library (`M2/Macaulay2/m2/`)**: ~100 `.m2` files implementing the M2 language standard library and mathematical objects.

5. **Package System (`M2/Macaulay2/packages/`)**: 280+ distributed packages for specialized mathematical functionality.

### Component Relationships

The architecture follows a layered design:
- **M2 Frontend** (`.m2` files) provides the user interface and high-level mathematical constructs
- **Interpreter** (`.d` files) handles expression evaluation, memory management, and runtime
- **Engine** (`.cpp` files) performs computations via a clean C interface
- **External Libraries** (GMP, FLINT, etc.) provide low-level arithmetic and algorithms

### Key Architectural Patterns

- **Interface/Implementation Separation**: Engine provides clean C interface (`e/interface/`) that the interpreter uses
- **Memory Management**: Boehm garbage collector with careful integration across language boundaries
- **Modular Design**: Clear separation between parsing/UI, evaluation, and computation layers
- **Extensibility**: Package system allows mathematical domain experts to extend functionality

## Directory Structure

```
M2/
├── Macaulay2/                 # Main source directory
│   ├── c/                     # SCC compiler (custom language → C++)
│   ├── d/                     # Interpreter (written in custom .d language)
│   ├── e/                     # Computational engine (C++)
│   │   ├── interface/         # Clean C interface to engine
│   │   └── unit-tests/        # Google Test unit tests
│   ├── m2/                    # Core M2 library (.m2 files)
│   ├── packages/              # Distributed packages (280+)
│   └── tests/                 # Test suite
│       ├── normal/            # Regular tests (300+ .m2 files)
│       ├── slow/              # Slower running tests
│       ├── engine/            # Engine-specific tests
│       └── ComputationsBook/  # Tests from reference book
├── cmake/                     # CMake modules and library detection
├── BUILD/                     # Build output directory
└── libraries/                 # External library configurations
```

## Working with the Codebase

### Engine Development (C++)
- Engine source in `M2/Macaulay2/e/`
- Interface headers in `M2/Macaulay2/e/interface/`
- Unit tests use Google Test framework
- Build target: `M2-engine`

### Interpreter Development (.d language)
- Source in `M2/Macaulay2/d/`
- Custom language compiled via SCC compiler
- Interfaces with engine via C API
- Build target: `M2-interpreter`

### Package Development (.m2 language)
- Each package is a `.m2` file with optional subdirectory
- Standard structure: version info, dependencies, documentation, tests
- Use `installPackage("PackageName")` and `check("PackageName")` for development
- Documentation integrated via `SimpleDoc`

### Key Files for Understanding
- `M2/CMakeLists.txt`: Main build configuration with build instructions
- `M2/Macaulay2/d/M2.d`: Core M2 language implementation
- `M2/Macaulay2/e/engine.cpp`: Main engine interface
- `M2/Macaulay2/m2/startup.m2.in`: System initialization
- `cmake/check-libraries.cmake`: External library requirements

## ARM64 macOS Considerations

- Always use `arch -arm64` prefix for build commands
- External mathematical libraries (Factory, Normaliz) may need special integration
- Some packages may have architecture-specific issues
- Use `-DCMAKE_OSX_ARCHITECTURES=arm64` for proper cross-compilation
- Boost and TBB paths may need explicit specification

## External Library Integration

The build system downloads and builds 20+ external mathematical libraries:
- **Core arithmetic**: GMP, MPFR, FLINT
- **Advanced math**: Factory (polynomial operations), Normaliz (convex geometry)
- **Linear algebra**: LAPACK, OpenBLAS, Eigen
- **Specialized**: Frobby (monomial ideals), NTL (number theory)

Libraries are managed via CMake's `ExternalProject` with consistent compiler flags and installation paths.

## Code Intelligence Features

- Successfully implemented comprehensive code intelligence for M2 Jupyter kernel
- Features include:
  * **Autocomplete**: Context-aware completion for 1763+ M2 symbols (functions, types, keywords)
  * **Hover Documentation**: Quick info on Shift+hover (symbol type, signatures, descriptions)
  * **Go-to-Definition**: Alt+Click to jump to where symbols are defined
  * **Syntax Highlighting**: Dynamic highlighting using parsed M2 language data
- Implementation details:
  * Parses M2 vim dictionary file for language symbols
  * Tracks symbol definitions as code executes
  * Provides built-in symbol information
  * Context-aware completions (e.g., types after ':', functions after '=')
- Testing: Run `python test_code_intelligence.py` and `python test_goto_definition.py`

## Grammar Development Workflow (codemirror-lang-m2)

**IMPORTANT**: When working on the M2 Lezer grammar, follow this workflow:

1. **Validate grammar compiles**:
   ```fish
   cd M2-Jupyter-Kernel/codemirror-lang-m2
   npx lezer-generator src/m2.grammar -o src/parser.js
   ```

2. **Run corpus test** (target: <5% error rate across all .m2 files):
   ```fish
   node test/test_corpus.js
   ```

3. **Build extension**:
   ```fish
   cd M2-Jupyter-Kernel
   npx tsc --sourceMap && jupyter labextension build --development True .
   ```

4. **Key grammar files**:
   - Grammar: `M2-Jupyter-Kernel/codemirror-lang-m2/src/m2.grammar`
   - Highlight mapping: `M2-Jupyter-Kernel/codemirror-lang-m2/src/highlight.js`
   - Token lists: `M2-Jupyter-Kernel/codemirror-lang-m2/src/tokens.ts`
   - Corpus test: `M2-Jupyter-Kernel/codemirror-lang-m2/test/test_corpus.js`

5. **Reference files for M2 syntax**:
   - Operator precedence: `M2/Macaulay2/d/binding.d` (lines 215-371)
   - Bison grammar: `M2/Macaulay2/c/grammar.y`
   - Symbol dictionary: `M2/Macaulay2/editors/vim/m2.vim.dict` (1763+ symbols)

**Current status**: Complete expression-oriented grammar with 28 precedence levels, 4.35% corpus error rate.

## Memories
- `memorize`
- Always use fish and jupyter lab
- I have added the book itself to the project, it is called M2-Jupyter-Kernel/EisenbudEtAlComputationAlgGeoMacaulay.pdf, you can use the text in there and the files we already found to make notebooks with text/formulas and M2 code intermixed
- I use fish, please have all shell instruction fish compatible
- to memorize
- Lets remember this todo list
- lets not use claude references in github comments, we will attribute properly in a different way, there are many more that need attribution
- Do not mention claude in commit messages, this will be attributed elsewhere
- M2 documentation can be searched on the web using a Google query with site specification https://www.google.com/search?q=parsing+precedence+site%3Amacaulay2.com%2Fdoc
- we can not allow _ as part of identifiers, it is not allowed, it is an operator
- Remember to always run a check on grammar grammar using the lezer grammar  before generating a parser for a grammar