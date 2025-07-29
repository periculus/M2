# JupyterLab M2 Extension Plan

## Overview
Create a comprehensive CodeMirror 6 language support package for Macaulay2 that integrates with JupyterLab.

## Architecture

### 1. Core Language Package (@codemirror/lang-m2)
- **Parser**: Lezer grammar for M2 syntax
- **Tokens**: Complete token definitions from M2 vim dictionary
- **Highlighting**: Theme-aware syntax highlighting
- **Folding**: Code folding for blocks
- **Indentation**: Smart indentation rules

### 2. Language Server Features
- **Autocomplete**: Context-aware completions
- **Hover**: Documentation on hover
- **Diagnostics**: Syntax error detection
- **Go-to-definition**: Navigate to definitions

### 3. JupyterLab Extension
- **Extension wrapper**: JupyterLab plugin
- **Registration**: Register M2 language with JupyterLab
- **Integration**: Connect to kernel for dynamic features

## Implementation Steps

### Phase 1: Basic Syntax Highlighting
1. Create Lezer grammar for M2
2. Define token types and highlighting tags
3. Build basic language package
4. Test in standalone CodeMirror 6

### Phase 2: JupyterLab Integration
1. Create JupyterLab extension structure
2. Register M2 language support
3. Connect to kernel language_info
4. Package and install

### Phase 3: Advanced Features
1. Add autocomplete from kernel
2. Implement hover documentation
3. Add go-to-definition support
4. Smart indentation rules

## Technology Stack
- TypeScript
- CodeMirror 6
- Lezer parser generator
- JupyterLab extension API
- npm/yarn for package management
