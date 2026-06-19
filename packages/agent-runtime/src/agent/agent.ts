// ============================================================================
// OpenCode Studio - Autonomous Agent Implementation
// ============================================================================

import { randomUUID } from 'crypto';
import type {
  AgentConfig,
  AgentState,
  AgentResponse,
  Message,
  Tool,
  ToolResult,
  ToolContext,
  AgentMode,
} from '@opencode/shared';
import { generateId } from '@opencode/shared';
import type { BaseLLMProvider, LLMResponse, StreamChunk } from '../providers/llm.js';

// ----------------------------------------------------------------------------
// Agent State Graph
// ----------------------------------------------------------------------------

interface GraphState {
  mode: AgentMode;
  messages: Message[];
  currentTask?: string;
  plan?: string[];
  executedSteps: string[];
  toolResults: Array<{ id: string; result: ToolResult }>;
  errors: string[];
  observation?: string;
  thinking?: string;
  verification?: string;
}

// ----------------------------------------------------------------------------
// System Prompt Template
// ----------------------------------------------------------------------------

const SYSTEM_PROMPT = `You are OpenCode Studio, an expert AI coding assistant.

Your capabilities:
- Read, write, and edit code files
- Execute terminal commands
- Run git operations
- Search and analyze codebases
- Generate tests and documentation
- Review pull requests
- Debug and fix issues

You operate in an autonomous loop:
1. OBSERVE - Gather information about the current state
2. THINK - Analyze the situation and plan
3. PLAN - Break down the task into steps
4. ACT - Execute the plan step by step
5. VERIFY - Check that actions produced expected results
6. REFLECT - Learn from outcomes and adjust

Always:
- Be thorough and methodical
- Verify your changes work correctly
- Ask for clarification when needed
- Explain your reasoning
- Prefer small, incremental changes

When using tools:
- Make one tool call at a time
- Wait for results before continuing
- Handle errors gracefully
- Self-correct if needed

Current workspace: {workspace}
Session ID: {sessionId}
`;

// ----------------------------------------------------------------------------
// Main Agent Class
// ----------------------------------------------------------------------------

export class CodeAgent {
  private config: AgentConfig;
  private provider: BaseLLMProvider;
  private tools: Map<string, Tool>;
  private state: AgentState;
  private sessionId: string;
  private workspace: string;
  
  constructor(
    config: AgentConfig,
    provider: BaseLLMProvider,
    tools: Tool[],
    workspace: string,
    sessionId?: string
  ) {
    this.config = config;
    this.provider = provider;
    this.tools = new Map(tools.map((t) => [t.name, t]));
    this.workspace = workspace;
    this.sessionId = sessionId || generateId();
    
    this.state = {
      mode: 'observe',
      executedSteps: [],
      toolResults: new Map(),
      memory: [],
      errors: [],
    };
  }
  
  // --------------------------------------------------------------------------
  // Public Methods
  // --------------------------------------------------------------------------
  
  async *run(
    userMessage: string,
    options?: {
      maxIterations?: number;
      stream?: boolean;
      onProgress?: (state: AgentState) => void;
    }
  ): AsyncGenerator<AgentResponse> {
    const maxIterations = options?.maxIterations || 50;
    const messages: Message[] = [
      {
        role: 'system',
        content: this.getSystemPrompt(),
      },
      {
        role: 'user',
        content: userMessage,
      },
    ];
    
    this.state.currentTask = userMessage;
    this.state.mode = 'observe';
    
    for (let iteration = 0; iteration < maxIterations; iteration++) {
      // Progress callback
      if (options?.onProgress) {
        options.onProgress(this.getState());
      }
      
      // Complete with current messages
      const response = await this.provider.complete({
        messages,
        model: this.config.model,
        temperature: this.config.temperature ?? 0.7,
        maxTokens: 4096,
        tools: Array.from(this.tools.values()),
      });
      
      // Add assistant response
      const assistantMessage: Message = {
        role: 'assistant',
        content: response.content,
      };
      
      if (response.toolCalls && response.toolCalls.length > 0) {
        assistantMessage.toolCalls = response.toolCalls.map((tc) => ({
          id: tc.id,
          type: 'function',
          function: {
            name: tc.name,
            arguments: JSON.stringify(tc.arguments),
          },
        }));
      }
      
      messages.push(assistantMessage);
      
      // Stream response
      if (options?.stream) {
        yield {
          content: response.content,
          toolCalls: response.toolCalls,
          done: false,
        };
      }
      
      // Handle tool calls
      if (response.toolCalls && response.toolCalls.length > 0) {
        for (const toolCall of response.toolCalls) {
          this.state.mode = 'act';
          
          const toolResult = await this.executeTool(toolCall.name, toolCall.arguments);
          
          // Store result
          const resultId = generateId();
          this.state.toolResults.set(resultId, toolResult);
          this.state.executedSteps.push(toolCall.name);
          
          // Add tool result as message
          const toolMessage: Message = {
            role: 'tool',
            content: toolResult.success
              ? toolResult.output || 'Tool executed successfully'
              : `Error: ${toolResult.error}`,
            toolCallId: toolCall.id,
          };
          messages.push(toolMessage);
          
          // Stream tool result
          if (options?.stream) {
            yield {
              content: `[${toolCall.name}] ${toolResult.success ? '✓' : '✗'}: ${toolResult.output || toolResult.error}`,
              done: false,
              metadata: { toolCallId: toolCall.id },
            };
          }
          
          // Verify results
          this.state.mode = 'verify';
          if (!toolResult.success) {
            this.state.errors.push(`${toolCall.name}: ${toolResult.error}`);
          }
        }
        
        // Continue to next iteration
        continue;
      }
      
      // No tool calls - we're done
      this.state.mode = 'reflect';
      
      yield {
        content: response.content,
        done: true,
        metadata: {
          iterations: iteration + 1,
          executedSteps: this.state.executedSteps.length,
        },
      };
      
      return;
    }
    
    // Max iterations reached
    yield {
      content: 'Maximum iterations reached. The task may be incomplete.',
      done: true,
      metadata: {
        iterations: maxIterations,
        warning: 'max_iterations_reached',
      },
    };
  }
  
  async complete(
    userMessage: string,
    options?: {
      maxIterations?: number;
    }
  ): Promise<AgentResponse> {
    let result: AgentResponse = {
      content: '',
      done: false,
    };
    
    for await (const chunk of this.run(userMessage, options)) {
      result = chunk;
    }
    
    return result;
  }
  
  async streamComplete(
    userMessage: string,
    options?: {
      maxIterations?: number;
    }
  ): Promise<AsyncGenerator<string>> {
    const chunks: string[] = [];
    
    for await (const chunk of this.run(userMessage, options)) {
      if (chunk.content) {
        chunks.push(chunk.content);
      }
      if (chunk.done) {
        break;
      }
    }
    
    async function* generator(): AsyncGenerator<string> {
      for (const chunk of chunks) {
        yield chunk;
      }
    }
    
    return generator();
  }
  
  getState(): AgentState {
    return { ...this.state };
  }
  
  // --------------------------------------------------------------------------
  // Private Methods
  // --------------------------------------------------------------------------
  
  private getSystemPrompt(): string {
    return SYSTEM_PROMPT.replace('{workspace}', this.workspace)
      .replace('{sessionId}', this.sessionId);
  }
  
  private async executeTool(
    name: string,
    arguments_: Record<string, unknown>
  ): Promise<ToolResult> {
    const tool = this.tools.get(name);
    if (!tool) {
      return {
        success: false,
        error: `Unknown tool: ${name}`,
      };
    }
    
    try {
      const context: ToolContext = {
        workspace: this.workspace,
        sessionId: this.sessionId,
        userId: 'user',
        permissions: this.config.permissions || [],
      };
      
      return await tool.handler(arguments_, context);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}

// ----------------------------------------------------------------------------
// Multi-Agent Orchestrator
// ----------------------------------------------------------------------------

export interface SubAgent {
  name: string;
  description: string;
  agent: CodeAgent;
}

export class AgentOrchestrator {
  private agents: Map<string, SubAgent> = new Map();
  private mainAgent: CodeAgent;
  
  constructor(mainAgent: CodeAgent) {
    this.mainAgent = mainAgent;
  }
  
  registerSubAgent(name: string, description: string, agent: CodeAgent): void {
    this.agents.set(name, { name, description, agent });
  }
  
  async *runParallel(
    task: string,
    agentNames?: string[]
  ): AsyncGenerator<{ agent: string; response: AgentResponse }> {
    const targetAgents = agentNames
      ? agentNames.map((n) => this.agents.get(n)).filter(Boolean) as SubAgent[]
      : Array.from(this.agents.values());
    
    // Run all agents in parallel
    const promises = targetAgents.map(async (subAgent) => {
      const response = await subAgent.agent.complete(task);
      return { agent: subAgent.name, response };
    });
    
    for (const promise of promises) {
      yield await promise;
    }
  }
  
  async runSequential(
    task: string,
    agentNames?: string[]
  ): Promise<Array<{ agent: string; response: AgentResponse }>> {
    const targetAgents = agentNames
      ? agentNames.map((n) => this.agents.get(n)).filter(Boolean) as SubAgent[]
      : Array.from(this.agents.values());
    
    const results: Array<{ agent: string; response: AgentResponse }> = [];
    
    for (const subAgent of targetAgents) {
      const response = await subAgent.agent.complete(task);
      results.push({ agent: subAgent.name, response });
    }
    
    return results;
  }
  
  getAgent(name: string): SubAgent | undefined {
    return this.agents.get(name);
  }
  
  listAgents(): SubAgent[] {
    return Array.from(this.agents.values());
  }
}

// ----------------------------------------------------------------------------
// Specialized Agent Factories
// ----------------------------------------------------------------------------

export function createCodeReviewAgent(
  provider: BaseLLMProvider,
  tools: Tool[],
  workspace: string
): CodeAgent {
  const reviewSystemPrompt = `You are a code reviewer specializing in:
- Bug detection
- Security vulnerabilities
- Performance issues
- Code quality
- Best practices
- Architecture patterns

Provide detailed, actionable feedback on code changes.`;
  
  return new CodeAgent(
    {
      name: 'code-reviewer',
      description: 'Reviews code for bugs, security, and quality issues',
      model: provider.getModel(),
      temperature: 0.3,
      maxIterations: 20,
      tools,
    },
    provider,
    tools,
    workspace
  );
}

export function createTestAgent(
  provider: BaseLLMProvider,
  tools: Tool[],
  workspace: string
): CodeAgent {
  return new CodeAgent(
    {
      name: 'test-generator',
      description: 'Generates comprehensive tests',
      model: provider.getModel(),
      temperature: 0.5,
      maxIterations: 30,
      tools,
    },
    provider,
    tools,
    workspace
  );
}

export function createDebugAgent(
  provider: BaseLLMProvider,
  tools: Tool[],
  workspace: string
): CodeAgent {
  return new CodeAgent(
    {
      name: 'debugger',
      description: 'Debugs issues and fixes bugs',
      model: provider.getModel(),
      temperature: 0.2,
      maxIterations: 25,
      tools,
    },
    provider,
    tools,
    workspace
  );
}
