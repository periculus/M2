# M2 Output System Analysis

## Overview

This document analyzes Macaulay2's output formatting system to understand how to implement proper dual output mode support for the Jupyter kernel, replacing the flawed regex-based LaTeX conversion approach.

## Problem Statement

The current Jupyter kernel implementation uses regex to convert M2's LaTeX output back to plain text when `%latex off` is enabled. This approach is:

- **Fragile**: Breaks on complex mathematical objects
- **Incomplete**: Cannot handle all M2 data types  
- **Unnecessary**: M2 already has native plain text formatting
- **Maintenance nightmare**: Every new construct needs new regex patterns

## M2 Output System Architecture

### Top Level Modes

M2 has three built-in output modes controlled by the `topLevelMode` variable:

1. **Standard** - Normal M2 text output (ASCII art matrices, plain text)
2. **WebApp** - Web application output with LaTeX/HTML formatting  
3. **TeXmacs** - TeXmacs frontend output

### Mode Selection

- **Command line**: `M2 --webapp` sets `topLevelMode = global WebApp`
- **Runtime**: `topLevelMode = global Standard` switches to text mode
- **Default**: Standard mode when no flags specified

### WebApp Mode Implementation

Located in `/M2/Macaulay2/m2/webapp.m2`, this file defines:

#### Control Characters (ASCII delimiters)
```m2
webAppTags := apply((17,18,19,20,28,29,30,14,21,(17,36),(36,18)),ascii);
```

- `webAppHtmlTag` (17) - Marks start of HTML content (`\x11`)
- `webAppEndTag` (18) - Marks end of HTML content (`\x12`)  
- `webAppPromptTag` (14) - Marks prompts like "o1" (`\x0e`)
- `webAppCellTag` (19) - Start of cell (`\x13`)
- `webAppPositionTag` (21) - Code position markers (`\x15`)

#### Print Method Override System
```m2
Thing#{WebApp,print} = x -> (
    y := html x; -- Generate HTML/LaTeX output
    << webAppHtmlTag | y | webAppEndTag << endl;
)

Thing#{WebApp,Print} = x -> (
    << endl << on() | " = ";
    printFunc x;
)
```

**Key insight**: WebApp mode calls `html x` to generate LaTeX/HTML, while Standard mode calls `net x` for ASCII text.

### Standard Mode Behavior

Standard mode produces the desired plain text output:

```
i1 : matrix{{1,2},{3,4}}

o1 = | 1 2 |
     | 3 4 |

              2       2
o1 : Matrix ZZ  <-- ZZ
```

### WebApp Mode Behavior  

WebApp mode produces delimited LaTeX/HTML:

```
17:0matrix{{1,2},{3,4}}

o1 = $\left(\!\begin{array}{cc}1&2\\3&4\end{array}\!\right)$

o1 : Matrix ${\mathbb Z}^{2}\,\longleftarrow \,{\mathbb Z}^{2}$
```

## Solution Strategies

### Option 1: Dynamic Mode Switching (RECOMMENDED)

**Approach**: Use M2's existing mode system to switch output format per command.

**Implementation**:
- When `%latex off`: Send `topLevelMode = global Standard` to M2
- When `%latex on`: Send `topLevelMode = global WebApp` to M2
- Parse output according to current mode

**Advantages**:
- Uses existing M2 infrastructure
- No M2 source code modifications needed
- Maintains compatibility
- Leverages M2's native text formatting

**Disadvantages**:
- Mode switching overhead for each command
- May need to track and restore M2 state

### Option 2: Temporary Method Override

**Approach**: Temporarily override WebApp print methods.

**Implementation**:
```m2
-- Save current methods
savedPrint = Thing#{WebApp,Print};
-- Override with Standard methods  
Thing#{WebApp,Print} = Thing#{Standard,Print};
-- Execute command
-- Restore methods
Thing#{WebApp,Print} = savedPrint;
```

**Advantages**:
- Stays in WebApp mode
- Fine-grained control

**Disadvantages**:
- Complex state management
- Risk of method corruption

### Option 3: Dual Output Generation

**Approach**: Modify WebApp methods to generate both formats.

**Implementation**: 
Override WebApp methods to call both `net x` and `html x`, then delimit both outputs with control characters.

**Advantages**:
- Both formats always available
- No mode switching

**Disadvantages**:
- Requires M2 source modifications
- Increased output size
- Complex parsing logic

### Option 4: New Hybrid Mode

**Approach**: Create `JupyterApp` mode that can switch per command.

**Implementation**:
Create new mode with configurable output format controlled by kernel commands.

**Advantages**:
- Purpose-built for Jupyter
- Clean separation of concerns

**Disadvantages**:
- Requires M2 source modifications
- Additional maintenance burden

## Implementation Plan: Dynamic Mode Switching

### Phase 1: Kernel Modifications

1. **Add mode tracking**: Track current M2 output mode in kernel state
2. **Implement mode switching**: 
   ```python
   def set_latex_mode(self, enabled):
       if enabled:
           self.m2_process.execute("topLevelMode = global WebApp")
       else:
           self.m2_process.execute("topLevelMode = global Standard")
       self.current_mode = "WebApp" if enabled else "Standard"
   ```

3. **Update magic handlers**:
   ```python
   def _handle_latex_magic(self, code):
       # ... existing logic ...
       self.set_latex_mode(self.enable_latex)
   ```

### Phase 2: Output Parsing

1. **Mode-aware parsing**: 
   - Standard mode: Parse plain text directly
   - WebApp mode: Parse delimited LaTeX/HTML (existing logic)

2. **Remove regex conversion**: Eliminate all LaTeX-to-text regex patterns

### Phase 3: State Management

1. **Mode consistency**: Ensure mode matches `enable_latex` flag
2. **Session continuity**: Handle mode switching without losing variables
3. **Error recovery**: Restore correct mode after errors

## Testing Strategy

### Unit Tests
- Mode switching functionality
- Output parsing for both modes  
- State consistency verification

### Integration Tests
- Matrix display in both modes
- GroebnerBasis output verification
- Complex mathematical objects
- Mode transitions during computation

### Regression Tests
- All existing kernel functionality
- Magic command behavior
- Error handling

## Migration Path

1. **Implement mode switching** (backward compatible)
2. **Add comprehensive tests** 
3. **Remove regex patterns** in follow-up release
4. **Document breaking changes** if any

## References

- **M2 Source Files**:
  - `/M2/Macaulay2/m2/webapp.m2` - WebApp mode implementation
  - `/M2/Macaulay2/m2/printing.m2` - Core printing system
  - `/M2/Macaulay2/m2/startup.m2.in` - Mode initialization
  - `/M2/Macaulay2/d/stdio.d` - I/O handling and webapp flag processing

- **Key M2 Variables**:
  - `topLevelMode` - Controls output formatting mode
  - `printWidth` - Text output width (set to 0 in WebApp mode)
  - Print method tables: `Thing#{Mode,Print}`, `Thing#{Mode,AfterPrint}`

- **Control Characters**:
  - `\x0e` (14) - webAppPromptTag  
  - `\x11` (17) - webAppHtmlTag
  - `\x12` (18) - webAppEndTag
  - `\x15` (21) - webAppPositionTag

## Conclusion

The dynamic mode switching approach leverages M2's existing dual-mode capability rather than attempting to reverse-engineer LaTeX. This provides a robust, maintainable solution that uses M2's native text formatting capabilities while preserving full LaTeX/HTML functionality when needed.