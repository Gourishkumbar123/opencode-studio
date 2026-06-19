# OpenCode Studio

<p align="center">
  <img src="https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript">
  <img src="https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" alt="Node.js">
  <img src="https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white" alt="Docker">
  <img src="https://img.shields.io/badge/License-MIT-green?style=for-the-badge" alt="MIT License">
</p>

<p align="center">
  <strong>OpenCode Studio</strong> — An open-source AI coding agent inspired by Claude Code, Cursor Agent, and Codex CLI.
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#quick-start">Quick Start</a> •
  <a href="#installation">Installation</a> •
  <a href="#mcp-connectors">MCP Connectors</a> •
  <a href="#configuration">Configuration</a> •
  <a href="#development">Development</a>
</p>

---

## ✨ Features

### 🤖 AI-Powered Coding Agent

- **Autonomous Agent Loop**: Observe → Think → Plan → Act → Verify → Reflect → **Learn**
- **Multi-Step Planning**: Automatically break down complex tasks into executable steps
- **Self-Correction**: The agent detects failures and retries with alternative approaches
- **Learning Memory**: AI learns from past mistakes and successes, building persistent knowledge
- **Context Management**: Handle 100k+ tokens with smart truncation and summarization

### 🔌 Multi-Provider AI Support

Connect to any OpenAI-compatible API:

| Provider | Status | Models |
|----------|--------|--------|
| **OpenRouter** | ✅ Primary | 100+ models |
| **Anthropic** | ✅ | Claude 3.5, Claude 3 |
| **OpenAI** | ✅ | GPT-4, GPT-3.5 |
| **Google Gemini** | ✅ | Gemini Pro, Flash |
| **DeepSeek** | ✅ | DeepSeek Chat |
| **Mistral** | ✅ | Mistral Large |
| **Groq** | ✅ | Llama, Mixtral |
| **Local Models** | ✅ | Ollama, LM Studio, vLLM |

### 🛠️ Built-in Tools

| Category | Tools |
|----------|-------|
| **File Operations** | Read, write, edit, delete, move, glob, grep |
| **Git Workflow** | Status, diff, commit, branch, merge, rebase, push, pull |
| **Terminal** | Execute commands, run scripts, manage processes |
| **Search** | Semantic search, regex, symbol search, cross-repo search |

### 🔗 MCP Connectors (21 Available)

| Category | Connectors |
|----------|------------|
| **AI & Media** | Higgs Field (20 tools), EverArt |
| **Version Control** | GitHub (27+ tools), GitLab |
| **Productivity** | Slack, Linear, Notion, Jira |
| **Databases** | PostgreSQL, SQLite, Memory |
| **Cloud** | AWS KB, Google Maps, Brave Search |
| **Browser** | Puppeteer, Fetch, Filesystem |

### 🎨 User Interfaces

- **CLI**: Interactive terminal REPL with streaming responses
- **Web Dashboard**: Modern Next.js dashboard with chat, settings, analytics
- **Desktop App**: Tauri-based cross-platform desktop application
- **REST API**: Fastify-based API for custom integrations

### 🐳 Deployment Options

- Docker & Docker Compose
- Kubernetes (K8s)
- Linux, macOS, Windows
- Single binary CLI

---

## 🚀 Quick Start

### System Requirements

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| **OS** | Linux, macOS, Windows 10+ | Linux Mint, Ubuntu 22.04+, macOS |
| **Node.js** | v20.0.0 | v20 LTS |
| **RAM** | 4 GB | 8 GB |
| **Storage** | 2 GB free | 5 GB free |
| **Network** | Internet | Stable connection |

> ⚠️ **No GPU required!** OpenCode Studio uses cloud APIs and runs on any CPU.

### 1. Install Node.js

```bash
# Linux Mint / Ubuntu
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install nodejs

# Verify
node --version  # Should show v20.x.x
```

### 2. Install pnpm

```bash
npm install -g pnpm
pnpm --version  # Should show 8.x.x
```

### 3. Clone the Repository

```bash
git clone https://github.com/Gourishkumbar123/opencode-studio.git
cd opencode-studio
```

### 4. Install Dependencies

```bash
pnpm install
```

### 5. Configure API Key

```bash
cp .env.example .env
echo "OPENROUTER_API_KEY=sk-or-v1-xxxxx" >> .env
```

### 6. Start the CLI

```bash
pnpm cli interactive
# or
opencode interactive
```

### Quick Test (5 minutes)

```bash
# Test MCP connectors (no API key needed)
node scripts/mcp-manager.js registry
node scripts/mcp-manager.js test memory
```

---

## 📦 Installation

### Docker

```bash
docker-compose up
```

### Development

```bash
pnpm install
pnpm build
pnpm test
```

---

## 🔌 MCP Connectors

### Adding Connectors

```bash
# Add Higgs Field
node scripts/mcp-manager.js add higgsfield

# Add GitHub
node scripts/mcp-manager.js add github

# Browse all
node scripts/mcp-manager.js registry
```

### Available Connectors

| Connector | Tools | Description |
|-----------|-------|-------------|
| higgsfield | 20 | AI image/video generation |
| github | 27+ | Issues, PRs, repos |
| filesystem | 14 | File operations |
| memory | 9 | Knowledge graph |
| slack | 8 | Messaging |
| linear | 15 | Project management |
| postgres | 5 | Database queries |
| puppeteer | 10 | Browser automation |

---

## ⚙️ Configuration

### Environment Variables

```bash
OPENROUTER_API_KEY=sk-or-v1-xxxxx
ANTHROPIC_API_KEY=sk-ant-xxxxx
GITHUB_TOKEN=ghp_xxxxx
HF_API_KEY=xxxxx
```

### Project Rules (AGENTS.md)

```markdown
# Tech Stack
- Node.js 20+
- TypeScript

## Commands
npm run dev    # Start development
npm test       # Run tests
```

---

## 💻 CLI Usage

```bash
# Interactive mode
opencode interactive

# Single command
opencode chat "Create a REST API"

# Options
-w, --workspace   Working directory
-m, --model       Model to use
-s, --stream      Enable streaming
```

---

## 🌐 Web Dashboard

```bash
pnpm web dev
# Open http://localhost:3000
```

Features: Chat, Session History, Project Management, Settings, Analytics

---

## 🏗️ Architecture

```
opencode-studio/
├── packages/
│   ├── shared/           # Types & utilities
│   ├── agent-runtime/    # Core agent (LangGraph)
│   ├── backend/          # Fastify API
│   ├── cli/              # Terminal interface
│   └── web/              # Next.js dashboard
├── docker/               # Docker configs
├── scripts/              # Build scripts
└── docs/                 # Documentation
```

### Agent Loop

```
┌─────────────┐
│   OBSERVE   │ ← Get user input, read files, check state
└──────┬──────┘
       ▼
┌─────────────┐
│    THINK    │ ← Analyze task, understand context
└──────┬──────┘
       ▼
┌─────────────┐
│    PLAN     │ ← Create execution plan, break into steps
└──────┬──────┘
       ▼
┌─────────────┐
│     ACT     │ ← Execute tools, modify files, run commands
└──────┬──────┘
       ▼
┌─────────────┐
│   VERIFY    │ ← Check results, validate changes
└──────┬──────┘
       ▼
┌─────────────┐
│   REFLECT   │ ← Self-correct if needed, summarize
└──────┬──────┘
       ▼
┌─────────────┐
│    LEARN    │ ← Store patterns, learn from mistakes
└──────┬──────┘
       │
       └──────→ Repeat until task complete
```

**Learning Memory Features:**
- Remembers successful patterns and strategies
- Learns from failures and avoids repeated mistakes
- Builds project-specific knowledge over time
- Semantic search across past sessions
- Automatic knowledge graph updates

---

## 📚 Documentation

- [ARCHITECTURE.md](ARCHITECTURE.md) - System design
- [docs/CLI.md](docs/CLI.md) - CLI reference
- [docs/API.md](docs/API.md) - API reference
- [docs/MCP.md](docs/MCP.md) - MCP connectors
- [docs/HIGGSFIELD_MCP.md](docs/HIGGSFIELD_MCP.md) - Higgs Field
- [CONTRIBUTING.md](CONTRIBUTING.md) - Guidelines

---

## 🧪 Development

```bash
pnpm test        # Run tests
pnpm build       # Build all
pnpm lint        # Lint code
```

---

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing`)
3. Commit changes (`git commit -m 'feat: add amazing'`)
4. Push branch (`git push origin feature/amazing`)
5. Open a Pull Request

---

## 📄 License

MIT License

---

<p align="center">
  ⭐ Star us on GitHub | 🐛 Report a Bug
</p>
