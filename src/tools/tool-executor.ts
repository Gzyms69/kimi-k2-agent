import * as vscode from 'vscode';
import { FileManager } from './file-manager';
import { TerminalManager } from './terminal-manager';
import { ExecutionStep, ToolResult, ToolAction, ErrorInfo } from '../types';

export class ToolExecutor {
  private fileManager: FileManager;
  private terminalManager: TerminalManager;
  private executionHistory: Array<{ step: ExecutionStep; result: ToolResult }> = [];

  constructor(workspaceRoot: string) {
    this.fileManager = new FileManager(workspaceRoot);
    this.terminalManager = new TerminalManager();
  }

  async execute(step: ExecutionStep): Promise<ToolResult> {
    const result = await this.executeAction(step.action, step.parameters);
    
    this.executionHistory.push({ step, result });
    
    return result;
  }

  private async executeAction(action: ToolAction, params: Record<string, unknown>): Promise<ToolResult> {
    switch (action) {
      case 'read_file':
        return this.fileManager.readFile(params.path as string);

      case 'write_file':
        return this.fileManager.writeFile(
          params.path as string,
          params.content as string
        );

      case 'create_file':
        return this.fileManager.createFile(
          params.path as string,
          (params.content as string) || ''
        );

      case 'delete_file': {
        const confirm = await this.confirmDangerousAction(
          `Delete file: ${params.path}?`
        );
        if (!confirm) {
          return { success: false, error: 'Operation cancelled by user' };
        }
        return this.fileManager.deleteFile(params.path as string);
      }

      case 'list_directory':
        return this.fileManager.listDirectory(params.path as string);

      case 'execute_command': {
        const command = params.command as string;
        const dangerous = this.isDangerousCommand(command);
        
        if (dangerous) {
          const confirm = await this.confirmDangerousAction(
            `Execute potentially dangerous command: ${command}?`
          );
          if (!confirm) {
            return { success: false, error: 'Operation cancelled by user' };
          }
        }
        
        return this.terminalManager.executeCommand(command, {
          cwd: params.cwd as string,
          timeout: params.timeout as number,
        });
      }

      case 'search_files':
        return this.fileManager.searchFiles(
          params.pattern as string,
          params.content as string
        );

      case 'ask_user': {
        const response = await vscode.window.showInputBox({
          prompt: params.question as string,
          placeHolder: params.placeholder as string,
        });
        return {
          success: true,
          data: response,
          output: response || 'No response',
        };
      }

      case 'create_directory':
        return this.fileManager.createDirectory(params.path as string);

      case 'analyze_error':
        return {
          success: true,
          data: params,
          output: 'Error analysis requested - forwarding to AI',
        };

      default:
        return {
          success: false,
          error: `Unknown action: ${action}`,
        };
    }
  }

  async executeWithRecovery(
    step: ExecutionStep,
    onError: (error: ErrorInfo, step: ExecutionStep) => Promise<ExecutionStep[] | null>,
    maxRetries: number = 3
  ): Promise<ToolResult> {
    let attempts = 0;
    let currentStep = step;

    while (attempts < maxRetries) {
      const result = await this.execute(currentStep);
      
      if (result.success) {
        return result;
      }

      attempts++;
      
      if (attempts >= maxRetries) {
        return result;
      }

      const errorInfo = this.parseError(result.error || '', currentStep);
      if (!errorInfo) {
        return result;
      }

      const recoverySteps = await onError(errorInfo, currentStep);
      if (!recoverySteps || recoverySteps.length === 0) {
        return result;
      }

      for (const recoveryStep of recoverySteps) {
        const recoveryResult = await this.execute(recoveryStep);
        if (!recoveryResult.success) {
          return recoveryResult;
        }
      }
    }

    return { success: false, error: 'Max retries exceeded' };
  }

  private parseError(errorMessage: string, step: ExecutionStep): ErrorInfo | undefined {
    if (step.action === 'execute_command') {
      return this.terminalManager.parseError(
        errorMessage,
        step.parameters.command as string
      );
    }

    if (errorMessage.includes('ENOENT') || errorMessage.includes('not found')) {
      return {
        type: 'file_not_found',
        message: errorMessage,
        source: `${step.action}: ${JSON.stringify(step.parameters)}`,
        timestamp: Date.now(),
      };
    }

    if (errorMessage.includes('EACCES') || errorMessage.includes('permission')) {
      return {
        type: 'permission_denied',
        message: errorMessage,
        source: `${step.action}: ${JSON.stringify(step.parameters)}`,
        timestamp: Date.now(),
      };
    }

    return undefined;
  }

  private async confirmDangerousAction(message: string): Promise<boolean> {
    const config = vscode.workspace.getConfiguration('kimi-agent');
    if (config.get<boolean>('autoApprove')) {
      return true;
    }

    const result = await vscode.window.showWarningMessage(
      message,
      { modal: true },
      'Yes',
      'No'
    );
    return result === 'Yes';
  }

  private isDangerousCommand(command: string): boolean {
    const dangerousPatterns = [
      /\brm\s+-rf?\b/i,
      /\bdel\s+\/[sfq]/i,
      /\bformat\b/i,
      /\bmkfs\b/i,
      /\bdd\s+if=/i,
      />\s*\/dev\/[sh]d/i,
      /\bsudo\b/i,
      /\bchmod\s+777\b/i,
      /\bchown\s+-R\b/i,
      /:\s*\(\)\s*\{/,
      /\beval\s*\(/i,
      /\bcurl\b.*\|\s*(ba)?sh/i,
      /\bwget\b.*\|\s*(ba)?sh/i,
    ];

    return dangerousPatterns.some(pattern => pattern.test(command));
  }

  getHistory(): Array<{ step: ExecutionStep; result: ToolResult }> {
    return [...this.executionHistory];
  }

  clearHistory(): void {
    this.executionHistory = [];
  }

  dispose(): void {
    this.terminalManager.dispose();
  }
}
