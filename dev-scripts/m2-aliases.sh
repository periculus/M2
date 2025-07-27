# M2 Development Aliases and Functions
# Source this file in your ~/.zshrc or ~/.bashrc:
# source /path/to/M2/dev-scripts/m2-aliases.sh

# Set M2 development environment
export M2_DEV_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
export M2_BUILD_DIR="$M2_DEV_ROOT/BUILD/cmake"
export M2_BINARY="$M2_BUILD_DIR/usr-dist/arm64-Darwin-macOS-15.5/bin/M2"

# Core aliases
alias m2dev='cd "$M2_DEV_ROOT"'
alias m2build='arch -arm64 ninja -C "$M2_BUILD_DIR" M2-binary'
alias m2engine='arch -arm64 ninja -C "$M2_BUILD_DIR" M2-engine'
alias m2interp='arch -arm64 ninja -C "$M2_BUILD_DIR" M2-interpreter'
alias m2all='arch -arm64 ninja -C "$M2_BUILD_DIR"'
alias m2test='"$M2_BINARY"'
alias m2clean='rm -rf "$M2_BUILD_DIR"'

# Development functions
m2run() {
    if [ $# -eq 0 ]; then
        "$M2_BINARY"
    else
        "$M2_BINARY" -e "$*"
    fi
}

m2pkg() {
    if [ $# -ne 1 ]; then
        echo "Usage: m2pkg PACKAGE_NAME"
        return 1
    fi
    echo "Installing and checking package: $1"
    "$M2_BINARY" -e "installPackage \"$1\"; check \"$1\""
}

m2quick() {
    local component="${1:-binary}"
    echo "Quick building: $component"
    
    case "$component" in
        "engine"|"e")
            arch -arm64 ninja -C "$M2_BUILD_DIR" M2-engine
            ;;
        "interpreter"|"i") 
            arch -arm64 ninja -C "$M2_BUILD_DIR" M2-interpreter
            ;;
        "binary"|"b"|"")
            arch -arm64 ninja -C "$M2_BUILD_DIR" M2-binary
            ;;
        "all"|"a")
            arch -arm64 ninja -C "$M2_BUILD_DIR"
            ;;
        *)
            echo "Usage: m2quick [engine|interpreter|binary|all]"
            return 1
            ;;
    esac
    
    if [ $? -eq 0 ]; then
        echo "✓ Build successful!"
        # Quick test for binary builds
        if [[ "$component" == "binary" || "$component" == "b" || "$component" == "" || "$component" == "all" || "$component" == "a" ]]; then
            if "$M2_BINARY" -e "2+2" > /dev/null 2>&1; then
                echo "✓ M2 test passed!"
            else
                echo "✗ M2 test failed!"
                return 1
            fi
        fi
    else
        echo "✗ Build failed!"
        return 1
    fi
}

m2status() {
    echo "M2 Development Status:"
    echo "Root: $M2_DEV_ROOT"
    echo "Build: $M2_BUILD_DIR"
    
    if [ -d "$M2_BUILD_DIR" ]; then
        echo "✓ Build directory exists"
        if [ -f "$M2_BINARY" ]; then
            echo "✓ M2 binary exists"
            if "$M2_BINARY" -e "2+2" > /dev/null 2>&1; then
                echo "✓ M2 is working"
            else
                echo "✗ M2 test failed"
            fi
        else
            echo "✗ M2 binary not found"
        fi
    else
        echo "✗ Build directory not found"
    fi
}

# ARM64-specific environment setup
export PATH="/opt/homebrew/bin:/opt/homebrew/sbin:$PATH"
export CMAKE_PREFIX_PATH="/opt/homebrew/normaliz:/opt/homebrew/givaro:/opt/homebrew"

echo "M2 development environment loaded!"
echo "Use 'm2status' to check build status"
echo "Use 'm2quick' for fast rebuilds"
echo "Use 'm2dev' to navigate to M2 root"