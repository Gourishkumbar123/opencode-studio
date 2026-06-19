// ============================================================================
// OpenCode Studio - Terminal and Git Tools
// ============================================================================

import { exec as nodeExec, spawn } from 'child_process';
import { promisify } from 'util';
import { join } from 'path';
import type { Tool, ToolResult, ToolContext } from '@opencode/shared';

const execAsync = promisify(nodeExec);

// ----------------------------------------------------------------------------
// Terminal Execution
// ----------------------------------------------------------------------------

export const terminalTool: Tool = {
  name: 'terminal',
  description: 'Execute a terminal command in the workspace directory',
  inputSchema: {
    type: 'object',
    properties: {
      command: {
        type: 'string',
        description: 'The command to execute',
      },
      timeout: {
        type: 'number',
        description: 'Maximum execution time in seconds',
        default: 60,
      },
      workingDirectory: {
        type: 'string',
        description: 'Working directory for the command (relative to workspace)',
      },
    },
    required: ['command'],
  },
  handler: async (input, context): Promise<ToolResult> => {
    try {
      const command = input.command as string;
      const timeout = (input.timeout as number) || 60;
      const workDir = input.workingDirectory
        ? join(context.workspace, input.workingDirectory as string)
        : context.workspace;
      
      // Security: Check for dangerous commands
      const dangerousPatterns = [
        /rm\s+-rf\s+\/(?!workspace)/,  // Allow rm -rf /workspace
        /:\(\)\{.*:\|:&.*\}/,          // Fork bomb
        /dd\s+if=.*of=\/dev\/sd/,      // Disk wipe
      ];
      
      for (const pattern of dangerousPatterns) {
        if (pattern.test(command)) {
          return {
            success: false,
            error: 'Command blocked: potentially dangerous operation detected',
          };
        }
      }
      
      const { stdout, stderr } = await execAsync(command, {
        cwd: workDir,
        timeout: timeout * 1000,
        maxBuffer: 10 * 1024 * 1024, // 10MB buffer
      });
      
      let output = '';
      if (stdout) output += `STDOUT:\n${stdout}`;
      if (stderr) output += `\nSTDERR:\n${stderr}`;
      
      return {
        success: true,
        output: output || 'Command executed successfully (no output)',
      };
    } catch (error) {
      if ((error as { code?: string }).code === 'ETIMEDOUT') {
        return {
          success: false,
          error: `Command timed out after ${input.timeout}s`,
        };
      }
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
};

// ----------------------------------------------------------------------------
// Terminal Streaming (for long-running commands)
// ----------------------------------------------------------------------------

export const terminalStreamTool: Tool = {
  name: 'terminal_stream',
  description: 'Execute a terminal command with streaming output',
  inputSchema: {
    type: 'object',
    properties: {
      command: {
        type: 'string',
        description: 'The command to execute',
      },
      workingDirectory: {
        type: 'string',
        description: 'Working directory for the command',
      },
    },
    required: ['command'],
  },
  handler: async (input, context): Promise<ToolResult> => {
    return new Promise((resolve) => {
      const command = input.command as string;
      const workDir = input.workingDirectory
        ? join(context.workspace, input.workingDirectory as string)
        : context.workspace;
      
      let output = '';
      const child = spawn('sh', ['-c', command], {
        cwd: workDir,
        env: { ...process.env },
      });
      
      child.stdout?.on('data', (data) => {
        output += data.toString();
      });
      
      child.stderr?.on('data', (data) => {
        output += data.toString();
      });
      
      child.on('close', (code) => {
        resolve({
          success: code === 0,
          output: output || `Process exited with code ${code}`,
        });
      });
      
      child.on('error', (error) => {
        resolve({
          success: false,
          error: error.message,
        });
      });
    });
  },
};

// ----------------------------------------------------------------------------
// Git Status
// ----------------------------------------------------------------------------

export const gitStatusTool: Tool = {
  name: 'git_status',
  description: 'Show the working tree status',
  inputSchema: {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: 'Path to the git repository',
        default: '.',
      },
      short: {
        type: 'boolean',
        description: 'Use short format',
        default: false,
      },
    },
  },
  handler: async (input, context): Promise<ToolResult> => {
    try {
      const repoPath = join(context.workspace, (input.path as string) || '.');
      const shortFlag = input.short ? '--short' : '';
      
      const { stdout } = await execAsync(`git status ${shortFlag}`, {
        cwd: repoPath,
      });
      
      return { success: true, output: stdout };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
};

// ----------------------------------------------------------------------------
// Git Diff
// ----------------------------------------------------------------------------

export const gitDiffTool: Tool = {
  name: 'git_diff',
  description: 'Show changes between commits, working tree, etc.',
  inputSchema: {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: 'Path to the git repository',
        default: '.',
      },
      staged: {
        type: 'boolean',
        description: 'Show staged changes',
        default: false,
      },
      file: {
        type: 'string',
        description: 'Show diff for specific file',
      },
      commit: {
        type: 'string',
        description: 'Show diff for specific commit',
      },
      stat: {
        type: 'boolean',
        description: 'Show diffstat instead of patch',
        default: false,
      },
    },
  },
  handler: async (input, context): Promise<ToolResult> => {
    try {
      const repoPath = join(context.workspace, (input.path as string) || '.');
      let cmd = 'git diff';
      
      if (input.staged) cmd += ' --cached';
      if (input.stat) cmd += ' --stat';
      if (input.file) cmd += ` -- "${input.file}"`;
      if (input.commit) cmd += ` ${input.commit}`;
      
      const { stdout } = await execAsync(cmd, { cwd: repoPath });
      
      return { success: true, output: stdout || 'No changes' };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
};

// ----------------------------------------------------------------------------
// Git Log
// ----------------------------------------------------------------------------

export const gitLogTool: Tool = {
  name: 'git_log',
  description: 'Show commit logs',
  inputSchema: {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: 'Path to the git repository',
        default: '.',
      },
      limit: {
        type: 'number',
        description: 'Number of commits to show',
        default: 10,
      },
      oneline: {
        type: 'boolean',
        description: 'One line per commit',
        default: false,
      },
      graph: {
        type: 'boolean',
        description: 'Show ASCII graph',
        default: false,
      },
      author: {
        type: 'string',
        description: 'Filter by author',
      },
      since: {
        type: 'string',
        description: 'Show commits since date',
      },
      until: {
        type: 'string',
        description: 'Show commits until date',
      },
    },
  },
  handler: async (input, context): Promise<ToolResult> => {
    try {
      const repoPath = join(context.workspace, (input.path as string) || '.');
      let cmd = 'git log';
      
      if (input.oneline) cmd += ' --oneline';
      if (input.graph) cmd += ' --graph --all';
      if (input.limit) cmd += ` -n ${input.limit}`;
      if (input.author) cmd += ` --author="${input.author}"`;
      if (input.since) cmd += ` --since="${input.since}"`;
      if (input.until) cmd += ` --until="${input.until}"`;
      
      const { stdout } = await execAsync(cmd, { cwd: repoPath });
      
      return { success: true, output: stdout || 'No commits found' };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
};

// ----------------------------------------------------------------------------
// Git Commit
// ----------------------------------------------------------------------------

export const gitCommitTool: Tool = {
  name: 'git_commit',
  description: 'Record changes to the repository',
  inputSchema: {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: 'Path to the git repository',
        default: '.',
      },
      message: {
        type: 'string',
        description: 'Commit message',
      },
      all: {
        type: 'boolean',
        description: 'Stage all modified and deleted files',
        default: false,
      },
      amend: {
        type: 'boolean',
        description: 'Amend to previous commit',
        default: false,
      },
    },
    required: ['message'],
  },
  handler: async (input, context): Promise<ToolResult> => {
    try {
      const repoPath = join(context.workspace, (input.path as string) || '.');
      let cmd = 'git commit';
      
      if (input.all) cmd += ' -a';
      if (input.amend) cmd += ' --amend --no-edit';
      
      // Escape the message properly
      const message = (input.message as string).replace(/"/g, '\\"');
      cmd += ` -m "${message}"`;
      
      const { stdout, stderr } = await execAsync(cmd, { cwd: repoPath });
      
      return {
        success: true,
        output: stdout || stderr || 'Commit created successfully',
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
};

// ----------------------------------------------------------------------------
// Git Branch
// ----------------------------------------------------------------------------

export const gitBranchTool: Tool = {
  name: 'git_branch',
  description: 'List, create, or delete branches',
  inputSchema: {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: 'Path to the git repository',
        default: '.',
      },
      list: {
        type: 'boolean',
        description: 'List branches',
        default: true,
      },
      create: {
        type: 'string',
        description: 'Create a new branch',
      },
      delete: {
        type: 'string',
        description: 'Delete a branch',
      },
      current: {
        type: 'boolean',
        description: 'Show current branch name',
        default: false,
      },
    },
  },
  handler: async (input, context): Promise<ToolResult> => {
    try {
      const repoPath = join(context.workspace, (input.path as string) || '.');
      let cmd = 'git branch';
      
      if (input.list) cmd += ' -a';
      if (input.create) cmd += ` -c "${input.create}"`;
      if (input.delete) cmd += ` -d "${input.delete}"`;
      
      const { stdout } = await execAsync(cmd, { cwd: repoPath });
      
      if (input.current) {
        const { stdout: branch } = await execAsync('git branch --show-current', {
          cwd: repoPath,
        });
        return { success: true, output: branch.trim() };
      }
      
      return { success: true, output: stdout };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
};

// ----------------------------------------------------------------------------
// Git Checkout
// ----------------------------------------------------------------------------

export const gitCheckoutTool: Tool = {
  name: 'git_checkout',
  description: 'Switch branches or restore working tree files',
  inputSchema: {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: 'Path to the git repository',
        default: '.',
      },
      branch: {
        type: 'string',
        description: 'Branch to checkout',
      },
      newBranch: {
        type: 'boolean',
        description: 'Create and switch to new branch',
        default: false,
      },
      file: {
        type: 'string',
        description: 'Restore specific file from HEAD',
      },
    },
    required: ['branch'],
  },
  handler: async (input, context): Promise<ToolResult> => {
    try {
      const repoPath = join(context.workspace, (input.path as string) || '.');
      let cmd = 'git checkout';
      
      if (input.newBranch) cmd += ' -b';
      if (input.file) cmd += ` -- "${input.file}"`;
      else cmd += ` "${input.branch}"`;
      
      const { stdout, stderr } = await execAsync(cmd, { cwd: repoPath });
      
      return {
        success: true,
        output: stdout || stderr || `Checked out ${input.branch}`,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
};

// ----------------------------------------------------------------------------
// Git Merge
// ----------------------------------------------------------------------------

export const gitMergeTool: Tool = {
  name: 'git_merge',
  description: 'Join two or more development histories together',
  inputSchema: {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: 'Path to the git repository',
        default: '.',
      },
      branch: {
        type: 'string',
        description: 'Branch to merge into current branch',
      },
      noFF: {
        type: 'boolean',
        description: 'Create merge commit even for fast-forward',
        default: false,
      },
      squash: {
        type: 'boolean',
        description: 'Squash commits into one',
        default: false,
      },
    },
    required: ['branch'],
  },
  handler: async (input, context): Promise<ToolResult> => {
    try {
      const repoPath = join(context.workspace, (input.path as string) || '.');
      let cmd = 'git merge';
      
      if (input.noFF) cmd += ' --no-ff';
      if (input.squash) cmd += ' --squash';
      cmd += ` "${input.branch}"`;
      
      const { stdout, stderr } = await execAsync(cmd, { cwd: repoPath });
      
      return {
        success: true,
        output: stdout || stderr || `Merged ${input.branch}`,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
};

// ----------------------------------------------------------------------------
// Git Rebase
// ----------------------------------------------------------------------------

export const gitRebaseTool: Tool = {
  name: 'git_rebase',
  description: 'Reapply commits on top of another base',
  inputSchema: {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: 'Path to the git repository',
        default: '.',
      },
      branch: {
        type: 'string',
        description: 'Branch to rebase onto',
      },
      continue: {
        type: 'boolean',
        description: 'Continue rebase after resolving conflicts',
        default: false,
      },
      abort: {
        type: 'boolean',
        description: 'Abort rebase in progress',
        default: false,
      },
      interactive: {
        type: 'boolean',
        description: 'Interactive rebase',
        default: false,
      },
    },
  },
  handler: async (input, context): Promise<ToolResult> => {
    try {
      const repoPath = join(context.workspace, (input.path as string) || '.');
      
      if (input.abort) {
        await execAsync('git rebase --abort', { cwd: repoPath });
        return { success: true, output: 'Rebase aborted' };
      }
      
      if (input.continue) {
        await execAsync('git rebase --continue', { cwd: repoPath });
        return { success: true, output: 'Rebase continued' };
      }
      
      let cmd = 'git rebase';
      if (input.interactive) cmd += ' -i';
      cmd += ` "${input.branch}"`;
      
      const { stdout, stderr } = await execAsync(cmd, { cwd: repoPath });
      
      return {
        success: true,
        output: stdout || stderr || `Rebased onto ${input.branch}`,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
};

// ----------------------------------------------------------------------------
// Git Remote
// ----------------------------------------------------------------------------

export const gitRemoteTool: Tool = {
  name: 'git_remote',
  description: 'Manage set of tracked repositories',
  inputSchema: {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: 'Path to the git repository',
        default: '.',
      },
      list: {
        type: 'boolean',
        description: 'List remotes',
        default: true,
      },
      add: {
        type: 'object',
        description: 'Add a remote',
        properties: {
          name: { type: 'string' },
          url: { type: 'string' },
        },
      },
      remove: {
        type: 'string',
        description: 'Remove a remote',
      },
    },
  },
  handler: async (input, context): Promise<ToolResult> => {
    try {
      const repoPath = join(context.workspace, (input.path as string) || '.');
      
      if (input.remove) {
        await execAsync(`git remote remove "${input.remove}"`, { cwd: repoPath });
        return { success: true, output: `Removed remote: ${input.remove}` };
      }
      
      if (input.add) {
        await execAsync(
          `git remote add "${input.add.name}" "${input.add.url}"`,
          { cwd: repoPath }
        );
        return { success: true, output: `Added remote: ${input.add.name}` };
      }
      
      const { stdout } = await execAsync('git remote -v', { cwd: repoPath });
      return { success: true, output: stdout || 'No remotes configured' };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
};

// ----------------------------------------------------------------------------
// Git Push
// ----------------------------------------------------------------------------

export const gitPushTool: Tool = {
  name: 'git_push',
  description: 'Update remote refs along with associated objects',
  inputSchema: {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: 'Path to the git repository',
        default: '.',
      },
      remote: {
        type: 'string',
        description: 'Remote name',
        default: 'origin',
      },
      branch: {
        type: 'string',
        description: 'Branch to push',
      },
      force: {
        type: 'boolean',
        description: 'Force push',
        default: false,
      },
      setUpstream: {
        type: 'boolean',
        description: 'Set upstream for the branch',
        default: false,
      },
    },
  },
  handler: async (input, context): Promise<ToolResult> => {
    try {
      const repoPath = join(context.workspace, (input.path as string) || '.');
      let cmd = 'git push';
      
      if (input.force) cmd += ' --force';
      if (input.setUpstream) cmd += ' -u';
      if (input.remote) cmd += ` "${input.remote}"`;
      if (input.branch) cmd += ` "${input.branch}"`;
      
      const { stdout, stderr } = await execAsync(cmd, { cwd: repoPath });
      
      return {
        success: true,
        output: stdout || stderr || 'Pushed successfully',
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
};

// ----------------------------------------------------------------------------
// Git Pull
// ----------------------------------------------------------------------------

export const gitPullTool: Tool = {
  name: 'git_pull',
  description: 'Fetch from and integrate with another repository or branch',
  inputSchema: {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: 'Path to the git repository',
        default: '.',
      },
      remote: {
        type: 'string',
        description: 'Remote name',
        default: 'origin',
      },
      branch: {
        type: 'string',
        description: 'Branch to pull',
      },
      rebase: {
        type: 'boolean',
        description: 'Use rebase instead of merge',
        default: false,
      },
    },
  },
  handler: async (input, context): Promise<ToolResult> => {
    try {
      const repoPath = join(context.workspace, (input.path as string) || '.');
      let cmd = 'git pull';
      
      if (input.rebase) cmd += ' --rebase';
      if (input.remote) cmd += ` "${input.remote}"`;
      if (input.branch) cmd += ` "${input.branch}"`;
      
      const { stdout, stderr } = await execAsync(cmd, { cwd: repoPath });
      
      return {
        success: true,
        output: stdout || stderr || 'Pulled successfully',
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
};

// ----------------------------------------------------------------------------
// Git Stash
// ----------------------------------------------------------------------------

export const gitStashTool: Tool = {
  name: 'git_stash',
  description: 'Stash changes in a dirty working directory',
  inputSchema: {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: 'Path to the git repository',
        default: '.',
      },
      push: {
        type: 'boolean',
        description: 'Push a new stash',
        default: false,
      },
      message: {
        type: 'string',
        description: 'Stash message',
      },
      pop: {
        type: 'boolean',
        description: 'Apply and remove latest stash',
        default: false,
      },
      apply: {
        type: 'boolean',
        description: 'Apply latest stash without removing',
        default: false,
      },
      list: {
        type: 'boolean',
        description: 'List stashes',
        default: false,
      },
      clear: {
        type: 'boolean',
        description: 'Remove all stashes',
        default: false,
      },
    },
  },
  handler: async (input, context): Promise<ToolResult> => {
    try {
      const repoPath = join(context.workspace, (input.path as string) || '.');
      let cmd = 'git stash';
      
      if (input.list) {
        cmd = 'git stash list';
      } else if (input.clear) {
        cmd = 'git stash clear';
      } else if (input.pop) {
        cmd = 'git stash pop';
      } else if (input.apply) {
        cmd = 'git stash apply';
      } else if (input.push) {
        cmd = 'git stash push';
        if (input.message) {
          cmd += ` -m "${input.message}"`;
        }
      }
      
      const { stdout, stderr } = await execAsync(cmd, { cwd: repoPath });
      
      return {
        success: true,
        output: stdout || stderr || 'Stash operation completed',
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
};

// ----------------------------------------------------------------------------
// Export All Tools
// ----------------------------------------------------------------------------

export const terminalTools: Tool[] = [
  terminalTool,
  terminalStreamTool,
];

export const gitTools: Tool[] = [
  gitStatusTool,
  gitDiffTool,
  gitLogTool,
  gitCommitTool,
  gitBranchTool,
  gitCheckoutTool,
  gitMergeTool,
  gitRebaseTool,
  gitRemoteTool,
  gitPushTool,
  gitPullTool,
  gitStashTool,
];
