// ============================================================================
// OpenCode Studio - Backend Server
// ============================================================================

import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import websocket from '@fastify/websocket';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { agentRoutes } from './routes/agent.js';
import { sessionRoutes } from './routes/sessions.js';
import { settingsRoutes } from './routes/settings.js';
import { projectRoutes } from './routes/projects.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ----------------------------------------------------------------------------
// Server Configuration
// ----------------------------------------------------------------------------

export interface ServerConfig {
  port?: number;
  host?: string;
  logLevel?: 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace' | 'silent';
  cors?: {
    origin: boolean | string | string[];
    credentials?: boolean;
  };
}

// ----------------------------------------------------------------------------
// Create Fastify Instance
// ----------------------------------------------------------------------------

export async function createServer(config: ServerConfig = {}): Promise<FastifyInstance> {
  const fastify = Fastify({
    logger: {
      level: config.logLevel || 'info',
    },
  });

  // Register plugins
  await fastify.register(cors, config.cors || {
    origin: true,
    credentials: true,
  });

  await fastify.register(websocket);

  // Register routes
  await fastify.register(agentRoutes, { prefix: '/api/agent' });
  await fastify.register(sessionRoutes, { prefix: '/api/sessions' });
  await fastify.register(settingsRoutes, { prefix: '/api/settings' });
  await fastify.register(projectRoutes, { prefix: '/api/projects' });

  // Health check endpoint
  fastify.get('/health', async () => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });

  // API info endpoint
  fastify.get('/api', async () => {
    return {
      name: 'OpenCode Studio API',
      version: '0.1.0',
      endpoints: {
        agent: '/api/agent',
        sessions: '/api/sessions',
        settings: '/api/settings',
        projects: '/api/projects',
      },
    };
  });

  return fastify;
}

// ----------------------------------------------------------------------------
// Start Server
// ----------------------------------------------------------------------------

export async function startServer(config: ServerConfig = {}): Promise<FastifyInstance> {
  const server = await createServer(config);

  const port = config.port || 3001;
  const host = config.host || '0.0.0.0';

  try {
    await server.listen({ port, host });
    server.log.info(`OpenCode Studio API server running on http://${host}:${port}`);
    return server;
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
}

// ----------------------------------------------------------------------------
// Main Entry Point
// ----------------------------------------------------------------------------

if (import.meta.url === `file://${process.argv[1]}`) {
  const port = parseInt(process.env.PORT || '3001', 10);
  const host = process.env.HOST || '0.0.0.0';
  
  startServer({ port, host }).catch((err) => {
    console.error('Failed to start server:', err);
    process.exit(1);
  });
}
