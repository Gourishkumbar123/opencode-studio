// ============================================================================
// OpenCode Studio - Settings Routes
// ============================================================================

import { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';

// ----------------------------------------------------------------------------
// Settings Schema
// ----------------------------------------------------------------------------

const settingsSchema = z.object({
  apiKeys: z.record(z.string()).optional(),
  defaultProvider: z.string().optional(),
  defaultModel: z.string().optional(),
  sandboxMode: z.enum(['readonly', 'ask_edit', 'ask_command', 'autonomous']).optional(),
  theme: z.enum(['light', 'dark', 'system']).optional(),
  editor: z.string().optional(),
  terminal: z.string().optional(),
  mcpServers: z.array(z.object({
    name: z.string(),
    command: z.string(),
    args: z.array(z.string()).optional(),
    env: z.record(z.string()).optional(),
    enabled: z.boolean().optional(),
  })).optional(),
  plugins: z.array(z.string()).optional(),
});

type Settings = z.infer<typeof settingsSchema>;

// ----------------------------------------------------------------------------
// Default Settings
// ----------------------------------------------------------------------------

const defaultSettings: Required<Settings> = {
  apiKeys: {},
  defaultProvider: 'openrouter',
  defaultModel: 'anthropic/claude-3.5-sonnet',
  sandboxMode: 'ask_edit',
  theme: 'dark',
  editor: 'code',
  terminal: 'terminal',
  mcpServers: [],
  plugins: [],
};

// ----------------------------------------------------------------------------
// Settings Store (In-memory)
// ----------------------------------------------------------------------------

const settings = { ...defaultSettings };

// ----------------------------------------------------------------------------
// Routes
// ----------------------------------------------------------------------------

export async function settingsRoutes(fastify: FastifyInstance): Promise<void> {
  // Get all settings
  fastify.get('/', async () => {
    // Don't expose API keys
    const safeSettings = {
      ...settings,
      apiKeys: Object.fromEntries(
        Object.entries(settings.apiKeys).map(([k, v]) => [k, v ? '***' : ''])
      ),
    };
    
    return {
      success: true,
      settings: safeSettings,
    };
  });

  // Get a specific setting
  fastify.get<{ Params: { key: string } }>(
    '/:key',
    async (request, reply) => {
      const key = request.params.key as keyof Settings;
      
      if (!(key in settings)) {
        return reply.status(404).send({
          success: false,
          error: `Setting not found: ${key}`,
        });
      }
      
      const value = settings[key];
      
      // Mask API keys
      if (key === 'apiKeys' && typeof value === 'object') {
        return {
          success: true,
          key,
          value: Object.fromEntries(
            Object.entries(value as Record<string, string>).map(([k, v]) => [k, v ? '***' : ''])
          ),
        };
      }
      
      return {
        success: true,
        key,
        value,
      };
    }
  );

  // Update settings
  fastify.put('/', async (request: FastifyRequest) => {
    try {
      const updates = settingsSchema.partial().parse(request.body);
      
      // Apply updates
      Object.assign(settings, updates);
      
      return {
        success: true,
        settings: {
          ...settings,
          apiKeys: Object.fromEntries(
            Object.entries(settings.apiKeys).map(([k, v]) => [k, v ? '***' : ''])
          ),
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Invalid settings',
      };
    }
  });

  // Update a specific setting
  fastify.patch<{ Params: { key: string } }>(
    '/:key',
    async (request, reply) => {
      const key = request.params.key as keyof Settings;
      
      if (!(key in settings)) {
        return reply.status(404).send({
          success: false,
          error: `Setting not found: ${key}`,
        });
      }
      
      const value = (request.body as Record<string, unknown>).value;
      
      // Validate value type
      if (key === 'apiKeys') {
        settings.apiKeys = { ...settings.apiKeys, ...(value as Record<string, string>) };
      } else if (typeof (settings as Record<string, unknown>)[key] === typeof value) {
        (settings as Record<string, unknown>)[key] = value;
      } else {
        return reply.status(400).send({
          success: false,
          error: `Invalid type for setting ${key}`,
        });
      }
      
      return {
        success: true,
        key,
        value: key === 'apiKeys' && typeof value === 'object'
          ? Object.fromEntries(
              Object.entries(value as Record<string, string>).map(([k, v]) => [k, v ? '***' : ''])
            )
          : value,
      };
    }
  );

  // Set API key
  fastify.post<{ Params: { provider: string } }>(
    '/api-key/:provider',
    async (request, reply) => {
      const provider = request.params.provider;
      const body = request.body as { key: string };
      
      if (!body.key) {
        return reply.status(400).send({
          success: false,
          error: 'API key is required',
        });
      }
      
      settings.apiKeys[provider] = body.key;
      
      return {
        success: true,
        message: `API key for ${provider} has been set`,
      };
    }
  );

  // Delete API key
  fastify.delete<{ Params: { provider: string } }>(
    '/api-key/:provider',
    async (request, reply) => {
      const provider = request.params.provider;
      
      if (!settings.apiKeys[provider]) {
        return reply.status(404).send({
          success: false,
          error: `No API key found for ${provider}`,
        });
      }
      
      delete settings.apiKeys[provider];
      
      return {
        success: true,
        message: `API key for ${provider} has been deleted`,
      };
    }
  );

  // Reset settings to defaults
  fastify.post('/reset', async () => {
    Object.assign(settings, defaultSettings);
    
    return {
      success: true,
      message: 'Settings have been reset to defaults',
    };
  });

  // Export settings (for backup)
  fastify.get('/export', async () => {
    return {
      success: true,
      settings: {
        ...settings,
        // Still mask API keys on export
        apiKeys: Object.fromEntries(
          Object.entries(settings.apiKeys).map(([k, v]) => [k, v ? '***' : ''])
        ),
      },
      exportedAt: new Date().toISOString(),
    };
  });
}
