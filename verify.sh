#!/bin/bash

# Verification Script for Mickey Glitch Bot v5.0.0
# This script verifies that all upgrades are properly installed

echo "╔════════════════════════════════════════════════════════════╗"
echo "║     Mickey Glitch Bot v5.0.0 - Verification Script         ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Counters
passed=0
failed=0

# Function to check file exists
check_file() {
    if [ -f "$1" ]; then
        echo -e "${GREEN}✓${NC} Found: $1"
        ((passed++))
    else
        echo -e "${RED}✗${NC} Missing: $1"
        ((failed++))
    fi
}

# Function to check directory exists
check_dir() {
    if [ -d "$1" ]; then
        echo -e "${GREEN}✓${NC} Found: $1/"
        ((passed++))
    else
        echo -e "${RED}✗${NC} Missing: $1/"
        ((failed++))
    fi
}

echo -e "${BLUE}📁 Checking Directory Structure...${NC}"
echo ""

# Check main files
echo "Core Files:"
check_file "index.js"
check_file "config.js"
check_file "commandLoader.js"
check_file "package.json"
echo ""

# Check utility files
echo "Utility Modules:"
check_file "utils/logger.js"
check_file "utils/ratelimit.js"
check_file "utils/errors.js"
check_file "utils/validator.js"
check_file "utils/helpers.js"
check_file "utils/config.js"
echo ""

# Check command files
echo "Command Files:"
check_file "commands/alive.js"
check_file "commands/menu.js"
check_file "commands/gitclone.js"
check_file "commands/fb.js"
check_file "commands/tiktok.js"
check_file "commands/twitter.js"
check_file "commands/ig.js"
check_file "commands/snack.js"
check_file "commands/update.js"
echo ""

# Check configuration files
echo "Configuration Files:"
check_file "config.js"
check_file ".env.example"
echo ""

# Check documentation files
echo -e "${BLUE}📚 Checking Documentation...${NC}"
echo ""
check_file "DOCUMENTATION_INDEX.md"
check_file "QUICKSTART_v5.md"
check_file "UPGRADE_v5.md"
check_file "BEST_PRACTICES.md"
check_file "UPGRADE_SUMMARY.md"
check_file "UPGRADE_COMPLETE.md"
echo ""

# Check directories
echo -e "${BLUE}📂 Checking Directories...${NC}"
echo ""
check_dir "utils"
check_dir "commands"
check_dir "node_modules"
echo ""

# Check dependencies
echo -e "${BLUE}📦 Checking Dependencies...${NC}"
echo ""

if command -v npm &> /dev/null; then
    echo -e "${GREEN}✓${NC} npm is installed"
    ((passed++))
else
    echo -e "${RED}✗${NC} npm is not installed"
    ((failed++))
fi

if command -v node &> /dev/null; then
    NODE_VERSION=$(node -v)
    echo -e "${GREEN}✓${NC} Node.js is installed: $NODE_VERSION"
    ((passed++))
else
    echo -e "${RED}✗${NC} Node.js is not installed"
    ((failed++))
fi

# Check package.json has required dependencies
echo ""
if grep -q "telegraf" package.json; then
    echo -e "${GREEN}✓${NC} telegraf dependency found"
    ((passed++))
else
    echo -e "${RED}✗${NC} telegraf dependency missing"
    ((failed++))
fi

if grep -q "@whiskeysockets/baileys" package.json; then
    echo -e "${GREEN}✓${NC} baileys dependency found"
    ((passed++))
else
    echo -e "${RED}✗${NC} baileys dependency missing"
    ((failed++))
fi

echo ""

# Summary
echo "╔════════════════════════════════════════════════════════════╗"
echo ""
echo -e "Results: ${GREEN}$passed passed${NC}, ${RED}$failed failed${NC}"
echo ""

if [ $failed -eq 0 ]; then
    echo -e "${GREEN}✓ All checks passed! Bot v5.0.0 is ready.${NC}"
    echo ""
    echo "Next steps:"
    echo "1. cp .env.example .env"
    echo "2. Edit .env with your configuration"
    echo "3. npm install"
    echo "4. npm start"
else
    echo -e "${RED}✗ Some checks failed. Please fix before running bot.${NC}"
    echo ""
    echo "Issues found:"
    if [ ! -f ".env" ]; then
        echo "  - .env file not found (copy from .env.example)"
    fi
    if [ ! -d "node_modules" ]; then
        echo "  - Dependencies not installed (run: npm install)"
    fi
fi

echo ""
echo "╚════════════════════════════════════════════════════════════╝"

exit $failed
