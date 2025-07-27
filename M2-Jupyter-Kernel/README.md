# Macaulay2 Jupyter Kernel

A modern, robust Jupyter kernel for [Macaulay2](http://macaulay2.com/) with rich LaTeX output, intelligent timeout management, and comprehensive error handling.

## Features

✨ **Rich LaTeX Output**: Native integration with M2's `tex` and `texMath` functions  
⚡ **Intelligent Timeouts**: Configurable timeouts with magic commands  
🛠️ **Robust Error Handling**: Clear, formatted error messages and debugging support  
📦 **Package Management**: Seamless M2 package installation and loading  
🔍 **Tab Completion**: Context-aware code completion using M2's `apropos` function  
🎨 **Syntax Highlighting**: Full M2 syntax highlighting with Pygments  
🎯 **Modern Architecture**: Built on the latest Jupyter kernel protocol  

## Installation

### Prerequisites

- Python 3.8 or later
- Macaulay2 installed and accessible in PATH
- Jupyter Notebook or JupyterLab

### Install from Source

```bash
git clone https://github.com/Macaulay2/M2-Jupyter-Kernel.git
cd M2-Jupyter-Kernel
pip install -e .
install-m2-kernel --user
```

### Install from PyPI (coming soon)

```bash
pip install macaulay2-jupyter-kernel
install-m2-kernel --user
```

## Usage

### Starting a Notebook

```bash
jupyter notebook
# or
jupyter lab
```

Create a new notebook and select "Macaulay2" as the kernel.

### Magic Commands

- `%timeout=30` - Set execution timeout to 30 seconds
- `%debug on/off` - Enable/disable debug mode
- `%help` - Show kernel help

### Example Usage

```macaulay2
-- Define a polynomial ring
R = QQ[x,y,z]

-- Create an ideal
I = ideal(x^2 + y^2 - 1, x*y - z^2)

-- Compute a Gröbner basis
gb I

-- Get beautiful LaTeX output automatically
-- The kernel will display both text and rendered mathematics
```

## Advanced Features

### LaTeX Output

The kernel automatically renders mathematical objects using M2's built-in LaTeX capabilities:

- Matrices display as proper mathematical matrices
- Ideals show with mathematical notation
- Polynomials render with proper formatting
- Complex objects get both text and LaTeX representations

### Syntax Highlighting and Code Completion

The kernel provides rich code editing features:

- **Syntax Highlighting**: Full Macaulay2 syntax highlighting using Pygments
- **Tab Completion**: Press Tab to get context-aware completions based on M2's `apropos` function
- **Keywords**: All M2 keywords are recognized and highlighted
- **Built-in Functions**: Comprehensive support for M2's extensive function library

### Timeout Management

Set timeouts globally or per-execution:

```macaulay2
-- Set a 60-second timeout for long computations
%timeout=60

-- This computation will use the 60-second timeout
gb ideal(random(3,R), random(3,R), random(3,R))
```

### Package Development

The kernel seamlessly integrates with M2's package system:

```macaulay2
-- Install a package
installPackage "Graphs"

-- Load and use it
needsPackage "Graphs"
G = graph {{1,2},{2,3},{3,4},{4,1}}
```

## Development

### Running Tests

```bash
pytest tests/
```

### Code Formatting

```bash
black m2_kernel/
flake8 m2_kernel/
```

## Troubleshooting

### Common Issues

**Kernel not found**: Run `install-m2-kernel --user` to register the kernel.

**M2 not found**: Ensure Macaulay2 is installed and `M2` is in your PATH.

**Timeout errors**: Increase timeout with `%timeout=60` or adjust default in kernel settings.

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

This project is licensed under the GPL License - see [LICENSE](LICENSE) for details.

## Acknowledgments

- Built on the excellent [IPykernel](https://github.com/ipython/ipykernel) framework
- Inspired by [Macaulay2Web](https://github.com/pzinn/Macaulay2Web) and the original [Macaulay2-Jupyter-Kernel](https://github.com/rz-c/Macaulay2-Jupyter-Kernel)
- Thanks to the Macaulay2 development team for excellent LaTeX output support