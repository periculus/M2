# Code Intelligence Implementation for M2 Jupyter Kernel

## Overview

We've successfully implemented comprehensive code intelligence features for the M2 Jupyter kernel, providing autocomplete, hover documentation, and enhanced syntax highlighting.

## Features Implemented

### 1. **Dynamic Language Data Loading** (`language_data.py`)
- Parses M2 vim dictionary containing 1763+ symbols
- Automatically categorizes symbols into:
  - Keywords (30): `if`, `then`, `else`, `while`, `for`, etc.
  - Types (802): `Ring`, `Ideal`, `Matrix`, `Module`, etc.
  - Functions (928): `gb`, `res`, `ideal`, `matrix`, etc.
  - Constants (3): `infinity`, `ii`, `pi`
- Provides structured access to M2 language elements

### 2. **Autocomplete/IntelliSense** (`code_intelligence.py`)
- Context-aware code completion
- Returns matches with metadata (type, signature, description)
- Supports:
  - Partial name matching
  - Context-based prioritization (types after `:`, functions after `=`)
  - Rich metadata for Jupyter Lab

### 3. **Hover Documentation** 
- Quick symbol information on hover (Shift+hover in Jupyter)
- Displays:
  - Symbol name and category
  - Function signatures (when available)
  - Documentation (when available)
- Falls back to M2 help system for detailed documentation

### 4. **Go-to-Definition**
- Navigate to where symbols are defined (Alt+Click in Jupyter Lab)
- Tracks definitions from executed code cells
- Supports:
  - Variable assignments
  - Function definitions
  - Method installations
  - Built-in M2 symbols
- Returns definition location with code snippet

### 4. **Enhanced Syntax Highlighting**
- Custom Pygments lexer (`m2_lexer.py`) with dynamic symbol data
- CodeMirror mode (`codemirror_mode.js`) for frontend highlighting
- Supports:
  - All M2 keywords, types, functions, constants
  - Comments (`--` and `-* *-`)
  - Strings (double-quoted and `///` strings)
  - Numbers (including complex and p-adic)
  - Operators (arithmetic, comparison, special M2 operators)

## Integration Points

### Kernel Integration
```python
# In kernel.__init__
self.code_intelligence = M2CodeIntelligence()

# Completion handler
def do_complete(self, code, cursor_pos):
    return self.code_intelligence.get_completions(code, cursor_pos)

# Inspection handler  
def do_inspect(self, code, cursor_pos, detail_level):
    return self.code_intelligence.get_inspection(code, cursor_pos, detail_level)
```

### Language Info Update
```python
language_info = {
    'name': 'macaulay2',
    'codemirror_mode': {
        'name': 'macaulay2',
        'version': 1
    },
    'pygments_lexer': 'macaulay2',  # Our custom lexer
    'file_extension': '.m2',
    'mimetype': 'text/x-macaulay2'
}
```

## Usage Examples

### Autocomplete
- Type `gb` and press Tab → Shows `gb`, `gbTrace`, `gbRemove`, etc.
- Type `Ide` and press Tab → Shows `Ideal`, `idealizer`, etc.
- Type `res` and press Tab → Shows `res`, `resolution`, `restart`, etc.

### Hover Help
- Hold Shift and hover over `ideal` → Shows "ideal (function)"
- Hold Shift and hover over `Ring` → Shows "Ring (type)"
- Hold Shift and hover over `gb` → Shows function information

### Syntax Highlighting
- Keywords highlighted in keyword color
- Types highlighted in type color  
- Functions highlighted in function color
- Comments, strings, numbers all properly colored

## Testing

Run the test suites:
```bash
# Basic code intelligence tests
python test_code_intelligence.py

# Go-to-definition tests
python test_goto_definition.py
```

This tests:
- Language data loading
- Completion functionality
- Hover documentation
- Go-to-definition support
- Syntax highlighting
- Kernel integration

## Go-to-Definition Support

### Implementation
Go-to-definition is now fully implemented with the following features:

1. **Definition Tracking**: The kernel tracks all symbol definitions as code is executed
   - Variable assignments (`R = QQ[x,y,z]`)
   - Function definitions (`f = x -> x^2` or `f = method(); f(ZZ) := n -> n^2`)
   - Method installations (`installMethod("name", ...)`)
   
   Note: The `f(x) := ...` syntax requires `f` to be predeclared as a method

2. **Built-in Symbol Support**: Built-in M2 symbols (functions, types, constants) are recognized

3. **Jupyter Integration**: Access via `detail_level=2` in inspection requests
   - In Jupyter Lab: Alt+Click or Ctrl+Alt+Click on a symbol
   - Returns location info with file, line number, and code snippet

### Usage

#### Option 1: Magic Command (Recommended)
Since Jupyter's go-to-definition requires frontend support that may not be available for custom kernels, use the `%def` magic command:

```m2
%def R        # Show where R was defined
%where ideal  # Show if 'ideal' is built-in or user-defined
```

You can use multiple `%def` commands in a single cell:
```m2
%def S
%def I
%def f
```

#### Option 2: Mouse Navigation (If Supported)
In some Jupyter Lab versions, you may be able to use:
- **Cmd+Click** (Mac) or **Ctrl+Click** (Windows/Linux) on a symbol
- **Right-click** → "Go to Definition"
- Access via inspection with `detail_level=2`

Note: Mouse navigation requires Jupyter frontend support which may not recognize notebook cell locations.

### Definition Info Includes
- File location (or `<notebook>` for cells, `<builtin>` for M2 symbols)
- Line number and column
- Cell ID (for notebook definitions)
- Original code snippet
- Symbol type (variable, function, method)

### Example
```m2
-- Cell 1
R = QQ[x,y,z]
I = ideal(x^2, y^2)

-- Cell 2
G = gb I  -- Alt+Click on 'I' jumps to Cell 1, line 2
```

## Future Enhancements

1. **Function signatures**: Extract signatures from M2 documentation
2. **Documentation extraction**: Parse M2 doc system for richer hover help
3. **Symbol renaming**: Refactor symbol names across code
4. **Code formatting**: Auto-format M2 code
5. **Cross-file navigation**: Support go-to-definition across multiple files

## Files Added/Modified

- `m2_kernel/language_data.py` - Language data parser and provider
- `m2_kernel/code_intelligence.py` - Code intelligence implementation
- `m2_kernel/m2_lexer.py` - Enhanced Pygments lexer (updated)
- `m2_kernel/codemirror_mode.js` - Frontend syntax highlighting
- `m2_kernel/kernel.py` - Integration of code intelligence
- `test_code_intelligence.py` - Comprehensive test suite

## Dependencies

- No additional dependencies required
- Falls back gracefully if M2 repository not found
- Works with standard Pygments installation