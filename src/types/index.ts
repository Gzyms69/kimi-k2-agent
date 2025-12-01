export interface KimiRequest {
  task: string;
  context: ProjectContext;
  available_tools: string[];
  format: 'json';
}

export interface KimiResponse {
  plan: ExecutionStep[];
  reasoning: string;
  confidence: number;
}

export interface ExecutionStep {
  action: ToolAction;
  parameters: Record<string, unknown>;
  expected_outcome: string;
  rollback_plan?: ExecutionStep[];
}

export type ToolAction = 
  | 'read_file'
  | 'write_file'
  | 'create_file'
  | 'create_directory'
  | 'delete_file'
  | 'list_directory'
  | 'execute_command'
  | 'search_files'
  | 'analyze_error'
  | 'ask_user';

export interface ProjectContext {
  workspaceRoot: string;
  currentFile?: string;
  openFiles: string[];
  recentErrors: ErrorInfo[];
  projectType?: string;
  dependencies?: Record<string, string>;
}

export interface ErrorInfo {
  type: ErrorType;
  message: string;
  source: string;
  line?: number;
  column?: number;
  timestamp: number;
  context?: string;
}

export type ErrorType =
  | 'command_not_found'
  | 'permission_denied'
  | 'syntax_error'
  | 'dependency_missing'
  | 'network_error'
  | 'file_not_found'
  | 'compilation_error'
  | 'runtime_error'
  | 'unknown';

export interface ToolResult {
  success: boolean;
  data?: unknown;
  error?: string;
  output?: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  toolCalls?: ToolCall[];
}

export interface ToolCall {
  id: string;
  tool: ToolAction;
  parameters: Record<string, unknown>;
  result?: ToolResult;
  status: 'pending' | 'running' | 'completed' | 'failed';
}

export interface AgentState {
  isRunning: boolean;
  currentTask?: string;
  currentStep?: number;
  totalSteps?: number;
  messages: ChatMessage[];
  errors: ErrorInfo[];
}

export interface KimiConfig {
  apiKey: string;
  apiEndpoint: string;
  model: string;
  autoApprove: boolean;
  maxRetries: number;
}
