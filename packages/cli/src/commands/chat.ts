// ============================================================================
// OpenCode Studio - Chat Command
// ============================================================================

import chalk from 'chalk';
import {
  createProvider,
  CodeAgent,
  defaultTools,
} from '@opencode/agent-runtime';

// ----------------------------------------------------------------------------
// Chat Command
// ----------------------------------------------------------------------------

interface ChatOptions {
  workspace: string;
  model?: string;
  stream?: boolean;
}

export async function chat(message: string | undefined, options: ChatOptions): Promise<void> {
  // Check for API key
  const apiKey = process.env.OPENROUTER_API_KEY || process.env.ANTHROPIC_API_KEY;
  
  if (!apiKey) {
    console.error(chalk.red('Error: No API key found.'));
    console.log(chalk.yellow('\nPlease set one of the following environment variables:'));
    console.log('  - OPENROUTER_API_KEY'));
    console.log('  - ANTHROPIC_API_KEY');
    console.log('\nOr configure it via: opencode config set apiKey <key>');
    process.exit(1);
  }
  
  if (!message) {
    console.log(chalk.yellow('No message provided. Starting interactive mode...\n'));
    // Fall through to interactive mode
    const { interactive } = await import('./interactive.js');
    return interactive({ workspace: options.workspace, model: options.model });
  }
  
  console.log(chalk.cyan('🤖 OpenCode Studio\n'));
  console.log(chalk.dim(`Workspace: ${options.workspace}\n`));
  
  // Create provider
  const provider = createProvider({
    name: 'openrouter',
    apiKey,
    model: options.model,
  });
  
  // Create agent
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
  
  console.log(chalk.dim('User: ') + message + '\n');
  console.log(chalk.dim('Assistant:'));
  
  try {
    if (options.stream) {
      // Streaming response
      process.stdout.write(chalk.green('→ '));
      
      for await (const chunk of agent.run(message, { stream: true })) {
        if (chunk.content) {
          process.stdout.write(chunk.content);
        }
      }
      
      console.log('\n');
    } else {
      // Non-streaming response
      const response = await agent.complete(message);
      console.log(chalk.green('\n' + response.content + '\n'));
    }
    
    // Print metadata if available
    if (response.metadata) {
      console.log(chalk.dim('\n---'));
      console.log(chalk.dim(`Iterations: ${response.metadata.iterations}`));
      if (response.metadata.executedSteps) {
        console.log(chalk.dim(`Tools used: ${response.metadata.executedSteps}`));
      }
    }
  } catch (error) {
    console.error(chalk.red('\nError:'), error instanceof Error ? error.message : error);
    process.exit(1);
  }
}
