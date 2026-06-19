// ============================================================================
// OpenCode Studio - Core Types
// ============================================================================

// ----------------------------------------------------------------------------
// LLM Provider Types
// ----------------------------------------------------------------------------

export type ProviderName = 
  | 'openrouter'
  | 'anthropic'
  | 'openai'
  | 'google'
  | 'deepseek'
  | 'mistral'
  | 'groq'
  | 'cerebras'
  | 'ollama'
  | 'lmstudio'
  | 'custom';

export interface ProviderConfig {
  name: ProviderName;
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  embeddingModel?: string;
  maxTokens?: number;
  temperature?: number;
  timeout?: number;
}

export interface CompletionOptions {
  messages: Message[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
  tools?: Tool[];
  toolChoice?: string;
  stop?: string[];
}

export interface EmbeddingOptions {
  model?: string;
  input: string | string[];
}

// ----------------------------------------------------------------------------
// Message Types
// ----------------------------------------------------------------------------

export type MessageRole = 'system' | 'user' | 'assistant' | 'tool';

export interface Message {
  role: MessageRole;
  content: string;
  name?: string;
  toolCalls?: ToolCall[];
  toolCallId?: string;
}

export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

// ----------------------------------------------------------------------------
// Tool Types
// ----------------------------------------------------------------------------

export type ToolName = 
  | 'read_file'
  | 'write_file'
  | 'edit_file'
  | 'delete_file'
  | 'move_file'
  | 'list_directory'
  | 'search_files'
  | 'glob'
  | 'grep'
  | 'terminal'
  | 'git_status'
  | 'git_diff'
  | 'git_log'
  | 'git_commit'
  | 'git_branch'
  | 'git_checkout'
  | 'git_merge'
  | 'git_rebase'
  | 'browser_navigate'
  | 'browser_click'
  | 'browser_type'
  | 'browser_screenshot'
  | 'mcp_tool';

export interface Tool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  handler: ToolHandler;
}

export type ToolHandler = (
  input: Record<string, unknown>,
  context: ToolContext
) => Promise<ToolResult>;

export interface ToolContext {
  workspace: string;
  sessionId: string;
  userId: string;
  permissions: Permission[];
}

export interface ToolResult {
  success: boolean;
  output?: string;
  error?: string;
}

// ----------------------------------------------------------------------------
// Agent Types
// ----------------------------------------------------------------------------

export type AgentMode = 'observe' | 'think' | 'plan' | 'act' | 'verify' | 'reflect';

export interface AgentConfig {
  name: string;
  description: string;
  model?: string;
  temperature?: number;
  maxIterations?: number;
  tools?: Tool[];
  permissions?: Permission[];
  memoryEnabled?: boolean;
  streamingEnabled?: boolean;
}

export interface AgentState {
  mode: AgentMode;
  currentTask?: string;
  plan?: string[];
  executedSteps: string[];
  toolResults: Map<string, ToolResult>;
  memory: MemoryEntry[];
  errors: string[];
}

export interface AgentResponse {
  content: string;
  toolCalls?: ToolCall[];
  done: boolean;
  metadata?: Record<string, unknown>;
}

// ----------------------------------------------------------------------------
// Permission Types
// ----------------------------------------------------------------------------

export type Permission = 
  | 'read:all'
  | 'read:path'
  | 'write:all'
  | 'write:path'
  | 'exec:all'
  | 'exec:path'
  | 'network:all'
  | 'network:http'
  | 'git:all'
  | 'browser:all';

export interface PermissionContext {
  path?: string;
  command?: string;
  url?: string;
}

// ----------------------------------------------------------------------------
// Memory Types
// ----------------------------------------------------------------------------

export interface MemoryEntry {
  id: string;
  type: 'preference' | 'knowledge' | 'conversation' | 'project';
  content: string;
  metadata: Record<string, unknown>;
  embedding?: number[];
  createdAt: Date;
  updatedAt: Date;
  accessCount: number;
}

export interface MemoryQuery {
  query: string;
  type?: MemoryEntry['type'];
  limit?: number;
  threshold?: number;
}

// ----------------------------------------------------------------------------
// Project Types
// ----------------------------------------------------------------------------

export interface Project {
  id: string;
  name: string;
  path: string;
  description?: string;
  techStack: string[];
  files: number;
  lastAccessed: Date;
  indexStatus: 'pending' | 'indexing' | 'indexed' | 'error';
}

export interface ProjectIndex {
  projectId: string;
  summary: string;
  architecture: string;
  techStack: string[];
  criticalComponents: string[];
  dependencies: DependencyGraph;
  imports: ImportGraph;
}

export interface DependencyGraph {
  nodes: DependencyNode[];
  edges: DependencyEdge[];
}

export interface DependencyNode {
  id: string;
  name: string;
  type: 'file' | 'directory' | 'package';
  path: string;
}

export interface DependencyEdge {
  source: string;
  target: string;
  type: 'import' | 'export' | 'call' | 'inherit';
}

export interface ImportGraph {
  nodes: ImportNode[];
  edges: ImportEdge[];
}

export interface ImportNode {
  id: string;
  file: string;
  exports: string[];
}

export interface ImportEdge {
  source: string;
  target: string;
  imports: string[];
}

// ----------------------------------------------------------------------------
// Session Types
// ----------------------------------------------------------------------------

export interface Session {
  id: string;
  projectId?: string;
  mode: SessionMode;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
}

export type SessionMode = 'chat' | 'agent' | 'review' | 'test';

export interface ConversationCheckpoint {
  id: string;
  sessionId: string;
  messageIndex: number;
  summary: string;
  createdAt: Date;
}

// ----------------------------------------------------------------------------
// Git Types
// ----------------------------------------------------------------------------

export interface GitStatus {
  branch: string;
  ahead: number;
  behind: number;
  staged: FileChange[];
  modified: FileChange[];
  untracked: string[];
  conflicted: string[];
}

export interface FileChange {
  path: string;
  status: 'added' | 'modified' | 'deleted' | 'renamed';
  additions?: number;
  deletions?: number;
}

export interface GitDiff {
  file: string;
  hunks: DiffHunk[];
}

export interface DiffHunk {
  header: string;
  lines: DiffLine[];
}

export interface DiffLine {
  type: 'context' | 'add' | 'delete';
  content: string;
  oldLineNumber?: number;
  newLineNumber?: number;
}

export interface CommitInfo {
  hash: string;
  message: string;
  author: string;
  date: Date;
  files: string[];
}

// ----------------------------------------------------------------------------
// MCP Types
// ----------------------------------------------------------------------------

export interface MCPServer {
  name: string;
  command: string;
  args?: string[];
  env?: Record<string, string>;
  tools?: MCPTool[];
  status: 'running' | 'stopped' | 'error';
}

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

export interface MCPMessage {
  jsonrpc: '2.0';
  id: string | number;
  method?: string;
  params?: Record<string, unknown>;
  result?: unknown;
  error?: MCPError;
}

export interface MCPError {
  code: number;
  message: string;
  data?: unknown;
}

// ----------------------------------------------------------------------------
// API Types
// ----------------------------------------------------------------------------

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// ----------------------------------------------------------------------------
// Settings Types
// ----------------------------------------------------------------------------

export interface Settings {
  apiKeys: Record<ProviderName, string>;
  defaultProvider: ProviderName;
  defaultModel: string;
  sandboxMode: 'readonly' | 'ask_edit' | 'ask_command' | 'autonomous';
  theme: 'light' | 'dark' | 'system';
  editor?: string;
  terminal?: string;
  mcpServers: MCPServer[];
  plugins: string[];
}

export const DEFAULT_SETTINGS: Settings = {
  apiKeys: {},
  defaultProvider: 'openrouter',
  defaultModel: 'anthropic/claude-3.5-sonnet',
  sandboxMode: 'ask_edit',
  theme: 'dark',
  mcpServers: [],
  plugins: [],
};
