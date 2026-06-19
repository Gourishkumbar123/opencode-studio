// ============================================================================
// OpenCode Studio - Status Command
// ============================================================================

import chalk from 'chalk';
import { existsSync } from 'fs';
import { join } from 'path';

interface StatusOptions {
  json?: boolean;
}

export async function status(_options: StatusOptions): Promise<void> {
  const cwd = process.cwd();
  const agentsFile = join(cwd, 'AGENTS.md');
  const configFile = join(cwd, '.opencode', 'config.json');
  
  // Check API keys
  const hasOpenRouter = !!process.env.OPENROUTER_API_KEY;
  const hasAnthropic = !!process.env.ANTHROPIC_API_KEY;
  const hasOpenAI = !!process.env.OPENAI_API_KEY;
  const hasGemini = !!process.env.GOOGLE_API_KEY;
  
  const statusData = {
    workspace: cwd,
    projectInitialized: existsSync(agentsFile),
    configExists: existsSync(configFile),
    apiKeys: {
      openrouter: hasOpenRouter,
      anthropic: hasAnthropic,
      openai: hasOpenAI,
      gemini: hasGemini,
    },
    version: '0.1.0',
  };
  
  if (statusData.json) {
    console.log(JSON.stringify(statusData, null, 2));
    return;
  }
  
  // Print status
  console.log(chalk.cyan(`
┌─────────────────────────────────────────────────────────────────┐
│                    OpenCode Studio Status                       │
└─────────────────────────────────────────────────────────────────┘
  `));
  
  console.log(chalk.bold('\nWorkspace'));
  console.log(chalk.dim(`  Path: ${statusData.workspace}`));
  
  console.log(chalk.bold('\nProject Status'));
  console.log(
    statusData.projectInitialized
      ? chalk.green('  ✓ AGENTS.md found')
      : chalk.yellow('  ✗ AGENTS.md not found (run opencode init)')
  );
  console.log(
    statusData.configExists
      ? chalk.green('  ✓ Config file exists')
      : chalk.yellow('  ✗ Config file not found')
  );
  
  console.log(chalk.bold('\nAPI Keys'));
  if (hasOpenRouter || hasAnthropic || hasOpenAI || hasGemini) {
    if (hasOpenRouter) console.log(chalk.green('  ✓ OpenRouter'));
    if (hasAnthropic) console.log(chalk.green('  ✓ Anthropic'));
    if (hasOpenAI) console.log(chalk.green('  ✓ OpenAI'));
    if (hasGemini) console.log(chalk.green('  ✓ Google Gemini'));
  } else {
    console.log(chalk.red('  ✗ No API keys configured'));
    console.log(chalk.dim('    Set OPENROUTER_API_KEY or ANTHROPIC_API_KEY'));
  }
  
  console.log(chalk.bold('\nVersion'));
  console.log(chalk.dim(`  opencode v${statusData.version}`));
  
  console.log(chalk.cyan(`

┌─────────────────────────────────────────────────────────────────┐
│  Quick Commands                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ${chalk.cyan('opencode interactive')}    Start an interactive session           │
│  ${chalk.cyan('opencode chat "..."')}     Send a single message                  │
│  ${chalk.cyan('opencode init')}           Initialize project with AGENTS.md       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
  `));
}
