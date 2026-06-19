// ============================================================================
// OpenCode Studio - Utilities
// ============================================================================

import { randomUUID } from 'crypto';
import type {
  ProviderName,
  Message,
  ToolCall,
  MemoryEntry,
} from '../types/index.js';

// ----------------------------------------------------------------------------
// ID Generation
// ----------------------------------------------------------------------------

export function generateId(): string {
  return randomUUID();
}

export function generateToolCallId(): string {
  return `tool_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

// ----------------------------------------------------------------------------
// Message Formatting
// ----------------------------------------------------------------------------

export function formatMessageForLLM(messages: Message[]): string {
  return messages
    .map((msg) => {
      const role = msg.role === 'tool' ? 'tool' : msg.role;
      let content = msg.content;
      
      if (msg.toolCalls) {
        content += '\n\nTool calls:\n';
        content += msg.toolCalls
          .map((tc) => `${tc.function.name}(${tc.function.arguments})`)
          .join('\n');
      }
      
      return `<${role}>\n${content}\n</${role}>`;
    })
    .join('\n\n');
}

export function extractTextFromMessages(messages: Message[]): string {
  return messages
    .filter((m) => m.role !== 'tool')
    .map((m) => m.content)
    .join('\n\n');
}

// ----------------------------------------------------------------------------
// Token Estimation
// ----------------------------------------------------------------------------

export function estimateTokens(text: string): number {
  // Rough estimation: ~4 characters per token on average
  return Math.ceil(text.length / 4);
}

export function truncateText(text: string, maxTokens: number): string {
  const maxChars = maxTokens * 4;
  if (text.length <= maxChars) return text;
  
  // Try to truncate at a sentence or line boundary
  const truncated = text.slice(0, maxChars);
  const lastNewline = truncated.lastIndexOf('\n');
  const lastPeriod = truncated.lastIndexOf('.');
  
  const breakPoint = Math.max(lastNewline, lastPeriod);
  if (breakPoint > maxChars * 0.7) {
    return truncated.slice(0, breakPoint + 1);
  }
  
  return truncated + '...';
}

// ----------------------------------------------------------------------------
// Context Truncation
// ----------------------------------------------------------------------------

export interface TruncationOptions {
  maxTokens: number;
  preserveSystem?: boolean;
  preserveLast?: number;
}

export function truncateMessages(
  messages: Message[],
  options: TruncationOptions
): Message[] {
  const { maxTokens, preserveSystem = true, preserveLast = 2 } = options;
  
  let result: Message[] = [];
  let currentTokens = 0;
  
  // Separate messages by role
  const systemMessages = messages.filter((m) => m.role === 'system');
  const otherMessages = messages.filter((m) => m.role !== 'system');
  
  // Add system messages if preserved
  if (preserveSystem && systemMessages.length > 0) {
    result.push(...systemMessages);
    currentTokens += systemMessages.reduce((sum, m) => estimateTokens(m.content) + sum, 0);
  }
  
  // Add recent messages (preserve last N)
  const recentMessages = otherMessages.slice(-preserveLast);
  const recentTokens = recentMessages.reduce((sum, m) => estimateTokens(m.content) + sum, 0);
  
  if (currentTokens + recentTokens <= maxTokens) {
    result.push(...recentMessages);
    currentTokens += recentTokens;
  }
  
  // Add middle messages if there's room
  const middleMessages = otherMessages.slice(0, -preserveLast);
  for (let i = middleMessages.length - 1; i >= 0; i--) {
    const msgTokens = estimateTokens(middleMessages[i].content);
    if (currentTokens + msgTokens > maxTokens) {
      // Add a summary placeholder if we skip messages
      if (i > 0) {
        const skippedMessages = middleMessages.slice(0, i);
        const skippedSummary = `[Previous ${skippedMessages.length} messages omitted - ${skippedMessages.reduce((sum, m) => estimateTokens(m.content) + sum, 0)} tokens]`;
        result.unshift({
          role: 'system',
          content: skippedSummary,
        });
      }
      break;
    }
    result.unshift(middleMessages[i]);
    currentTokens += msgTokens;
  }
  
  return result;
}

// ----------------------------------------------------------------------------
// Memory Search
// ----------------------------------------------------------------------------

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

export function searchMemoryByEmbedding(
  query: number[],
  entries: MemoryEntry[],
  threshold: number = 0.7,
  limit: number = 10
): MemoryEntry[] {
  return entries
    .filter((e) => e.embedding)
    .map((e) => ({
      entry: e,
      similarity: cosineSimilarity(query, e.embedding!),
    }))
    .filter((r) => r.similarity >= threshold)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit)
    .map((r) => r.entry);
}

// ----------------------------------------------------------------------------
// File Path Utilities
// ----------------------------------------------------------------------------

export function normalizePath(path: string): string {
  return path.replace(/\\/g, '/').replace(/\/+/g, '/');
}

export function isWithinDirectory(filePath: string, directory: string): boolean {
  const normalizedFile = normalizePath(filePath);
  const normalizedDir = normalizePath(directory);
  return normalizedFile.startsWith(normalizedDir);
}

export function getRelativePath(filePath: string, basePath: string): string {
  const normalizedFile = normalizePath(filePath);
  const normalizedBase = normalizePath(basePath);
  return normalizedFile.replace(normalizedBase + '/', '');
}

// ----------------------------------------------------------------------------
// Git Utilities
// ----------------------------------------------------------------------------

export function parseGitDiff(hunk: string): {
  oldStart: number;
  oldCount: number;
  newStart: number;
  newCount: number;
  header: string;
} {
  const match = hunk.match(/^@@ -(\d+),?(\d*) \+(\d+),?(\d*) @@/);
  if (!match) {
    return { oldStart: 0, oldCount: 0, newStart: 0, newCount: 0, header: '' };
  }
  
  return {
    oldStart: parseInt(match[1], 10),
    oldCount: parseInt(match[2] || '1', 10),
    newStart: parseInt(match[3], 10),
    newCount: parseInt(match[4] || '1', 10),
    header: hunk,
  };
}

export function formatGitStatus(status: {
  branch: string;
  staged: string[];
  modified: string[];
  untracked: string[];
}): string {
  const lines: string[] = [];
  lines.push(`On branch ${status.branch}`);
  lines.push('');
  
  if (status.staged.length > 0) {
    lines.push('Changes to be committed:');
    status.staged.forEach((f) => lines.push(`  ${f}`));
    lines.push('');
  }
  
  if (status.modified.length > 0) {
    lines.push('Changes not staged for commit:');
    status.modified.forEach((f) => lines.push(`  ${f}`));
    lines.push('');
  }
  
  if (status.untracked.length > 0) {
    lines.push('Untracked files:');
    status.untracked.forEach((f) => lines.push(`  ${f}`));
    lines.push('');
  }
  
  if (status.staged.length === 0 && status.modified.length === 0 && status.untracked.length === 0) {
    lines.push('Nothing to commit, working tree clean');
  }
  
  return lines.join('\n');
}

// ----------------------------------------------------------------------------
// Code Analysis Utilities
// ----------------------------------------------------------------------------

export interface ImportInfo {
  source: string;
  imports: string[];
  type: 'import' | 'require' | 'dynamic';
}

export function parseImports(content: string, filePath: string): ImportInfo[] {
  const imports: ImportInfo[] = [];
  const ext = filePath.split('.').pop();
  
  // JavaScript/TypeScript imports
  if (['js', 'jsx', 'ts', 'tsx'].includes(ext || '')) {
    // ES6 imports: import { x } from 'y' or import x from 'y'
    const es6Regex = /import\s+(?:{([^}]+)}|(\w+))\s+from\s+['"]([^'"]+)['"]/g;
    let match;
    while ((match = es6Regex.exec(content)) !== null) {
      const imports_list = match[1]?.split(',').map((s) => s.trim()) || [match[2]];
      imports.push({
        source: match[3],
        imports: imports_list.filter(Boolean),
        type: 'import',
      });
    }
    
    // Dynamic imports: import('path')
    const dynamicRegex = /import\s*\(['"]([^'"]+)['"]\)/g;
    while ((match = dynamicRegex.exec(content)) !== null) {
      imports.push({
        source: match[1],
        imports: ['default'],
        type: 'dynamic',
      });
    }
    
    // Require: const x = require('y')
    const requireRegex = /(?:const|let|var)\s+(\w+)\s*=\s*require\s*\(['"]([^'"]+)['"]\)/g;
    while ((match = requireRegex.exec(content)) !== null) {
      imports.push({
        source: match[2],
        imports: [match[1]],
        type: 'require',
      });
    }
  }
  
  // Python imports
  if (['py'].includes(ext || '')) {
    const pyImportRegex = /(?:from\s+([\w.]+)\s+import\s+([\w,\s*]+)|import\s+([\w,]+))/g;
    let match;
    while ((match = pyImportRegex.exec(content)) !== null) {
      if (match[1] && match[2]) {
        imports.push({
          source: match[1],
          imports: match[2].split(',').map((s) => s.trim()),
          type: 'import',
        });
      } else if (match[3]) {
        imports.push({
          source: match[3].split(',').map((s) => s.trim())[0],
          imports: match[3].split(',').map((s) => s.trim()),
          type: 'import',
        });
      }
    }
  }
  
  return imports;
}

// ----------------------------------------------------------------------------
// JSON Utilities
// ----------------------------------------------------------------------------

export function safeJsonParse<T>(json: string, fallback: T): T {
  try {
    return JSON.parse(json) as T;
  } catch {
    return fallback;
  }
}

export function safeJsonStringify(obj: unknown, space?: number): string {
  try {
    return JSON.stringify(obj, null, space);
  } catch {
    return String(obj);
  }
}

// ----------------------------------------------------------------------------
// Async Utilities
// ----------------------------------------------------------------------------

export async function retry<T>(
  fn: () => Promise<T>,
  options: { maxRetries: number; delay: number; backoff?: number }
): Promise<T> {
  const { maxRetries, delay, backoff = 1 } = options;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxRetries) throw error;
      
      const waitTime = delay * Math.pow(backoff, attempt);
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }
  }
  
  throw new Error('Retry logic error');
}

export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  errorMessage?: string
): Promise<T> {
  let timeoutHandle: NodeJS.Timeout;
  
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutHandle = setTimeout(() => {
      reject(new Error(errorMessage || `Operation timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });
  
  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    clearTimeout(timeoutHandle!);
  }
}

// ----------------------------------------------------------------------------
// Validation Utilities
// ----------------------------------------------------------------------------

export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

export function isValidPath(path: string): boolean {
  // Basic path validation - allow alphanumeric, dots, slashes, underscores, hyphens
  return /^[a-zA-Z0-9/._-]+$/.test(path);
}

export function sanitizePath(path: string): string {
  // Remove potentially dangerous characters
  return path.replace(/[<>:"|?*\x00-\x1f]/g, '');
}
