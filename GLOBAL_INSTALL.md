# Global Installation Guide

Install your Kimi K2 Agent extension globally in VS Code.

## Quick Start

```bash
./install-global.sh
```

That's it! The script will:
1. ✓ Compile TypeScript
2. ✓ Bundle with esbuild
3. ✓ Package as VSIX
4. ✓ Install to your main VS Code
5. ✓ Verify installation

Takes ~5-10 seconds.

## After Installation

1. **Reload VS Code** in your main window
   - `Ctrl+Shift+P` → "Developer: Reload Window"

2. **Find the extension**
   - Check the Activity Bar (left sidebar)
   - Look for the Kimi agent icon/button

3. **Start using it**
   - Open a workspace/folder
   - Click the Kimi panel
   - Start asking questions or executing tasks

## What Gets Installed

- **Extension ID**: `kimi-agent.kimi-k2-agent`
- **Location**: VS Code's global extensions folder (~/.vscode/extensions/)
- **Scope**: Available in all workspaces/folders you open

## Update the Extension

Made code changes? Update with:

```bash
./install-global.sh
```

Then reload VS Code.

## Uninstall

To remove the extension from VS Code:

```bash
code --uninstall-extension kimi-agent.kimi-k2-agent
```

Or use VS Code's Extensions panel.

## Troubleshooting

### "code command not found"
- Make sure VS Code is installed
- On macOS/Linux: Add VS Code to PATH
- On Windows: Ensure VS Code CLI is available

### Extension doesn't appear after installation
- Reload VS Code: `Ctrl+Shift+P` → "Developer: Reload Window"
- Check Extensions panel to verify it's installed
- Try restarting VS Code completely

### Build fails
- Run `npm install` first
- Check that node_modules exists
- View error messages in terminal output

### Permission denied
- Make sure script is executable: `chmod +x install-global.sh`
- Run from the workspace root directory

## What Changed

Switched from **F5 Extension Development Host** to **global installation** because:

| Aspect | F5 Debug Mode | Global Installation |
|--------|---------------|-------------------|
| **Window** | Separate EDH window | Main VS Code |
| **Testing** | Dev-only mode | Real user experience |
| **Setup** | 2 clicks (F5 → File → Open) | 1 command |
| **Workflow** | Must rebuild to test | Simple: code → ./install-global.sh → reload |
| **Persistence** | Only while debugging | Installed permanently (until uninstalled) |

## Development Workflow Summary

1. **Edit code** in `src/`
2. **Install globally**: `./install-global.sh`
3. **Reload VS Code**: `Ctrl+Shift+P` → "Developer: Reload Window"
4. **Test** in main window
5. Repeat

## Advanced Options

### Manual Steps (if you want to see what's happening)

```bash
# Step 1: Compile
npm run compile

# Step 2: Bundle
npm run package

# Step 3: Package as VSIX
npm run vsce:package

# Step 4: Install
npm run vsce:install
```

### Keep Previous Version
To keep both dev (F5) and global installations:
- Keep the EDH running with F5
- Install global version separately
- Each works independently

### CI/CD Integration
The script is safe for CI/CD pipelines:
- Exits with code 0 on success
- Exits with non-zero code on failure
- All output is prefixed with context
- No interactive prompts (fully automated)

## Questions?

Check these files:
- `rebuild.sh` - Compile and bundle logic
- `package.json` - Scripts and configuration
- `.vscode/launch.json` - Debug configuration
- `src/` - Extension source code
