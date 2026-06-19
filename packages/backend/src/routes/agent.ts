// ============================================================================
// OpenCode Studio - Agent Routes
// ============================================================================

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import {
  createProvider,
  CodeAgent,
  defaultTools,
  type LLMResponse,
  type StreamChunk,
} from '@opencode/agent-runtime';
import { randomUUID } from 'crypto';
import { z } from 'zod';

// ----------------------------------------------------------------------------
// Request/Response Schemas
// ----------------------------------------------------------------------------

const completionRequestSchema = z.object({
  message: z.string(),
  sessionId: z.string().optional(),
  workspace: z.string().optional(),
  model: z.string().optional(),
  temperature: z.number().optional(),
  maxIterations: z.number().optional(),
  stream: z.boolean().optional(),
  tools: z.array(z.object({
    name: z.string(),
    description: z.string(),
    inputSchema: z.record(z.unknown()),
  })).optional(),
});

const toolExecutionSchema = z.object({
  toolName: z.string(),
  arguments: z.record(z.unknown()),
  sessionId: z.string(),
  workspace: z.string(),
});

type CompletionRequest = z.infer<typeof completionRequestSchema>;
type ToolExecutionRequest = z.infer<typeof toolExecutionSchema>;

// ----------------------------------------------------------------------------
// Session Store (In-memory for now)
// ----------------------------------------------------------------------------

const sessions = new Map<string, {
  agent: CodeAgent;
  messages: Array<{ role: string; content: string }>;
  workspace: string;
}>();

// ----------------------------------------------------------------------------
// Routes
// ----------------------------------------------------------------------------

export async function agentRoutes(fastify: FastifyInstance): Promise<void> {
  // Complete a message
  fastify.post('/complete', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const body = completionRequestSchema.parse(request.body);
      
      const provider = createProvider({
        name: 'openrouter',
        apiKey: process.env.OPENROUTER_API_KEY || '',
        model: body.model,
      });
      
      const sessionId = body.sessionId || randomUUID();
      const workspace = body.workspace || process.cwd();
      
      // Get or create session
      let session = sessions.get(sessionId);
      if (!session) {
        const tools = body.tools || defaultTools;
        const agent = new CodeAgent(
          {
            name: 'opencode-agent',
            description: 'OpenCode Studio Agent',
            model: body.model,
            temperature: body.temperature ?? 0.7,
            maxIterations: body.maxIterations ?? 50,
          },
          provider,
          tools,
          workspace,
          sessionId
        );
        
        session = { agent, messages: [], workspace };
        sessions.set(sessionId, session);
      }
      
      // Add user message
      session.messages.push({
        role: 'user',
        content: body.message,
      });
      
      // Run agent
      const response = await session.agent.complete(body.message, {
        maxIterations: body.maxIterations,
      });
      
      // Add assistant response
      session.messages.push({
        role: 'assistant',
        content: response.content,
      });
      
      return {
        success: true,
        sessionId,
        response: {
          content: response.content,
          done: response.done,
          metadata: response.metadata,
        },
      };
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // Streaming completion
  fastify.post('/complete/stream', { websocket: true }, (socket, _request) => {
    let agent: CodeAgent | null = null;
    let sessionId: string | null = null;
    
    socket.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString());
        
        if (message.type === 'start') {
          // Initialize agent
          const provider = createProvider({
            name: 'openrouter',
            apiKey: process.env.OPENROUTER_API_KEY || '',
            model: message.model,
          });
          
          sessionId = message.sessionId || randomUUID();
          const workspace = message.workspace || process.cwd();
          const tools = message.tools || defaultTools;
          
          agent = new CodeAgent(
            {
              name: 'opencode-agent',
              description: 'OpenCode Studio Agent',
              model: message.model,
              temperature: message.temperature ?? 0.7,
              maxIterations: message.maxIterations ?? 50,
            },
            provider,
            tools,
            workspace,
            sessionId
          );
          
          socket.send(JSON.stringify({ type: 'started', sessionId }));
        }
        
        if (message.type === 'message' && agent) {
          // Stream response
          for await (const chunk of agent.run(message.content, {
            maxIterations: message.maxIterations ?? 50,
            stream: true,
          })) {
            socket.send(JSON.stringify({
              type: 'chunk',
              content: chunk.content,
              done: chunk.done,
              metadata: chunk.metadata,
            }));
            
            if (chunk.done) break;
          }
          
          socket.send(JSON.stringify({ type: 'done' }));
        }
      } catch (error) {
        socket.send(JSON.stringify({
          type: 'error',
          error: error instanceof Error ? error.message : 'Unknown error',
        }));
      }
    });
    
    socket.on('close', () => {
      if (sessionId) {
        sessions.delete(sessionId);
      }
    });
  });

  // Execute a tool directly
  fastify.post('/tool', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const body = toolExecutionSchema.parse(request.body);
      
      const tool = defaultTools.find((t) => t.name === body.toolName);
      if (!tool) {
        return reply.status(404).send({
          success: false,
          error: `Tool not found: ${body.toolName}`,
        });
      }
      
      const result = await tool.handler(body.arguments, {
        workspace: body.workspace,
        sessionId: body.sessionId,
        userId: 'api',
        permissions: [],
      });
      
      return { success: true, result };
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // List available tools
  fastify.get('/tools', async () => {
    return {
      success: true,
      tools: defaultTools.map((tool) => ({
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema,
      })),
    };
  });

  // Get session state
  fastify.get<{ Params: { sessionId: string } }>(
    '/session/:sessionId',
    async (request, reply) => {
      const { sessionId } = request.params;
      const session = sessions.get(sessionId);
      
      if (!session) {
        return reply.status(404).send({
          success: false,
          error: 'Session not found',
        });
      }
      
      return {
        success: true,
        session: {
          sessionId,
          workspace: session.workspace,
          messageCount: session.messages.length,
          state: session.agent.getState(),
        },
      };
    }
  );

  // Delete session
  fastify.delete<{ Params: { sessionId: string } }>(
    '/session/:sessionId',
    async (request, reply) => {
      const { sessionId } = request.params;
      
      if (!sessions.has(sessionId)) {
        return reply.status(404).send({
          success: false,
          error: 'Session not found',
        });
      }
      
      sessions.delete(sessionId);
      
      return {
        success: true,
        message: 'Session deleted',
      };
    }
  );
}
