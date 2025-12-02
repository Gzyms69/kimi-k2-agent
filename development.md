# Kimi K2 Agent - Development Guide

Complete guide for developing the Kimi K2 VS Code extension.

## Quick Start

Your development workflow is simple:

```bash
# 1. Make code changes in src/
# 2. Run the dev script
./dev.sh

# 3. Reload VS Code
# Ctrl+Shift+P → Developer: Reload Window → Enter

# 4. Test in main VS Code window
# 5. Repeat from step 1
```

That's it. The entire cycle takes ~10 seconds.

## The `./dev.sh` Command

Single command that handles everything: compile → bundle → package → install

### Standard Usage
```bash
./dev.sh
```
Compiles, bundles, packages as VSIX, and installs globally to VS Code.

### With Flags
```bash
./dev.sh --no-build      # Use existing VSIX, just reinstall
./dev.sh --no-install    # Build only, don't install yet
./dev.sh --no-reload-info # Suppress reload instructions
./dev.sh --help          # Show all options
```

### Example Workflows

**Rapid iteration (you have the build already):**
```bash
# Edit code
# ...
./dev.sh --no-build      # Fast reinstall (~3s)
# Reload VS Code
```

**Build first, test later:**
```bash
./dev.sh --no-install    # Just build (~2s)
# Then when ready:
./dev.sh --no-build      # Just install
```

## Development Workflow Details

### Project Structure

```
src/
├── extension.ts        # VS Code extension entry point
├── core/
│   ├── agent.ts        # Task orchestration & AI integration
│   ├── kimi-client.ts   # OpenRouter API client
│   └── logger.ts       # Logging utility
├── tools/
│   ├── file-manager.ts      # File operations
│   ├── terminal-manager.ts   # Terminal execution
│   └── tool-executor.ts     # Tool dispatcher
├── ui/
│   └── chat-view.ts    # Webview chat UI
└── types/
    └── index.ts        # TypeScript type definitions

out/                # Build output (auto-generated, don't edit)
```

### Making Changes

**TypeScript Source Code:**
- Edit files in `src/`
- Changes are automatically picked up by `./dev.sh`
- All TypeScript is compiled to JavaScript in `out/`

**Configuration:**
- VS Code settings: `.vscode/settings.json`
- Debug config: `.vscode/launch.json`
- TypeScript config: `tsconfig.json`
- Extension manifest: `package.json`

### Testing Your Changes

1. **Make code changes** in `src/`
2. **Run `./dev.sh`** to compile, bundle, and install
3. **Reload VS Code**: `Ctrl+Shift+P` → "Developer: Reload Window"
4. **Test** in the extension's chat interface
5. **Check logs**: `Ctrl+Shift+P` → "Output" → "Kimi"

## Available Commands

### Development Scripts

```bash
./dev.sh                    # Full workflow: build + package + install
./dev.sh --no-build         # Fast reinstall with existing build
./dev.sh --no-install       # Build only, skip installation
```

### npm Scripts

```bash
npm run compile             # TypeScript → JavaScript
npm run watch               # Watch & auto-compile on changes
npm run package             # Bundle with esbuild
npm run lint                # Run ESLint checks
npm run lint -- --fix       # Auto-fix lint issues
npm test                    # Run tests
```

### Manual Installation

```bash
# If you prefer step-by-step control:
npm run compile             # Step 1: Compile TS
npm run package             # Step 2: Bundle JS
npm run vsce:package        # Step 3: Create VSIX
npm run vsce:install        # Step 4: Install to VS Code
```

## Configuration

Set in VS Code settings (Preferences or `.vscode/settings.json`):

```json
{
  "kimi-agent.apiKey": "your-openrouter-key",
  "kimi-agent.model": "moonshotai/kimi-k2:free",
  "kimi-agent.apiEndpoint": "https://openrouter.ai/api/v1",
  "kimi-agent.autoApprove": false,
  "kimi-agent.maxRetries": 3
}
```

**Get API Key:** https://openrouter.ai

### Configuration Options

| Option | Default | Description |
|--------|---------|-------------|
| `apiKey` | (empty) | Your OpenRouter API key |
| `model` | `moonshotai/kimi-k2:free` | AI model to use |
| `apiEndpoint` | `https://openrouter.ai/api/v1` | API endpoint URL |
| `autoApprove` | `false` | Auto-approve file operations |
| `maxRetries` | `3` | Max API retry attempts |

## Architecture Overview

### Extension Activation
1. VS Code loads `out/extension.js`
2. `extension.ts` initializes the extension
3. UI webview is registered
4. Commands are registered
5. Extension ready for interaction

### Task Execution Flow
1. User types task in chat UI
2. Task sent to Agent class
3. Agent calls Kimi K2 model via OpenRouter API
4. Model responds with tool calls
5. Tools execute (file ops, terminal commands)
6. Results sent back to model
7. Model formats response for UI
8. Response displayed to user

### Key Classes

**Agent** (`src/core/agent.ts`)
- Orchestrates task execution
- Manages tool calling loop
- Handles error recovery

**KimiClient** (`src/core/kimi-client.ts`)
- Communicates with OpenRouter API
- Manages API credentials
- Handles retries

**FileManager** (`src/tools/file-manager.ts`)
- Read/write files
- Create/delete directories
- List directory contents

**TerminalManager** (`src/tools/terminal-manager.ts`)
- Execute shell commands
- Capture output
- Handle timeouts

**ChatView** (`src/ui/chat-view.ts`)
- Webview UI component
- User interaction handling
- Message rendering

## Troubleshooting

### Extension doesn't appear after reload

```bash
# 1. Check it's installed
code --list-extensions | grep kimi

# 2. Reload VS Code (try again)
# Ctrl+Shift+P → Developer: Reload Window

# 3. Restart VS Code completely if reload didn't work
```

### Build fails with TypeScript errors

```bash
# Check for syntax errors
npm run compile

# Fix the error in src/ and try again
./dev.sh
```

### Extension works but shows old code

```bash
# Try a more thorough reload
# Ctrl+Shift+P → Developer: Reload Window (twice)

# Or restart VS Code completely
```

### "code command not found"

Make sure VS Code CLI is installed:
- macOS: `code --version` should work
- Linux: Add VS Code to PATH
- Windows: Ensure VS Code CLI is available

### View extension logs

```bash
# In VS Code:
Ctrl+Shift+P → Output → Select "Kimi" channel
```

### Clear everything and start fresh

```bash
# Remove all build artifacts
rm -rf out/ node_modules/ *.vsix

# Uninstall from VS Code
code --uninstall-extension kimi-agent.kimi-k2-agent

# Fresh install
npm install
./dev.sh
```

## Performance

| Operation | Time |
|-----------|------|
| `./dev.sh` (full) | ~10s |
| `./dev.sh --no-build` | ~3s |
| `npm run compile` | ~1-2s |
| `npm run package` | ~0.5-1s |

## Best Practices

1. **Save before rebuilding**: Always save your editor changes before running `./dev.sh`
2. **One `./dev.sh` at a time**: Don't run multiple instances simultaneously
3. **Don't edit `out/`**: Build artifacts are auto-generated, edits will be lost
4. **Check types**: Use TypeScript strict mode to catch errors early
5. **Test thoroughly**: Reload VS Code and test in the extension interface

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+Shift+K` | Open Kimi Chat |
| `Ctrl+Shift+P` | Command palette |
| `Ctrl+Shift+P` then "Developer: Reload Window" | Reload extension |
| `Ctrl+Shift+X` | Extensions panel |

## Git Workflow

```bash
# Work on your changes
# ... edit src/ files ...

# Build and test
./dev.sh

# Commit when satisfied
git add -A
git commit -m "Your changes"
git push origin main
```

## Debugging

### TypeScript Breakpoints

For real-time debugging with breakpoints:

```bash
# Option 1: Use F5 debug mode
Press F5  # Opens Extension Development Host
# Set breakpoints in src/ files
# Trigger extension actions to hit breakpoints
```

### Console Logging

Use the Logger utility:

```typescript
import { Logger } from './core/logger';

Logger.info('Message');
Logger.error('Error details');
Logger.warn('Warning message');
```

View logs in VS Code: `Ctrl+Shift+P` → "Output" → "Kimi"

### Extension Output

Check the "Kimi" output channel for all extension logs:
```
Ctrl+Shift+P → Output → Select "Kimi" from dropdown
```

## Common Tasks

### I want to run F5 debugging

```bash
# Press F5 in VS Code
# Extension Development Host window opens
# Set breakpoints in TypeScript files
# Test in EDH window while debugging
```

### I want to test with real VS Code behavior

```bash
# Use ./dev.sh for global installation
./dev.sh

# Reload main VS Code window
# Test as a regular user would

# This tests the real user experience
```

### I want to share my extension with someone

```bash
# Run ./dev.sh to create VSIX
./dev.sh

# Share the .vsix file
ls -lh *.vsix

# They can install with:
# code --install-extension path/to/kimi-k2-agent-*.vsix
```

### I want to update the version

Edit `package.json`:
```json
{
  "version": "0.1.1"  // Update this
}
```

Then rebuild and distribute the VSIX.

## Requirements

- **VS Code**: 1.85.0 or higher
- **Node.js**: 18.0.0 or higher
- **npm**: 9.0.0 or higher
- **OpenRouter API Key**: Get at https://openrouter.ai

## Next Steps

1. **First time?**
   - Run `./dev.sh`
   - Reload VS Code
   - Look for Kimi icon in Activity Bar

2. **Making changes?**
   - Edit `src/` files
   - Run `./dev.sh`
   - Reload VS Code
   - Test your changes

3. **Need more info?**
   - Check `AGENTS.md` for architecture and code style
   - Check `README.md` for user-facing information
   - Look at existing code in `src/` for examples

## Support

For issues:
1. Check the logs: `Ctrl+Shift+P` → "Output" → "Kimi"
2. Review the troubleshooting section above
3. Check VS Code error messages
4. Verify your environment setup

---

**Happy developing!** 🚀
