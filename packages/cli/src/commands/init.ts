// ============================================================================
// OpenCode Studio - Init Command
// ============================================================================

import chalk from 'chalk';
import { existsSync, writeFileSync } from 'fs';
import { join } from 'path';

const AGENTS_MD_CONTENT = `# OpenCode Studio - Project Configuration

This file contains project-specific instructions for the OpenCode Studio AI coding agent.

## Project Overview

<!-- Describe your project here -->

## Tech Stack

- Language:
- Framework:
- Build System:
- Testing Framework:

## Project Structure

Describe your project structure here.

## Key Conventions

### Code Style
- Use 2 spaces for indentation
- Follow ESLint/Prettier configuration

### Git Workflow
- Branch naming: \`feature/\`, \`fix/\`, \`chore/\`
- Commit messages: Conventional Commits format

### Testing
- All new features should have tests
- Run tests with: npm test

## Common Commands

\`\`\`bash
# Development
npm run dev

# Build
npm run build

# Test
npm test

# Lint
npm run lint
\`\`\`

## Important Files

| File | Description |
|------|-------------|
| | |

## Constraints

- Do not modify files outside the \`src/\` directory without approval
- Always run tests before committing
- Follow the code review checklist
`;

export async function init(path: string, options: { force?: boolean }): Promise<void> {
  const targetPath = path === '.' ? process.cwd() : path;
  const agentsFile = join(targetPath, 'AGENTS.md');
  
  console.log(chalk.cyan('\n🚀 Initializing OpenCode Studio...\n'));
  
  if (existsSync(agentsFile) && !options.force) {
    console.log(chalk.yellow(`⚠️  ${agentsFile} already exists.`));
    console.log(chalk.dim('Use --force to overwrite.\n'));
    
    const { Confirm } = await import('inquirer');
    const { confirmed } = await Confirm({ message: 'Overwrite existing AGENTS.md?' });
    
    if (!confirmed) {
      console.log(chalk.dim('Cancelled.\n'));
      return;
    }
  }
  
  // Create AGENTS.md
  writeFileSync(agentsFile, AGENTS_MD_CONTENT, 'utf-8');
  
  console.log(chalk.green(`✅ Created ${agentsFile}\n`));
  console.log(chalk.dim('Edit this file to configure project-specific instructions for the agent.\n'));
  
  // Create .opencode directory
  const configDir = join(targetPath, '.opencode');
  try {
    const { mkdirSync } = await import('fs');
    mkdirSync(configDir, { recursive: true });
    
    const configFile = join(configDir, 'config.json');
    const configContent = JSON.stringify({
      version: '0.1.0',
      workspace: targetPath,
      lastInitialized: new Date().toISOString(),
    }, null, 2);
    
    writeFileSync(configFile, configContent, 'utf-8');
    console.log(chalk.green(`✅ Created ${configFile}\n`));
  } catch {
    // Directory might already exist
  }
  
  console.log(chalk.cyan('✨ OpenCode Studio is ready!\n'));
  console.log(chalk.bold('Next steps:'));
  console.log(chalk.dim('  1. Set your API key:'));
  console.log(chalk.cyan('     export OPENROUTER_API_KEY=sk-or-...'));
  console.log(chalk.dim('\n  2. Start coding:'));
  console.log(chalk.cyan('     opencode interactive'));
  console.log(chalk.dim('\n  3. Or ask a question:'));
  console.log(chalk.cyan('     opencode chat "How does authentication work?"'));
  console.log();
}
