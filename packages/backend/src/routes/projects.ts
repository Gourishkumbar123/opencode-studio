// ============================================================================
// OpenCode Studio - Projects Routes
// ============================================================================

import { FastifyInstance, FastifyRequest } from 'fastify';
import { randomUUID } from 'crypto';
import { z } from 'zod';

// ----------------------------------------------------------------------------
// Project Schema
// ----------------------------------------------------------------------------

const projectSchema = z.object({
  name: z.string().min(1),
  path: z.string().min(1),
  description: z.string().optional(),
});

type Project = {
  id: string;
  name: string;
  path: string;
  description?: string;
  techStack: string[];
  files: number;
  lastAccessed: Date;
  indexStatus: 'pending' | 'indexing' | 'indexed' | 'error';
  createdAt: Date;
  updatedAt: Date;
};

// ----------------------------------------------------------------------------
// Project Store (In-memory)
// ----------------------------------------------------------------------------

const projects = new Map<string, Project>();

// ----------------------------------------------------------------------------
// Routes
// ----------------------------------------------------------------------------

export async function projectRoutes(fastify: FastifyInstance): Promise<void> {
  // List all projects
  fastify.get('/', async () => {
    const allProjects = Array.from(projects.values())
      .sort((a, b) => b.lastAccessed.getTime() - a.lastAccessed.getTime());
    
    return {
      success: true,
      projects: allProjects.map((p) => ({
        id: p.id,
        name: p.name,
        path: p.path,
        description: p.description,
        techStack: p.techStack,
        files: p.files,
        indexStatus: p.indexStatus,
        lastAccessed: p.lastAccessed.toISOString(),
      })),
      total: allProjects.length,
    };
  });

  // Create a new project
  fastify.post('/', async (request: FastifyRequest) => {
    try {
      const data = projectSchema.parse(request.body);
      
      const project: Project = {
        id: randomUUID(),
        name: data.name,
        path: data.path,
        description: data.description,
        techStack: [],
        files: 0,
        lastAccessed: new Date(),
        indexStatus: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      projects.set(project.id, project);
      
      return {
        success: true,
        project: {
          id: project.id,
          name: project.name,
          path: project.path,
          description: project.description,
          indexStatus: project.indexStatus,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Invalid project data',
      };
    }
  });

  // Get a specific project
  fastify.get<{ Params: { id: string } }>(
    '/:id',
    async (request, reply) => {
      const project = projects.get(request.params.id);
      
      if (!project) {
        return reply.status(404).send({
          success: false,
          error: 'Project not found',
        });
      }
      
      // Update last accessed
      project.lastAccessed = new Date();
      
      return {
        success: true,
        project: {
          id: project.id,
          name: project.name,
          path: project.path,
          description: project.description,
          techStack: project.techStack,
          files: project.files,
          indexStatus: project.indexStatus,
          lastAccessed: project.lastAccessed.toISOString(),
          createdAt: project.createdAt.toISOString(),
        },
      };
    }
  );

  // Update a project
  fastify.patch<{ Params: { id: string } }>(
    '/:id',
    async (request, reply) => {
      const project = projects.get(request.params.id);
      
      if (!project) {
        return reply.status(404).send({
          success: false,
          error: 'Project not found',
        });
      }
      
      const updates = request.body as Partial<Project>;
      
      if (updates.name) project.name = updates.name;
      if (updates.description !== undefined) project.description = updates.description;
      if (updates.techStack) project.techStack = updates.techStack;
      if (updates.indexStatus) project.indexStatus = updates.indexStatus;
      project.updatedAt = new Date();
      
      return {
        success: true,
        project: {
          id: project.id,
          name: project.name,
          path: project.path,
          description: project.description,
          indexStatus: project.indexStatus,
        },
      };
    }
  );

  // Delete a project
  fastify.delete<{ Params: { id: string } }>(
    '/:id',
    async (request, reply) => {
      if (!projects.has(request.params.id)) {
        return reply.status(404).send({
          success: false,
          error: 'Project not found',
        });
      }
      
      projects.delete(request.params.id);
      
      return {
        success: true,
        message: 'Project deleted',
      };
    }
  );

  // Index a project
  fastify.post<{ Params: { id: string } }>(
    '/:id/index',
    async (request, reply) => {
      const project = projects.get(request.params.id);
      
      if (!project) {
        return reply.status(404).send({
          success: false,
          error: 'Project not found',
        });
      }
      
      project.indexStatus = 'indexing';
      
      // In a real implementation, this would trigger the indexing process
      // For now, just simulate completion
      setTimeout(() => {
        project.indexStatus = 'indexed';
        project.techStack = detectTechStack(project.path);
        project.files = countFiles(project.path);
        project.updatedAt = new Date();
      }, 1000);
      
      return {
        success: true,
        message: 'Indexing started',
        status: 'indexing',
      };
    }
  );

  // Get project index
  fastify.get<{ Params: { id: string } }>(
    '/:id/index',
    async (request, reply) => {
      const project = projects.get(request.params.id);
      
      if (!project) {
        return reply.status(404).send({
          success: false,
          error: 'Project not found',
        });
      }
      
      if (project.indexStatus !== 'indexed') {
        return {
          success: true,
          status: project.indexStatus,
          message: project.indexStatus === 'indexing' 
            ? 'Project is still indexing' 
            : 'Project has not been indexed',
        };
      }
      
      return {
        success: true,
        status: 'indexed',
        index: {
          techStack: project.techStack,
          files: project.files,
          summary: generateProjectSummary(project),
        },
      };
    }
  );

  // Search in project
  fastify.get<{ Params: { id: string }; Querystring: { q: string } }>(
    '/:id/search',
    async (request, reply) => {
      const project = projects.get(request.params.id);
      
      if (!project) {
        return reply.status(404).send({
          success: false,
          error: 'Project not found',
        });
      }
      
      const query = request.query.q;
      
      if (!query) {
        return reply.status(400).send({
          success: false,
          error: 'Query parameter "q" is required',
        });
      }
      
      // In a real implementation, this would search the vector store
      return {
        success: true,
        query,
        results: [],
        message: 'Search not yet implemented',
      };
    }
  );
}

// ----------------------------------------------------------------------------
// Helper Functions
// ----------------------------------------------------------------------------

function detectTechStack(path: string): string[] {
  // Simple tech stack detection based on file extensions
  const techStack: string[] = [];
  
  // Check for common files
  if (exists(`${path}/package.json`)) techStack.push('Node.js');
  if (exists(`${path}/Cargo.toml`)) techStack.push('Rust');
  if (exists(`${path}/go.mod`)) techStack.push('Go');
  if (exists(`${path}/requirements.txt`)) techStack.push('Python');
  if (exists(`${path}/pom.xml`)) techStack.push('Java');
  if (exists(`${path}/build.gradle`)) techStack.push('Java/Kotlin');
  if (exists(`${path}/composer.json`)) techStack.push('PHP');
  if (exists(`${path}/Gemfile`)) techStack.push('Ruby');
  if (exists(`${path}/mix.exs`)) techStack.push('Elixir');
  if (exists(`${path}/pubspec.yaml`)) techStack.push('Dart/Flutter');
  
  return techStack;
}

function countFiles(path: string): number {
  // Placeholder - in production would recursively count files
  return 0;
}

function generateProjectSummary(project: Project): string {
  return `Project "${project.name}" is a ${project.techStack.join(', ') || 'unknown'} project located at ${project.path}.`;
}

function exists(path: string): boolean {
  try {
    const { existsSync } = require('fs');
    return existsSync(path);
  } catch {
    return false;
  }
}
