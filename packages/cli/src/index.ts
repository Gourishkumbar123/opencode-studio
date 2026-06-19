#!/usr/bin/env node

// ============================================================================
// OpenCode Studio - CLI Entry Point
// ============================================================================

import { Command } from 'commander';
import { chat } from './commands/chat.js';
import { interactive } from './commands/interactive.js';
import { init } from './commands/init.js';
import { status } from './commands/status.js';

const program = new Command();

program
  .name('opencode')
  .description('OpenCode Studio - Local AI Coding Agent')
  .version('0.1.0');

program
  .command('chat')
  .description('Start a chat session with the AI agent')
  .argument('[message]', 'Initial message to send')
  .option('-w, --workspace <path>', 'Working directory', process.cwd())
  .option('-m, --model <model>', 'Model to use')
  .option('-s, --stream', 'Enable streaming responses')
  .action(chat);

program
  .command('interactive')
  .alias('i')
  .description('Start an interactive REPL session')
  .option('-w, --workspace <path>', 'Working directory', process.cwd())
  .option('-m, --model <model>', 'Model to use')
  .action(interactive);

program
  .command('init')
  .description('Initialize a new project with OpenCode Studio')
  .argument('[path]', 'Project path', '.')
  .option('--force', 'Overwrite existing configuration')
  .action(init);

program
  .command('status')
  .description('Show current configuration and status')
  .option('-j, --json', 'Output as JSON')
  .action(status);

// Global options
program
  .option('-v, --verbose', 'Enable verbose logging')
  .hook('preAction', (thisCommand) => {
    const opts = thisCommand.opts();
    if (opts.verbose) {
      process.env.DEBUG = 'true';
    }
  });

program.parse();
