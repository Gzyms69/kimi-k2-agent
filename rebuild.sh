#!/bin/bash

# ============================================================================
# Kimi K2 Extension Rebuild & Reload Script
# 
# Safely rebuilds TypeScript, bundles with esbuild, clears cache.
# DOES NOT auto-kill VS Code - user must manually restart to avoid data loss.
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

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
START_TIME=$(date +%s)

# Temp files for build logs
TMP_TSC_LOG="/tmp/kimi_tsc_output_$$.log"
TMP_ESBUILD_LOG="/tmp/kimi_esbuild_output_$$.log"

# Cleanup function
cleanup() {
  rm -f "$TMP_TSC_LOG" "$TMP_ESBUILD_LOG"
}
trap cleanup EXIT

# Helper functions
print_header() {
  echo ""
  echo -e "${BLUE}╔════════════════════════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${BLUE}║${NC}  ${CYAN}KIMI K2 EXTENSION REBUILD${NC}"
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

print_build() {
  echo -e "${CYAN}${BUILD}${NC} $1"
}

print_footer() {
  END_TIME=$(date +%s)
  DURATION=$((END_TIME - START_TIME))
  echo ""
  echo -e "${BLUE}╔════════════════════════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${GREEN}║${NC}  ${GREEN}BUILD COMPLETE ✓${NC}"
  echo -e "${BLUE}║${NC}  Total time: ${DURATION}s"
  echo -e "${BLUE}╚════════════════════════════════════════════════════════════════════════════════╝${NC}"
  echo ""
}

print_error_footer() {
  END_TIME=$(date +%s)
  DURATION=$((END_TIME - START_TIME))
  echo ""
  echo -e "${BLUE}╔════════════════════════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${RED}║${NC}  ${RED}BUILD FAILED ✗${NC}"
  echo -e "${BLUE}║${NC}  Time elapsed: ${DURATION}s"
  echo -e "${BLUE}╚════════════════════════════════════════════════════════════════════════════════╝${NC}"
  echo ""
}

print_next_steps() {
  echo -e "${BLUE}Next steps:${NC}"
  echo ""
  echo -e "  ${YELLOW}Option 1: Auto-reload in VS Code${NC}"
  echo "    Press ${CYAN}Ctrl+Shift+P${NC} → type ${CYAN}Developer: Reload Window${NC} → Enter"
  echo ""
  echo -e "  ${YELLOW}Option 2: Restart debugging${NC}"
  echo "    1. Press ${CYAN}Ctrl+Shift+D${NC} to open Debug view"
  echo "    2. Click the ${RED}stop button${NC} (⏹) to stop current debug session"
  echo "    3. Press ${CYAN}F5${NC} to start debugging again"
  echo ""
  echo -e "  ${YELLOW}Option 3: Full VS Code restart${NC}"
  echo "    Close and reopen VS Code (recommended if experiencing issues)"
  echo ""
}

print_safety_warning() {
  echo ""
  echo -e "${YELLOW}╔════════════════════════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${YELLOW}║${NC}  ${YELLOW}IMPORTANT SAFETY NOTES:${NC}"
  echo -e "${YELLOW}║${NC}"
  echo -e "${YELLOW}║${NC}  • This script does NOT auto-kill VS Code to prevent data loss"
  echo -e "${YELLOW}║${NC}  • Unsaved files in your editor will be preserved"
  echo -e "${YELLOW}║${NC}  • You must manually reload VS Code to see changes"
  echo -e "${YELLOW}║${NC}  • Use Developer: Reload Window or restart debugging (see below)"
  echo -e "${YELLOW}╚════════════════════════════════════════════════════════════════════════════════╝${NC}"
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

NODE_VERSION=$(node --version)
NPM_VERSION=$(npm --version)
print_success "Environment check passed"
print_info "Node.js: $NODE_VERSION | npm: $NPM_VERSION"

# ============================================================================
# Step 2: Verify project structure
# ============================================================================
print_step "Verifying project structure..."

if [ ! -f "$SCRIPT_DIR/package.json" ]; then
  print_error "package.json not found. Are you in the project root?"
  print_error_footer
  exit 1
fi

if [ ! -d "$SCRIPT_DIR/src" ]; then
  print_error "src/ directory not found"
  print_error_footer
  exit 1
fi

if [ ! -f "$SCRIPT_DIR/tsconfig.json" ]; then
  print_error "tsconfig.json not found"
  print_error_footer
  exit 1
fi

print_success "Project structure verified"

# ============================================================================
# Step 3: Check for unsaved changes warning
# ============================================================================
print_step "Checking for VS Code activity..."

# Check if VS Code processes are running
if pgrep -f "code" > /dev/null 2>&1; then
  print_warning "VS Code is running"
  print_info "Make sure to save any unsaved changes before reloading"
else
  print_info "VS Code not currently running"
fi

# ============================================================================
# Step 4: Clean previous builds
# ============================================================================
print_step "Cleaning previous builds..."

if [ -d "$SCRIPT_DIR/out" ]; then
  rm -rf "$SCRIPT_DIR/out"
  print_build "Removed out/ directory"
else
  print_info "No previous build found"
fi

# ============================================================================
# Step 5: TypeScript Compilation
# ============================================================================
print_step "Compiling TypeScript..."

if npm run compile > "$TMP_TSC_LOG" 2>&1; then
  print_success "TypeScript compilation succeeded"
else
  print_error "TypeScript compilation failed"
  echo ""
  echo -e "${RED}Compiler output:${NC}"
  cat "$TMP_TSC_LOG"
  print_error_footer
  exit 2
fi

# ============================================================================
# Step 6: Verify TypeScript output
# ============================================================================
if [ ! -d "$SCRIPT_DIR/out" ] || [ -z "$(find "$SCRIPT_DIR/out" -name '*.js' 2>/dev/null | head -1)" ]; then
  print_error "No JavaScript files generated after compilation"
  print_error_footer
  exit 4
fi

JS_FILE_COUNT=$(find "$SCRIPT_DIR/out" -name '*.js' | wc -l)
print_success "Generated $JS_FILE_COUNT JavaScript files"

# ============================================================================
# Step 7: Bundle with esbuild
# ============================================================================
print_step "Bundling with esbuild..."

if npm run package > "$TMP_ESBUILD_LOG" 2>&1; then
  print_success "esbuild bundling succeeded"
else
  print_error "esbuild bundling failed"
  echo ""
  echo -e "${RED}Bundler output:${NC}"
  cat "$TMP_ESBUILD_LOG"
  print_error_footer
  exit 3
fi

# ============================================================================
# Step 8: Verify bundle integrity
# ============================================================================
if [ ! -f "$SCRIPT_DIR/out/extension.js" ]; then
  print_error "Bundle file out/extension.js not found"
  print_error_footer
  exit 4
fi

BUNDLE_SIZE=$(du -h "$SCRIPT_DIR/out/extension.js" | cut -f1)
BUNDLE_BYTES=$(stat -f%z "$SCRIPT_DIR/out/extension.js" 2>/dev/null || stat -c%s "$SCRIPT_DIR/out/extension.js" 2>/dev/null)

if [ "$BUNDLE_BYTES" -lt 1024 ]; then
  print_error "Bundle size too small ($BUNDLE_SIZE) - bundling may have failed"
  print_error_footer
  exit 4
fi

print_success "Bundle created: out/extension.js ($BUNDLE_SIZE)"

# ============================================================================
# Step 9: Verify source maps (optional but recommended)
# ============================================================================
if [ -f "$SCRIPT_DIR/out/extension.js.map" ]; then
  print_success "Source map generated"
else
  print_warning "No source map found (optional)"
fi

# ============================================================================
# Step 10: Clear VS Code cache safely
# ============================================================================
print_step "Clearing VS Code extension cache..."

CACHE_DIR="$HOME/.vscode-server/extensions"
if [ -d "$CACHE_DIR" ]; then
  if rm -rf "$CACHE_DIR"/kimi-agent* 2>/dev/null; then
    print_success "Extension cache cleared"
  else
    print_warning "Could not clear cache (permissions issue - you may need to reload manually)"
  fi
else
  # Check for local VS Code cache
  LOCAL_CACHE="$HOME/.config/Code/CachedExtensionVSIXs"
  if [ -d "$LOCAL_CACHE" ]; then
    if rm -rf "$LOCAL_CACHE"/kimi-agent* 2>/dev/null; then
      print_success "Local extension cache cleared"
    else
      print_warning "Could not clear local cache"
    fi
  else
    print_info "Cache directory not found (may be using remote VS Code)"
  fi
fi

# ============================================================================
# Success!
# ============================================================================
print_footer
print_safety_warning
print_next_steps

echo -e "${GREEN}Ready for reload! Build artifacts are fresh and waiting.${NC}"
echo ""

exit 0
