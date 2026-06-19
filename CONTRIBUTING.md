# Contributing to OpenCode Studio

Thank you for your interest in contributing to OpenCode Studio! This document provides guidelines and instructions for contributing.

## Code of Conduct

By participating in this project, you agree to abide by our Code of Conduct. Please read it before contributing.

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm 8+
- Git

### Setup

1. Fork the repository
2. Clone your fork:
   ```bash
   git clone https://github.com/YOUR_USERNAME/opencode-studio.git
   cd opencode-studio
   ```

3. Install dependencies:
   ```bash
   pnpm install
   ```

4. Build all packages:
   ```bash
   pnpm build
   ```

5. Run tests:
   ```bash
   pnpm test
   ```

## Development Workflow

### Branch Naming

- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation
- `refactor/` - Code refactoring
- `test/` - Tests

Example: `feature/add-mcp-support`

### Making Changes

1. Create a new branch from `main`:
   ```bash
   git checkout main
   git pull
   git checkout -b feature/your-feature-name
   ```

2. Make your changes following the guidelines below

3. Write tests for your changes

4. Ensure all tests pass:
   ```bash
   pnpm test
   ```

5. Commit your changes:
   ```bash
   git add .
   git commit -m "feat: add new feature"
   ```

### Commit Messages

We follow the Conventional Commits specification:

- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation
- `style:` - Code style (formatting)
- `refactor:` - Code refactoring
- `test:` - Tests
- `chore:` - Build/process

Example:
```
feat(agent): add autonomous planning loop

- Implement Observe → Think → Plan → Act cycle
- Add self-correction on tool failures
- Add verification step after each action

Closes #123
```

## Code Guidelines

### TypeScript

- Use strict TypeScript
- Avoid `any` type
- Export types when needed
- Use interfaces for object shapes

### File Organization

```
packages/
  shared/
    src/
      types/        # TypeScript types
      utils/       # Utility functions
  agent-runtime/
    src/
      agent/       # Agent implementation
      tools/       # Tool definitions
      providers/   # LLM providers
      memory/      # Memory system
```

### Testing

- Write unit tests for utilities and tools
- Write integration tests for agent workflows
- Aim for 80% code coverage

### Documentation

- Update README.md for user-facing changes
- Add JSDoc comments for public APIs
- Update ARCHITECTURE.md for structural changes

## Pull Request Process

1. Fill out the PR template completely
2. Request review from maintainers
3. Address all feedback
4. Ensure CI passes
5. Squash and merge

### PR Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
Describe testing performed

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-reviewed
- [ ] Tests added/updated
- [ ] Documentation updated
```

## Reporting Issues

### Bug Reports

Include:
- Steps to reproduce
- Expected behavior
- Actual behavior
- Environment details
- Code sample if applicable

### Feature Requests

Include:
- Problem you're solving
- Proposed solution
- Alternative solutions considered

## Questions?

Open an issue for discussion or join our Discord.

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
