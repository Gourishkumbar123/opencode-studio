// ============================================================================
// OpenCode Studio - File Operation Tools
// ============================================================================

import {
  readFile as fsReadFile,
  writeFile as fsWriteFile,
  unlink as fsUnlink,
  rename as fsRename,
  copyFile as fsCopyFile,
  mkdir as fsMkdir,
  readdir as fsReaddir,
  stat as fsStat,
  access as fsAccess,
  constants,
} from 'fs/promises';
import { join, dirname, extname } from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import type { Tool, ToolResult, ToolContext } from '@opencode/shared';

const execAsync = promisify(exec);

// ----------------------------------------------------------------------------
// File Reading
// ----------------------------------------------------------------------------

export const readFileTool: Tool = {
  name: 'read_file',
  description: 'Read the contents of a file from the filesystem',
  inputSchema: {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: 'Path to the file to read',
      },
      lineStart: {
        type: 'number',
        description: 'Start reading from this line number (1-indexed)',
      },
      lineEnd: {
        type: 'number',
        description: 'End reading at this line number',
      },
    },
    required: ['path'],
  },
  handler: async (input, context): Promise<ToolResult> => {
    try {
      const filePath = join(context.workspace, input.path as string);
      
      // Security check - ensure file is within workspace
      if (!filePath.startsWith(context.workspace)) {
        return { success: false, error: 'Access denied: Path outside workspace' };
      }
      
      let content = await fsReadFile(filePath, 'utf-8');
      
      // Handle line range
      if (input.lineStart || input.lineEnd) {
        const lines = content.split('\n');
        const start = Math.max(0, (input.lineStart as number || 1) - 1);
        const end = input.lineEnd ? Math.min(lines.length, input.lineEnd) : lines.length;
        content = lines.slice(start, end).join('\n');
        content = `Lines ${start + 1}-${end}:\n${content}`;
      }
      
      return { success: true, output: content };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
};

// ----------------------------------------------------------------------------
// File Writing
// ----------------------------------------------------------------------------

export const writeFileTool: Tool = {
  name: 'write_file',
  description: 'Write content to a file, creating it if it does not exist',
  inputSchema: {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: 'Path to the file to write',
      },
      content: {
        type: 'string',
        description: 'Content to write to the file',
      },
      append: {
        type: 'boolean',
        description: 'Append to file instead of overwriting',
        default: false,
      },
    },
    required: ['path', 'content'],
  },
  handler: async (input, context): Promise<ToolResult> => {
    try {
      const filePath = join(context.workspace, input.path as string);
      
      // Security check
      if (!filePath.startsWith(context.workspace)) {
        return { success: false, error: 'Access denied: Path outside workspace' };
      }
      
      // Create parent directory if it doesn't exist
      const dir = dirname(filePath);
      await fsMkdir(dir, { recursive: true });
      
      const flag = input.append ? 'a' : 'w';
      await fsWriteFile(filePath, input.content as string, { flag });
      
      return {
        success: true,
        output: `File ${input.append ? 'appended to' : 'written'}: ${input.path}`,
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
// File Editing (Replace in file)
// ----------------------------------------------------------------------------

export const editFileTool: Tool = {
  name: 'edit_file',
  description: 'Edit a file by replacing specific text. Use this for making targeted changes to files.',
  inputSchema: {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: 'Path to the file to edit',
      },
      old_text: {
        type: 'string',
        description: 'The exact text to replace (must match exactly including whitespace)',
      },
      new_text: {
        type: 'string',
        description: 'The replacement text',
      },
    },
    required: ['path', 'old_text', 'new_text'],
  },
  handler: async (input, context): Promise<ToolResult> => {
    try {
      const filePath = join(context.workspace, input.path as string);
      
      // Security check
      if (!filePath.startsWith(context.workspace)) {
        return { success: false, error: 'Access denied: Path outside workspace' };
      }
      
      const content = await fsReadFile(filePath, 'utf-8');
      const oldText = input.old_text as string;
      const newText = input.new_text as string;
      
      if (!content.includes(oldText)) {
        return {
          success: false,
          error: `Could not find the specified text in ${input.path}`,
        };
      }
      
      const newContent = content.replace(oldText, newText);
      await fsWriteFile(filePath, newContent, 'utf-8');
      
      return {
        success: true,
        output: `File edited: ${input.path}`,
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
// File Deletion
// ----------------------------------------------------------------------------

export const deleteFileTool: Tool = {
  name: 'delete_file',
  description: 'Delete a file from the filesystem',
  inputSchema: {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: 'Path to the file to delete',
      },
      recursive: {
        type: 'boolean',
        description: 'Delete directories recursively',
        default: false,
      },
    },
    required: ['path'],
  },
  handler: async (input, context): Promise<ToolResult> => {
    try {
      const filePath = join(context.workspace, input.path as string);
      
      // Security check
      if (!filePath.startsWith(context.workspace)) {
        return { success: false, error: 'Access denied: Path outside workspace' };
      }
      
      await fsUnlink(filePath);
      
      return {
        success: true,
        output: `Deleted: ${input.path}`,
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
// File Moving/Renaming
// ----------------------------------------------------------------------------

export const moveFileTool: Tool = {
  name: 'move_file',
  description: 'Move or rename a file',
  inputSchema: {
    type: 'object',
    properties: {
      source: {
        type: 'string',
        description: 'Current path of the file',
      },
      destination: {
        type: 'string',
        description: 'New path for the file',
      },
    },
    required: ['source', 'destination'],
  },
  handler: async (input, context): Promise<ToolResult> => {
    try {
      const sourcePath = join(context.workspace, input.source as string);
      const destPath = join(context.workspace, input.destination as string);
      
      // Security checks
      if (!sourcePath.startsWith(context.workspace)) {
        return { success: false, error: 'Access denied: Source path outside workspace' };
      }
      if (!destPath.startsWith(context.workspace)) {
        return { success: false, error: 'Access denied: Destination path outside workspace' };
      }
      
      // Create parent directory if needed
      await fsMkdir(dirname(destPath), { recursive: true });
      
      await fsRename(sourcePath, destPath);
      
      return {
        success: true,
        output: `Moved: ${input.source} → ${input.destination}`,
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
// Directory Listing
// ----------------------------------------------------------------------------

export const listDirectoryTool: Tool = {
  name: 'list_directory',
  description: 'List contents of a directory',
  inputSchema: {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: 'Path to the directory to list',
      },
      recursive: {
        type: 'boolean',
        description: 'List recursively',
        default: false,
      },
      includeHidden: {
        type: 'boolean',
        description: 'Include hidden files',
        default: false,
      },
    },
    required: ['path'],
  },
  handler: async (input, context): Promise<ToolResult> => {
    try {
      const dirPath = join(context.workspace, input.path as string);
      
      // Security check
      if (!dirPath.startsWith(context.workspace)) {
        return { success: false, error: 'Access denied: Path outside workspace' };
      }
      
      const entries = await fsReaddir(dirPath, { withFileTypes: true });
      const includeHidden = input.includeHidden as boolean;
      
      let results = entries
        .filter((entry) => {
          if (!includeHidden && entry.name.startsWith('.')) return false;
          return true;
        })
        .map((entry) => ({
          name: entry.name,
          type: entry.isDirectory() ? 'directory' : 'file',
          path: join(input.path as string, entry.name),
        }));
      
      // Sort: directories first, then files
      results.sort((a, b) => {
        if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
      
      const output = results
        .map((r) => `${r.type === 'directory' ? '📁' : '📄'} ${r.path}`)
        .join('\n');
      
      return { success: true, output };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
};

// ----------------------------------------------------------------------------
// File Search (Glob)
// ----------------------------------------------------------------------------

export const globTool: Tool = {
  name: 'glob',
  description: 'Find files matching a glob pattern',
  inputSchema: {
    type: 'object',
    properties: {
      pattern: {
        type: 'string',
        description: 'Glob pattern to match (e.g., "**/*.ts", "src/**/*.js")',
      },
      path: {
        type: 'string',
        description: 'Base directory to search from',
        default: '.',
      },
    },
    required: ['pattern'],
  },
  handler: async (input, context): Promise<ToolResult> => {
    try {
      const basePath = join(context.workspace, (input.path as string) || '.');
      
      // Security check
      if (!basePath.startsWith(context.workspace)) {
        return { success: false, error: 'Access denied: Path outside workspace' };
      }
      
      // Use find command for glob-like matching
      const pattern = input.pattern as string;
      const escapedPattern = pattern.replace(/\*/g, '.*').replace(/\?/g, '.');
      
      const { stdout } = await execAsync(
        `find "${basePath}" -type f -name "${pattern.replace(/\*\*/g, '*')}" 2>/dev/null | head -100`,
        { cwd: context.workspace }
      );
      
      const files = stdout.trim().split('\n').filter(Boolean);
      
      return {
        success: true,
        output: files.length > 0
          ? files.map((f) => f.replace(context.workspace + '/', '')).join('\n')
          : 'No files found',
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
// Grep Search
// ----------------------------------------------------------------------------

export const grepTool: Tool = {
  name: 'grep',
  description: 'Search for text patterns in files using regex',
  inputSchema: {
    type: 'object',
    properties: {
      pattern: {
        type: 'string',
        description: 'Regular expression pattern to search for',
      },
      path: {
        type: 'string',
        description: 'Path to search in (file or directory)',
        default: '.',
      },
      caseSensitive: {
        type: 'boolean',
        description: 'Case sensitive search',
        default: true,
      },
      context: {
        type: 'number',
        description: 'Number of context lines to show',
        default: 0,
      },
      maxResults: {
        type: 'number',
        description: 'Maximum number of results',
        default: 100,
      },
    },
    required: ['pattern'],
  },
  handler: async (input, context): Promise<ToolResult> => {
    try {
      const searchPath = join(context.workspace, input.path as string);
      
      // Security check
      if (!searchPath.startsWith(context.workspace)) {
        return { success: false, error: 'Access denied: Path outside workspace' };
      }
      
      const pattern = input.pattern as string;
      const flags = (input.caseSensitive ? '' : 'i') + 'n';
      const contextLines = input.context as number || 0;
      const maxResults = input.maxResults as number || 100;
      
      const cmd = contextLines > 0
        ? `grep -r${flags} -C ${contextLines} "${pattern}" "${searchPath}" 2>/dev/null | head -${maxResults}`
        : `grep -r${flags} "${pattern}" "${searchPath}" 2>/dev/null | head -${maxResults}`;
      
      const { stdout } = await execAsync(cmd, { cwd: context.workspace });
      
      return {
        success: true,
        output: stdout.trim() || 'No matches found',
      };
    } catch (error) {
      // grep returns exit code 1 when no matches found
      if ((error as { code?: number }).code === 1) {
        return { success: true, output: 'No matches found' };
      }
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
};

// ----------------------------------------------------------------------------
// Create Directory
// ----------------------------------------------------------------------------

export const createDirectoryTool: Tool = {
  name: 'create_directory',
  description: 'Create a new directory',
  inputSchema: {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: 'Path of the directory to create',
      },
      parents: {
        type: 'boolean',
        description: 'Create parent directories as needed',
        default: true,
      },
    },
    required: ['path'],
  },
  handler: async (input, context): Promise<ToolResult> => {
    try {
      const dirPath = join(context.workspace, input.path as string);
      
      // Security check
      if (!dirPath.startsWith(context.workspace)) {
        return { success: false, error: 'Access denied: Path outside workspace' };
      }
      
      await fsMkdir(dirPath, { recursive: input.parents !== false });
      
      return {
        success: true,
        output: `Directory created: ${input.path}`,
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
// Check File Existence
// ----------------------------------------------------------------------------

export const fileExistsTool: Tool = {
  name: 'file_exists',
  description: 'Check if a file or directory exists',
  inputSchema: {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: 'Path to check',
      },
    },
    required: ['path'],
  },
  handler: async (input, context): Promise<ToolResult> => {
    try {
      const checkPath = join(context.workspace, input.path as string);
      
      // Security check
      if (!checkPath.startsWith(context.workspace)) {
        return { success: false, error: 'Access denied: Path outside workspace' };
      }
      
      await fsAccess(checkPath, constants.F_OK);
      
      const stat = await fsStat(checkPath);
      
      return {
        success: true,
        output: `${input.path} exists (${stat.isDirectory() ? 'directory' : 'file'})`,
      };
    } catch {
      return {
        success: true,
        output: `${input.path} does not exist`,
      };
    }
  },
};

// ----------------------------------------------------------------------------
// Get All File Tools
// ----------------------------------------------------------------------------

export const fileTools: Tool[] = [
  readFileTool,
  writeFileTool,
  editFileTool,
  deleteFileTool,
  moveFileTool,
  listDirectoryTool,
  globTool,
  grepTool,
  createDirectoryTool,
  fileExistsTool,
];
