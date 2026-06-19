# OpenCode Studio - Release Plan

## Version Overview

| Version | Codename | Target | Status |
|---------|----------|--------|--------|
| v0.1.0 | Alpha | Q1 2025 | In Progress |
| v0.5.0 | Beta | Q2 2025 | Planned |
| v1.0.0 | Stable | Q4 2025 | Planned |

---

## v0.1.0 - Alpha (Current)

### Release Date
Q1 2025

### Goals
- Establish core architecture
- Basic agent functionality
- Multiple LLM provider support
- CLI interface

### Features

#### ✅ Completed
- [x] Monorepo setup with pnpm workspaces
- [x] Core types and interfaces (@opencode/shared)
- [x] LLM provider abstraction layer
- [x] OpenRouter provider implementation
- [x] Anthropic provider implementation
- [x] OpenAI provider implementation
- [x] Google Gemini provider implementation
- [x] Basic agent runtime
- [x] File operation tools (read, write, edit, delete, move)
- [x] Directory listing and glob
- [x] Git tools (status, diff, log, commit, branch, checkout)
- [x] Terminal execution tool
- [x] CLI with interactive mode
- [x] CLI with single message mode
- [x] Basic web UI (Next.js)
- [x] Fastify backend API
- [x] Docker support

#### 📋 TODO
- [ ] Memory system with SQLite
- [ ] Vector store integration
- [ ] Comprehensive error handling
- [ ] Documentation site

### Known Limitations
- No persistent memory between sessions
- Limited context window management
- No MCP server support yet
- Basic web UI (chat only)

---

## v0.5.0 - Beta

### Target Release Date
Q2 2025

### Goals
- Production-ready agent capabilities
- Memory and context management
- MCP integration
- Enhanced tooling

### Features

#### Core Agent
- [ ] LangGraph-based agent orchestration
- [ ] Autonomous planning and execution loop
- [ ] Self-correction on failures
- [ ] Multi-step task decomposition
- [ ] Sub-agent system for specialized tasks

#### Memory System
- [ ] SQLite-based memory store
- [ ] Vector store for semantic search
- [ ] Project memory persistence
- [ ] User preference learning
- [ ] Memory compression and cleanup

#### Repository Understanding
- [ ] Project indexing
- [ ] Dependency graph generation
- [ ] Import graph analysis
- [ ] Architecture summarization
- [ ] Tech stack detection

#### MCP Integration
- [ ] MCP protocol implementation
- [ ] MCP server discovery
- [ ] Built-in MCP servers (filesystem, git, etc.)
- [ ] Custom MCP server support

#### Enhanced Tools
- [ ] Code review mode
- [ ] Test generation (Jest, Pytest, etc.)
- [ ] Pull request review
- [ ] Browser automation (Playwright)

#### CLI Enhancements
- [ ] Syntax highlighting
- [ ] Command history
- [ ] Auto-completion
- [ ] Configuration management

#### Web UI
- [ ] Project management
- [ ] Conversation history
- [ ] Settings management
- [ ] Usage analytics

### Known Limitations
- No desktop application yet
- No plugin marketplace
- No voice mode

---

## v1.0.0 - Stable

### Target Release Date
Q4 2025

### Goals
- Production deployment ready
- Enterprise features
- Plugin ecosystem
- Full platform support

### Features

#### Desktop Application
- [ ] Tauri desktop app
- [ ] Native window management
- [ ] System tray integration
- [ ] Notifications
- [ ] Global hotkeys

#### Plugin System
- [ ] Plugin marketplace
- [ ] Custom tool plugins
- [ ] Custom provider plugins
- [ ] UI theme plugins
- [ ] Output format plugins

#### Enterprise Features
- [ ] Role-based access control (RBAC)
- [ ] Audit logging
- [ ] Team workspaces
- [ ] Shared memory
- [ ] SSO integration
- [ ] Secrets management

#### Advanced Capabilities
- [ ] Voice mode (STT/TTS)
- [ ] Advanced RAG
- [ ] Cross-repository search
- [ ] Intelligent code suggestions

#### Platform Support
- [ ] Linux (CLI, Docker, Desktop)
- [ ] macOS (CLI, Docker, Desktop)
- [ ] Windows (CLI, Docker, Desktop)
- [ ] Web (hosted)

---

## Development Guidelines

### Version Numbering
- **Major (X.0.0)**: Breaking changes, major features
- **Minor (0.X.0)**: New features, backward compatible
- **Patch (0.0.X)**: Bug fixes, small improvements

### Release Process
1. Feature freeze 1 week before release
2. Beta testing period
3. Documentation update
4. Changelog generation
5. Version bump and tagging
6. Build and release
7. Announcement

### Backward Compatibility
- API changes must be deprecated first
- CLI commands should maintain aliases
- Configuration format migrations

---

## Contributing to Releases

### For Contributors
1. Check the milestone board for available issues
2. Follow the contribution guidelines
3. Write tests for new features
4. Update documentation

### For Testers
1. Install from nightly builds
2. Report bugs with detailed reproduction steps
3. Provide feedback on features

---

## Migration Guides

### v0.1.0 → v0.5.0
Will include:
- Configuration file format updates
- Database schema migrations
- API endpoint changes
- CLI command changes

### v0.5.0 → v1.0.0
Will include:
- Breaking changes to agent configuration
- Database migrations
- WebSocket protocol updates
- Major CLI redesign

---

## Support Timeline

| Version | Support Status | EOL Date |
|---------|---------------|-----------|
| v0.1.0 | Active | v0.5.0 release |
| v0.5.0 | Active | v1.0.0 release |
| v1.0.0 | LTS | TBD |

---

## Questions?

Open an issue on GitHub or join our Discord for discussions about the roadmap.
