# Kimi K2 AI Agent for VS Code

AI-powered automation extension using Kimi K2 model - execute tasks through natural language, manage files, run terminal commands, and get AI-formatted results.

## Quick Start

```bash
./install-global.sh
# Reload VS Code: Ctrl+Shift+P → Developer: Reload Window
```

## Features

- **Natural Language Tasks**: Execute file operations and terminal commands using plain English
- **File Operations**: Create, read, list, delete files and directories
- **Terminal Integration**: Execute shell commands with intelligent output formatting
- **Chat Interface**: Ask questions about your code and get conversational responses
- **Error Recovery**: Comprehensive error handling and debugging support
- **Multiple AI Models**: Kimi K2, Claude, GPT-4o, Gemini, and more via OpenRouter

## Installation

### Option 1: Global Install (Recommended)
```bash
./install-global.sh
```

### Option 2: Manual Installation
```bash
npm install
npm run compile
npm run package
code --install-extension kimi-k2-agent-*.vsix
```

### Option 3: Development Mode
```bash
npm install
npm run watch      # In one terminal
# Then press F5 in VS Code to start debugging
```

## Configuration

Set these in VS Code settings (Preferences or `.vscode/settings.json`):

```json
{
  "kimi-agent.apiKey": "your-openrouter-key",
  "kimi-agent.model": "moonshotai/kimi-k2:free",
  "kimi-agent.autoApprove": false,
  "kimi-agent.maxRetries": 3
}
```

Get your API key at: https://openrouter.ai

## Project Structure

```
src/
├── core/          # Agent orchestration and API client
├── tools/         # File operations and terminal execution
├── types/         # TypeScript type definitions
├── ui/            # Chat webview UI
└── extension.ts   # VS Code extension entry point

out/              # Compiled JavaScript (auto-generated)
```

## Development Commands

```bash
npm run compile              # TypeScript to JavaScript
npm run package              # Bundle with esbuild
npm run watch                # Watch compilation
npm run lint                 # Run ESLint
npm test                     # Run tests
./rebuild.sh                 # Quick rebuild for F5
./install-global.sh          # Full build + install
```

## Keyboard Shortcuts

- **Ctrl+Shift+K** (Windows/Linux) or **Cmd+Shift+K** (macOS): Open Kimi Chat

## Requirements

- VS Code 1.85.0+
- Node.js 18.0.0+
- npm 9.0.0+

## Security

- API keys stored securely in VS Code settings
- No data persisted to disk except VS Code configuration
- All execution logged to VS Code output channel

## Documentation

Additional guides available in the project:
- `INDEX.md` - Documentation overview
- `AGENTS.md` - Code style and architecture guidelines
- `COMPLETE_WORKFLOW.md` - Development workflow

## License

MIT

---

**Status**: Production Ready  
**Last Updated**: December 2025
