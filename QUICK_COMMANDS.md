# Kimi K2 Extension - Quick Commands

## Development Workflow

### Build & Test (Global Installation - Recommended)
```bash
./install-global.sh    # Build, package, install → 5-10s
# Then: Ctrl+Shift+P → "Developer: Reload Window"
```

### Build Only (for F5 debugging)
```bash
./rebuild.sh           # Compile & bundle → 2s
# Then: Press F5 in VS Code
```

### Watch Mode (Live compilation)
```bash
npm run watch          # Auto-recompile on changes
# In another terminal: Press F5 for debug session
```

---

## Useful Commands

### Compile TypeScript
```bash
npm run compile
```

### Bundle with esbuild
```bash
npm run package
```

### Lint code
```bash
npm run lint
npm run lint -- --fix  # Auto-fix issues
```

### Run tests
```bash
npm test
```

### Create VSIX manually
```bash
npm run vsce:package
# Creates: kimi-k2-agent-X.X.X.vsix
```

### Install VSIX manually
```bash
npm run vsce:install
```

### List installed extensions
```bash
code --list-extensions | grep kimi
```

### Uninstall extension
```bash
code --uninstall-extension kimi-agent.kimi-k2-agent
```

---

## Troubleshooting

### Extension doesn't appear
```bash
# Reload VS Code
Ctrl+Shift+P → "Developer: Reload Window"

# Or restart completely
code --new-window
```

### Clear all builds & reinstall
```bash
rm -rf out/ node_modules/ *.vsix
npm install
./install-global.sh
```

### Force reinstall (uninstall old version first)
```bash
code --uninstall-extension kimi-agent.kimi-k2-agent
./install-global.sh
```

### View extension logs
```bash
# In VS Code:
Ctrl+Shift+P → "Output" → "Kimi"
```

### Debug breakpoints
```bash
# Start F5 debug session
Press F5
# Set breakpoints in VS Code
# Trigger extension actions
# Breakpoints will hit in EDH window
```

---

## File Locations

| File | Purpose |
|------|---------|
| `src/` | Source code |
| `out/extension.js` | Built bundle |
| `*.vsix` | Packaged extension |
| `.vscode/` | IDE config + debug settings |
| `package.json` | Dependencies & npm scripts |

---

## Key Documents

- **GLOBAL_INSTALL.md** - Complete installation guide
- **COMPLETE_WORKFLOW.md** - Full development workflow overview
- **REBUILD_GUIDE.md** - Build script documentation
- **WORKFLOW_SETUP.md** - Setup instructions
- **quick-ref.sh** - Shell-based command reference

---

## API Configuration

Set in VS Code settings (`.vscode/settings.json`):

```json
{
  "kimi-agent": {
    "apiKey": "your-openrouter-key",
    "model": "moonshotai/kimi-k2:free",
    "autoApprove": false,
    "maxRetries": 3
  }
}
```

Get API key: https://openrouter.ai

---

## CI/CD Integration

Scripts are safe for CI/CD:
```bash
# Install deps
npm install

# Build & package
./install-global.sh

# Check result
ls -la *.vsix
```

Exit codes:
- `0` = Success
- `1` = Environment error
- `2` = Build error
- `3` = Packaging error
- `4` = Install error

---

## Performance

| Operation | Time | When |
|-----------|------|------|
| `rebuild.sh` | ~2s | Quick compile + bundle for F5 |
| `install-global.sh` | ~5-10s | Full build + package + install |
| `npm run compile` | ~1-2s | TypeScript → JavaScript |
| `npm run package` | ~0.5-1s | esbuild bundling |
| `npm run vsce:package` | ~1-2s | Create VSIX |

---

## Directory Structure

```
kimi-vsc/
├── src/
│   ├── extension.ts
│   ├── core/
│   │   ├── agent.ts
│   │   ├── kimi-client.ts
│   │   └── logger.ts
│   ├── tools/
│   │   ├── file-manager.ts
│   │   ├── terminal-manager.ts
│   │   └── tool-executor.ts
│   ├── ui/
│   │   └── chat-view.ts
│   └── types/
│       └── index.ts
├── out/
│   └── extension.js ← Built bundle
├── .vscode/
│   ├── launch.json
│   └── settings.json
├── package.json
├── rebuild.sh
├── install-global.sh
└── *.md ← Documentation
```

---

## Tips & Tricks

### Test multiple versions simultaneously
```bash
# One terminal: F5 for debugging
Press F5

# Another terminal: Global installation for real-world testing
./install-global.sh
# Reload main VS Code window
```

### Share VSIX with team
```bash
# After running ./install-global.sh:
ls -lh *.vsix

# Share the .vsix file with team
# They can install with:
code --install-extension path/to/kimi-k2-agent-*.vsix
```

### Version management
- Version in `package.json` controls VSIX version
- Update before packaging for distribution
- semver format: `MAJOR.MINOR.PATCH`

---

**Quick Start**: Run `./install-global.sh` then reload VS Code. Done! 🚀
