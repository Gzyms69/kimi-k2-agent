#!/bin/bash

# ============================================================================
# Kimi K2 Extension - Global Installation Script
#
# Rebuilds, packages, and installs the extension globally to VS Code
# Safe, reversible, and fully automated
# ============================================================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Emoji markers
CHECK="✓"
CROSS="✗"
INFO="ℹ"
WARN="⚠"
BUILD="⚙"
PACKAGE="📦"

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
START_TIME=$(date +%s)

# Temp files for build logs
TMP_BUILD_LOG="/tmp/kimi_install_$$.log"

# Cleanup function
cleanup() {
  rm -f "$TMP_BUILD_LOG"
}
trap cleanup EXIT

# Helper functions
print_header() {
  echo ""
  echo -e "${BLUE}╔════════════════════════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${BLUE}║${NC}  ${CYAN}KIMI K2 EXTENSION - GLOBAL INSTALLATION${NC}"
  echo -e "${BLUE}║${NC}  Started: $(date '+%Y-%m-%d %H:%M:%S')"
  echo -e "${BLUE}╚════════════════════════════════════════════════════════════════════════════════╝${NC}"
  echo ""
}

print_success() {
  echo -e "${GREEN}${CHECK}${NC} $1"
}

print_error() {
  echo -e "${RED}${CROSS}${NC} $1"
}

print_warning() {
  echo -e "${YELLOW}${WARN}${NC} $1"
}

print_info() {
  echo -e "${BLUE}${INFO}${NC} $1"
}

print_step() {
  echo -e "${CYAN}→${NC} $1"
}

print_package() {
  echo -e "${CYAN}${PACKAGE}${NC} $1"
}

print_footer() {
  END_TIME=$(date +%s)
  DURATION=$((END_TIME - START_TIME))
  echo ""
  echo -e "${BLUE}╔════════════════════════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${GREEN}║${NC}  ${GREEN}INSTALLATION COMPLETE ✓${NC}"
  echo -e "${BLUE}║${NC}  Total time: ${DURATION}s"
  echo -e "${BLUE}╚════════════════════════════════════════════════════════════════════════════════╝${NC}"
  echo ""
}

print_error_footer() {
  END_TIME=$(date +%s)
  DURATION=$((END_TIME - START_TIME))
  echo ""
  echo -e "${BLUE}╔════════════════════════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${RED}║${NC}  ${RED}INSTALLATION FAILED ✗${NC}"
  echo -e "${BLUE}║${NC}  Time elapsed: ${DURATION}s"
  echo -e "${BLUE}╚════════════════════════════════════════════════════════════════════════════════╝${NC}"
  echo ""
}

print_next_steps() {
  echo -e "${BLUE}Next steps:${NC}"
  echo ""
  echo "  1. The extension is now installed in your main VS Code"
  echo "  2. Reload VS Code: ${CYAN}Ctrl+Shift+P${NC} → ${CYAN}Developer: Reload Window${NC}"
  echo "  3. Open Kimi Agent panel (check activity bar)"
  echo "  4. Test with your projects - Kimi can now interact with real files"
  echo ""
  echo -e "${BLUE}For future updates:${NC}"
  echo "  1. Make code changes"
  echo "  2. Run: ${CYAN}./install-global.sh${NC}"
  echo "  3. Reload VS Code"
  echo ""
}

print_uninstall_info() {
  echo -e "${YELLOW}To uninstall:${NC}"
  echo "  code --uninstall-extension kimi-agent.kimi-k2-agent"
  echo ""
}

# ============================================================================
# Step 1: Environment validation
# ============================================================================
print_header

print_step "Checking environment..."

if ! command -v node &> /dev/null; then
  print_error "Node.js not found. Please install Node.js"
  print_error_footer
  exit 1
fi

if ! command -v npm &> /dev/null; then
  print_error "npm not found. Please install npm"
  print_error_footer
  exit 1
fi

if ! command -v code &> /dev/null; then
  print_error "VS Code CLI not found. Make sure VS Code is installed and 'code' command is available"
  print_error_footer
  exit 1
fi

NODE_VERSION=$(node --version)
NPM_VERSION=$(npm --version)
print_success "Environment check passed"
print_info "Node.js: $NODE_VERSION | npm: $NPM_VERSION"

# ============================================================================
# Step 2: Verify project structure
# ============================================================================
print_step "Verifying project structure..."

if [ ! -f "$SCRIPT_DIR/package.json" ]; then
  print_error "package.json not found"
  print_error_footer
  exit 1
fi

if [ ! -d "$SCRIPT_DIR/src" ]; then
  print_error "src/ directory not found"
  print_error_footer
  exit 1
fi

print_success "Project structure verified"

# ============================================================================
# Step 3: Install dependencies if needed
# ============================================================================
print_step "Ensuring dependencies installed..."

if [ ! -d "$SCRIPT_DIR/node_modules" ]; then
  print_info "Installing npm dependencies..."
  npm install > "$TMP_BUILD_LOG" 2>&1 || {
    print_error "npm install failed"
    cat "$TMP_BUILD_LOG"
    print_error_footer
    exit 1
  }
  print_success "Dependencies installed"
else
  print_info "Dependencies already installed"
fi

# ============================================================================
# Step 4: Clean and rebuild
# ============================================================================
print_step "Rebuilding extension..."

if [ -d "$SCRIPT_DIR/out" ]; then
  rm -rf "$SCRIPT_DIR/out"
  print_package "Cleaned old build"
fi

if npm run compile > "$TMP_BUILD_LOG" 2>&1; then
  print_success "TypeScript compilation succeeded"
else
  print_error "TypeScript compilation failed"
  cat "$TMP_BUILD_LOG"
  print_error_footer
  exit 2
fi

if npm run package > "$TMP_BUILD_LOG" 2>&1; then
  print_success "Bundling succeeded"
else
  print_error "Bundling failed"
  cat "$TMP_BUILD_LOG"
  print_error_footer
  exit 2
fi

# ============================================================================
# Step 5: Package as VSIX
# ============================================================================
print_step "Packaging as VSIX..."

# Check if vsce is installed
if ! npm list @vscode/vsce > /dev/null 2>&1; then
  print_info "Installing @vscode/vsce..."
  npm install --save-dev @vscode/vsce > "$TMP_BUILD_LOG" 2>&1 || {
    print_error "Failed to install @vscode/vsce"
    cat "$TMP_BUILD_LOG"
    print_error_footer
    exit 1
  }
fi

# Create VSIX package
if npx vsce package --no-git-tag-version --allow-missing-repository --allow-star-activation > "$TMP_BUILD_LOG" 2>&1; then
  print_success "VSIX package created"
else
  print_error "VSIX packaging failed"
  cat "$TMP_BUILD_LOG"
  print_error_footer
  exit 3
fi

# Find the created VSIX file
VSIX_FILE=$(ls -t "$SCRIPT_DIR"/*.vsix 2>/dev/null | head -1)

if [ -z "$VSIX_FILE" ]; then
  print_error "VSIX file not found after packaging"
  print_error_footer
  exit 3
fi

VSIX_NAME=$(basename "$VSIX_FILE")
VSIX_SIZE=$(du -h "$VSIX_FILE" | cut -f1)
print_success "Package ready: $VSIX_NAME ($VSIX_SIZE)"

# ============================================================================
# Step 6: Uninstall previous version (if exists)
# ============================================================================
print_step "Checking for previous installation..."

if code --list-extensions 2>/dev/null | grep -q "kimi-agent.kimi-k2-agent"; then
  print_info "Previous version found, uninstalling..."
  if code --uninstall-extension kimi-agent.kimi-k2-agent > /dev/null 2>&1; then
    print_success "Previous version uninstalled"
  else
    print_warning "Could not uninstall previous version (it may be in use)"
  fi
else
  print_info "No previous installation found"
fi

# ============================================================================
# Step 7: Install globally
# ============================================================================
print_step "Installing extension globally..."

if code --install-extension "$VSIX_FILE" --force > "$TMP_BUILD_LOG" 2>&1; then
  print_success "Extension installed globally"
else
  print_error "Installation failed"
  cat "$TMP_BUILD_LOG"
  print_error_footer
  exit 4
fi

# Verify installation
sleep 1
if code --list-extensions 2>/dev/null | grep -q "kimi-agent.kimi-k2-agent"; then
  print_success "Installation verified"
else
  print_warning "Installation may not be complete (try reloading VS Code)"
fi

# ============================================================================
# Success!
# ============================================================================
print_footer
print_next_steps
print_uninstall_info

echo -e "${GREEN}✨ Ready to use! Your extension is now installed in VS Code.${NC}"
echo ""

exit 0
