# Complete Kimi K2 Extension Workflow

This document provides the complete picture of how to develop and deploy the Kimi K2 Agent extension.

## Development Phase Comparison

### Option 1: F5 Extension Development Host (Debug Mode)
Used for debugging at the TypeScript source level.

```
[Edit code in src/] 
    ↓
[Press F5] 
    ↓
[Separate EDH window opens] 
    ↓
[Open folder in EDH] 
    ↓
[Test extension] 
    ↓
[Repeat]
```

**Pros:**
- Debug with breakpoints
- Live recompilation
- Full development mode

**Cons:**
- Separate window to manage
- Not realistic user environment
- Multiple clicks to test (F5 → File → Open)

### Option 2: Global Installation (Recommended)
Install as a real user would experience it.

```
[Edit code in src/]
    ↓
[./install-global.sh]
    ↓
[Reload VS Code]
    ↓
[Test in main window]
    ↓
[Repeat]
```

**Pros:**
- Real user experience
- Simple one-command workflow
- Test in main VS Code window
- Permanent installation (good for QA)

**Cons:**
- Can't use TypeScript debugger
- Must rebuild for each test

## Quick Reference

### Build Only (for F5 or testing locally)
```bash
./rebuild.sh
```
Creates `/out/extension.js` bundle. Use with F5 debug mode.

### Build & Install Globally (Recommended for testing)
```bash
./install-global.sh
```
Builds, packages as VSIX, and installs to VS Code globally.

### Full Manual Control
```bash
npm run compile              # Compile TypeScript
npm run package             # Bundle with esbuild
npm run vsce:package        # Create VSIX file
npm run vsce:install        # Install to VS Code
```

## Standard Workflow (Global Installation)

### Setup (One-time)
1. Clone/open workspace
2. `npm install`
3. `./install-global.sh` (first time)
4. Reload VS Code (`Ctrl+Shift+P` → "Developer: Reload Window")

### Development Loop
1. Edit code in `src/`
2. Run `./install-global.sh`
3. Reload VS Code
4. Test
5. Repeat from step 1

### Deployment
- Same as development! Just run `./install-global.sh`
- Package is created at `/kimi-k2-agent-*.vsix`
- Can share VSIX with team members or ship to distribution

## File Structure

```
workspace-root/
├── src/
│   ├── extension.ts           # Entry point
│   ├── core/
│   │   ├── agent.ts           # Task execution + AI integration
│   │   ├── kimi-client.ts      # OpenRouter API client
│   │   └── logger.ts          # Logging utility
│   ├── tools/
│   │   ├── file-manager.ts    # File operations
│   │   ├── terminal-manager.ts # Terminal operations
│   │   └── tool-executor.ts   # Tool dispatcher
│   ├── ui/
│   │   └── chat-view.ts       # Webview UI
│   └── types/
│       └── index.ts            # Type definitions
├── out/                        # Generated (build output)
├── rebuild.sh                  # Build automation script
├── install-global.sh           # Build + package + install script
├── package.json                # Dependencies and scripts
├── tsconfig.json               # TypeScript config
└── .vscode/
    ├── launch.json             # F5 debug config
    ├── settings.json           # IDE settings
    └── extensions.json         # Recommended extensions

```

## Scripts Explained

### rebuild.sh
- **Purpose**: Quick local build for F5 debugging
- **Does**: Compile → Bundle → Verify → Clear cache
- **Output**: `/out/extension.js`
- **Time**: ~2s
- **When to use**: After code changes, before F5

### install-global.sh
- **Purpose**: Complete build + package + install workflow
- **Does**: Validate environment → Compile → Bundle → Package as VSIX → Install to VS Code
- **Output**: VSIX file + installed extension
- **Time**: ~5-10s
- **When to use**: Want to test as real user, final deployment

### npm scripts
Located in `package.json`:
- `npm run compile` - TypeScript → JavaScript
- `npm run watch` - Continuous compilation
- `npm run lint` - Code quality check
- `npm run package` - esbuild bundling
- `npm run vsce:package` - Create VSIX
- `npm run vsce:install` - Install VSIX

## Common Tasks

### I made code changes, how do I test them?

For **global installation** (recommended):
```bash
./install-global.sh
# Then reload VS Code
```

For **F5 debug mode**:
```bash
./rebuild.sh
# Then press F5, wait for it to compile in real-time
```

### How do I uninstall the extension?

```bash
code --uninstall-extension kimi-agent.kimi-k2-agent
```

Or: VS Code → Extensions → Click "Uninstall" on Kimi K2 Agent

### How do I reset everything?

```bash
# Remove build artifacts
rm -rf out/ node_modules/

# Remove VSIX files
rm -f *.vsix

# Uninstall from VS Code
code --uninstall-extension kimi-agent.kimi-k2-agent

# Fresh install
npm install
./install-global.sh
```

### Can I run both F5 and global installation at the same time?

Yes! They're independent:
- F5 debug mode runs in Extension Development Host window
- Global installation runs in main VS Code
- Each can be active separately or together
- Useful for comparing behaviors

### How do I debug TypeScript code?

Use F5 debug mode:
1. Open workspace in VS Code
2. Press `F5`
3. EDH window opens with extension running
4. Set breakpoints in TypeScript code
5. Trigger extension actions to hit breakpoints
6. Inspect variables, step through code

For production testing, use global installation instead.

### How do I see extension logs?

1. Open extension's output panel:
   - `Ctrl+Shift+P` → "Output" → Select "Kimi" channel
   
2. Or check Node process logs:
   - `Ctrl+Shift+P` → "Developer: Toggle Developer Tools"

## Troubleshooting

### Extension not appearing after ./install-global.sh

1. Check installation:
   ```bash
   code --list-extensions | grep kimi
   ```
   
2. Reload VS Code:
   - `Ctrl+Shift+P` → "Developer: Reload Window"

3. Check for errors:
   - `Ctrl+Shift+P` → "Output" → Select "Kimi" channel

4. Restart VS Code completely if reload didn't work

### Build fails with "command not found: esbuild"

```bash
npm install
./install-global.sh
```

### VSIX packaging fails

Make sure vsce is installed:
```bash
npm install --save-dev @vscode/vsce
npm run vsce:package
```

### Previous version won't uninstall

Force reinstall:
```bash
./install-global.sh --force
```

Or use UI:
1. `Ctrl+Shift+X` → Extensions
2. Search "Kimi"
3. Click the installed version
4. Click "Uninstall"
5. Run `./install-global.sh` again

## Configuration

Settings are in `vscode.workspace.getConfiguration('kimi-agent')`:

- `apiKey` - OpenRouter API key
- `apiEndpoint` - OpenRouter endpoint (default: https://openrouter.ai/api/v1)
- `model` - Model to use (default: moonshotai/kimi-k2:free)
- `autoApprove` - Auto-approve tool execution (default: false)
- `maxRetries` - Max API retries (default: 3)

Set in VS Code settings or in workspace settings:

`.vscode/settings.json`:
```json
{
  "kimi-agent": {
    "apiKey": "your-key",
    "model": "moonshotai/kimi-k2:free"
  }
}
```

## Next Steps

1. **First time?**
   - Run `./install-global.sh`
   - Reload VS Code
   - Check the Activity Bar for Kimi extension

2. **Making changes?**
   - Edit `src/` files
   - Run `./install-global.sh`
   - Reload VS Code
   - Test your changes

3. **Need help?**
   - Check `GLOBAL_INSTALL.md` for installation details
   - Check `REBUILD_GUIDE.md` for build details
   - Look at code comments and type definitions in `src/`

---

**Latest Update**: Moved from F5-based development to global VSIX installation for more realistic testing and simpler workflow. All fixes from Phase 1 (architecture) and Option A (AI result formatting) are now built in.
