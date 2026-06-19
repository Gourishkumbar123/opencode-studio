// ============================================================================
// OpenCode Studio - Session Routes
// ============================================================================

import { FastifyInstance, FastifyRequest } from 'fastify';
import { randomUUID } from 'crypto';

// ----------------------------------------------------------------------------
// Session Store (In-memory)
// ----------------------------------------------------------------------------

interface Session {
  id: string;
  projectId?: string;
  mode: 'chat' | 'agent' | 'review' | 'test';
  workspace: string;
  createdAt: Date;
  updatedAt: Date;
  metadata: Record<string, unknown>;
}

const sessions = new Map<string, Session>();

// ----------------------------------------------------------------------------
// Routes
// ----------------------------------------------------------------------------

export async function sessionRoutes(fastify: FastifyInstance): Promise<void> {
  // List all sessions
  fastify.get('/', async () => {
    const allSessions = Array.from(sessions.values())
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
    
    return {
      success: true,
      sessions: allSessions.map((s) => ({
        id: s.id,
        projectId: s.projectId,
        mode: s.mode,
        workspace: s.workspace,
        createdAt: s.createdAt.toISOString(),
        updatedAt: s.updatedAt.toISOString(),
      })),
      total: allSessions.length,
    };
  });

  // Create a new session
  fastify.post('/', async (request: FastifyRequest) => {
    const body = request.body as Record<string, unknown> || {};
    
    const session: Session = {
      id: randomUUID(),
      projectId: body.projectId as string | undefined,
      mode: (body.mode as Session['mode']) || 'chat',
      workspace: (body.workspace as string) || process.cwd(),
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: body.metadata as Record<string, unknown> || {},
    };
    
    sessions.set(session.id, session);
    
    return {
      success: true,
      session: {
        id: session.id,
        projectId: session.projectId,
        mode: session.mode,
        workspace: session.workspace,
        createdAt: session.createdAt.toISOString(),
        updatedAt: session.updatedAt.toISOString(),
      },
    };
  });

  // Get a specific session
  fastify.get<{ Params: { id: string } }>(
    '/:id',
    async (request, reply) => {
      const session = sessions.get(request.params.id);
      
      if (!session) {
        return reply.status(404).send({
          success: false,
          error: 'Session not found',
        });
      }
      
      return {
        success: true,
        session: {
          id: session.id,
          projectId: session.projectId,
          mode: session.mode,
          workspace: session.workspace,
          createdAt: session.createdAt.toISOString(),
          updatedAt: session.updatedAt.toISOString(),
          metadata: session.metadata,
        },
      };
    }
  );

  // Update a session
  fastify.patch<{ Params: { id: string } }>(
    '/:id',
    async (request, reply) => {
      const session = sessions.get(request.params.id);
      
      if (!session) {
        return reply.status(404).send({
          success: false,
          error: 'Session not found',
        });
      }
      
      const updates = request.body as Partial<Session>;
      
      if (updates.mode) session.mode = updates.mode;
      if (updates.workspace) session.workspace = updates.workspace;
      if (updates.projectId !== undefined) session.projectId = updates.projectId;
      if (updates.metadata) session.metadata = { ...session.metadata, ...updates.metadata };
      session.updatedAt = new Date();
      
      return {
        success: true,
        session: {
          id: session.id,
          projectId: session.projectId,
          mode: session.mode,
          workspace: session.workspace,
          createdAt: session.createdAt.toISOString(),
          updatedAt: session.updatedAt.toISOString(),
        },
      };
    }
  );

  // Delete a session
  fastify.delete<{ Params: { id: string } }>(
    '/:id',
    async (request, reply) => {
      if (!sessions.has(request.params.id)) {
        return reply.status(404).send({
          success: false,
          error: 'Session not found',
        });
      }
      
      sessions.delete(request.params.id);
      
      return {
        success: true,
        message: 'Session deleted',
      };
    }
  );

  // Get sessions by project
  fastify.get<{ Querystring: { projectId: string } }>(
    '/project/:projectId',
    async (request, reply) => {
      const projectId = request.query.projectId;
      
      const projectSessions = Array.from(sessions.values())
        .filter((s) => s.projectId === projectId)
        .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
      
      return {
        success: true,
        sessions: projectSessions.map((s) => ({
          id: s.id,
          projectId: s.projectId,
          mode: s.mode,
          workspace: s.workspace,
          createdAt: s.createdAt.toISOString(),
          updatedAt: s.updatedAt.toISOString(),
        })),
        total: projectSessions.length,
      };
    }
  );
}
