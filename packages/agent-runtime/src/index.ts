// ============================================================================
// OpenCode Studio - Agent Runtime
// ============================================================================

// Re-export types
export type {
  AgentConfig,
  AgentState,
  AgentResponse,
  AgentMode,
  Tool,
  ToolResult,
  ToolContext,
  Message,
  ToolCall,
} from '@opencode/shared';

// Re-export providers
export {
  createProvider,
  BaseLLMProvider,
  OpenRouterProvider,
  AnthropicProvider,
  OpenAIProvider,
  GeminiProvider,
  type LLMResponse,
  type StreamChunk,
} from './providers/llm.js';

// Re-export agent
export {
  CodeAgent,
  AgentOrchestrator,
  createCodeReviewAgent,
  createTestAgent,
  createDebugAgent,
  type SubAgent,
} from './agent/agent.js';

// Re-export tools
export {
  fileTools,
  readFileTool,
  writeFileTool,
  editFileTool,
  deleteFileTool,
  moveFileTool,
  listDirectoryTool,
  globTool,
  grepTool,
  createDirectoryTool,
  fileExistsTool,
} from './tools/file.js';

export {
  terminalTools,
  gitTools,
  terminalTool,
  terminalStreamTool,
  gitStatusTool,
  gitDiffTool,
  gitLogTool,
  gitCommitTool,
  gitBranchTool,
  gitCheckoutTool,
  gitMergeTool,
  gitRebaseTool,
  gitRemoteTool,
  gitPushTool,
  gitPullTool,
  gitStashTool,
} from './tools/terminal.js';

// Re-export memory
export {
  MemoryStore,
  VectorStore,
  createMemorySystem,
} from './memory/index.js';

// Re-export context
export {
  ContextManager,
  truncateMessages,
  estimateTokens,
} from './context/index.js';

// Re-export MCP
export {
  MCPServer,
  MCPClient,
  createMCPServer,
} from './mcp/index.js';

// Default tools export
import { fileTools } from './tools/file.js';
import { terminalTools, gitTools } from './tools/terminal.js';

export const defaultTools = [...fileTools, ...terminalTools, ...gitTools];
