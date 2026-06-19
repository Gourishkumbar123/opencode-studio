# MCP Connectors - Complete Guide

OpenCode Studio supports **Model Context Protocol (MCP)** connectors, allowing you to extend its capabilities with external tools and services.

## Quick Start

```bash
# Add Higgs Field (AI image/video generation)
node scripts/mcp-manager.js quick

# Add recommended connectors
node scripts/mcp-manager.js init

# Browse all available connectors
node scripts/mcp-manager.js registry

# List configured connectors
node scripts/mcp-manager.js list
```

## Available MCP Connectors

### 🤖 AI & Media

| Connector | Tools | Description |
|-----------|-------|-------------|
| **higgsfield** | 20 | Cinematic image and video generation |
| **everart** | 5 | AI image generation |

### 📂 Version Control

| Connector | Tools | Description |
|-----------|-------|-------------|
| **github** | 27+ | Issues, PRs, repos, code search |
| **gitlab** | 12 | Issues, MRs, and repos |

### 📋 Productivity

| Connector | Tools | Description |
|-----------|-------|-------------|
| **slack** | 8 | Messaging and channel management |
| **linear** | 15 | Project management and issues |
| **notion** | 12 | Notes and documentation |
| **jira** | 15 | Issue tracking and project management |

### 💾 Databases

| Connector | Tools | Description |
|-----------|-------|-------------|
| **postgres** | 5 | PostgreSQL database queries |
| **sqlite** | 5 | Local SQLite database queries |
| **memory** | 5 | Persistent knowledge graph |

### ☁️ Cloud Services

| Connector | Tools | Description |
|-----------|-------|-------------|
| **aws-kb** | 5 | AWS Bedrock RAG knowledge base |
| **google-maps** | 8 | Locations and directions |
| **brave-search** | 3 | Web search |

### 📁 Files & Browser

| Connector | Tools | Description |
|-----------|-------|-------------|
| **filesystem** | 10 | Read, write, manage files |
| **fetch** | 3 | HTTP requests and web scraping |
| **puppeteer** | 10 | Browser automation |
| **everything** | 5 | File search (Windows) |

### 📊 Monitoring

| Connector | Tools | Description |
|-----------|-------|-------------|
| **sentry** | 8 | Error tracking and monitoring |

### 🧠 AI Tools

| Connector | Tools | Description |
|-----------|-------|-------------|
| **sequential-thinking** | 3 | Chain of thought reasoning |

## Adding Connectors

### Interactive Mode

```bash
# Browse available connectors
node scripts/mcp-manager.js registry

# Add a specific connector
node scripts/mcp-manager.js add github
node scripts/mcp-manager.js add slack
node scripts/mcp-manager.js add postgres
```

### Quick Start Connectors

```bash
# Higgs Field only (AI image/video)
node scripts/mcp-manager.js quick

# Recommended set (GitHub, Filesystem, Memory)
node scripts/mcp-manager.js init
```

### Custom Connector

```bash
node scripts/mcp-manager.js add my-connector '{"command":"node","args":["./server.js"],"env":{"API_KEY":"..."}}'
```

## Configuration

MCP servers are configured in `.opencode/mcp-servers.json`:

```json
{
  "version": "1.0",
  "mcpServers": {
    "higgsfield": {
      "name": "higgsfield",
      "command": "npx",
      "args": ["-y", "higgsfield-mcp"],
      "env": {
        "HF_API_KEY": "your_key",
        "HF_SECRET": "your_secret"
      },
      "enabled": true
    },
    "github": {
      "name": "github",
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_TOKEN": "your_github_token"
      },
      "enabled": true
    }
  }
}
```

## Environment Variables

### Generate Required Variables

```bash
node scripts/mcp-manager.js env
```

### Manual Setup

Create a `.env` file:

```bash
# Higgs Field (AI Media)
HF_API_KEY=your_api_key
HF_SECRET=your_secret

# GitHub
GITHUB_TOKEN=ghp_xxxxxxxxxxxx

# GitLab
GITLAB_TOKEN=glpat-xxxxxxxxxxxx

# Slack
SLACK_BOT_TOKEN=xoxb-xxxxxxxxxxxx
SLACK_TEAM_ID=TXXXXXXXX

# Linear
LINEAR_API_KEY=lin_api_xxxxxxxxxxxx

# Notion
NOTION_TOKEN=secret_xxxxxxxxxxxx

# Jira
JIRA_URL=https://your-domain.atlassian.net
JIRA_TOKEN=your_api_token
JIRA_EMAIL=your@email.com

# PostgreSQL
DATABASE_URL=postgresql://user:pass@host:5432/db

# Google Maps
GOOGLE_MAPS_API_KEY=AIzaSyxxxxxxxxxxxx

# Brave Search
BRAVE_API_KEY=BSAxxxxxxxxxxxx

# AWS
AWS_ACCESS_KEY_ID=AKIAxxxxxxxxxxxx
AWS_SECRET_ACCESS_KEY=xxxxxxxxxxxx
AWS_REGION=us-east-1

# Sentry
SENTRY_AUTH_TOKEN=xxxxxxxxxxxx
SENTRY_ORGANIZATION=your-org
SENTRY_PROJECT=your-project
```

## Testing Connectors

```bash
# Test a specific connector
node scripts/mcp-manager.js test higgsfield
node scripts/mcp-manager.js test github

# Test all configured connectors
for server in higgsfield github filesystem memory; do
  node scripts/mcp-manager.js test $server
done
```

## GitHub MCP - Complete Tool List

### Repository Operations
- `create_repository` - Create a new repository
- `fork_repository` - Fork a repository
- `get_file_contents` - Get file or directory contents
- `create_or_update_file` - Create/update a file
- `push_files` - Push multiple files in one commit

### Branch Operations
- `create_branch` - Create a new branch
- `list_commits` - List branch commits
- `update_pull_request_branch` - Update branch from base

### Issue Operations
- `create_issue` - Create an issue
- `get_issue` - Get issue details
- `list_issues` - List repository issues
- `update_issue` - Update an issue
- `add_issue_comment` - Comment on an issue

### Pull Request Operations
- `create_pull_request` - Create a PR
- `get_pull_request` - Get PR details
- `list_pull_requests` - List repository PRs
- `get_pull_request_files` - Get changed files
- `get_pull_request_status` - Get CI status
- `create_pull_request_review` - Submit review
- `merge_pull_request` - Merge a PR

### Search Operations
- `search_repositories` - Find repositories
- `search_code` - Search code
- `search_issues` - Search issues/PRs
- `search_users` - Find users

## Higgs Field MCP - Complete Tool List

### Image Generation
- `generate_image` - Soul model (with styles)
- `generate_image_reve` - Reve model
- `generate_image_seedream` - Seedream v4 (ByteDance)
- `edit_image_seedream` - Edit images with Seedream

### Video Generation
- `generate_video` - DoP model (5-second cinematic)
- `generate_video_kling` - Kling v2.1 Pro
- `generate_video_seedance` - Seedance v1 Pro
- `generate_video_dop_standard` - DoP Standard

### Talking Head
- `generate_talking_head` - Lip-sync video (image + WAV)

### Characters
- `create_character` - Create reusable character (40 credits)
- `list_characters` - List all characters
- `get_character` - Get character details
- `delete_character` - Delete a character

### Utilities
- `list_styles` - Available style presets
- `list_motions` - Available motion presets
- `get_generation_status` - Poll Soul/DoP status
- `get_request_status` - Poll new-API status
- `cancel_request` - Cancel queued job
- `upload_image` - Upload image for generation

## Usage Examples

### Generate AI Image
```
opencode chat "Generate a futuristic cityscape image using Higgs Field"
```

### Create GitHub Issue
```
opencode chat "Create a GitHub issue on owner/repo titled 'Fix login bug' with label 'bug'"
```

### Query Database
```
opencode chat "Run SELECT * FROM users LIMIT 10 on our PostgreSQL database"
```

### Search Code
```
opencode chat "Search GitHub for repositories with 'typescript' and 'open source'"
```

### Browser Automation
```
opencode chat "Take a screenshot of https://example.com"
```

### Create Talking Head Video
```
opencode chat "Create a talking head video using my portrait.jpg and speech.wav"
```

## MCP Manager Commands

```bash
# Add a connector
node scripts/mcp-manager.js add <name>

# Remove a connector
node scripts/mcp-manager.js remove <name>

# List configured connectors
node scripts/mcp-manager.js list

# Browse available connectors
node scripts/mcp-manager.js registry

# Generate environment variables
node scripts/mcp-manager.js env

# Test a connector
node scripts/mcp-manager.js test <name>

# Install all MCP packages
node scripts/mcp-manager.js install

# Quick start (Higgs Field only)
node scripts/mcp-manager.js quick

# Recommended setup
node scripts/mcp-manager.js init
```

## Troubleshooting

### Server Not Starting

```bash
# Check if npm package exists
npm view higgsfield-mcp

# Test manually
npx -y higgsfield-mcp

# Check environment variables
echo $HF_API_KEY
```

### Authentication Errors

```bash
# Verify GitHub token
curl -H "Authorization: token $GITHUB_TOKEN" https://api.github.com/user

# Test Higgs Field credentials
echo '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"debug_credentials","arguments":{}}}' | npx -y higgsfield-mcp
```

### Permission Issues

```bash
# Reinstall globally
npm install -g @modelcontextprotocol/server-github

# Or use npx directly
npx -y @modelcontextprotocol/server-github
```

## Adding Custom MCP Servers

1. Create your MCP server using the SDK
2. Add to registry in `scripts/mcp-manager.js`
3. Or configure directly in `.opencode/mcp-servers.json`

```json
{
  "name": "my-custom-server",
  "command": "node",
  "args": ["/path/to/server.js"],
  "env": {
    "API_KEY": "your_key"
  },
  "enabled": true
}
```

## Resources

- [MCP Documentation](https://modelcontextprotocol.io)
- [MCP SDK](https://github.com/modelcontextprotocol/sdk)
- [Higgs Field API](https://platform.higgsfield.ai/docs)
- [GitHub MCP Server](https://github.com/modelcontextprotocol/server-github)
