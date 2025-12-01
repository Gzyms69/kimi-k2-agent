# Development Workflow Setup Complete ✓

## What Was Created

### 1. **rebuild.sh** - Main rebuild script
- Safely rebuilds your extension
- Compiles TypeScript → Bundles with esbuild
- Clears VS Code cache
- **SAFE:** Does NOT auto-kill VS Code (prevents data loss)
- Takes 2-10 seconds
- Colored output with clear progress

### 2. **REBUILD_GUIDE.md** - Full documentation
- Complete guide on using rebuild.sh
- Safety notes and best practices
- Troubleshooting guide
- Advanced options

### 3. **quick-ref.sh** - Quick reference card
- TL;DR commands
- Project structure overview
- Common commands cheat sheet

---

## Your New Development Workflow

### Step 1: Make Code Changes
Edit any file in `src/` directory

### Step 2: Rebuild
```bash
./rebuild.sh
```
Output will show:
- ✓ Environment check
- ✓ TypeScript compilation
- ✓ esbuild bundling
- ✓ Cache clearing
- Total time: ~2-10 seconds

### Step 3: Reload VS Code
Choose ONE of these:

**A) Fast Reload (Recommended)**
```
Press: Ctrl+Shift+P
Type:  Developer: Reload Window
Press: Enter
```

**B) Restart Debugging**
1. Press `Ctrl+Shift+D` (open Debug view)
2. Click stop button (⏹)
3. Press `F5` to restart

**C) Full Restart**
Close and reopen VS Code

### Step 4: Verify Changes
Check the Kimi Agent panel in VS Code - changes should be visible immediately

---

## Key Safety Features

✅ **No data loss** - Script doesn't auto-kill VS Code  
✅ **Unsaved files preserved** - You have time to save  
✅ **Clear error messages** - Tells you exactly what failed  
✅ **Verification checks** - Ensures build succeeded before cleanup  
✅ **Cache clearing** - Prevents stale code from loading  
✅ **Environment validation** - Stops early if dependencies missing  

---

## What Each Script Does

### rebuild.sh
```
Input:  TypeScript source files in src/
Process: Compile → Bundle → Verify → Clear cache
Output: Fresh out/extension.js ready to load
```

**Usage:** `./rebuild.sh` (from project root)

### REBUILD_GUIDE.md
Complete documentation with:
- Detailed workflow
- Safety considerations
- Troubleshooting
- Advanced options
- Environment checks

### quick-ref.sh
Quick reference for common commands:
- File locations
- NPM scripts
- Project structure
- Debug tips

---

## Essential Commands Reference

```bash
# Full rebuild (recommended after changes)
./rebuild.sh

# Just compile TypeScript
npm run compile

# Just bundle
npm run package

# Watch for changes (run in separate terminal)
npm run watch

# Check for errors
npm run compile

# Clean build artifacts
rm -rf out/
```

---

## Timeline for Changes to Take Effect

1. **Make code change** - 0s (instant)
2. **Run `./rebuild.sh`** - 2-10s (usually ~2s)
3. **Reload window** - 1-2s
4. **Total time** - ~5-15 seconds

Changes should be visible immediately after reload.

---

## Troubleshooting Quick Links

| Problem | Solution |
|---------|----------|
| Changes not showing | Run `./rebuild.sh` then reload |
| Compilation errors | Check error message, fix code, retry |
| Bundle too small | Check if esbuild ran (npm run package) |
| Cache clearing fails | Use Option B or C reload method |
| VS Code frozen | Use Option C (full restart) |
| "Permission denied" | Run with `bash rebuild.sh` |

See **REBUILD_GUIDE.md** for detailed troubleshooting.

---

## Next Steps

1. **Test the workflow:**
   ```bash
   ./rebuild.sh
   ```

2. **Make a small change** to verify reload works:
   - Edit `src/ui/chat-view.ts` (change a string)
   - Run `./rebuild.sh`
   - Reload VS Code
   - Verify change appears

3. **Read the guide** for more details:
   ```bash
   cat REBUILD_GUIDE.md
   ```

4. **Set up workflow** for future development

---

## Safety Reminders

⚠️ **Before reloading:**
- Save all unsaved files
- Make sure build succeeded (script will tell you)
- Don't close VS Code immediately after rebuild

⚠️ **During development:**
- Don't edit `out/` directory directly
- Don't run multiple rebuilds simultaneously
- Let the build finish (don't interrupt with Ctrl+C)

✅ **After reload:**
- Give extension 2-3 seconds to activate
- Check Kimi Agent panel for changes
- If something seems wrong, use Option C (full restart)

---

## Development Tips

### Keep watch running
Keep `npm watch` running in a background terminal for faster development:
```bash
# In separate terminal
npm run watch
```
Then `./rebuild.sh` will only bundle (faster).

### Use source maps
The build includes source maps for easier debugging in browser DevTools.

### Check output channel
VS Code shows extension logs in Output panel:
```
Ctrl+Shift+U (toggle Output)
Select "Kimi Agent" channel
```

---

## Success! 🚀

Your development workflow is now:

1. **Code** → 2. **Run** `./rebuild.sh` → 3. **Reload** (Ctrl+Shift+P) → 4. **See changes**

Simple, fast, and safe!

For questions, see:
- **REBUILD_GUIDE.md** - Full documentation
- **quick-ref.sh** - Command reference
- Scripts have built-in help with clear error messages
