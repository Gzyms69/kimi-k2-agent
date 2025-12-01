import * as vscode from 'vscode';
import { KimiConfig, ProjectContext, ExecutionStep, ChatMessage, ToolAction } from '../types';
import { Logger } from './logger';

const TASK_SYSTEM_PROMPT = `You are an AI coding agent integrated into VS Code. You help users manage their projects through natural language commands.

You have access to these tools:
- read_file: Read file contents. Parameters: { "path": "relative/path/to/file" }
- write_file: Write/update file contents. Parameters: { "path": "...", "content": "..." }
- create_file: Create new files. Parameters: { "path": "...", "content": "..." }
- create_directory: Create new directories. Parameters: { "path": "..." }
- delete_file: Delete files. Parameters: { "path": "..." }
- list_directory: List directory contents. Parameters: { "path": "." }
- execute_command: Run terminal commands. Parameters: { "command": "npm install", "cwd": "optional/path" }
- search_files: Search for files or content. Parameters: { "pattern": "**/*.ts", "content": "optional search text" }
- ask_user: Ask user for clarification. Parameters: { "question": "..." }

When given a task:
1. Analyze what needs to be done
2. Create a step-by-step plan using the available tools
3. Return ONLY a valid JSON response with your plan

You MUST respond with this exact JSON format:
{
  "plan": [
    {
      "action": "tool_name",
      "parameters": { },
      "expected_outcome": "description of what this step achieves"
    }
  ],
  "reasoning": "brief explanation of your approach",
  "confidence": 0.85
}

Rules:
- Always use valid tool names from the list above
- Parameters must match what each tool expects
- Be precise and safe
- For file paths, use relative paths from workspace root
- Confidence should be 0.0 to 1.0`;

const CHAT_SYSTEM_PROMPT = `You are a helpful AI assistant integrated into VS Code. You help developers by answering questions, providing explanations, and offering coding advice.

Respond naturally and conversationally. Be concise but thorough. If the user asks you to perform a task (like "create a file" or "run a command"), acknowledge it but explain that they should use the "Execute Task" button for that.

If the user references files or code, provide helpful context and suggestions. Be professional but friendly.`;

const RESULT_FORMATTING_PROMPT = `You executed a tool and got results. Now format the output in a user-friendly way for the developer.

Guidelines:
- If it's a file/directory list, format as a tree or organized list
- If it's error output, highlight the key issue
- If it's command output, summarize the important parts
- Keep it concise but complete
- Add helpful context or next steps if relevant
- Use markdown formatting for better readability

Respond with ONLY the formatted output/interpretation, no JSON, no extra text.`;

export class KimiClient {
  private config: KimiConfig;
  private conversationHistory: ChatMessage[] = [];

  constructor(config: KimiConfig) {
    this.config = config;
    
    Logger.info('Initializing API client', {
      endpoint: config.apiEndpoint,
      model: config.model,
      hasApiKey: !!config.apiKey,
    });
  }

  updateConfig(config: Partial<KimiConfig>): void {
    this.config = { ...this.config, ...config };
    Logger.info('Config updated', { endpoint: this.config.apiEndpoint, model: this.config.model });
  }

  clearHistory(): void {
    this.conversationHistory = [];
    Logger.info('Conversation history cleared');
  }

  private async makeRequest(body: object): Promise<any> {
    const url = `${this.config.apiEndpoint}/chat/completions`;
    
    Logger.api('REQUEST', url, {
      model: (body as any).model,
      messageCount: (body as any).messages?.length,
    });

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://github.com/kimi-vsc-agent',
        'X-Title': 'Kimi VS Code Agent',
      },
      body: JSON.stringify(body),
    });

    const data: any = await response.json();

    if (!response.ok) {
      Logger.api('RESPONSE', `${response.status} ERROR`, data);
      this.handleApiError(response.status, data);
    }

    Logger.api('RESPONSE', `${response.status} OK`, {
      model: data?.model,
      usage: data?.usage,
      finishReason: data?.choices?.[0]?.finish_reason,
    });

    return data;
  }

  async planTask(
    task: string,
    context: ProjectContext,
    availableTools: ToolAction[]
  ): Promise<{ plan: ExecutionStep[]; reasoning: string; confidence: number }> {
    Logger.info('Planning task', { task, projectType: context.projectType });
    
    const userMessage = this.buildTaskPrompt(task, context, availableTools);
    
    this.conversationHistory.push({
      role: 'user',
      content: userMessage,
      timestamp: Date.now(),
    });

    const messages = [
      { role: 'system', content: TASK_SYSTEM_PROMPT },
      ...this.conversationHistory.map(m => ({ role: m.role, content: m.content })),
    ];

    try {
      Logger.debug('Sending request to API', { messageCount: messages.length });
      
      const data = await this.makeRequest({
        model: this.config.model,
        messages,
        temperature: 0.3,
        max_tokens: 4096,
      });

      const content = data.choices[0]?.message?.content;
      Logger.debug('Raw API response content', content);

      if (!content) {
        throw new Error('Empty response from API');
      }

      let parsed;
      try {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        const jsonStr = jsonMatch ? jsonMatch[0] : content;
        parsed = JSON.parse(jsonStr);
      } catch (parseError) {
        Logger.error('Failed to parse JSON response', { content, error: parseError });
        throw new Error(`Invalid JSON response from AI: ${content.substring(0, 200)}`);
      }

      Logger.info('Task plan created', {
        steps: parsed.plan?.length || 0,
        confidence: parsed.confidence,
        reasoning: parsed.reasoning?.substring(0, 100),
      });

      if (parsed.plan) {
        parsed.plan.forEach((step: ExecutionStep, i: number) => {
          Logger.debug(`Plan step ${i + 1}`, { action: step.action, parameters: step.parameters });
        });
      }

      this.conversationHistory.push({
        role: 'assistant',
        content: content,
        timestamp: Date.now(),
      });

      return {
        plan: parsed.plan || [],
        reasoning: parsed.reasoning || '',
        confidence: parsed.confidence || 0.5,
      };
    } catch (error) {
      if (error instanceof Error && error.message.includes('API')) {
        throw error;
      }
      Logger.error('Request failed', error);
      throw error;
    }
  }

  async chat(message: string): Promise<string> {
    Logger.info('Chat message', { message: message.substring(0, 50) });

    this.conversationHistory.push({
      role: 'user',
      content: message,
      timestamp: Date.now(),
    });

    const messages = [
      { role: 'system', content: CHAT_SYSTEM_PROMPT },
      ...this.conversationHistory.map(m => ({ role: m.role, content: m.content })),
    ];

    try {
      const data = await this.makeRequest({
        model: this.config.model,
        messages,
        temperature: 0.7,
        max_tokens: 4096,
      });

      const content = data.choices[0]?.message?.content || '';
      
      this.conversationHistory.push({
        role: 'assistant',
        content: content,
        timestamp: Date.now(),
      });

      Logger.info('Chat response received', { length: content.length });
      return content;
    } catch (error) {
      if (error instanceof Error && error.message.includes('API')) {
        throw error;
      }
      Logger.error('Chat request failed', error);
      throw error;
    }
  }

  async analyzeError(
    errorInfo: { message: string; context: string; command?: string }
  ): Promise<{ analysis: string; suggestions: ExecutionStep[] }> {
    Logger.info('Analyzing error', { message: errorInfo.message });

    const prompt = `Analyze this error and suggest fixes:

Error: ${errorInfo.message}
Context: ${errorInfo.context}
${errorInfo.command ? `Command: ${errorInfo.command}` : ''}

Respond with JSON:
{
  "analysis": "explanation of what went wrong",
  "suggestions": [
    {
      "action": "tool_name",
      "parameters": { },
      "expected_outcome": "what this will fix"
    }
  ]
}`;

    try {
      const data = await this.makeRequest({
        model: this.config.model,
        messages: [
          { role: 'system', content: TASK_SYSTEM_PROMPT },
          { role: 'user', content: prompt },
        ],
        temperature: 0.3,
        max_tokens: 2048,
      });

      const content = data.choices[0]?.message?.content;
      const jsonMatch = content?.match(/\{[\s\S]*\}/);
      const result = JSON.parse(jsonMatch?.[0] || '{"analysis":"","suggestions":[]}');
      
      Logger.info('Error analysis complete', { 
        analysis: result.analysis?.substring(0, 100),
        suggestionCount: result.suggestions?.length 
      });

      return result;
    } catch (error) {
      Logger.error('Error analysis failed', error);
      return { analysis: 'Failed to analyze error', suggestions: [] };
    }
  }

  async formatToolResult(
    toolName: string,
    result: unknown,
    context: string
  ): Promise<string> {
    Logger.info('Formatting tool result', { toolName, context: context.substring(0, 50) });

    const prompt = `${RESULT_FORMATTING_PROMPT}

Tool Used: ${toolName}
Original Request: ${context}
Tool Result:
${JSON.stringify(result, null, 2)}`;

    try {
      const data = await this.makeRequest({
        model: this.config.model,
        messages: [
          { role: 'system', content: RESULT_FORMATTING_PROMPT },
          { role: 'user', content: prompt },
        ],
        temperature: 0.5,
        max_tokens: 2048,
      });

      const content = data.choices[0]?.message?.content || '';
      Logger.info('Result formatted', { length: content.length });
      return content;
    } catch (error) {
      Logger.error('Result formatting failed', error);
      // Fallback: return raw result as formatted string
      return typeof result === 'string' ? result : JSON.stringify(result, null, 2);
    }
  }

  private handleApiError(status: number, data: any): void {
    const message = data?.error?.message || 'Unknown error';
    
    Logger.error('API Error', { status, message, data });

    if (status === 401) {
      vscode.window.showErrorMessage('Invalid API key. Check your OpenRouter API key in settings.');
      throw new Error('Invalid API key. Please check your API key in settings.');
    } else if (status === 402) {
      vscode.window.showErrorMessage('Insufficient credits on OpenRouter. Please add credits.');
      throw new Error('Insufficient credits. Please add credits to your OpenRouter account.');
    } else if (status === 429) {
      vscode.window.showErrorMessage('Rate limit exceeded. Please wait and try again.');
      throw new Error('Rate limit exceeded. Please wait and try again.');
    } else if (status === 400) {
      throw new Error(`Bad request: ${message}`);
    }
    throw new Error(`API error (${status}): ${message}`);
  }

  private buildTaskPrompt(
    task: string,
    context: ProjectContext,
    availableTools: ToolAction[]
  ): string {
    return `Task: ${task}

Project Context:
- Workspace: ${context.workspaceRoot}
- Current File: ${context.currentFile || 'none'}
- Open Files: ${context.openFiles.slice(0, 5).join(', ') || 'none'}
- Project Type: ${context.projectType || 'unknown'}
${context.recentErrors.length > 0 
  ? `- Recent Errors: ${context.recentErrors.map(e => e.message).join('; ')}`
  : ''}

Available Tools: ${availableTools.join(', ')}

IMPORTANT: If a directory needs to be created, use the 'create_directory' tool first before trying to create files in it.

Analyze this task and provide a JSON execution plan.`;
  }
}

export function createKimiClient(): KimiClient {
  const config = vscode.workspace.getConfiguration('kimi-agent');
  
  const clientConfig: KimiConfig = {
    apiKey: config.get<string>('apiKey') || '',
    apiEndpoint: config.get<string>('apiEndpoint') || 'https://openrouter.ai/api/v1',
    model: config.get<string>('model') || 'moonshotai/kimi-k2:free',
    autoApprove: config.get<boolean>('autoApprove') || false,
    maxRetries: config.get<number>('maxRetries') || 3,
  };

  Logger.info('Creating Kimi client with config', {
    endpoint: clientConfig.apiEndpoint,
    model: clientConfig.model,
    hasApiKey: !!clientConfig.apiKey,
  });

  return new KimiClient(clientConfig);
}
