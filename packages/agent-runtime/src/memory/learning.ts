// ============================================================================
// OpenCode Studio - Learning Memory System
// AI learns from mistakes and keeps persistent knowledge
// ============================================================================

import type { MemoryEntry } from '@opencode/shared';

export interface LearnedPattern {
  id: string;
  pattern: string;
  context: string;
  task: string;
  successCount: number;
  failureCount: number;
  lastUsed: number;
  lastSuccess: number;
  lastFailure: number;
  source: 'mistake' | 'success' | 'feedback' | 'automatic';
  tools: string[];
  score: number;
}

export interface LearningEntry {
  timestamp: number;
  task: string;
  action: string;
  result: 'success' | 'failure' | 'partial';
  error?: string;
  toolsUsed: string[];
  context: Record<string, unknown>;
}

export class LearningMemory {
  private patterns: Map<string, LearnedPattern> = new Map();
  private history: LearningEntry[] = [];
  private maxHistory = 1000;
  
  constructor() {
    this.loadFromStorage();
  }
  
  // Record an action and its result
  async recordAction(entry: LearningEntry): Promise<void> {
    this.history.push(entry);
    
    // Keep history bounded
    if (this.history.length > this.maxHistory) {
      this.history = this.history.slice(-this.maxHistory);
    }
    
    // Learn from the outcome
    if (entry.result === 'failure') {
      await this.learnFromMistake(entry);
    } else if (entry.result === 'success') {
      await this.learnFromSuccess(entry);
    }
    
    this.saveToStorage();
  }
  
  // Learn from a mistake
  async learnFromMistake(entry: LearningEntry): Promise<void> {
    const key = this.patternKey(entry.task, entry.action);
    const existing = this.patterns.get(key);
    
    if (existing) {
      existing.failureCount++;
      existing.lastFailure = entry.timestamp;
      existing.lastUsed = entry.timestamp;
      existing.score = this.calculateScore(existing);
    } else {
      this.patterns.set(key, {
        id: crypto.randomUUID(),
        pattern: entry.action,
        context: JSON.stringify(entry.context),
        task: entry.task,
        successCount: 0,
        failureCount: 1,
        lastUsed: entry.timestamp,
        lastSuccess: 0,
        lastFailure: entry.timestamp,
        source: 'automatic',
        tools: entry.toolsUsed,
        score: 0,
      });
    }
  }
  
  // Learn from success
  async learnFromSuccess(entry: LearningEntry): Promise<void> {
    const key = this.patternKey(entry.task, entry.action);
    const existing = this.patterns.get(key);
    
    if (existing) {
      existing.successCount++;
      existing.lastSuccess = entry.timestamp;
      existing.lastUsed = entry.timestamp;
      existing.score = this.calculateScore(existing);
    } else {
      this.patterns.set(key, {
        id: crypto.randomUUID(),
        pattern: entry.action,
        context: JSON.stringify(entry.context),
        task: entry.task,
        successCount: 1,
        failureCount: 0,
        lastUsed: entry.timestamp,
        lastSuccess: entry.timestamp,
        lastFailure: 0,
        source: 'automatic',
        tools: entry.toolsUsed,
        score: 1,
      });
    }
  }
  
  // Get patterns to avoid for a task
  async getPatternsToAvoid(task: string): Promise<LearnedPattern[]> {
    const taskPatterns = Array.from(this.patterns.values())
      .filter(p => 
        p.task.includes(task) || 
        task.includes(p.task) ||
        p.pattern.toLowerCase().includes(task.toLowerCase())
      )
      .filter(p => p.failureCount > p.successCount)
      .sort((a, b) => {
        // Prioritize recent failures with high failure counts
        const scoreA = (a.failureCount * 10) - (Date.now() - a.lastFailure) / 100000;
        const scoreB = (b.failureCount * 10) - (Date.now() - b.lastFailure) / 100000;
        return scoreB - scoreA;
      });
    
    return taskPatterns;
  }
  
  // Get successful strategies for a task
  async getSuccessStrategies(task: string): Promise<LearnedPattern[]> {
    const taskPatterns = Array.from(this.patterns.values())
      .filter(p => 
        p.task.includes(task) || 
        task.includes(p.task) ||
        p.pattern.toLowerCase().includes(task.toLowerCase())
      )
      .filter(p => p.successCount > 0)
      .sort((a, b) => b.score - a.score);
    
    return taskPatterns;
  }
  
  // Get all learned patterns
  async getAllPatterns(): Promise<LearnedPattern[]> {
    return Array.from(this.patterns.values())
      .sort((a, b) => b.lastUsed - a.lastUsed);
  }
  
  // Get most valuable lessons
  async getValuableLessons(limit = 10): Promise<LearnedPattern[]> {
    return Array.from(this.patterns.values())
      .filter(p => p.successCount + p.failureCount >= 2)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }
  
  // Get recent mistakes
  async getRecentMistakes(limit = 5): Promise<LearnedPattern[]> {
    return Array.from(this.patterns.values())
      .filter(p => p.failureCount > 0)
      .sort((a, b) => b.lastFailure - a.lastFailure)
      .slice(0, limit);
  }
  
  // Search patterns by query
  async searchPatterns(query: string): Promise<LearnedPattern[]> {
    const lowerQuery = query.toLowerCase();
    return Array.from(this.patterns.values())
      .filter(p => 
        p.pattern.toLowerCase().includes(lowerQuery) ||
        p.task.toLowerCase().includes(lowerQuery) ||
        p.context.toLowerCase().includes(lowerQuery)
      )
      .sort((a, b) => b.score - a.score);
  }
  
  // Clear learned patterns
  async clear(): Promise<void> {
    this.patterns.clear();
    this.history = [];
    this.saveToStorage();
  }
  
  // Remove a specific pattern
  async removePattern(id: string): Promise<boolean> {
    const deleted = this.patterns.delete(id);
    if (deleted) this.saveToStorage();
    return deleted;
  }
  
  // Update pattern source
  async updatePatternSource(id: string, source: LearnedPattern['source']): Promise<void> {
    const pattern = this.patterns.get(id);
    if (pattern) {
      pattern.source = source;
      this.saveToStorage();
    }
  }
  
  // Calculate pattern score (success rate weighted by recency)
  private calculateScore(pattern: LearnedPattern): number {
    const total = pattern.successCount + pattern.failureCount;
    if (total === 0) return 0;
    
    const successRate = pattern.successCount / total;
    const recencyBonus = Math.max(0, 1 - (Date.now() - pattern.lastUsed) / (30 * 24 * 60 * 60 * 1000));
    
    return successRate * 0.8 + recencyBonus * 0.2;
  }
  
  // Generate pattern key
  private patternKey(task: string, action: string): string {
    return `${task}::${action}`.toLowerCase().slice(0, 200);
  }
  
  // Save to localStorage (browser) or file (Node.js)
  private saveToStorage(): void {
    try {
      const data = {
        patterns: Array.from(this.patterns.entries()),
        history: this.history,
      };
      
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('opencode-learning', JSON.stringify(data));
      }
      
      // Also try Node.js fs
      try {
        const fs = require('fs');
        const path = require('path');
        const dir = path.join(process.cwd(), '.opencode');
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(path.join(dir, 'learning.json'), JSON.stringify(data, null, 2));
      } catch {}
    } catch (e) {
      console.warn('Failed to save learning data:', e);
    }
  }
  
  // Load from storage
  private loadFromStorage(): void {
    try {
      let data: { patterns: [string, LearnedPattern][]; history: LearningEntry[] } | null = null;
      
      // Try localStorage first
      if (typeof localStorage !== 'undefined') {
        const stored = localStorage.getItem('opencode-learning');
        if (stored) data = JSON.parse(stored);
      }
      
      // Try Node.js file
      if (!data) {
        try {
          const fs = require('fs');
          const path = require('path');
          const file = path.join(process.cwd(), '.opencode', 'learning.json');
          if (fs.existsSync(file)) {
            data = JSON.parse(fs.readFileSync(file, 'utf-8'));
          }
        } catch {}
      }
      
      if (data) {
        this.patterns = new Map(data.patterns);
        this.history = data.history || [];
      }
    } catch (e) {
      console.warn('Failed to load learning data:', e);
    }
  }
  
  // Export lessons for context
  async getContextForTask(task: string): Promise<string> {
    const avoid = await this.getPatternsToAvoid(task);
    const use = await this.getSuccessStrategies(task);
    
    const lines: string[] = [];
    
    if (avoid.length > 0) {
      lines.push('⚠️ Patterns to AVOID:');
      avoid.slice(0, 3).forEach(p => {
        lines.push(`  - ${p.pattern} (failed ${p.failureCount} times)`);
      });
    }
    
    if (use.length > 0) {
      lines.push('✅ Successful strategies to USE:');
      use.slice(0, 3).forEach(p => {
        lines.push(`  - ${p.pattern} (succeeded ${p.successCount} times)`);
      });
    }
    
    return lines.length > 0 ? lines.join('\n') : '';
  }
}

// Singleton instance
let learningMemoryInstance: LearningMemory | null = null;

export function getLearningMemory(): LearningMemory {
  if (!learningMemoryInstance) {
    learningMemoryInstance = new LearningMemory();
  }
  return learningMemoryInstance;
}
