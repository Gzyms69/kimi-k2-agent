import * as vscode from 'vscode';

export class Logger {
  private static outputChannel: vscode.OutputChannel | undefined;
  
  static init(): vscode.OutputChannel {
    if (!this.outputChannel) {
      this.outputChannel = vscode.window.createOutputChannel('Kimi Agent', { log: true });
    }
    return this.outputChannel;
  }

  static show(): void {
    this.outputChannel?.show();
  }

  static info(message: string, data?: unknown): void {
    this.log('INFO', message, data);
  }

  static warn(message: string, data?: unknown): void {
    this.log('WARN', message, data);
  }

  static error(message: string, data?: unknown): void {
    this.log('ERROR', message, data);
  }

  static debug(message: string, data?: unknown): void {
    this.log('DEBUG', message, data);
  }

  static api(direction: 'REQUEST' | 'RESPONSE', endpoint: string, data?: unknown): void {
    const timestamp = new Date().toISOString();
    const channel = this.init();
    
    channel.appendLine(`\n${'='.repeat(60)}`);
    channel.appendLine(`[${timestamp}] API ${direction}: ${endpoint}`);
    channel.appendLine('='.repeat(60));
    
    if (data) {
      const sanitized = this.sanitize(data);
      channel.appendLine(JSON.stringify(sanitized, null, 2));
    }
  }

  static step(stepNum: number, total: number, action: string, params?: unknown): void {
    const channel = this.init();
    channel.appendLine(`\n► Step ${stepNum}/${total}: ${action}`);
    if (params) {
      channel.appendLine(`  Parameters: ${JSON.stringify(params)}`);
    }
  }

  static result(success: boolean, message: string): void {
    const channel = this.init();
    const icon = success ? '✓' : '✗';
    channel.appendLine(`  ${icon} ${message}`);
  }

  private static log(level: string, message: string, data?: unknown): void {
    const timestamp = new Date().toISOString();
    const channel = this.init();
    
    let line = `[${timestamp}] [${level}] ${message}`;
    channel.appendLine(line);
    
    if (data) {
      const sanitized = this.sanitize(data);
      if (typeof sanitized === 'object') {
        channel.appendLine(`  ${JSON.stringify(sanitized, null, 2).replace(/\n/g, '\n  ')}`);
      } else {
        channel.appendLine(`  ${sanitized}`);
      }
    }
  }

  private static sanitize(data: unknown): unknown {
    if (typeof data !== 'object' || data === null) {
      return data;
    }

    const sanitized = JSON.parse(JSON.stringify(data));
    
    const sensitiveKeys = ['apiKey', 'api_key', 'authorization', 'token', 'password', 'secret'];
    
    const redact = (obj: Record<string, unknown>): void => {
      for (const key of Object.keys(obj)) {
        if (sensitiveKeys.some(k => key.toLowerCase().includes(k))) {
          obj[key] = '[REDACTED]';
        } else if (typeof obj[key] === 'object' && obj[key] !== null) {
          redact(obj[key] as Record<string, unknown>);
        }
      }
    };

    if (typeof sanitized === 'object') {
      redact(sanitized as Record<string, unknown>);
    }

    return sanitized;
  }

  static dispose(): void {
    this.outputChannel?.dispose();
  }
}
