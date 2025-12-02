# AGENTS.md

## Commands

### Development Workflow (Recommended)
```bash
./dev.sh                   # Full cycle: compile → bundle → package → install (~10s)
./dev.sh --no-build        # Fast reinstall with existing build (~3s)
./dev.sh --no-install      # Build only, don't install
```

### Individual npm Scripts
```bash
npm run compile            # Compile TypeScript to JavaScript
npm run package            # Bundle extension with esbuild (minified)
npm run watch              # Watch TypeScript compilation
npm run lint               # Run ESLint
npm run lint -- --fix      # Auto-fix linting issues
npm test                   # Run tests
```

## Architecture

**VS Code Extension** (TypeScript) for AI-powered project automation:
- `src/core/` - Agent orchestration, API client (Kimi/OpenRouter), logging
- `src/tools/` - File operations, terminal execution, tool routing
- `src/ui/` - Chat webview provider
- `src/types/` - Type definitions (KimiRequest, ToolAction, ErrorInfo, etc.)
- `out/` - Build output (auto-generated, do NOT edit)

Main entry: `extension.ts` → `Agent` class → Tools (file-manager, terminal-manager)

## Code Style

- **Language:** TypeScript (strict mode enabled, ES2022 target)
- **Build:** tsc → esbuild (CJS, minified)
- **Imports:** ES modules style; no bare imports
- **Error Handling:** Structured ErrorInfo objects (type, message, source, line, column)
- **Types:** Use interfaces from `src/types/index.ts` (KimiRequest, ToolResult, ChatMessage, ToolAction, etc.)
- **Logging:** Use Logger.info/error/warn instead of console
- **Naming:** camelCase for functions/variables, PascalCase for classes/types, kebab-case for VS Code commands
- **Config:** Read from `vscode.workspace.getConfiguration('kimi-agent')` (apiKey, apiEndpoint, model, autoApprove, maxRetries)
