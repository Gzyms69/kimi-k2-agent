#!/usr/bin/env bash

# ============================================================================
# Quick Reference Card for Kimi K2 Extension Development
# Place this file in your project root as quick-ref.sh (informational only)
# ============================================================================

# Your Development Workflow:
# ==========================

# 1. Make changes to src/ files
# 2. Run the rebuild script:
./rebuild.sh

# 3. Reload VS Code - CHOOSE ONE:

# OPTION A: Fast reload (recommended)
# Press: Ctrl+Shift+P
# Type: Developer: Reload Window
# Press: Enter

# OPTION B: Restart debugging
# Press: Ctrl+Shift+D (to open Debug view)
# Click: Stop button (⏹) to stop debugging
# Press: F5 to restart debugging

# OPTION C: Full restart
# Close VS Code and reopen it


# Common Commands:
# ===============

# Rebuild only (compile + bundle)
./rebuild.sh

# TypeScript compilation only (no bundling)
npm run compile

# Bundle only (assumes TypeScript already compiled)
npm run package

# Watch for changes (continuous compilation)
npm run watch

# Clean build artifacts
rm -rf out/

# Check for TypeScript errors
npm run compile

# Lint TypeScript
npm run lint


# File Locations:
# ===============

# Source code:              src/
# Compiled output:          out/
# Bundled extension:        out/extension.js
# TypeScript config:        tsconfig.json
# VS Code extension config: .vscode/
# This guide:               REBUILD_GUIDE.md


# Project Structure:
# ==================

# src/
#   ├── extension.ts          (Entry point)
#   ├── core/
#   │   ├── agent.ts          (Main AI agent)
#   │   ├── kimi-client.ts     (API client)
#   │   └── logger.ts          (Logging)
#   ├── tools/
#   │   ├── tool-executor.ts   (Tool execution)
#   │   ├── file-manager.ts    (File operations)
#   │   └── terminal-manager.ts (Terminal/commands)
#   ├── ui/
#   │   └── chat-view.ts       (Webview UI)
#   └── types/
#       └── index.ts           (Type definitions)


# Key NPM Scripts:
# ================

# npm run watch          - Continuous TypeScript compilation
# npm run compile        - One-time TypeScript compilation
# npm run package        - Bundle with esbuild (minification)
# npm run package:watch  - Bundle in watch mode
# npm run lint           - Run ESLint
# npm run vscode:prepublish - Full production build


# Debug Tips:
# ===========

# 1. Check compilation errors:
npm run compile

# 2. See full esbuild output:
npm run package

# 3. Debug webpack/bundler issues:
npm run package -- --trace

# 4. Check if extension loads:
# - Look at VS Code Extension Output tab
# - Press Ctrl+Shift+U to toggle Output
# - Select "Kimi Agent" channel

# 5. Full debug log:
# - Go to Help → Toggle Developer Tools
# - Check Console tab for errors


# Extension Won't Load?
# ====================

# 1. Run:   ./rebuild.sh
# 2. Reload: Ctrl+Shift+P → Developer: Reload Window
# 3. Check:  Ctrl+Shift+U → Kimi Agent output
# 4. If still broken:
#    - Stop debugging (Ctrl+Shift+D → stop)
#    - Close VS Code
#    - Reopen VS Code
#    - Press F5


# Performance Tips:
# =================

# - Keep npm watch running in background for fast compilation
# - Use ./rebuild.sh before major changes
# - Don't edit out/ directory directly
# - Use source maps (included in build) for debugging


# Safety Reminders:
# =================

# ✅ Save unsaved files before reloading
# ✅ Run rebuild.sh before every reload
# ✅ Let build complete (don't interrupt)
# ✅ Use one reload method at a time

# ❌ Don't edit out/ directory
# ❌ Don't run multiple rebuilds simultaneously
# ❌ Don't force-close builds
# ❌ Don't assume changes applied without reload


echo "Kimi K2 Extension - Quick Reference"
echo "Read the inline comments above for detailed info"
echo ""
echo "TL;DR:"
echo "  1. Make changes"
echo "  2. Run: ./rebuild.sh"
echo "  3. Reload: Ctrl+Shift+P → Developer: Reload Window"
