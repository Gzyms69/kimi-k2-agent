#!/bin/bash

# ============================================================================
# Kimi K2 Development Command
# Streamlined single-command workflow: compile → bundle → package → install
# ============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
START_TIME=$(date +%s)

# Parse flags
NO_BUILD=false
NO_INSTALL=false
NO_RELOAD_INFO=false

while [[ $# -gt 0 ]]; do
  case $1 in
    --no-build) NO_BUILD=true; shift ;;
    --no-install) NO_INSTALL=true; shift ;;
    --no-reload-info) NO_RELOAD_INFO=true; shift ;;
    --help) 
      echo "Usage: ./dev.sh [options]"
      echo ""
      echo "Options:"
      echo "  --no-build       Skip build step (just install existing VSIX)"
      echo "  --no-install     Build only, don't install"
      echo "  --no-reload-info Skip reload instructions"
      echo "  --help           Show this help message"
      exit 0
      ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
done

# Helper functions
print_header() {
  echo ""
  echo -e "${BLUE}╔════════════════════════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${BLUE}║${NC}  ${CYAN}KIMI K2 DEVELOPMENT${NC}"
  echo -e "${BLUE}║${NC}  Started: $(date '+%Y-%m-%d %H:%M:%S')"
  echo -e "${BLUE}╚════════════════════════════════════════════════════════════════════════════════╝${NC}"
  echo ""
}

print_success() {
  echo -e "${GREEN}✓${NC} $1"
}

print_error() {
  echo -e "${RED}✗${NC} $1"
}

print_warning() {
  echo -e "${YELLOW}⚠${NC} $1"
}

print_info() {
  echo -e "${BLUE}ℹ${NC} $1"
}

print_step() {
  echo -e "${CYAN}→${NC} $1"
}

print_footer() {
  END_TIME=$(date +%s)
  DURATION=$((END_TIME - START_TIME))
  echo ""
  echo -e "${BLUE}╔════════════════════════════════════════════════════════════════════════════════╗${NC}"
  if [ $? -eq 0 ]; then
    echo -e "${GREEN}║${NC}  ${GREEN}COMPLETE ✓${NC}"
  else
    echo -e "${RED}║${NC}  ${RED}FAILED ✗${NC}"
  fi
  echo -e "${BLUE}║${NC}  Time: ${DURATION}s"
  echo -e "${BLUE}╚════════════════════════════════════════════════════════════════════════════════╝${NC}"
  echo ""
}

print_reload_info() {
  if [ "$NO_RELOAD_INFO" = false ]; then
    echo -e "${YELLOW}Next: Reload VS Code${NC}"
    echo -e "  Ctrl+Shift+P → ${CYAN}Developer: Reload Window${NC} → Enter"
    echo ""
  fi
}

# Temp file for logs
TMP_LOG="/tmp/kimi_dev_$$.log"
cleanup() {
  rm -f "$TMP_LOG"
}
trap cleanup EXIT

# ============================================================================
# Validation
# ============================================================================
print_header

print_step "Validating environment..."

if ! command -v node &> /dev/null; then
  print_error "Node.js not found"
  print_footer
  exit 1
fi

if ! command -v npm &> /dev/null; then
  print_error "npm not found"
  print_footer
  exit 1
fi

if [ ! -f "$SCRIPT_DIR/package.json" ]; then
  print_error "package.json not found"
  print_footer
  exit 1
fi

if [ ! -d "$SCRIPT_DIR/src" ]; then
  print_error "src/ directory not found"
  print_footer
  exit 1
fi

print_success "Environment validated"

# ============================================================================
# Build (if not skipped)
# ============================================================================
if [ "$NO_BUILD" = false ]; then
  print_step "Building..."
  
  # Clean
  if [ -d "$SCRIPT_DIR/out" ]; then
    rm -rf "$SCRIPT_DIR/out"
  fi
  
  # Compile
  if ! npm run compile > "$TMP_LOG" 2>&1; then
    print_error "TypeScript compilation failed"
    cat "$TMP_LOG"
    print_footer
    exit 2
  fi
  print_success "Compiled TypeScript"
  
  # Bundle
  if ! npm run package > "$TMP_LOG" 2>&1; then
    print_error "Bundling failed"
    cat "$TMP_LOG"
    print_footer
    exit 2
  fi
  
  BUNDLE_SIZE=$(du -h "$SCRIPT_DIR/out/extension.js" 2>/dev/null | cut -f1)
  print_success "Bundled extension ($BUNDLE_SIZE)"
  
  # Package VSIX
  if ! npm run vsce:package --no-git-tag-version --allow-missing-repository --allow-star-activation > "$TMP_LOG" 2>&1; then
    print_error "VSIX packaging failed"
    cat "$TMP_LOG"
    print_footer
    exit 3
  fi
  
  VSIX_FILE=$(ls -t "$SCRIPT_DIR"/*.vsix 2>/dev/null | head -1)
  if [ -z "$VSIX_FILE" ]; then
    print_error "VSIX file not found"
    print_footer
    exit 3
  fi
  
  VSIX_NAME=$(basename "$VSIX_FILE")
  VSIX_SIZE=$(du -h "$VSIX_FILE" | cut -f1)
  print_success "Packaged VSIX ($VSIX_SIZE)"
else
  # Find existing VSIX
  VSIX_FILE=$(ls -t "$SCRIPT_DIR"/*.vsix 2>/dev/null | head -1)
  if [ -z "$VSIX_FILE" ]; then
    print_error "No VSIX file found (run without --no-build first)"
    print_footer
    exit 3
  fi
  print_info "Using existing VSIX: $(basename "$VSIX_FILE")"
fi

# ============================================================================
# Install (if not skipped)
# ============================================================================
if [ "$NO_INSTALL" = false ]; then
  print_step "Installing globally..."
  
  # Uninstall old version
  if code --list-extensions 2>/dev/null | grep -q "kimi-agent.kimi-k2-agent"; then
    if code --uninstall-extension kimi-agent.kimi-k2-agent > /dev/null 2>&1; then
      print_info "Removed previous version"
    fi
  fi
  
  # Install
  if ! code --install-extension "$VSIX_FILE" --force > "$TMP_LOG" 2>&1; then
    print_error "Installation failed"
    cat "$TMP_LOG"
    print_footer
    exit 4
  fi
  
  print_success "Extension installed"
  
  # Clear cache
  CACHE_DIR="$HOME/.vscode-server/extensions"
  if [ -d "$CACHE_DIR" ]; then
    rm -rf "$CACHE_DIR"/kimi-agent* 2>/dev/null || true
    print_info "Cache cleared"
  fi
fi

# ============================================================================
# Complete
# ============================================================================
print_footer
print_reload_info

if [ "$NO_BUILD" = false ] && [ "$NO_INSTALL" = false ]; then
  echo -e "${GREEN}Ready for development! 🚀${NC}"
elif [ "$NO_INSTALL" = true ]; then
  echo -e "${GREEN}Build complete. Run './dev.sh' to install.${NC}"
else
  echo -e "${GREEN}Installation complete. Reload VS Code.${NC}"
fi
echo ""

exit 0
