# OpenCode Studio - CLI Reference

## Installation

```bash
npm install -g @opencode/cli
# or
npx @opencode/cli interactive
```

## Commands

### `opencode interactive` (or `opencode i`)

Start an interactive REPL session with the AI agent.

```bash
opencode interactive
opencode i
```

Options:
- `-w, --workspace <path>` - Working directory (default: current directory)
- `-m, --model <model>` - Model to use

Example:
```bash
opencode interactive -w ./my-project -m anthropic/claude-3.5-sonnet
```

### `opencode chat`

Send a single message to the agent.

```bash
opencode chat "Fix the login bug"
opencode chat -s "Create a REST API for users"
```

Options:
- `-w, --workspace <path>` - Working directory
- `-m, --model <model>` - Model to use
- `-s, --stream` - Enable streaming responses

### `opencode init`

Initialize a project with OpenCode Studio.

```bash
opencode init
opencode init ./my-project --force
```

This creates an `AGENTS.md` file with project-specific instructions.

### `opencode status`

Show current configuration and status.

```bash
opencode status
opencode status --json
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `OPENROUTER_API_KEY` | OpenRouter API key (recommended) |
| `ANTHROPIC_API_KEY` | Anthropic API key |
| `OPENAI_API_KEY` | OpenAI API key |
| `GOOGLE_API_KEY` | Google API key |

## Configuration

### AGENTS.md

Create a project-specific `AGENTS.md` file to customize agent behavior:

```markdown
# OpenCode Studio - Project Configuration

## Tech Stack
- Node.js 20+
- TypeScript
- Express.js

## Conventions
- Use 2 spaces for indentation
- Follow ESLint/Prettier
- 80% test coverage required

## Commands
npm run dev    # Start development
npm test       # Run tests
npm run build  # Production build
```

## Examples

### Fix a Bug

```bash
$ opencode chat "Fix the null pointer exception in user.service.ts"
```

### Create a Feature

```bash
$ opencode interactive
You: Create a REST API for the todo list
Agent: Planning...
```

### Code Review

```bash
$ opencode chat "Review this code for security issues" --file ./src/auth/login.ts
```

### Generate Tests

```bash
$ opencode chat "Generate Jest tests for the payment module"
```

## Troubleshooting

### "No API key found"

Set your API key:
```bash
export OPENROUTER_API_KEY=sk-or-...
```

### "Permission denied"

The agent may not have write permissions. Check your sandbox mode settings.

### Slow responses

Try a faster model:
```bash
opencode chat -m "anthropic/claude-3-haiku-20240307" "Help me"
```
