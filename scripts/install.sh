#!/bin/bash
# ============================================================================
# OpenCode Studio - Installation Script
# ============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}"
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║                                                           ║"
echo "║   OpenCode Studio - Installation Script                   ║"
echo "║                                                           ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Check Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}Error: Node.js is not installed.${NC}"
    echo "Please install Node.js 20+ from https://nodejs.org/"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 20 ]; then
    echo -e "${RED}Error: Node.js 20+ is required.${NC}"
    echo "Current version: $(node -v)"
    echo "Please update Node.js from https://nodejs.org/"
    exit 1
fi

echo -e "${GREEN}✓${NC} Node.js $(node -v) detected"

# Check pnpm
if ! command -v pnpm &> /dev/null; then
    echo -e "${YELLOW}Installing pnpm...${NC}"
    npm install -g pnpm
fi

echo -e "${GREEN}✓${NC} pnpm $(pnpm -v) detected"

# Clone or use existing repository
if [ ! -d "opencode-studio" ]; then
    echo -e "${YELLOW}Cloning OpenCode Studio...${NC}"
    git clone https://github.com/opencode-studio/opencode-studio.git
fi

cd opencode-studio

# Install dependencies
echo -e "${YELLOW}Installing dependencies...${NC}"
pnpm install --frozen-lockfile

# Build all packages
echo -e "${YELLOW}Building packages...${NC}"
pnpm build

# Create symlink for CLI
echo -e "${YELLOW}Setting up CLI...${NC}"
npm link packages/cli

echo -e "${GREEN}"
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║                                                           ║"
echo "║   Installation Complete!                                  ║"
echo "║                                                           ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo -e "${NC}"

echo -e "${GREEN}Next steps:${NC}"
echo "1. Set your API key:"
echo "   ${YELLOW}export OPENROUTER_API_KEY=sk-or-...${NC}"
echo ""
echo "2. Start an interactive session:"
echo "   ${YELLOW}opencode interactive${NC}"
echo ""
echo "3. Or ask a single question:"
echo "   ${YELLOW}opencode chat \"Fix the login bug\"${NC}"
echo ""
echo "For more help, run: ${YELLOW}opencode --help${NC}"
