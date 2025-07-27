#!/bin/bash
# Quick M2 rebuild script for development

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}M2 Quick Rebuild Script${NC}"

# Navigate to build directory
cd "$(dirname "$0")/../BUILD/cmake"

# Check what to rebuild based on arguments
case "${1:-binary}" in
    "engine")
        echo -e "${YELLOW}Building M2 Engine...${NC}"
        arch -arm64 ninja -j8 M2-engine
        ;;
    "interpreter") 
        echo -e "${YELLOW}Building M2 Interpreter...${NC}"
        arch -arm64 ninja -j8 M2-interpreter
        ;;
    "binary"|"")
        echo -e "${YELLOW}Building M2 Binary...${NC}"
        arch -arm64 ninja -j8 M2-binary
        ;;
    "all")
        echo -e "${YELLOW}Building All...${NC}"
        arch -arm64 ninja -j8
        ;;
    *)
        echo -e "${RED}Usage: $0 [engine|interpreter|binary|all]${NC}"
        exit 1
        ;;
esac

if [ $? -eq 0 ]; then
    echo -e "${GREEN}Build successful!${NC}"
    
    # Quick test if binary was built
    if [[ "${1:-binary}" == "binary" || "${1:-binary}" == "all" ]]; then
        echo -e "${YELLOW}Testing M2...${NC}"
        if ./usr-dist/arm64-Darwin-macOS-*/bin/M2 -e "2+2" > /dev/null 2>&1; then
            echo -e "${GREEN}M2 is working correctly!${NC}"
        else
            echo -e "${RED}M2 test failed!${NC}"
            exit 1
        fi
    fi
else
    echo -e "${RED}Build failed!${NC}"
    exit 1
fi