// ============================================================================
// OpenCode Studio - Context Management
// ============================================================================

import type { Message, MemoryEntry } from '@opencode/shared';

// ----------------------------------------------------------------------------
// Token Estimation
// ----------------------------------------------------------------------------

export function estimateTokens(text: string): number {
  // Rough estimation: ~4 characters per token on average for English
  // Adjust based on language complexity
  const chineseChars = (text.match(/[\u4e00-\u9fff]/g) || []).length;
  const otherChars = text.length - chineseChars;
  
  // Chinese characters are roughly 1 token each
  // English is roughly 4 chars per token
  return Math.ceil(otherChars / 4 + chineseChars);
}

export function estimateMessagesTokens(messages: Message[]): number {
  return messages.reduce((sum, msg) => {
    // Each message has overhead
    let overhead = 4; // <role>\n</role>\n format
    if (msg.name) overhead += 10;
    return sum + estimateTokens(msg.content) + overhead;
  }, 0);
}

// ----------------------------------------------------------------------------
// Context Truncation
// ----------------------------------------------------------------------------

export interface TruncationOptions {
  maxTokens: number;
  preserveSystem?: boolean;
  preserveLast?: number;
  preserveFirst?: number;
}

export function truncateMessages(
  messages: Message[],
  options: TruncationOptions
): Message[] {
  const {
    maxTokens,
    preserveSystem = true,
    preserveLast = 2,
    preserveFirst = 0,
  } = options;
  
  // Separate messages by role
  const systemMessages = messages.filter((m) => m.role === 'system');
  const otherMessages = messages.filter((m) => m.role !== 'system');
  
  let result: Message[] = [];
  let currentTokens = 0;
  
  // 1. Add system messages if preserved
  if (preserveSystem && systemMessages.length > 0) {
    result.push(...systemMessages);
    currentTokens += estimateMessagesTokens(systemMessages);
    
    if (currentTokens > maxTokens) {
      // Truncate system message
      return truncateSingleMessage(systemMessages[0], maxTokens, 'start');
    }
  }
  
  // 2. Add preserved first messages
  if (preserveFirst > 0) {
    const firstMessages = otherMessages.slice(0, preserveFirst);
    for (const msg of firstMessages) {
      const tokens = estimateTokens(msg.content) + 4;
      if (currentTokens + tokens > maxTokens) break;
      result.push(msg);
      currentTokens += tokens;
    }
  }
  
  // 3. Add preserved last messages
  const recentMessages = otherMessages.slice(-preserveLast);
  const recentTokens = estimateMessagesTokens(recentMessages);
  
  if (currentTokens + recentTokens <= maxTokens) {
    // Check if we can fit all middle messages
    const firstCount = preserveFirst > 0 ? preserveFirst : 0;
    const middleMessages = otherMessages.slice(firstCount, -preserveLast);
    const middleTokens = estimateMessagesTokens(middleMessages);
    
    if (currentTokens + middleTokens + recentTokens <= maxTokens) {
      // Fit all middle messages
      result.push(...middleMessages);
      currentTokens += middleTokens;
    } else {
      // Try to fit a summary of middle messages
      if (middleMessages.length > 0) {
        const summary = `[Previous ${middleMessages.length} messages omitted (${middleTokens} tokens)]`;
        const summaryTokens = estimateTokens(summary) + 10;
        
        if (currentTokens + summaryTokens + recentTokens <= maxTokens) {
          result.push({
            role: 'system',
            content: summary,
          });
          currentTokens += summaryTokens;
        }
      }
    }
    
    result.push(...recentMessages);
  } else {
    // Not enough room, just keep last messages with truncation
    const availableTokens = maxTokens - currentTokens - recentTokens;
    if (availableTokens > 100) {
      result.push({
        role: 'system',
        content: `[${otherMessages.length - preserveLast} earlier messages omitted]`,
      });
    }
    result.push(...recentMessages);
  }
  
  return result;
}

function truncateSingleMessage(
  msg: Message,
  maxTokens: number,
  from: 'start' | 'end' = 'end'
): Message[] {
  const content = msg.content;
  const maxChars = maxTokens * 4;
  
  let truncated: string;
  if (from === 'start') {
    truncated = '...' + content.slice(-maxChars);
  } else {
    truncated = content.slice(0, maxChars) + '...';
  }
  
  return [{ ...msg, content: truncated }];
}

// ----------------------------------------------------------------------------
// Message Summarization
// ----------------------------------------------------------------------------

export interface ConversationSummary {
  summary: string;
  keyPoints: string[];
  remainingMessages: Message[];
}

export function summarizeConversation(
  messages: Message[],
  maxSummaryLength: number = 500
): ConversationSummary {
  // Remove system messages for summarization
  const relevantMessages = messages.filter((m) => m.role !== 'system');
  
  if (relevantMessages.length === 0) {
    return { summary: 'Empty conversation', keyPoints: [], remainingMessages: [] };
  }
  
  // Extract key actions from tool calls and results
  const actions: string[] = [];
  const decisions: string[] = [];
  
  for (const msg of relevantMessages) {
    if (msg.role === 'tool') {
      if (msg.content.startsWith('Error:')) {
        actions.push(`Error encountered: ${msg.content.slice(0, 100)}`);
      } else {
        actions.push(`Tool executed: ${msg.content.slice(0, 100)}`);
      }
    } else if (msg.role === 'assistant' && msg.content.length > 200) {
      decisions.push(msg.content.slice(0, 150) + '...');
    }
  }
  
  // Build summary
  let summary = '';
  
  if (relevantMessages.length > 0) {
    const firstUserMsg = relevantMessages.find((m) => m.role === 'user');
    if (firstUserMsg) {
      summary += `User asked: ${firstUserMsg.content.slice(0, 200)}`;
    }
  }
  
  if (actions.length > 0) {
    summary += `\n\nActions taken: ${actions.slice(0, 5).join('; ')}`;
  }
  
  if (decisions.length > 0) {
    summary += `\n\nKey responses: ${decisions.slice(0, 3).join('; ')}`;
  }
  
  // Truncate if needed
  if (summary.length > maxSummaryLength * 4) {
    summary = summary.slice(0, maxSummaryLength * 4) + '...';
  }
  
  return {
    summary,
    keyPoints: actions.slice(0, 5),
    remainingMessages: relevantMessages.slice(-2), // Keep last 2 messages
  };
}

// ----------------------------------------------------------------------------
// RAG (Retrieval Augmented Generation) Helpers
// ----------------------------------------------------------------------------

export interface ContextChunk {
  content: string;
  source: string;
  relevance: number;
  metadata?: Record<string, unknown>;
}

export function createChunks(
  text: string,
  chunkSize: number = 1000,
  overlap: number = 200
): ContextChunk[] {
  const chunks: ContextChunk[] = [];
  const sentences = text.split(/(?<=[.!?])\s+/);
  
  let currentChunk = '';
  let chunkStart = 0;
  
  for (const sentence of sentences) {
    if (currentChunk.length + sentence.length > chunkSize && currentChunk.length > 0) {
      chunks.push({
        content: currentChunk.trim(),
        source: `chars ${chunkStart}-${chunkStart + currentChunk.length}`,
        relevance: 1,
      });
      
      // Keep overlap
      const overlapStart = Math.max(0, currentChunk.length - overlap);
      currentChunk = currentChunk.slice(overlapStart) + ' ' + sentence;
      chunkStart += currentChunk.length - sentence.length - overlapStart;
    } else {
      currentChunk += ' ' + sentence;
    }
  }
  
  // Add remaining chunk
  if (currentChunk.trim().length > 0) {
    chunks.push({
      content: currentChunk.trim(),
      source: `chars ${chunkStart}-${chunkStart + currentChunk.length}`,
      relevance: 1,
    });
  }
  
  return chunks;
}

export function selectRelevantChunks(
  chunks: ContextChunk[],
  query: string,
  maxTokens: number,
  scoreFunction?: (chunk: ContextChunk, query: string) => number
): ContextChunk[] {
  // Score each chunk
  const scored = chunks.map((chunk) => {
    const relevance = scoreFunction
      ? scoreFunction(chunk, query)
      : simpleRelevanceScore(chunk.content, query);
    return { chunk, relevance };
  });
  
  // Sort by relevance
  scored.sort((a, b) => b.relevance - a.relevance);
  
  // Select chunks that fit within token limit
  const selected: ContextChunk[] = [];
  let totalTokens = 0;
  
  for (const { chunk } of scored) {
    const chunkTokens = estimateTokens(chunk.content);
    if (totalTokens + chunkTokens > maxTokens) {
      // Try to fit a partial chunk
      if (totalTokens < maxTokens * 0.9) {
        const remainingTokens = maxTokens - totalTokens;
        const remainingChars = remainingTokens * 4;
        selected.push({
          ...chunk,
          content: chunk.content.slice(0, remainingChars) + '...',
        });
        totalTokens = maxTokens;
      }
      break;
    }
    
    selected.push(chunk);
    totalTokens += chunkTokens;
  }
  
  // Sort by position in original text
  selected.sort((a, b) => {
    const aPos = parseInt(a.source.match(/\d+/)?.[0] || '0');
    const bPos = parseInt(b.source.match(/\d+/)?.[0] || '0');
    return aPos - bPos;
  });
  
  return selected;
}

function simpleRelevanceScore(chunk: string, query: string): number {
  const queryWords = query.toLowerCase().split(/\s+/);
  const chunkLower = chunk.toLowerCase();
  
  let score = 0;
  for (const word of queryWords) {
    if (chunkLower.includes(word)) {
      score += 1;
      // Bonus for exact phrase match
      if (chunkLower.includes(query.toLowerCase())) {
        score += 5;
      }
    }
  }
  
  return score;
}

// ----------------------------------------------------------------------------
// Context Manager Class
// ----------------------------------------------------------------------------

export class ContextManager {
  private maxTokens: number;
  private preserveSystem: boolean;
  private preserveLast: number;
  private preserveFirst: number;
  
  constructor(options: {
    maxTokens?: number;
    preserveSystem?: boolean;
    preserveLast?: number;
    preserveFirst?: number;
  } = {}) {
    this.maxTokens = options.maxTokens || 100000;
    this.preserveSystem = options.preserveSystem ?? true;
    this.preserveLast = options.preserveLast || 4;
    this.preserveFirst = options.preserveFirst || 0;
  }
  
  prepareMessages(
    messages: Message[],
    additionalContext?: ContextChunk[]
  ): Message[] {
    // Add context chunks as a system message
    let processedMessages = [...messages];
    
    if (additionalContext && additionalContext.length > 0) {
      const contextText = additionalContext
        .map((c) => `[${c.source}]\n${c.content}`)
        .join('\n\n');
      
      const contextSystemMsg: Message = {
        role: 'system',
        content: `Relevant context:\n\n${contextText}`,
      };
      
      if (this.preserveSystem) {
        // Insert after system messages
        const firstNonSystem = processedMessages.findIndex((m) => m.role !== 'system');
        if (firstNonSystem > 0) {
          processedMessages.splice(firstNonSystem, 0, contextSystemMsg);
        } else {
          processedMessages.unshift(contextSystemMsg);
        }
      } else {
        processedMessages.unshift(contextSystemMsg);
      }
    }
    
    // Check if truncation is needed
    const currentTokens = estimateMessagesTokens(processedMessages);
    
    if (currentTokens <= this.maxTokens) {
      return processedMessages;
    }
    
    // Truncate
    return truncateMessages(processedMessages, {
      maxTokens: this.maxTokens,
      preserveSystem: this.preserveSystem,
      preserveLast: this.preserveLast,
      preserveFirst: this.preserveFirst,
    });
  }
  
  getAvailableTokens(currentMessages: Message[]): number {
    const usedTokens = estimateMessagesTokens(currentMessages);
    return Math.max(0, this.maxTokens - usedTokens);
  }
  
  setMaxTokens(maxTokens: number): void {
    this.maxTokens = maxTokens;
  }
}

// ----------------------------------------------------------------------------
// Conversation Checkpoint
// ----------------------------------------------------------------------------

export interface Checkpoint {
  id: string;
  timestamp: Date;
  messages: Message[];
  summary?: string;
}

export class CheckpointManager {
  private checkpoints: Map<string, Checkpoint[]>;
  private maxCheckpointsPerSession: number;
  
  constructor(maxCheckpointsPerSession: number = 10) {
    this.checkpoints = new Map();
    this.maxCheckpointsPerSession = maxCheckpointsPerSession;
  }
  
  createCheckpoint(
    sessionId: string,
    messages: Message[],
    summary?: string
  ): Checkpoint {
    const checkpoint: Checkpoint = {
      id: `${sessionId}-${Date.now()}`,
      timestamp: new Date(),
      messages: [...messages],
      summary,
    };
    
    if (!this.checkpoints.has(sessionId)) {
      this.checkpoints.set(sessionId, []);
    }
    
    const sessionCheckpoints = this.checkpoints.get(sessionId)!;
    sessionCheckpoints.push(checkpoint);
    
    // Keep only recent checkpoints
    if (sessionCheckpoints.length > this.maxCheckpointsPerSession) {
      sessionCheckpoints.shift();
    }
    
    return checkpoint;
  }
  
  getLatestCheckpoint(sessionId: string): Checkpoint | undefined {
    const checkpoints = this.checkpoints.get(sessionId);
    return checkpoints?.[checkpoints.length - 1];
  }
  
  getCheckpoints(sessionId: string): Checkpoint[] {
    return this.checkpoints.get(sessionId) || [];
  }
  
  restoreCheckpoint(checkpointId: string): Message[] | undefined {
    for (const checkpoints of this.checkpoints.values()) {
      const found = checkpoints.find((c) => c.id === checkpointId);
      if (found) return found.messages;
    }
    return undefined;
  }
  
  clearSession(sessionId: string): void {
    this.checkpoints.delete(sessionId);
  }
}
