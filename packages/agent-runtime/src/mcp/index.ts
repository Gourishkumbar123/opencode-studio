// ============================================================================
// OpenCode Studio - MCP (Model Context Protocol) Implementation
// ============================================================================

import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';
import { randomUUID } from 'crypto';
import type { Tool, ToolResult, ToolContext, MCPServer, MCPTool } from '@opencode/shared';

// ----------------------------------------------------------------------------
// MCP JSON-RPC Types
// ----------------------------------------------------------------------------

interface MCPRequest {
  jsonrpc: '2.0';
  id: string | number;
  method: string;
  params?: Record<string, unknown>;
}

interface MCPResponse {
  jsonrpc: '2.0';
  id: string | number;
  result?: unknown;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

interface MCPNotification {
  jsonrpc: '2.0';
  method: string;
  params?: Record<string, unknown>;
}

// ----------------------------------------------------------------------------
// MCP Server
// ----------------------------------------------------------------------------

export class MCPServer {
  private process: ChildProcess | null = null;
  private tools: Map<string, MCPTool> = new Map();
  private status: 'running' | 'stopped' | 'error' = 'stopped';
  private errorMessage?: string;
  
  constructor(private config: MCPServer) {
    this.tools = new Map(config.tools || []);
  }
  
  async start(): Promise<void> {
    if (this.process) {
      throw new Error('Server already running');
    }
    
    return new Promise((resolve, reject) => {
      try {
        this.process = spawn(this.config.command, this.config.args || [], {
          stdio: ['pipe', 'pipe', 'pipe'],
          env: { ...process.env, ...this.config.env },
        });
        
        this.process.on('error', (error) => {
          this.status = 'error';
          this.errorMessage = error.message;
          reject(error);
        });
        
        this.process.on('exit', (code) => {
          this.status = code === 0 ? 'stopped' : 'error';
          if (code !== 0) {
            this.errorMessage = `Process exited with code ${code}`;
          }
        });
        
        // Wait for server to initialize
        setTimeout(() => {
          this.status = 'running';
          resolve();
        }, 1000);
      } catch (error) {
        this.status = 'error';
        this.errorMessage = error instanceof Error ? error.message : String(error);
        reject(error);
      }
    });
  }
  
  stop(): void {
    if (this.process) {
      this.process.kill();
      this.process = null;
    }
    this.status = 'stopped';
  }
  
  getStatus(): { status: string; error?: string } {
    return {
      status: this.status,
      error: this.errorMessage,
    };
  }
  
  getTools(): MCPTool[] {
    return Array.from(this.tools.values());
  }
  
  addTool(tool: MCPTool): void {
    this.tools.set(tool.name, tool);
  }
  
  removeTool(name: string): void {
    this.tools.delete(name);
  }
}

// ----------------------------------------------------------------------------
// MCP Client
// ----------------------------------------------------------------------------

export class MCPClient extends EventEmitter {
  private servers: Map<string, MCPServer> = new Map();
  private pendingRequests: Map<string, {
    resolve: (value: unknown) => void;
    reject: (error: Error) => void;
  }> = new Map();
  private messageId = 0;
  
  constructor() {
    super();
  }
  
  async addServer(name: string, config: MCPServer): Promise<void> {
    const server = new MCPServer(config);
    await server.start();
    this.servers.set(name, server);
  }
  
  removeServer(name: string): void {
    const server = this.servers.get(name);
    if (server) {
      server.stop();
      this.servers.delete(name);
    }
  }
  
  getServer(name: string): MCPServer | undefined {
    return this.servers.get(name);
  }
  
  listServers(): Array<{ name: string; status: string }> {
    return Array.from(this.servers.entries()).map(([name, server]) => {
      const status = server.getStatus();
      return { name, status: status.status };
    });
  }
  
  async listTools(serverName?: string): Promise<MCPTool[]> {
    if (serverName) {
      const server = this.servers.get(serverName);
      return server?.getTools() || [];
    }
    
    const allTools: MCPTool[] = [];
    for (const server of this.servers.values()) {
      allTools.push(...server.getTools());
    }
    return allTools;
  }
  
  // Convert MCP tool to OpenCode tool
  toTool(mcpTool: MCPTool, serverName: string): Tool {
    return {
      name: `mcp_${serverName}_${mcpTool.name}`,
      description: mcpTool.description,
      inputSchema: mcpTool.inputSchema,
      handler: async (input, context) => {
        return this.executeTool(serverName, mcpTool.name, input, context);
      },
    };
  }
  
  // Convert all MCP tools to OpenCode tools
  getToolsForAllServers(): Tool[] {
    const tools: Tool[] = [];
    
    for (const [serverName, server] of this.servers) {
      for (const mcpTool of server.getTools()) {
        tools.push(this.toTool(mcpTool, serverName));
      }
    }
    
    return tools;
  }
  
  private async executeTool(
    serverName: string,
    toolName: string,
    arguments_: Record<string, unknown>,
    context: ToolContext
  ): Promise<ToolResult> {
    try {
      // This is a simplified implementation
      // In production, this would communicate with the MCP server via stdio
      
      // For now, return a placeholder result
      // Real implementation would send JSON-RPC request to the server
      return {
        success: true,
        output: `MCP tool ${toolName} executed on server ${serverName}`,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
  
  private sendRequest(method: string, params?: Record<string, unknown>): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const id = this.messageId++;
      const request: MCPRequest = {
        jsonrpc: '2.0',
        id,
        method,
        params,
      };
      
      this.pendingRequests.set(String(id), { resolve, reject });
      
      // Send to server
      const server = Array.from(this.servers.values())[0];
      if (server) {
        // In production, this would send via stdio
        // For now, simulate a response
        setTimeout(() => {
          const pending = this.pendingRequests.get(String(id));
          if (pending) {
            pending.resolve({});
            this.pendingRequests.delete(String(id));
          }
        }, 100);
      }
    });
  }
  
  private handleResponse(response: MCPResponse): void {
    const pending = this.pendingRequests.get(String(response.id));
    if (pending) {
      if (response.error) {
        pending.reject(new Error(response.error.message));
      } else {
        pending.resolve(response.result);
      }
      this.pendingRequests.delete(String(response.id));
    }
  }
  
  private handleNotification(notification: MCPNotification): void {
    this.emit(notification.method, notification.params);
  }
}

// ----------------------------------------------------------------------------
// MCP Server Factory
// ----------------------------------------------------------------------------

export interface MCPServerConfig {
  name: string;
  command: string;
  args?: string[];
  env?: Record<string, string>;
}

export async function createMCPServer(config: MCPServerConfig): Promise<MCPServer> {
  const server = new MCPServer({
    ...config,
    tools: [],
    status: 'stopped',
  });
  
  await server.start();
  return server;
}

// ----------------------------------------------------------------------------
// Pre-built MCP Server Configurations
// ----------------------------------------------------------------------------

export const MCP_SERVER_PRESETS: Record<string, MCPServerConfig> = {
  filesystem: {
    name: 'filesystem',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-filesystem', process.cwd()],
  },
  github: {
    name: 'github',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-github'],
    env: {
      GITHUB_TOKEN: process.env.GITHUB_TOKEN || '',
    },
  },
  slack: {
    name: 'slack',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-slack'],
    env: {
      SLACK_BOT_TOKEN: process.env.SLACK_BOT_TOKEN || '',
      SLACK_TEAM_ID: process.env.SLACK_TEAM_ID || '',
    },
  },
  postgres: {
    name: 'postgres',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-postgres'],
    env: {
      DATABASE_URL: process.env.DATABASE_URL || '',
    },
  },
  memory: {
    name: 'memory',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-memory'],
  },
  brave_search: {
    name: 'brave-search',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-brave-search'],
    env: {
      BRAVE_API_KEY: process.env.BRAVE_API_KEY || '',
    },
  },
  sequential_thinking: {
    name: 'sequential-thinking',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-sequential-thinking'],
  },
};

// ----------------------------------------------------------------------------
// MCP Tool Registry
// ----------------------------------------------------------------------------

export class MCPToolRegistry {
  private tools: Map<string, Tool> = new Map();
  
  register(tool: Tool): void {
    if (this.tools.has(tool.name)) {
      throw new Error(`Tool ${tool.name} already registered`);
    }
    this.tools.set(tool.name, tool);
  }
  
  unregister(name: string): void {
    this.tools.delete(name);
  }
  
  get(name: string): Tool | undefined {
    return this.tools.get(name);
  }
  
  list(): Tool[] {
    return Array.from(this.tools.values());
  }
  
  createToolHandler(name: string) {
    const tool = this.tools.get(name);
    if (!tool) {
      throw new Error(`Tool ${name} not found`);
    }
    return tool.handler;
  }
}

// ----------------------------------------------------------------------------
// MCP Protocol Utilities
// ----------------------------------------------------------------------------

export function parseMCPToolSchema(schema: Record<string, unknown>): z.ZodSchema {
  // Simple schema parser for MCP tools
  // In production, use proper Zod schema generation
  return {
    parse: (input: unknown) => input,
  } as z.ZodSchema;
}

// Import zod for schema validation
import { z } from 'zod';

export { MCPRequest, MCPResponse, MCPNotification };
