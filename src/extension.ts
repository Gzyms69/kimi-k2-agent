import * as vscode from 'vscode';
import { Agent } from './core/agent';
import { ChatViewProvider } from './ui/chat-view';
import { Logger } from './core/logger';

let agent: Agent | undefined;

export function activate(context: vscode.ExtensionContext) {
  try {
    Logger.init();
    Logger.info('Kimi K2 Agent extension activating...');

    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '';
    Logger.info('Workspace root', { workspaceRoot });
    agent = new Agent(workspaceRoot);
  } catch (error) {
    console.error('Kimi Agent activation failed:', error);
    vscode.window.showErrorMessage(`Kimi Agent failed to activate: ${error}`);
    throw error;
  }

  const statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  statusBar.text = '$(robot) Kimi';
  statusBar.tooltip = 'Click to open Kimi Agent';
  statusBar.command = 'kimi-agent.openChat';
  statusBar.show();
  context.subscriptions.push(statusBar);

  const chatProvider = new ChatViewProvider(context.extensionUri, agent, statusBar);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(ChatViewProvider.viewType, chatProvider)
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('kimi-agent.openChat', () => {
      vscode.commands.executeCommand('workbench.view.extension.kimi-agent');
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('kimi-agent.executeTask', async () => {
      const task = await vscode.window.showInputBox({
        prompt: 'What would you like Kimi to do?',
        placeHolder: 'e.g., Create a new component, fix TypeScript errors, run tests...',
      });

      if (task && agent) {
        await agent.executeTask(task);
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('kimi-agent.cancelTask', () => {
      agent?.cancel();
      vscode.window.showInformationMessage('Task cancelled');
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('kimi-agent.showLogs', () => {
      Logger.show();
    })
  );

  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration('kimi-agent')) {
        vscode.window.showInformationMessage('Kimi Agent configuration updated');
      }
    })
  );

  checkApiKey();
}

async function checkApiKey(): Promise<void> {
  const config = vscode.workspace.getConfiguration('kimi-agent');
  const apiKey = config.get<string>('apiKey');

  if (!apiKey) {
    const action = await vscode.window.showWarningMessage(
      'Kimi Agent: API key not configured. Please add your Kimi K2 API key in settings.',
      'Open Settings'
    );

    if (action === 'Open Settings') {
      vscode.commands.executeCommand('workbench.action.openSettings', 'kimi-agent.apiKey');
    }
  }
}

export function deactivate() {
  Logger.info('Kimi K2 Agent extension deactivating...');
  agent?.dispose();
  Logger.dispose();
}
