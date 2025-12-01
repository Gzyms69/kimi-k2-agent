# Rebuild Script Guide

## Quick Start

After making changes to the extension code:

```bash
./rebuild.sh
```

Then reload VS Code (see options below).

---

## What the Script Does

1. ✅ Validates Node.js and npm are installed
2. ✅ Verifies project structure
3. ✅ Cleans previous build artifacts
4. ✅ Compiles TypeScript → JavaScript
5. ✅ Bundles with esbuild (minification + tree-shaking)
6. ✅ Verifies bundle integrity
7. ✅ Clears VS Code extension cache
8. ✅ Shows next steps

**Total time:** Usually 5-10 seconds

---

## Safety First

This script **does NOT** auto-kill VS Code to prevent data loss. Your unsaved files are safe!

**You must manually reload VS Code** after running the script. Choose one:

### Option 1: Hot Reload (Recommended)
```
Ctrl+Shift+P → Developer: Reload Window → Enter
```
✅ Fast and safe  
✅ Keeps editor state  
✅ Reloads extension only

### Option 2: Restart Debugging
```
Ctrl+Shift+D (open Debug)
→ Click stop button (⏹)
→ Press F5
```
✅ Full extension process restart  
✅ Cleanest state

### Option 3: Full Restart
Close and reopen VS Code completely  
✅ Nuclear option (use if experiencing issues)

---

## Workflow

This is your optimal development workflow:

```
1. Make code changes in src/
2. Run: ./rebuild.sh
3. Reload VS Code (Option 1 is fastest)
4. See changes immediately
5. Repeat
```

---

## Error Handling

If something goes wrong:

- **TypeScript compilation error**: Fix the error in your code, re-run `./rebuild.sh`
- **esbuild bundling error**: Check your code for syntax errors
- **Cache clear failed**: Run with elevated permissions or just reload normally
- **Build takes too long**: Check if `npm watch` is still running in background

---

## Environment Checks

The script verifies:
- ✅ Node.js is installed
- ✅ npm is available
- ✅ Project structure is correct
- ✅ TypeScript configuration exists
- ✅ VS Code is properly configured

---

## Troubleshooting

**Script won't execute:**
```bash
chmod +x rebuild.sh
```

**Permission denied errors:**
```bash
# Run with bash explicitly
bash rebuild.sh
```

**Build takes forever:**
Check if `npm watch` is running and consuming resources. If needed:
```bash
pkill -f "npm watch"
```

**Extension still shows old version:**
Try Option 2 or Option 3 reload (more thorough)

---

## What NOT to Do

❌ Don't manually edit files in `out/` - they're auto-generated  
❌ Don't use Ctrl+C during the build - always let it finish  
❌ Don't run multiple `rebuild.sh` instances simultaneously  
❌ Don't close VS Code immediately after reload (extension needs time to activate)

---

## Advanced Options

To see verbose output:
```bash
# Enable bash debugging
bash -x rebuild.sh
```

To clean just the build (without rebuilding):
```bash
rm -rf out/
```

---

## File Locations

After a successful build:
- **Compiled JS:** `out/` directory (individual files)
- **Bundled extension:** `out/extension.js` (main file)
- **Source maps:** `out/**/*.js.map` (for debugging)

---

## Need Help?

If `./rebuild.sh` fails:

1. Check error message carefully (usually very clear)
2. Make sure TypeScript files have no syntax errors
3. Verify all imports are correct
4. Try `npm run compile` manually to see detailed errors
5. Try `npm run package` manually to debug bundling

---

## Summary

```bash
# Your new development loop:
./rebuild.sh              # 5-10 seconds
# Then: Ctrl+Shift+P → Developer: Reload Window → Enter
# Done! See changes immediately
```

That's it! 🚀
