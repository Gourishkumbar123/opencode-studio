// ============================================================================
// OpenCode Studio - Interactive Command
// ============================================================================

import chalk from 'chalk';
import inquirer from 'inquirer';
import { createInterface } from 'readline';
import {
  createProvider,
  CodeAgent,
  defaultTools,
} from '@opencode/agent-runtime';

// ----------------------------------------------------------------------------
// Interactive Options
// ----------------------------------------------------------------------------

interface InteractiveOptions {
  workspace: string;
  model?: string;
}

// ----------------------------------------------------------------------------
// Interactive Mode
// ----------------------------------------------------------------------------

export async function interactive(options: InteractiveOptions): Promise<void> {
  // Check for API key
  const apiKey = process.env.OPENROUTER_API_KEY || process.env.ANTHROPIC_API_KEY;
  
  if (!apiKey) {
    console.error(chalk.red('\nError: No API key found.\n'));
    console.log(chalk.yellow('Please set one of the following environment variables:'));
    console.log('  - OPENROUTER_API_KEY');
    console.log('  - ANTHROPIC_API_KEY');
    console.log('\nExample:'));
    console.log(chalk.cyan('  export OPENROUTER_API_KEY=sk-or-...'));
    console.log(chalk.cyan('  opencode interactive\n'));
    process.exit(1);
  }
  
  // Banner
  console.log(chalk.cyan(`
  ╔═══════════════════════════════════════════════════════════╗
  ║                                                           ║
  ║   ███████╗██╗     ███████╗███╗   ███╗██████╗ ██╗███╗   ██╗███████╗   ║
  ║   ██╔════╝██║     ██╔════╝████╗ ████║██╔══██╗██║████╗  ██║██╔════╝   ║
  ║   ███████╗██║     █████╗  ██╔████╔██║██████╔╝██║██╔██╗ ██║█████╗     ║
  ║   ╚════██║██║     ██╔══╝  ██║╚██╔╝██║██╔═══╝ ██║██║╚██╗██║██╔══╝     ║
  ║   ███████║███████╗███████╗██║ ╚═╝ ██║██║     ██║██║ ╚████║███████╗   ║
  ║   ╚══════╝╚══════╝╚══════╝╚═╝     ╚═╝╚═╝     ╚═╝╚═╝  ╚═══╝╚══════╝   ║
  ║                                                           ║
  ║   Studio - Local AI Coding Agent                          ║
  ║                                                           ║
  ╚═══════════════════════════════════════════════════════════╝
  `));
  
  console.log(chalk.dim(`Workspace: ${options.workspace}\n`));
  console.log(chalk.dim('Type your request and press Enter. Ctrl+C to exit.\n'));
  
  // Create provider and agent
  const provider = createProvider({
    name: 'openrouter',
    apiKey,
    model: options.model,
  });
  
  const agent = new CodeAgent(
    {
      name: 'opencode-agent',
      description: 'OpenCode Studio Agent',
      model: options.model,
      temperature: 0.7,
      maxIterations: 50,
    },
    provider,
    defaultTools,
    options.workspace
  );
  
  // Create readline interface
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  
  const question = (prompt: string): Promise<string> => {
    return new Promise((resolve) => {
      rl.question(chalk.bold.green('You: ') + chalk.reset(''), (answer) => {
        resolve(answer);
      });
    });
  };
  
  // Main loop
  let running = true;
  
  while (running) {
    try {
      const input = await question('');
      
      if (!input.trim()) continue;
      
      // Check for exit commands
      if (['exit', 'quit', 'q'].includes(input.toLowerCase())) {
        console.log(chalk.dim('\nGoodbye! 👋\n'));
        running = false;
        break;
      }
      
      // Check for help
      if (input.toLowerCase() === 'help') {
        printHelp();
        continue;
      }
      
      // Show thinking indicator
      console.log(chalk.dim('\nAssistant: Thinking...\n'));
      
      // Run agent
      console.log(chalk.green('→ '));
      
      let fullResponse = '';
      
      for await (const chunk of agent.run(input, { stream: true })) {
        if (chunk.content) {
          process.stdout.write(chunk.content);
          fullResponse += chunk.content;
        }
        
        if (chunk.done) {
          console.log('\n');
          
          // Print metadata
          if (chunk.metadata) {
            console.log(chalk.dim('---'));
            console.log(chalk.dim(`Iterations: ${chunk.metadata.iterations || 1}`));
            if (chunk.metadata.executedSteps) {
              console.log(chalk.dim(`Tools used: ${chunk.metadata.executedSteps}`));
            }
          }
          console.log();
        }
      }
    } catch (error) {
      console.error(chalk.red('\n\nError:'), error instanceof Error ? error.message : error);
      console.log();
    }
  }
  
  rl.close();
}

// ----------------------------------------------------------------------------
// Help
// ----------------------------------------------------------------------------

function printHelp(): void {
  console.log(chalk.cyan(`
╭────────────────────────────────────────────────────────────────╮
│  Commands                                                       │
├────────────────────────────────────────────────────────────────╤
│  help              Show this help message                       │
│  exit / quit / q   Exit the interactive mode                    │
│  clear             Clear the screen                             │
├────────────────────────────────────────────────────────────────╤
│  Examples:                                                      │
│                                                                 │
│  • "Fix the login bug in auth.js"                               │
│  • "Create a REST API for users"                                │
│  • "Add unit tests for the payment module"                      │
│  • "Review this code for security issues"                       │
│  • "Generate Playwright tests for the checkout flow"             │
│                                                                 │
╰────────────────────────────────────────────────────────────────╯
  `));
}
