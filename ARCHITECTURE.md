# OpenCode Studio Architecture

## Overview

OpenCode Studio is a local-first AI coding agent that provides intelligent code assistance through natural language interactions. It combines autonomous agent capabilities with deep codebase understanding.

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLI / Web UI                             │
│                    (Ink React / Next.js)                        │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Agent Runtime Layer                        │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    LangGraph Agent                        │   │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐       │   │
│  │  │ Observe │ │  Think  │ │  Plan   │ │  Act    │       │   │
│  │  └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘       │   │
│  │       └───────────┴───────────┴───────────┘              │   │
│  │                      │                                     │   │
│  │                      ▼                                     │   │
│  │              ┌─────────────┐                              │   │
│  │              │   Verify    │                              │   │
│  │              └─────────────┘                              │   │
│  └─────────────────────────────────────────────────────────┘   │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       │
│  │  Memory  │ │  Tools   │ │  Context │ │ Subagents│       │
│  │  System  │ │  Registry│ │  Manager │ │  Manager │       │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘       │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Tool Execution Layer                         │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       │
│  │  File    │ │   Git    │ │ Terminal │ │  Browser │       │
│  │  Tools   │ │  Tools   │ │  Tools   │ │  (MCP)   │       │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘       │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       │
│  │  Code    │ │  Search  │ │   MCP    │ │ Custom   │       │
│  │ Analysis │ │  Tools   │ │  Client  │ │  Tools   │       │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘       │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                       Provider Layer                             │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              Unified LLM Interface                      │   │
│  │                                                          │   │
│  │  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐          │   │
│  │  │OpenRouter│ │Anthropic│ │ OpenAI │ │ Gemini │          │   │
│  │  └────────┘ └────────┘ └────────┘ └────────┘          │   │
│  │  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐          │   │
│  │  │DeepSeek │ │Mistral │ │  Groq  │ │Cerebras│          │   │
│  │  └────────┘ └────────┘ └────────┘ └────────┘          │   │
│  └─────────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              Embeddings Interface                        │   │
│  │    OpenAI │ Voyage │ Nomic │ OpenRouter                 │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                       Storage Layer                              │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       │
│  │  SQLite  │ │ ChromaDB │ │   File   │ │  Memory  │       │
│  │ Database │ │Vector DB │ │  System  │ │  Store  │       │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘       │
└─────────────────────────────────────────────────────────────────┘
```

## Package Structure

```
opencode-studio/
├── packages/
│   ├── backend/              # Fastify API server
│   │   ├── src/
│   │   │   ├── routes/       # API endpoints
│   │   │   ├── services/     # Business logic
│   │   │   ├── plugins/      # Fastify plugins
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   ├── agent-runtime/        # Core agent logic
│   │   ├── src/
│   │   │   ├── agent/        # LangGraph agent
│   │   │   ├── tools/        # Tool definitions
│   │   │   ├── memory/       # Memory system
│   │   │   ├── context/      # Context management
│   │   │   ├── providers/   # LLM providers
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   ├── cli/                  # Terminal CLI
│   │   ├── src/
│   │   │   ├── commands/     # CLI commands
│   │   │   ├── components/   # Ink React components
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   ├── web/                  # Next.js dashboard
│   │   ├── src/
│   │   │   ├── app/          # App router pages
│   │   │   ├── components/   # React components
│   │   │   ├── lib/          # Utilities
│   │   │   └── pages/
│   │   └── package.json
│   │
│   └── shared/               # Shared types/utils
│       ├── src/
│       │   ├── types/         # TypeScript types
│       │   ├── utils/         # Utilities
│       │   └── constants.ts
│       └── package.json
│
├── docker/                   # Docker configurations
├── scripts/                  # Build/deployment scripts
├── docs/                     # Documentation
└── README.md
```

## Core Components

### 1. Agent Runtime

The agent runtime is built on LangGraph and implements an autonomous agent loop:

```
Observe → Think → Plan → Act → Verify → Reflect → Repeat
```

**Key Features:**
- Multi-step planning with task decomposition
- Self-correction on failures
- Result verification
- Streaming responses
- Sub-agent spawning

### 2. Memory System

**Layers:**
1. **Working Memory** - Current conversation context
2. **Short-term Memory** - Recent interactions (SQLite)
3. **Long-term Memory** - Persistent knowledge (ChromaDB vector store)
4. **Project Memory** - Repository-specific knowledge

**Capabilities:**
- Semantic search
- Memory compression
- Automatic cleanup
- User preference learning

### 3. Tool Registry

**Built-in Tools:**
- File operations (read, write, edit, delete, move)
- Git operations (status, diff, commit, branch, merge)
- Terminal execution
- Code search (regex, semantic, symbol)
- Web browsing (Playwright MCP)
- Test generation

**MCP Integration:**
- Full MCP protocol support
- Tool discovery
- Permission system
- Dynamic tool loading

### 4. Context Management

**Strategies:**
- Summarization for long contexts
- Semantic chunking
- RAG-based retrieval
- Priority-based selection
- Conversation checkpoints

### 5. Provider Abstraction

Unified interface for multiple LLM providers:

```typescript
interface LLMProvider {
  complete(prompt: string, options: CompletionOptions): Promise<string>;
  stream(prompt: string, options: CompletionOptions): AsyncIterable<string>;
  embed(text: string): Promise<number[]>;
}
```

**Supported Providers:**
- OpenRouter (primary)
- Anthropic
- OpenAI
- Google Gemini
- DeepSeek
- Mistral
- Groq
- Cerebras
- Local models (Ollama, LM Studio, vLLM)

## Data Flow

```
User Input
    │
    ▼
┌─────────────┐
│ CLI / Web   │
└─────────────┘
    │
    ▼
┌─────────────┐
│   Backend   │ ◄── API requests
└─────────────┘
    │
    ▼
┌─────────────┐
│   Agent     │ ◄── Tool calls
│   Runtime   │
└─────────────┘
    │
    ├──► LLM Provider (streaming response)
    │
    ├──► Tool Executor
    │       │
    │       └──► File System / Git / Terminal
    │
    ├──► Memory System
    │       │
    │       └──► SQLite / ChromaDB
    │
    └──► Context Manager
            │
            └──► Truncation / RAG / Summary
```

## Security Model

**Sandbox Modes:**
1. **Read-only** - View code only
2. **Ask before edit** - Confirm each modification
3. **Ask before command** - Confirm each command
4. **Fully autonomous** - No confirmation needed

**Permission Levels:**
- Tool permissions
- Directory restrictions
- Network access
- Execution limits

## Deployment Options

1. **CLI Only** - Local terminal usage
2. **Web Dashboard** - Browser-based interface
3. **Desktop App** - Tauri native application
4. **Docker** - Containerized deployment
5. **Self-hosted** - Full server deployment

## Performance Considerations

- Streaming for instant feedback
- Async tool execution
- Parallel file operations
- Cached repository indices
- Connection pooling
- Rate limiting

## Extensibility

**Plugin System:**
- Custom tools
- Additional LLM providers
- Memory backends
- UI themes
- Output formatters

**MCP Support:**
- 100+ pre-built tools
- Custom MCP servers
- Protocol bridge
