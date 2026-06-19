# OpenCode Studio - API Reference

## Base URL

```
http://localhost:3001/api
```

## Authentication

API requests require no authentication by default (local use). For production, configure authentication middleware.

## Endpoints

### Agent

#### POST `/api/agent/complete`

Send a message to the agent.

**Request:**
```json
{
  "message": "Fix the login bug",
  "sessionId": "optional-session-id",
  "workspace": "/path/to/project",
  "model": "anthropic/claude-3.5-sonnet",
  "temperature": 0.7,
  "maxIterations": 50,
  "stream": false
}
```

**Response:**
```json
{
  "success": true,
  "sessionId": "uuid",
  "response": {
    "content": "I'll help you fix the login bug...",
    "done": true,
    "metadata": {
      "iterations": 3,
      "executedSteps": ["read_file", "grep", "edit_file"]
    }
  }
}
```

#### POST `/api/agent/complete/stream`

Stream agent responses via WebSocket.

**Message Types:**

Client → Server:
```json
{ "type": "start", "sessionId": "uuid", "model": "..." }
{ "type": "message", "content": "Fix the bug" }
```

Server → Client:
```json
{ "type": "started", "sessionId": "uuid" }
{ "type": "chunk", "content": "I'll...", "done": false }
{ "type": "chunk", "content": " help...", "done": false }
{ "type": "done" }
```

#### POST `/api/agent/tool`

Execute a specific tool.

**Request:**
```json
{
  "toolName": "read_file",
  "arguments": { "path": "src/index.ts" },
  "sessionId": "uuid",
  "workspace": "/path/to/project"
}
```

#### GET `/api/agent/tools`

List available tools.

**Response:**
```json
{
  "success": true,
  "tools": [
    {
      "name": "read_file",
      "description": "Read file contents",
      "inputSchema": { ... }
    }
  ]
}
```

### Sessions

#### GET `/api/sessions`

List all sessions.

#### POST `/api/sessions`

Create a new session.

#### GET `/api/sessions/:id`

Get session details.

#### PATCH `/api/sessions/:id`

Update session.

#### DELETE `/api/sessions/:id`

Delete session.

### Settings

#### GET `/api/settings`

Get current settings.

#### PUT `/api/settings`

Update settings.

#### POST `/api/settings/api-key/:provider`

Set API key.

#### DELETE `/api/settings/api-key/:provider`

Delete API key.

### Projects

#### GET `/api/projects`

List all projects.

#### POST `/api/projects`

Create a new project.

#### GET `/api/projects/:id`

Get project details.

#### PATCH `/api/projects/:id`

Update project.

#### DELETE `/api/projects/:id`

Delete project.

#### POST `/api/projects/:id/index`

Start indexing a project.

#### GET `/api/projects/:id/search?q=query`

Search in project.

## WebSocket

Connect to `/ws` for streaming responses.

## Error Responses

```json
{
  "success": false,
  "error": "Error message"
}
```

## Rate Limits

No rate limits by default. Configure middleware for production.
