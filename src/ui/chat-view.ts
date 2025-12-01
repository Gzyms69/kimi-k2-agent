import * as vscode from 'vscode';
import { Agent } from '../core/agent';
import { AgentState } from '../types';
import { Logger } from '../core/logger';

export class ChatViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'kimi-agent.chatView';
  private webviewView: vscode.WebviewView | undefined;
  private agent: Agent;
  private statusBar: vscode.StatusBarItem;

  constructor(
    private readonly extensionUri: vscode.Uri,
    agent: Agent,
    statusBar: vscode.StatusBarItem
  ) {
    this.agent = agent;
    this.statusBar = statusBar;
    this.agent.setStateChangeHandler((state) => {
      Logger.info('State change received in ChatViewProvider', { 
        messageCount: state.messages.length,
        isRunning: state.isRunning 
      });
      this.updateWebview(state);
      this.updateStatusBar(state);
    });
  }

  private updateStatusBar(state: AgentState): void {
    if (state.isRunning) {
      this.statusBar.text = `$(sync~spin) Kimi: ${state.currentStep}/${state.totalSteps}`;
      this.statusBar.tooltip = `Running: ${state.currentTask}`;
    } else {
      this.statusBar.text = '$(robot) Kimi';
      this.statusBar.tooltip = 'Click to open Kimi Agent';
    }
  }

  resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ): void {
    this.webviewView = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this.extensionUri],
    };

    webviewView.webview.html = this.getHtmlContent();

    // Handle webview visibility changes - resync state when becoming visible
    webviewView.onDidChangeVisibility(() => {
      if (webviewView.visible) {
        Logger.info('Webview became visible, resyncing state');
        this.updateWebview(this.agent.getState());
      } else {
        Logger.info('Webview hidden');
      }
    });

    webviewView.webview.onDidReceiveMessage(async (message) => {
      switch (message.type) {
        case 'executeTask':
          await this.agent.executeTask(message.text);
          break;
        case 'chat':
          await this.agent.chat(message.text);
          break;
        case 'cancel':
          this.agent.cancel();
          break;
        case 'clear':
          this.agent.clearHistory();
          break;
      }
    });

    this.updateWebview(this.agent.getState());
  }

  private updateWebview(state: AgentState): void {
    if (!this.webviewView) {
      Logger.warn('Webview not available, cannot update');
      return;
    }
    Logger.info('Posting state to webview', { messageCount: state.messages.length });
    
    // Deep clone to ensure proper serialization
    const serializedState = JSON.parse(JSON.stringify({
      isRunning: state.isRunning,
      currentTask: state.currentTask,
      currentStep: state.currentStep,
      totalSteps: state.totalSteps,
      messages: state.messages,
      errors: state.errors,
    }));
    
    this.webviewView.webview.postMessage({
      type: 'stateUpdate',
      state: serializedState,
    });
  }

  private getHtmlContent(): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Kimi Agent</title>
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    
    body {
      font-family: var(--vscode-font-family);
      font-size: var(--vscode-font-size);
      color: var(--vscode-foreground);
      background: var(--vscode-sideBar-background);
      height: 100vh;
      display: flex;
      flex-direction: column;
    }
    
    .header {
      padding: 12px;
      border-bottom: 1px solid var(--vscode-panel-border);
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    .header h2 {
      font-size: 14px;
      font-weight: 600;
      flex: 1;
    }
    
    .status {
      font-size: 12px;
      color: var(--vscode-descriptionForeground);
    }
    
    .status.running {
      color: var(--vscode-charts-yellow);
    }
    
    .messages {
      flex: 1;
      overflow-y: auto;
      padding: 12px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    
    .message {
      padding: 10px 12px;
      border-radius: 8px;
      max-width: 95%;
      white-space: pre-wrap;
      word-break: break-word;
      font-size: 13px;
      line-height: 1.5;
    }
    
    .message.user {
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      align-self: flex-end;
      border-bottom-right-radius: 4px;
    }
    
    .message.assistant {
      background: var(--vscode-editor-background);
      border: 1px solid var(--vscode-panel-border);
      align-self: flex-start;
      border-bottom-left-radius: 4px;
    }
    
    .message.system {
      background: var(--vscode-inputValidation-infoBackground);
      border: 1px solid var(--vscode-inputValidation-infoBorder);
      align-self: center;
      font-size: 12px;
      text-align: center;
    }
    
    .input-area {
      padding: 12px;
      border-top: 1px solid var(--vscode-panel-border);
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    
    .input-row {
      display: flex;
      gap: 8px;
    }
    
    textarea {
      flex: 1;
      padding: 10px;
      border: 1px solid var(--vscode-input-border);
      background: var(--vscode-input-background);
      color: var(--vscode-input-foreground);
      border-radius: 6px;
      resize: none;
      font-family: inherit;
      font-size: 13px;
      min-height: 60px;
    }
    
    textarea:focus {
      outline: 1px solid var(--vscode-focusBorder);
    }
    
    .buttons {
      display: flex;
      gap: 8px;
    }
    
    button {
      padding: 8px 16px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 13px;
      font-weight: 500;
      transition: opacity 0.2s;
    }
    
    button:hover {
      opacity: 0.9;
    }
    
    button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    
    .btn-primary {
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
    }
    
    .btn-secondary {
      background: var(--vscode-button-secondaryBackground);
      color: var(--vscode-button-secondaryForeground);
    }
    
    .btn-danger {
      background: var(--vscode-inputValidation-errorBackground);
      color: var(--vscode-errorForeground);
    }
    
    .progress {
      height: 3px;
      background: var(--vscode-progressBar-background);
      border-radius: 2px;
      overflow: hidden;
    }
    
    .progress-bar {
      height: 100%;
      background: var(--vscode-button-background);
      transition: width 0.3s ease;
    }
    
    .empty-state {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      color: var(--vscode-descriptionForeground);
      text-align: center;
      padding: 20px;
    }
    
    .empty-state h3 {
      margin-bottom: 8px;
      color: var(--vscode-foreground);
    }
    
    .empty-state p {
      font-size: 12px;
      max-width: 250px;
    }
  </style>
</head>
<body>
  <div class="header">
    <h2>🤖 Kimi Agent</h2>
    <span id="status" class="status">Ready</span>
  </div>
  
  <div id="messages" class="messages">
    <div class="empty-state">
      <h3>Welcome to Kimi Agent</h3>
      <p><strong>Execute Task:</strong> "create a React component", "fix TypeScript errors", "list all files as a tree"</p>
      <p><strong>Ask Question:</strong> "what's this code doing?", "how do I...?", "explain this error"</p>
    </div>
  </div>
  
  <div id="progress-container" style="display: none; padding: 0 12px;">
    <div class="progress">
      <div id="progress-bar" class="progress-bar" style="width: 0%"></div>
    </div>
  </div>
  
  <div class="input-area">
    <textarea 
      id="input" 
      placeholder="Describe a task (e.g., 'create a component') or ask a question..."
      rows="2"
    ></textarea>
    <div class="buttons">
      <button id="execute-btn" class="btn-primary" title="Execute a task or command">Execute Task</button>
      <button id="chat-btn" class="btn-secondary" title="Ask a question or get help">Ask Question</button>
      <button id="cancel-btn" class="btn-danger" style="display: none;" title="Stop current execution">Cancel</button>
      <button id="clear-btn" class="btn-secondary" title="Clear chat history">Clear</button>
    </div>
  </div>

  <script>
    const vscode = acquireVsCodeApi();
    
    const messagesEl = document.getElementById('messages');
    const inputEl = document.getElementById('input');
    const statusEl = document.getElementById('status');
    const progressContainer = document.getElementById('progress-container');
    const progressBar = document.getElementById('progress-bar');
    const executeBtn = document.getElementById('execute-btn');
    const chatBtn = document.getElementById('chat-btn');
    const cancelBtn = document.getElementById('cancel-btn');
    const clearBtn = document.getElementById('clear-btn');
    
    let isRunning = false;
    
    function renderMessages(messages) {
      console.log('[KIMI]', 'renderMessages:', messages?.length || 0);
      if (!messages || messages.length === 0) {
        messagesEl.innerHTML = \`
          <div class="empty-state">
            <h3>Welcome to Kimi Agent</h3>
            <p><strong>Execute Task:</strong> "create a React component", "fix TypeScript errors", "list all files as a tree"</p>
            <p><strong>Ask Question:</strong> "what's this code doing?", "how do I...?", "explain this error"</p>
          </div>
        \`;
        return;
      }
      
      console.log('[KIMI]', 'Rendering:', messages.map(m => m.role));
      messagesEl.innerHTML = messages.map(msg => \`
        <div class="message \${msg.role}">
          \${escapeHtml(msg.content || '')}
        </div>
      \`).join('');
      
      messagesEl.scrollTop = messagesEl.scrollHeight;
    }
    
    function escapeHtml(text) {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }
    
    function updateUI(state) {
      console.log('[KIMI]', 'updateUI:', state?.messages?.length || 0, 'messages');
      isRunning = state.isRunning;
      
      statusEl.textContent = state.isRunning 
        ? \`Running: Step \${state.currentStep || 0}/\${state.totalSteps || '?'}\`
        : 'Ready';
      statusEl.className = 'status' + (state.isRunning ? ' running' : '');
      
      if (state.isRunning && state.totalSteps) {
        progressContainer.style.display = 'block';
        const percent = ((state.currentStep || 0) / state.totalSteps) * 100;
        progressBar.style.width = percent + '%';
      } else {
        progressContainer.style.display = 'none';
      }
      
      executeBtn.disabled = state.isRunning;
      chatBtn.disabled = state.isRunning;
      cancelBtn.style.display = state.isRunning ? 'inline-block' : 'none';
      inputEl.disabled = state.isRunning;
      
      renderMessages(state.messages || []);
    }
    
    executeBtn.addEventListener('click', () => {
      const text = inputEl.value.trim();
      if (text && !isRunning) {
        console.log('[KIMI]', 'Executing task:', text.substring(0, 50));
        vscode.postMessage({ type: 'executeTask', text });
        inputEl.value = '';
      }
    });
    
    chatBtn.addEventListener('click', () => {
      const text = inputEl.value.trim();
      if (text && !isRunning) {
        console.log('[KIMI]', 'Asking question:', text.substring(0, 50));
        vscode.postMessage({ type: 'chat', text });
        inputEl.value = '';
      }
    });
    
    cancelBtn.addEventListener('click', () => {
      vscode.postMessage({ type: 'cancel' });
    });
    
    clearBtn.addEventListener('click', () => {
      vscode.postMessage({ type: 'clear' });
    });
    
    inputEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey && !isRunning) {
        e.preventDefault();
        const text = inputEl.value.trim();
        if (text) {
          vscode.postMessage({ type: 'executeTask', text });
          inputEl.value = '';
        }
      }
    });
    
    window.addEventListener('message', (event) => {
      const message = event.data;
      console.log('[KIMI]', 'Received:', message.type, 'messages:', message.state?.messages?.length || 0);
      if (message.type === 'stateUpdate') {
        updateUI(message.state);
      }
    });
    
    console.log('[KIMI]', 'Webview initialized');
  </script>
</body>
</html>`;
  }
}
