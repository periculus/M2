#!/bin/bash
# M2 Development Helper Script

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

M2_ROOT="$(dirname "$0")/.."
M2_BUILD="$M2_ROOT/BUILD/cmake"
M2_BINARY="$M2_BUILD/usr-dist/arm64-Darwin-macOS-*/bin/M2"

print_usage() {
    echo -e "${BLUE}M2 Development Helper${NC}"
    echo "Usage: $0 [command] [options]"
    echo ""
    echo "Commands:"
    echo "  build [engine|interpreter|binary|all]  - Build M2 components"
    echo "  test [basic|package NAME]               - Test M2 functionality"
    echo "  run [COMMAND]                          - Run M2 with command"
    echo "  interactive                            - Start interactive M2 session"
    echo "  install PACKAGE                        - Install M2 package"
    echo "  check PACKAGE                          - Check M2 package"
    echo "  clean                                  - Clean build directory"
    echo "  status                                 - Show build status"
}

build_component() {
    echo -e "${YELLOW}Building ${1}...${NC}"
    cd "$M2_BUILD"
    
    case "$1" in
        "engine")
            arch -arm64 ninja -j8 M2-engine
            ;;
        "interpreter")
            arch -arm64 ninja -j8 M2-interpreter
            ;;
        "binary")
            arch -arm64 ninja -j8 M2-binary
            ;;
        "all")
            arch -arm64 ninja -j8
            ;;
        *)
            echo -e "${RED}Unknown build target: $1${NC}"
            return 1
            ;;
    esac
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}Build successful!${NC}"
    else
        echo -e "${RED}Build failed!${NC}"
        return 1
    fi
}

test_m2() {
    case "$1" in
        "basic"|"")
            echo -e "${YELLOW}Testing basic M2 functionality...${NC}"
            $M2_BINARY -e "2+2"
            ;;
        "package")
            if [ -z "$2" ]; then
                echo -e "${RED}Please specify package name${NC}"
                return 1
            fi
            echo -e "${YELLOW}Testing package $2...${NC}"
            $M2_BINARY -e "needsPackage \"$2\""
            ;;
        *)
            echo -e "${RED}Unknown test type: $1${NC}"
            return 1
            ;;
    esac
}

case "${1:-help}" in
    "build")
        build_component "${2:-binary}"
        ;;
    "test")
        test_m2 "$2" "$3"
        ;;
    "run")
        shift
        echo -e "${YELLOW}Running M2 with: $@${NC}"
        $M2_BINARY "$@"
        ;;
    "interactive")
        echo -e "${YELLOW}Starting M2 interactive session...${NC}"
        $M2_BINARY
        ;;
    "install")
        if [ -z "$2" ]; then
            echo -e "${RED}Please specify package name${NC}"
            exit 1
        fi
        echo -e "${YELLOW}Installing package $2...${NC}"
        $M2_BINARY -e "installPackage \"$2\""
        ;;
    "check")
        if [ -z "$2" ]; then
            echo -e "${RED}Please specify package name${NC}"
            exit 1
        fi
        echo -e "${YELLOW}Checking package $2...${NC}"
        $M2_BINARY -e "check \"$2\""
        ;;
    "clean")
        echo -e "${YELLOW}Cleaning build directory...${NC}"
        rm -rf "$M2_BUILD"
        echo -e "${GREEN}Build directory cleaned!${NC}"
        ;;
    "status")
        echo -e "${BLUE}M2 Build Status${NC}"
        echo "Build directory: $M2_BUILD"
        if [ -d "$M2_BUILD" ]; then
            echo -e "${GREEN}✓ Build directory exists${NC}"
            if [ -f "$M2_BUILD/usr-dist/arm64-Darwin-macOS-"*/bin/M2 ]; then
                echo -e "${GREEN}✓ M2 binary exists${NC}"
                # Test if it works
                if $M2_BINARY -e "2+2" > /dev/null 2>&1; then
                    echo -e "${GREEN}✓ M2 is working${NC}"
                else
                    echo -e "${RED}✗ M2 test failed${NC}"
                fi
            else
                echo -e "${RED}✗ M2 binary not found${NC}"
            fi
        else
            echo -e "${RED}✗ Build directory not found${NC}"
        fi
        ;;
    "help"|*)
        print_usage
        ;;
esac