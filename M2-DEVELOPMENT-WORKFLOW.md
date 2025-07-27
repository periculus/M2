# M2 Development Workflow Guide

This guide provides a complete development environment setup for Macaulay2 (M2) on ARM64 macOS, optimized for working across C, C++, and M2 code levels.

## Overview

The development environment includes:
- **VS Code Integration**: Complete IDE setup with tasks, debugging, and problem matchers
- **Development Scripts**: Command-line tools for fast builds and testing
- **Shell Integration**: Aliases and functions for streamlined workflow
- **Package Development**: Templates and tools for creating M2 packages

## Prerequisites

Ensure M2 is already built successfully on ARM64 macOS. If not, see `BUILD-ARM64-MACOS.md` first.

## VS Code Integration

### Quick Start
1. Open M2 project in VS Code: `code /path/to/M2`
2. Use **Cmd+Shift+P** → "Tasks: Run Task" to access M2 development tasks
3. Press **F5** to debug M2 binary

### Available Tasks

Access via **Cmd+Shift+P** → "Tasks: Run Task":

#### Build Tasks
- **M2: Configure Build** - Set up CMake build with ARM64 configuration
- **M2: Build Libraries** - Build external mathematical libraries
- **M2: Build Engine** - Build C++ computational engine only
- **M2: Build Interpreter** - Build interpreter (.d language) only  
- **M2: Build Binary** - Build complete M2 binary (default build)
- **M2: Full Build** - Build everything (marked as default build task)
- **M2: Clean Build** - Remove build directory

#### Test Tasks
- **M2: Test Basic** - Quick test with `2+2`
- **M2: Install Package** - Install M2 package (prompts for name)
- **M2: Check Package** - Test M2 package (prompts for name)
- **M2: Interactive Session** - Start M2 interactive session

### Debugging Configuration

Three debugging configurations available via **F5** or Debug panel:

1. **Debug M2** - Debug main M2 binary with simple test
2. **Debug M2 Engine** - Debug C++ engine component
3. **Debug M2 with Package** - Debug M2 with Normaliz package example

#### Setting Breakpoints
- Open C++ files in `M2/Macaulay2/e/`
- Click left margin to set breakpoints
- Press **F5** to start debugging
- Use Debug Console for GDB/LLDB commands

### IntelliSense & Code Navigation

VS Code is configured with:
- **C++ IntelliSense**: Full code completion for engine files
- **CMake Integration**: Automatic build configuration detection
- **Problem Matchers**: Real-time error detection during builds
- **Library Paths**: All ARM64-specific library locations configured

## Development Scripts

Three helper scripts in `dev-scripts/`:

### 1. `m2-dev.sh` - Comprehensive Development Helper

```bash
# Build components
./dev-scripts/m2-dev.sh build [engine|interpreter|binary|all]

# Test functionality  
./dev-scripts/m2-dev.sh test [basic|package NAME]

# Run M2 with commands
./dev-scripts/m2-dev.sh run "2+2"

# Start interactive session
./dev-scripts/m2-dev.sh interactive

# Package development
./dev-scripts/m2-dev.sh install PackageName
./dev-scripts/m2-dev.sh check PackageName

# Utilities
./dev-scripts/m2-dev.sh status  # Check build status
./dev-scripts/m2-dev.sh clean   # Clean build directory
```

### 2. `quick-rebuild.sh` - Fast Incremental Builds

```bash
# Quick rebuilds for development iteration
./dev-scripts/quick-rebuild.sh [engine|interpreter|binary|all]

# Examples:
./dev-scripts/quick-rebuild.sh engine      # Rebuild C++ engine only
./dev-scripts/quick-rebuild.sh interpreter # Rebuild .d interpreter only  
./dev-scripts/quick-rebuild.sh             # Rebuild binary (default)
```

### 3. `m2-aliases.sh` - Shell Integration

Source in your `~/.zshrc` or `~/.bashrc`:

```bash
source /path/to/M2/dev-scripts/m2-aliases.sh
```

Provides aliases and functions:
```bash
m2dev        # Navigate to M2 root directory
m2build      # Build M2 binary
m2engine     # Build engine only
m2interp     # Build interpreter only
m2test       # Run M2 binary
m2status     # Check build status

# Functions:
m2run "2+2"               # Run M2 with command
m2pkg PackageName         # Install and check package
m2quick [component]       # Quick rebuild with test
```

## Development Workflows

### 1. Engine Development (C++)

**Scenario**: Modifying computational algorithms in the C++ engine

```bash
# 1. Edit C++ files in M2/Macaulay2/e/
code M2/Macaulay2/e/your-file.cpp

# 2. Quick rebuild engine only
./dev-scripts/quick-rebuild.sh engine

# 3. Test changes
./dev-scripts/m2-dev.sh test basic

# 4. Debug if needed (VS Code)
# Set breakpoints in C++ code, press F5
```

**VS Code Method**:
1. Edit C++ files
2. **Cmd+Shift+P** → "Tasks: Run Task" → "M2: Build Engine"
3. **F5** to debug with breakpoints

### 2. Interpreter Development (.d language)

**Scenario**: Modifying interpreter logic written in M2's custom .d language

```bash
# 1. Edit .d files in M2/Macaulay2/d/
code M2/Macaulay2/d/your-file.d

# 2. Rebuild interpreter
./dev-scripts/quick-rebuild.sh interpreter

# 3. Test M2 functionality
./dev-scripts/m2-dev.sh interactive
```

### 3. Package Development (.m2 language)

**Scenario**: Creating or modifying M2 packages

```bash
# 1. Create package file (see ExamplePackage.m2 template)
code MyPackage.m2

# 2. Install and test package
./dev-scripts/m2-dev.sh install MyPackage
./dev-scripts/m2-dev.sh check MyPackage

# 3. Iterate on package code
# Edit MyPackage.m2, then repeat step 2
```

**VS Code Method**:
1. **Cmd+Shift+P** → "Tasks: Run Task" → "M2: Install Package"
2. Enter package name when prompted
3. **Cmd+Shift+P** → "Tasks: Run Task" → "M2: Check Package"

### 4. Mixed Development

**Scenario**: Feature requiring changes across C++, .d, and .m2 levels

```bash
# 1. Make C++ engine changes
code M2/Macaulay2/e/your-engine-file.cpp
./dev-scripts/quick-rebuild.sh engine

# 2. Update interpreter if needed
code M2/Macaulay2/d/your-interp-file.d  
./dev-scripts/quick-rebuild.sh interpreter

# 3. Create/update M2 package
code MyPackage.m2
./dev-scripts/m2-dev.sh install MyPackage

# 4. Full system test
./dev-scripts/quick-rebuild.sh binary
./dev-scripts/m2-dev.sh check MyPackage
```

## Package Development Template

Use `ExamplePackage.m2` as a starting template:

```m2
newPackage(
    "YourPackage",
    Version => "1.0",
    Date => "January 26, 2025", 
    Authors => {{Name => "Your Name", Email => "your@email.com"}},
    Headline => "Description of your package",
    DebuggingMode => true
)

export {"yourFunction", "YourType"}

-- Implementation
yourFunction = method()
yourFunction ZZ := (n) -> (
    -- Your code here
)

-- Documentation  
beginDocumentation()
doc ///
Key
  YourPackage
Headline
  Your package description
///

-- Tests
TEST ///
result = yourFunction 5
assert(result == expectedValue)
///

end
```

## Performance Tips

### Fast Development Iteration
1. **Use Component Builds**: Build only what changed (engine/interpreter/binary)
2. **Quick Scripts**: Use `quick-rebuild.sh` for fastest rebuilds
3. **VS Code Tasks**: Access builds via Cmd+Shift+P for GUI workflow
4. **Shell Aliases**: Source `m2-aliases.sh` for command-line efficiency

### Build Optimization
- Engine builds are fastest (C++ only)
- Interpreter builds include .d → C++ compilation
- Binary builds link everything together
- Full builds include libraries (rarely needed during development)

### Debugging Strategy
1. **Start Simple**: Use "M2: Test Basic" task first
2. **Isolate Components**: Test engine/interpreter separately if issues
3. **Use Breakpoints**: Set in C++ engine code for low-level debugging
4. **Package Testing**: Use dedicated install/check tasks for package development

## Troubleshooting

### Build Issues
```bash
# Check build status
./dev-scripts/m2-dev.sh status

# Clean and rebuild
./dev-scripts/m2-dev.sh clean
# Then reconfigure in VS Code: "M2: Configure Build"
```

### VS Code Issues
- **IntelliSense Problems**: Reload window (Cmd+Shift+P → "Developer: Reload Window")
- **Task Failures**: Check Terminal output for specific errors
- **Debugging Issues**: Ensure binary was built successfully first

### Package Issues
```bash
# Check if package loads
./dev-scripts/m2-dev.sh run "needsPackage \"YourPackage\""

# Reinstall package
./dev-scripts/m2-dev.sh install YourPackage
```

## Architecture Overview for Developers

Understanding M2's layered architecture helps with development:

```
M2 Frontend (.m2 files)     ← Package development
       ↓
Interpreter (.d files)      ← High-level logic, memory management  
       ↓
Engine (C++ files)          ← Mathematical computations
       ↓  
External Libraries          ← GMP, FLINT, Factory, etc.
```

**Development Flow**:
- **C++ Engine**: Core algorithms, performance-critical code
- **.d Interpreter**: Language features, type system, interface logic
- **.m2 Packages**: Mathematical abstractions, user-facing functionality

This workflow setup enables seamless development across all these levels with optimized build times and comprehensive debugging support.