import * as vscode from 'vscode';
import { KimiClient, createKimiClient } from './kimi-client';
import { ToolExecutor } from '../tools/tool-executor';
import { Logger } from './logger';
import { 
  AgentState, 
  ExecutionStep, 
  ProjectContext, 
  ToolAction, 
  ChatMessage,
  ErrorInfo,
  ToolResult 
} from '../types';

const AVAILABLE_TOOLS: ToolAction[] = [
  'read_file',
  'write_file', 
  'create_file',
  'create_directory',
  'delete_file',
  'list_directory',
  'execute_command',
  'search_files',
  'analyze_error',
  'ask_user',
];

export class Agent {
  private kimiClient: KimiClient;
  private toolExecutor: ToolExecutor;
  private state: AgentState;
  private onStateChange: ((state: AgentState) => void) | undefined;
  
  constructor(workspaceRoot: string) {
    this.kimiClient = createKimiClient();
    this.toolExecutor = new ToolExecutor(workspaceRoot);
    this.state = {
      isRunning: false,
      messages: [],
      errors: [],
    };
  }

  setStateChangeHandler(handler: (state: AgentState) => void): void {
    this.onStateChange = handler;
  }

  async executeTask(task: string): Promise<void> {
    Logger.info('=== Starting new task ===', { task });

    this.updateState({
      isRunning: true,
      currentTask: task,
      currentStep: 0,
    });

    this.addMessage({ role: 'user', content: task, timestamp: Date.now() });

    try {
      Logger.info('Gathering project context...');
      const context = await this.gatherContext();
      Logger.info('Context gathered', { 
        workspaceRoot: context.workspaceRoot,
        projectType: context.projectType,
        openFiles: context.openFiles.length 
      });
      
      Logger.info('Requesting task plan from AI...');
      const { plan, reasoning, confidence } = await this.kimiClient.planTask(
        task,
        context,
        AVAILABLE_TOOLS
      );

      Logger.info('Plan received', { 
        stepCount: plan.length, 
        confidence: `${(confidence * 100).toFixed(0)}%`,
        reasoning 
      });

      this.addMessage({
        role: 'assistant',
        content: `Planning complete (confidence: ${(confidence * 100).toFixed(0)}%)\n\n${reasoning}\n\nSteps: ${plan.length}`,
        timestamp: Date.now(),
      });

      if (plan.length === 0) {
        Logger.warn('AI returned empty plan');
        this.addMessage({
          role: 'assistant',
          content: 'No actions needed for this task.',
          timestamp: Date.now(),
        });
        return;
      }

      this.updateState({ totalSteps: plan.length });

      const config = vscode.workspace.getConfiguration('kimi-agent');
      const maxRetries = config.get<number>('maxRetries') || 3;

      for (let i = 0; i < plan.length; i++) {
        if (!this.state.isRunning) {
          Logger.info('Task cancelled by user');
          this.addMessage({
            role: 'assistant',
            content: 'Task cancelled by user.',
            timestamp: Date.now(),
          });
          break;
        }

        this.updateState({ currentStep: i + 1 });
        const step = plan[i];

        Logger.step(i + 1, plan.length, step.action, step.parameters);

        this.addMessage({
          role: 'assistant',
          content: `Step ${i + 1}/${plan.length}: ${step.action}\nExpected: ${step.expected_outcome}`,
          timestamp: Date.now(),
        });

        const result = await this.toolExecutor.executeWithRecovery(
          step,
          (error, failedStep) => this.handleError(error, failedStep, context),
          maxRetries
        );

        if (result.success) {
          Logger.result(true, result.output || 'Completed successfully');
          
          // Format tool result through AI for better presentation
          let displayOutput = result.output || 'Completed successfully';
          try {
            displayOutput = await this.kimiClient.formatToolResult(
              step.action,
              result.data || result.output,
              task
            );
          } catch (formatError) {
            Logger.debug('Result formatting failed, using raw output', formatError);
            // Fallback to raw output if formatting fails
          }
          
          this.addMessage({
            role: 'assistant', 
            content: `✓ ${displayOutput}`,
            timestamp: Date.now(),
          });
        } else {
          Logger.result(false, result.error || 'Unknown error');
          this.addMessage({
            role: 'assistant',
            content: `✗ Failed: ${result.error}`,
            timestamp: Date.now(),
          });

          const shouldContinue = await this.askToContinue(result.error || 'Unknown error');
          if (!shouldContinue) {
            Logger.info('User chose to stop after error');
            break;
          }
        }
      }

      Logger.info('=== Task execution completed ===');
      this.addMessage({
        role: 'assistant',
        content: 'Task execution completed.',
        timestamp: Date.now(),
      });

    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      Logger.error('Task failed with error', { message, error });
      this.addMessage({
        role: 'assistant',
        content: `Error: ${message}`,
        timestamp: Date.now(),
      });
    } finally {
      this.updateState({
        isRunning: false,
        currentTask: undefined,
        currentStep: undefined,
        totalSteps: undefined,
      });
    }
  }

  async chat(message: string): Promise<string> {
    this.addMessage({ role: 'user', content: message, timestamp: Date.now() });
    
    try {
      const response = await this.kimiClient.chat(message);
      this.addMessage({ role: 'assistant', content: response, timestamp: Date.now() });
      return response;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Chat failed';
      this.addMessage({ role: 'assistant', content: `Error: ${message}`, timestamp: Date.now() });
      throw error;
    }
  }

  cancel(): void {
    this.updateState({ isRunning: false });
  }

  getState(): AgentState {
    return { ...this.state };
  }

  clearHistory(): void {
    this.state.messages = [];
    this.state.errors = [];
    this.kimiClient.clearHistory();
    this.toolExecutor.clearHistory();
    this.notifyStateChange();
  }

  private async handleError(
    error: ErrorInfo,
    failedStep: ExecutionStep,
    context: ProjectContext
  ): Promise<ExecutionStep[] | null> {
    this.state.errors.push(error);
    
    this.addMessage({
      role: 'assistant',
      content: `Analyzing error: ${error.type} - ${error.message}`,
      timestamp: Date.now(),
    });

    try {
      const analysis = await this.kimiClient.analyzeError({
        message: error.message,
        context: error.context || '',
        command: error.source,
      });

      if (analysis.suggestions.length > 0) {
        this.addMessage({
          role: 'assistant',
          content: `Recovery suggestion: ${analysis.analysis}`,
          timestamp: Date.now(),
        });

        const approve = await vscode.window.showInformationMessage(
          `Error detected: ${error.message}\n\nSuggested fix: ${analysis.analysis}\n\nApply fix?`,
          'Yes',
          'No',
          'Skip Step'
        );

        if (approve === 'Yes') {
          return analysis.suggestions;
        } else if (approve === 'Skip Step') {
          return [];
        }
      }
    } catch (analysisError) {
      console.error('Error analysis failed:', analysisError);
    }

    return null;
  }

  private async gatherContext(): Promise<ProjectContext> {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    const workspaceRoot = workspaceFolders?.[0]?.uri.fsPath || '';
    
    const activeEditor = vscode.window.activeTextEditor;
    const openFiles = vscode.window.tabGroups.all
      .flatMap(group => group.tabs)
      .filter(tab => tab.input instanceof vscode.TabInputText)
      .map(tab => (tab.input as vscode.TabInputText).uri.fsPath)
      .slice(0, 10);

    let projectType: string | undefined;
    const packageJsonResult = await this.toolExecutor.execute({
      action: 'read_file',
      parameters: { path: 'package.json' },
      expected_outcome: 'Read package.json',
    });

    if (packageJsonResult.success && typeof packageJsonResult.data === 'string') {
      try {
        const pkg = JSON.parse(packageJsonResult.data);
        if (pkg.dependencies?.next || pkg.devDependencies?.next) {
          projectType = 'Next.js';
        } else if (pkg.dependencies?.react) {
          projectType = 'React';
        } else if (pkg.dependencies?.express) {
          projectType = 'Express';
        } else {
          projectType = 'Node.js';
        }
      } catch {
        // Not valid JSON
      }
    }

    return {
      workspaceRoot,
      currentFile: activeEditor?.document.uri.fsPath,
      openFiles,
      recentErrors: this.state.errors.slice(-5),
      projectType,
    };
  }

  private async askToContinue(error: string): Promise<boolean> {
    const result = await vscode.window.showWarningMessage(
      `Step failed: ${error}\n\nContinue with remaining steps?`,
      'Continue',
      'Stop'
    );
    return result === 'Continue';
  }

  private addMessage(message: ChatMessage): void {
    this.state.messages.push(message);
    this.notifyStateChange();
  }

  private updateState(updates: Partial<AgentState>): void {
    this.state = { ...this.state, ...updates };
    this.notifyStateChange();
  }

  private notifyStateChange(): void {
    this.onStateChange?.(this.getState());
  }

  dispose(): void {
    this.toolExecutor.dispose();
  }
}
