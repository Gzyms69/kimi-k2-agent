import * as vscode from 'vscode';
import { ToolResult, ErrorInfo, ErrorType } from '../types';

interface CommandExecution {
  command: string;
  startTime: number;
  endTime?: number;
  exitCode?: number;
  output: string;
  error?: string;
}

export class TerminalManager {
  private terminal: vscode.Terminal | undefined;
  private outputChannel: vscode.OutputChannel;
  private currentExecution: CommandExecution | undefined;
  private commandQueue: Array<{ command: string; resolve: (result: ToolResult) => void }> = [];
  private isExecuting = false;

  constructor() {
    this.outputChannel = vscode.window.createOutputChannel('Kimi Agent Terminal');
  }

  async executeCommand(
    command: string,
    options: {
      cwd?: string;
      timeout?: number;
      captureOutput?: boolean;
    } = {}
  ): Promise<ToolResult> {
    const { cwd, timeout = 30000 } = options;

    return new Promise((resolve) => {
      this.commandQueue.push({ command, resolve });
      this.processQueue(cwd, timeout);
    });
  }

  private async processQueue(cwd?: string, timeout?: number): Promise<void> {
    if (this.isExecuting || this.commandQueue.length === 0) {
      return;
    }

    this.isExecuting = true;
    const { command, resolve } = this.commandQueue.shift()!;

    try {
      const result = await this.runCommand(command, cwd, timeout);
      resolve(result);
    } catch (error) {
      resolve({
        success: false,
        error: error instanceof Error ? error.message : 'Command execution failed',
      });
    } finally {
      this.isExecuting = false;
      this.processQueue(cwd, timeout);
    }
  }

  private async runCommand(command: string, cwd?: string, timeout: number = 30000): Promise<ToolResult> {
    const cp = await import('child_process');
    const util = await import('util');
    const exec = util.promisify(cp.exec);

    this.currentExecution = {
      command,
      startTime: Date.now(),
      output: '',
    };

    this.outputChannel.appendLine(`\n> ${command}`);
    this.outputChannel.appendLine(`  Working directory: ${cwd || 'default'}`);
    this.outputChannel.show(true);

    try {
      const { stdout, stderr } = await exec(command, {
        cwd: cwd || vscode.workspace.workspaceFolders?.[0]?.uri.fsPath,
        timeout,
        maxBuffer: 10 * 1024 * 1024,
        shell: process.platform === 'win32' ? 'powershell.exe' : '/bin/bash',
      });

      const output = stdout + (stderr ? `\nStderr: ${stderr}` : '');
      
      this.currentExecution.endTime = Date.now();
      this.currentExecution.output = output;
      this.currentExecution.exitCode = 0;

      this.outputChannel.appendLine(output);
      this.outputChannel.appendLine(`  ✓ Completed in ${this.currentExecution.endTime - this.currentExecution.startTime}ms`);

      return {
        success: true,
        output: output.trim(),
        data: {
          exitCode: 0,
          duration: this.currentExecution.endTime - this.currentExecution.startTime,
        },
      };
    } catch (error: unknown) {
      this.currentExecution.endTime = Date.now();
      
      const execError = error as { code?: number; stdout?: string; stderr?: string; message?: string };
      const errorOutput = execError.stderr || execError.stdout || execError.message || 'Unknown error';
      
      this.currentExecution.error = errorOutput;
      this.currentExecution.exitCode = execError.code || 1;

      this.outputChannel.appendLine(`  ✗ Error: ${errorOutput}`);

      return {
        success: false,
        error: errorOutput,
        output: execError.stdout || '',
        data: {
          exitCode: execError.code || 1,
          duration: this.currentExecution.endTime - this.currentExecution.startTime,
        },
      };
    }
  }

  async runInTerminal(command: string): Promise<void> {
    if (!this.terminal || this.terminal.exitStatus !== undefined) {
      this.terminal = vscode.window.createTerminal({
        name: 'Kimi Agent',
        iconPath: new vscode.ThemeIcon('robot'),
      });
    }

    this.terminal.show();
    this.terminal.sendText(command);
  }

  parseError(output: string, command: string): ErrorInfo | undefined {
    const patterns: Array<{ regex: RegExp; type: ErrorType; extract: (match: RegExpMatchArray) => string }> = [
      {
        regex: /command not found|not recognized as.*command|'(\w+)' is not recognized/i,
        type: 'command_not_found',
        extract: (m) => m[1] || 'Command not found',
      },
      {
        regex: /permission denied|access is denied|EACCES/i,
        type: 'permission_denied',
        extract: () => 'Permission denied',
      },
      {
        regex: /SyntaxError|syntax error|unexpected token/i,
        type: 'syntax_error',
        extract: () => 'Syntax error in code',
      },
      {
        regex: /Cannot find module|Module not found|package.*not found|ENOENT/i,
        type: 'dependency_missing',
        extract: (m) => m[0],
      },
      {
        regex: /ECONNREFUSED|ETIMEDOUT|network|getaddrinfo|ENOTFOUND/i,
        type: 'network_error',
        extract: () => 'Network connection error',
      },
      {
        regex: /no such file or directory|file not found|ENOENT/i,
        type: 'file_not_found',
        extract: () => 'File or directory not found',
      },
      {
        regex: /error TS\d+|tsc.*error|TypeScript/i,
        type: 'compilation_error',
        extract: () => 'TypeScript compilation error',
      },
      {
        regex: /Error:|Exception:|Traceback|at .* \(.*:\d+:\d+\)/i,
        type: 'runtime_error',
        extract: () => 'Runtime error',
      },
    ];

    for (const { regex, type, extract } of patterns) {
      const match = output.match(regex);
      if (match) {
        return {
          type,
          message: extract(match),
          source: command,
          timestamp: Date.now(),
          context: output.substring(0, 500),
        };
      }
    }

    if (output.toLowerCase().includes('error') || output.toLowerCase().includes('failed')) {
      return {
        type: 'unknown',
        message: output.split('\n')[0].substring(0, 200),
        source: command,
        timestamp: Date.now(),
        context: output.substring(0, 500),
      };
    }

    return undefined;
  }

  getLastExecution(): CommandExecution | undefined {
    return this.currentExecution;
  }

  showOutput(): void {
    this.outputChannel.show();
  }

  dispose(): void {
    this.terminal?.dispose();
    this.outputChannel.dispose();
  }
}
