// ============================================================================
// OpenCode Studio - Memory System
// ============================================================================

import Database from 'better-sqlite3';
import { join } from 'path';
import { mkdir } from 'fs/promises';
import type { MemoryEntry, MemoryQuery } from '@opencode/shared';
import { generateId } from '@opencode/shared';

// ----------------------------------------------------------------------------
// SQLite Memory Store
// ----------------------------------------------------------------------------

export class MemoryStore {
  private db: Database.Database;
  private embeddingDimension: number;
  
  constructor(dbPath: string, embeddingDimension: number = 1536) {
    this.db = new Database(dbPath);
    this.embeddingDimension = embeddingDimension;
    this.init();
  }
  
  private init(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS memories (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        content TEXT NOT NULL,
        metadata TEXT DEFAULT '{}',
        embedding BLOB,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        access_count INTEGER DEFAULT 0
      );
      
      CREATE INDEX IF NOT EXISTS idx_memories_type ON memories(type);
      CREATE INDEX IF NOT EXISTS idx_memories_created ON memories(created_at);
    `);
  }
  
  async add(entry: Omit<MemoryEntry, 'id' | 'createdAt' | 'updatedAt' | 'accessCount'>): Promise<MemoryEntry> {
    const id = generateId();
    const now = new Date().toISOString();
    
    let embeddingBlob: Buffer | null = null;
    if (entry.embedding) {
      embeddingBlob = Buffer.from(new Float32Array(entry.embedding));
    }
    
    const stmt = this.db.prepare(`
      INSERT INTO memories (id, type, content, metadata, embedding, created_at, updated_at, access_count)
      VALUES (?, ?, ?, ?, ?, ?, ?, 0)
    `);
    
    stmt.run(
      id,
      entry.type,
      entry.content,
      JSON.stringify(entry.metadata || {}),
      embeddingBlob,
      now,
      now
    );
    
    return {
      ...entry,
      id,
      createdAt: new Date(now),
      updatedAt: new Date(now),
      accessCount: 0,
    };
  }
  
  async get(id: string): Promise<MemoryEntry | null> {
    const stmt = this.db.prepare('SELECT * FROM memories WHERE id = ?');
    const row = stmt.get(id) as MemoryRow | undefined;
    
    if (!row) return null;
    
    // Update access count
    this.db.prepare('UPDATE memories SET access_count = access_count + 1 WHERE id = ?').run(id);
    
    return this.rowToEntry(row);
  }
  
  async update(id: string, updates: Partial<MemoryEntry>): Promise<MemoryEntry | null> {
    const existing = await this.get(id);
    if (!existing) return null;
    
    const now = new Date().toISOString();
    const stmt = this.db.prepare(`
      UPDATE memories 
      SET content = ?, metadata = ?, updated_at = ?
      WHERE id = ?
    `);
    
    stmt.run(
      updates.content ?? existing.content,
      JSON.stringify(updates.metadata ?? existing.metadata),
      now,
      id
    );
    
    return this.get(id);
  }
  
  async delete(id: string): Promise<boolean> {
    const stmt = this.db.prepare('DELETE FROM memories WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }
  
  async query(query: MemoryQuery): Promise<MemoryEntry[]> {
    let sql = 'SELECT * FROM memories WHERE 1=1';
    const params: unknown[] = [];
    
    if (query.type) {
      sql += ' AND type = ?';
      params.push(query.type);
    }
    
    sql += ' ORDER BY access_count DESC, created_at DESC';
    
    if (query.limit) {
      sql += ' LIMIT ?';
      params.push(query.limit);
    }
    
    const stmt = this.db.prepare(sql);
    const rows = stmt.all(...params) as MemoryRow[];
    
    return rows.map((row) => this.rowToEntry(row));
  }
  
  async searchByContent(content: string, limit: number = 10): Promise<MemoryEntry[]> {
    // Simple text search using LIKE
    const stmt = this.db.prepare(`
      SELECT * FROM memories 
      WHERE content LIKE ?
      ORDER BY access_count DESC, created_at DESC
      LIMIT ?
    `);
    
    const rows = stmt.all(`%${content}%`, limit) as MemoryRow[];
    return rows.map((row) => this.rowToEntry(row));
  }
  
  async getAllByType(type: MemoryEntry['type']): Promise<MemoryEntry[]> {
    const stmt = this.db.prepare('SELECT * FROM memories WHERE type = ? ORDER BY created_at DESC');
    const rows = stmt.all(type) as MemoryRow[];
    return rows.map((row) => this.rowToEntry(row));
  }
  
  async count(): Promise<number> {
    const stmt = this.db.prepare('SELECT COUNT(*) as count FROM memories');
    const result = stmt.get() as { count: number };
    return result.count;
  }
  
  async clear(type?: MemoryEntry['type']): Promise<number> {
    if (type) {
      const stmt = this.db.prepare('DELETE FROM memories WHERE type = ?');
      const result = stmt.run(type);
      return result.changes;
    }
    
    const stmt = this.db.prepare('DELETE FROM memories');
    const result = stmt.run();
    return result.changes;
  }
  
  async cleanup(maxEntries: number = 10000): Promise<number> {
    // Keep most accessed memories
    const count = await this.count();
    if (count <= maxEntries) return 0;
    
    const toDelete = count - maxEntries;
    const stmt = this.db.prepare(`
      DELETE FROM memories 
      WHERE id IN (
        SELECT id FROM memories 
        ORDER BY access_count ASC, created_at ASC 
        LIMIT ?
      )
    `);
    
    const result = stmt.run(toDelete);
    return result.changes;
  }
  
  close(): void {
    this.db.close();
  }
  
  private rowToEntry(row: MemoryRow): MemoryEntry {
    let embedding: number[] | undefined;
    if (row.embedding) {
      embedding = Array.from(new Float32Array(row.embedding));
    }
    
    return {
      id: row.id,
      type: row.type as MemoryEntry['type'],
      content: row.content,
      metadata: JSON.parse(row.metadata || '{}'),
      embedding,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      accessCount: row.access_count,
    };
  }
}

interface MemoryRow {
  id: string;
  type: string;
  content: string;
  metadata: string;
  embedding: Buffer | null;
  created_at: string;
  updated_at: string;
  access_count: number;
}

// ----------------------------------------------------------------------------
// Vector Store (Simple in-memory with cosine similarity)
// ----------------------------------------------------------------------------

export class VectorStore {
  private vectors: Map<string, { embedding: number[]; metadata: Record<string, unknown> }>;
  
  constructor() {
    this.vectors = new Map();
  }
  
  add(id: string, embedding: number[], metadata: Record<string, unknown> = {}): void {
    this.vectors.set(id, { embedding, metadata });
  }
  
  remove(id: string): boolean {
    return this.vectors.delete(id);
  }
  
  search(queryEmbedding: number[], topK: number = 10): Array<{ id: string; score: number; metadata: Record<string, unknown> }> {
    const results: Array<{ id: string; score: number; metadata: Record<string, unknown> }> = [];
    
    for (const [id, { embedding, metadata }] of this.vectors) {
      const score = this.cosineSimilarity(queryEmbedding, embedding);
      results.push({ id, score, metadata });
    }
    
    // Sort by score descending
    results.sort((a, b) => b.score - a.score);
    
    return results.slice(0, topK);
  }
  
  clear(): void {
    this.vectors.clear();
  }
  
  size(): number {
    return this.vectors.size;
  }
  
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;
    
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    
    const denominator = Math.sqrt(normA) * Math.sqrt(normB);
    return denominator === 0 ? 0 : dotProduct / denominator;
  }
}

// ----------------------------------------------------------------------------
// Memory System Factory
// ----------------------------------------------------------------------------

export interface MemorySystem {
  store: MemoryStore;
  vectors: VectorStore;
  embed: (text: string) => Promise<number[]>;
  addMemory: (content: string, type: MemoryEntry['type'], metadata?: Record<string, unknown>) => Promise<MemoryEntry>;
  search: (query: string, type?: MemoryEntry['type'], limit?: number) => Promise<MemoryEntry[]>;
  getProjectMemory: (projectId: string) => Promise<MemoryEntry[]>;
  clearProjectMemory: (projectId: string) => Promise<void>;
}

export async function createMemorySystem(
  dbPath: string,
  embedFunction: (text: string) => Promise<number[]>
): Promise<MemorySystem> {
  // Ensure directory exists
  const dir = join(dbPath, '..');
  await mkdir(dir, { recursive: true });
  
  const store = new MemoryStore(dbPath);
  const vectors = new VectorStore();
  
  // Load existing memories into vector store
  const allMemories = await store.query({ query: '', limit: 10000 });
  for (const memory of allMemories) {
    if (memory.embedding) {
      vectors.add(memory.id, memory.embedding, { type: memory.type, ...memory.metadata });
    }
  }
  
  return {
    store,
    vectors,
    embed: embedFunction,
    
    async addMemory(content: string, type: MemoryEntry['type'], metadata: Record<string, unknown> = {}): Promise<MemoryEntry> {
      // Generate embedding
      const embedding = await embedFunction(content);
      
      // Store in SQLite
      const entry = await store.add({
        type,
        content,
        metadata,
        embedding,
      });
      
      // Store in vector index
      vectors.add(entry.id, embedding, { type, ...metadata });
      
      return entry;
    },
    
    async search(query: string, type?: MemoryEntry['type'], limit: number = 10): Promise<MemoryEntry[]> {
      // Generate query embedding
      const queryEmbedding = await embedFunction(query);
      
      // Search vectors
      const vectorResults = vectors.search(queryEmbedding, limit * 2);
      
      // Get full entries
      const results: MemoryEntry[] = [];
      for (const result of vectorResults) {
        if (type && result.metadata.type !== type) continue;
        
        const entry = await store.get(result.id);
        if (entry) results.push(entry);
        if (results.length >= limit) break;
      }
      
      return results;
    },
    
    async getProjectMemory(projectId: string): Promise<MemoryEntry[]> {
      return store.query({
        query: projectId,
        type: 'project',
        limit: 100,
      });
    },
    
    async clearProjectMemory(projectId: string): Promise<void> {
      const memories = await store.query({
        query: projectId,
        type: 'project',
        limit: 1000,
      });
      
      for (const memory of memories) {
        await store.delete(memory.id);
        vectors.remove(memory.id);
      }
    },
  };
}
