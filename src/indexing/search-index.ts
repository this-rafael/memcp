import Database from "better-sqlite3";
import * as path from "path";
import {
  IndexError,
  SearchOptions,
  SearchResponse,
  SearchResult,
} from "../types.js";
import { FileSystemUtils } from "../utils/file-system.js";

/**
 * SQLite FTS5 full-text search indexing system
 */
export class SearchIndex {
  private db: Database.Database;
  private memoryPath: string;

  constructor(memoryPath: string) {
    this.memoryPath = memoryPath;
    const dbPath = path.join(memoryPath, "index.db");
    this.db = new Database(dbPath);
    this.setupDatabase();
  }

  // ====== DATABASE SETUP ======

  /**
   * Setup SQLite database with FTS5 tables
   */
  private setupDatabase(): void {
    try {
      // Enable FTS5
      this.db.pragma("foreign_keys = ON");

      // Create FTS5 virtual table for memory content
      this.db.exec(`
        CREATE VIRTUAL TABLE IF NOT EXISTS memory_index USING fts5(
          path,
          title,
          context,
          subcontext,
          content,
          tags,
          importance,
          created_at,
          updated_at,
          tokenize = 'unicode61'
        );
      `);

      // Create regular table for metadata and faceting
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS memory_metadata (
          path TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          context TEXT NOT NULL,
          subcontext TEXT NOT NULL,
          importance TEXT NOT NULL,
          tags TEXT, -- JSON array as string
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          content_length INTEGER DEFAULT 0,
          indexed_at TEXT DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // Create indexes for faceting
      this.db.exec(`
        CREATE INDEX IF NOT EXISTS idx_context ON memory_metadata(context);
        CREATE INDEX IF NOT EXISTS idx_subcontext ON memory_metadata(subcontext);
        CREATE INDEX IF NOT EXISTS idx_importance ON memory_metadata(importance);
        CREATE INDEX IF NOT EXISTS idx_updated_at ON memory_metadata(updated_at);
      `);
    } catch (error) {
      throw new IndexError(
        `Failed to setup database: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  // ====== INDEXING OPERATIONS ======

  /**
   * Index a memory file
   */
  async indexMemory(relativePath: string): Promise<void> {
    try {
      const fullPath = path.join(this.memoryPath, relativePath);
      const memory = await FileSystemUtils.readMarkdown(fullPath);

      const tagsString = memory.frontmatter.tags
        ? memory.frontmatter.tags.join(" ")
        : "";

      // Insert into FTS5 table
      const insertFTS = this.db.prepare(`
        INSERT OR REPLACE INTO memory_index (
          path, title, context, subcontext, content, tags, importance, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      insertFTS.run(
        relativePath,
        memory.frontmatter.title,
        memory.frontmatter.context,
        memory.frontmatter.subcontext,
        memory.content,
        tagsString,
        memory.frontmatter.importance,
        memory.frontmatter.created_at,
        memory.frontmatter.updated_at
      );

      // Insert into metadata table
      const insertMeta = this.db.prepare(`
        INSERT OR REPLACE INTO memory_metadata (
          path, title, context, subcontext, importance, tags, created_at, updated_at, content_length
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      insertMeta.run(
        relativePath,
        memory.frontmatter.title,
        memory.frontmatter.context,
        memory.frontmatter.subcontext,
        memory.frontmatter.importance,
        JSON.stringify(memory.frontmatter.tags || []),
        memory.frontmatter.created_at,
        memory.frontmatter.updated_at,
        memory.content.length
      );
    } catch (error) {
      throw new IndexError(
        `Failed to index memory ${relativePath}: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Remove memory from index
   */
  removeMemory(relativePath: string): void {
    try {
      const deleteFTS = this.db.prepare(
        "DELETE FROM memory_index WHERE path = ?"
      );
      const deleteMeta = this.db.prepare(
        "DELETE FROM memory_metadata WHERE path = ?"
      );

      deleteFTS.run(relativePath);
      deleteMeta.run(relativePath);
    } catch (error) {
      throw new IndexError(
        `Failed to remove memory ${relativePath} from index: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Validate and fix corrupted index data
   */
  validateAndFixIndex(): { fixed: number; errors: string[] } {
    const errors: string[] = [];
    let fixed = 0;

    try {
      // Find all rows with invalid JSON in tags
      const invalidRowsStmt = this.db.prepare(`
        SELECT path, tags FROM memory_metadata WHERE tags IS NOT NULL AND tags != ''
      `);

      const rows = invalidRowsStmt.all() as { path: string; tags: string }[];

      for (const row of rows) {
        try {
          JSON.parse(row.tags);
        } catch (parseError) {
          try {
            // Try to fix the tags - convert string to JSON array
            let fixedTags: string[] = [];
            if (typeof row.tags === "string") {
              // If it's a space-separated string, split it
              fixedTags = row.tags.split(" ").filter(Boolean);
            }

            const updateStmt = this.db.prepare(`
              UPDATE memory_metadata SET tags = ? WHERE path = ?
            `);
            updateStmt.run(JSON.stringify(fixedTags), row.path);
            fixed++;
          } catch (fixError) {
            errors.push(`Failed to fix tags for ${row.path}: ${fixError}`);
          }
        }
      }
    } catch (error) {
      errors.push(
        `Validation failed: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }

    return { fixed, errors };
  }

  /**
   * Reindex all memories
   */
  async reindexAll(): Promise<{ indexed: number; errors: string[] }> {
    const errors: string[] = [];
    let indexed = 0;

    try {
      // Clear existing indexes
      this.db.exec("DELETE FROM memory_index");
      this.db.exec("DELETE FROM memory_metadata");

      // Find all markdown files
      const memoriesPath = path.join(this.memoryPath, "memories");
      const markdownFiles = await FileSystemUtils.listFilesWithExtensions(
        memoriesPath,
        [".md", ".markdown"]
      );

      for (const fullPath of markdownFiles) {
        try {
          const relativePath = path.relative(this.memoryPath, fullPath);
          await this.indexMemory(relativePath);
          indexed++;
        } catch (error) {
          errors.push(
            `${fullPath}: ${
              error instanceof Error ? error.message : String(error)
            }`
          );
        }
      }

      // Optimize FTS5 index
      this.db.exec("INSERT INTO memory_index(memory_index) VALUES('optimize')");
    } catch (error) {
      throw new IndexError(
        `Failed to reindex all memories: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }

    return { indexed, errors };
  }

  // ====== SEARCH OPERATIONS ======

  /**
   * Search memories with full-text search and faceting
   */
  search(query: string, options: Partial<SearchOptions> = {}): SearchResponse {
    try {
      const {
        contexts = [],
        subcontexts = [],
        tags = [],
        importance = [],
        limit = 10,
        offset = 0,
      } = options;

      // Build FTS query
      const ftsQuery = this.buildFTSQuery(query);

      // Build filters
      const filters = this.buildFilters({
        contexts,
        subcontexts,
        tags,
        importance,
      });

      // Search query with ranking
      const searchSQL = `
        SELECT 
          m.path,
          m.title,
          m.context,
          m.subcontext,
          m.importance,
          meta.tags,
          snippet(memory_index, 4, '<mark>', '</mark>', '...', 64) as snippet,
          bm25(memory_index) as score
        FROM memory_index m
        JOIN memory_metadata meta ON m.path = meta.path
        ${filters.joins}
        WHERE memory_index MATCH ?
        ${filters.where}
        ORDER BY bm25(memory_index)
        LIMIT ? OFFSET ?
      `;

      const searchStmt = this.db.prepare(searchSQL);
      const results = searchStmt.all(
        ftsQuery,
        ...filters.params,
        limit,
        offset
      ) as any[];

      // Count total results
      const countSQL = `
        SELECT COUNT(*) as total
        FROM memory_index m
        JOIN memory_metadata meta ON m.path = meta.path
        ${filters.joins}
        WHERE memory_index MATCH ?
        ${filters.where}
      `;

      const countStmt = this.db.prepare(countSQL);
      const totalResult = countStmt.get(ftsQuery, ...filters.params) as {
        total: number;
      };

      // Convert results
      const searchResults: SearchResult[] = results.map((row) => {
        let tags: string[] = [];
        try {
          tags = row.tags ? JSON.parse(row.tags) : [];
        } catch (parseError) {
          console.warn(`Failed to parse tags for ${row.path}:`, parseError);
          // Fallback: if it's a simple string, split by spaces
          tags =
            typeof row.tags === "string"
              ? row.tags.split(" ").filter(Boolean)
              : [];
        }

        return {
          path: row.path,
          title: row.title,
          context: row.context,
          subcontext: row.subcontext,
          snippet: row.snippet || "",
          importance: row.importance,
          score: Math.abs(row.score), // BM25 scores are negative
          tags,
        };
      });

      // Get facets
      const facets = this.getFacets(query, {
        contexts,
        subcontexts,
        tags,
        importance,
      });

      return {
        results: searchResults,
        total: totalResult.total,
        facets,
      };
    } catch (error) {
      throw new IndexError(
        `Search failed: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Find similar memories (placeholder for future semantic search)
   */
  findSimilar(memoryPath: string, limit: number = 5): SearchResult[] {
    try {
      // For now, find memories from same context/subcontext with shared tags
      const metaStmt = this.db.prepare(
        "SELECT * FROM memory_metadata WHERE path = ?"
      );
      const memory = metaStmt.get(memoryPath) as any;

      if (!memory) return [];

      const tags = JSON.parse(memory.tags || "[]");

      if (tags.length === 0) {
        // Fall back to context similarity
        const similarStmt = this.db.prepare(`
          SELECT 
            m.path, m.title, m.context, m.subcontext, m.importance, m.tags,
            snippet(memory_index, 4, '<mark>', '</mark>', '...', 64) as snippet,
            1.0 as score
          FROM memory_index m
          WHERE m.context = ? AND m.path != ?
          ORDER BY m.updated_at DESC
          LIMIT ?
        `);

        const results = similarStmt.all(
          memory.context,
          memoryPath,
          limit
        ) as any[];
        return this.convertToSearchResults(results);
      }

      // Tag-based similarity
      const tagQuery = tags.map((tag: string) => `"${tag}"`).join(" OR ");

      const similarStmt = this.db.prepare(`
        SELECT 
          m.path, m.title, m.context, m.subcontext, m.importance, m.tags,
          snippet(memory_index, 4, '<mark>', '</mark>', '...', 64) as snippet,
          bm25(memory_index) as score
        FROM memory_index m
        WHERE memory_index MATCH ? AND m.path != ?
        ORDER BY bm25(memory_index)
        LIMIT ?
      `);

      const results = similarStmt.all(tagQuery, memoryPath, limit) as any[];
      return this.convertToSearchResults(results);
    } catch (error) {
      throw new IndexError(
        `Find similar failed: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  // ====== UTILITY METHODS ======

  /**
   * Build FTS5 query from user query
   */
  private buildFTSQuery(query: string): string {
    // Simple query processing - can be enhanced
    const cleaned = query.trim().replace(/[^\w\s\-"]/g, "");

    // If query contains quotes, preserve them for phrase search
    if (cleaned.includes('"')) {
      return cleaned;
    }

    // Otherwise, create OR query for individual terms
    const terms = cleaned.split(/\s+/).filter((t) => t.length > 0);
    if (terms.length === 1) {
      return terms[0];
    }

    return terms.map((term) => `"${term}"`).join(" OR ");
  }

  /**
   * Build SQL filters for search options
   */
  private buildFilters(options: {
    contexts: string[];
    subcontexts: string[];
    tags: string[];
    importance: string[];
  }): { joins: string; where: string; params: any[] } {
    const conditions: string[] = [];
    const params: any[] = [];
    let joins = "";

    if (options.contexts.length > 0) {
      const placeholders = options.contexts.map(() => "?").join(",");
      conditions.push(`m.context IN (${placeholders})`);
      params.push(...options.contexts);
    }

    if (options.subcontexts.length > 0) {
      const placeholders = options.subcontexts.map(() => "?").join(",");
      conditions.push(`m.subcontext IN (${placeholders})`);
      params.push(...options.subcontexts);
    }

    if (options.importance.length > 0) {
      const placeholders = options.importance.map(() => "?").join(",");
      conditions.push(`m.importance IN (${placeholders})`);
      params.push(...options.importance);
    }

    if (options.tags.length > 0) {
      // Tag filtering using JSON operations on the already joined metadata table
      const tagConditions = options.tags.map(
        () => `json_extract(meta.tags, '$') LIKE ?`
      );
      conditions.push(`(${tagConditions.join(" OR ")})`);
      params.push(...options.tags.map((tag) => `%"${tag}"%`));
    }

    const where =
      conditions.length > 0 ? `AND ${conditions.join(" AND ")}` : "";

    return { joins, where, params };
  }

  /**
   * Get search facets for filtering
   */
  private getFacets(
    query: string,
    currentFilters: {
      contexts: string[];
      subcontexts: string[];
      tags: string[];
      importance: string[];
    }
  ): any {
    try {
      const facets = {
        contexts: {},
        subcontexts: {},
        tags: {},
        importance: {},
      };

      // Get facet counts from current search
      const ftsQuery = this.buildFTSQuery(query);

      // Context facets
      const contextStmt = this.db.prepare(`
        SELECT m.context, COUNT(*) as count
        FROM memory_index m
        WHERE memory_index MATCH ?
        GROUP BY m.context
        ORDER BY count DESC
      `);

      const contextResults = contextStmt.all(ftsQuery) as {
        context: string;
        count: number;
      }[];
      for (const result of contextResults) {
        (facets.contexts as any)[result.context] = result.count;
      }

      // Subcontext facets
      const subcontextStmt = this.db.prepare(`
        SELECT m.subcontext, COUNT(*) as count
        FROM memory_index m
        WHERE memory_index MATCH ?
        GROUP BY m.subcontext
        ORDER BY count DESC
      `);

      const subcontextResults = subcontextStmt.all(ftsQuery) as {
        subcontext: string;
        count: number;
      }[];
      for (const result of subcontextResults) {
        (facets.subcontexts as any)[result.subcontext] = result.count;
      }

      // Importance facets
      const importanceStmt = this.db.prepare(`
        SELECT m.importance, COUNT(*) as count
        FROM memory_index m
        WHERE memory_index MATCH ?
        GROUP BY m.importance
        ORDER BY count DESC
      `);

      const importanceResults = importanceStmt.all(ftsQuery) as {
        importance: string;
        count: number;
      }[];
      for (const result of importanceResults) {
        (facets.importance as any)[result.importance] = result.count;
      }

      return facets;
    } catch (error) {
      // Return empty facets on error
      return {
        contexts: {},
        subcontexts: {},
        tags: {},
        importance: {},
      };
    }
  }

  /**
   * Convert database results to SearchResult objects
   */
  private convertToSearchResults(results: any[]): SearchResult[] {
    return results.map((row) => ({
      path: row.path,
      title: row.title,
      context: row.context,
      subcontext: row.subcontext,
      snippet: row.snippet || "",
      importance: row.importance,
      score: Math.abs(row.score || 0),
      tags: row.tags ? JSON.parse(row.tags) : [],
    }));
  }

  // ====== MAINTENANCE ======

  /**
   * Get index statistics
   */
  getStats(): any {
    try {
      const stats = this.db
        .prepare(
          `
        SELECT 
          COUNT(*) as total_memories,
          COUNT(DISTINCT context) as total_contexts,
          COUNT(DISTINCT subcontext) as total_subcontexts,
          AVG(content_length) as avg_content_length,
          MAX(updated_at) as last_update
        FROM memory_metadata
      `
        )
        .get();

      const dbSize = this.db
        .prepare(
          "SELECT page_count * page_size as size FROM pragma_page_count(), pragma_page_size()"
        )
        .get() as { size: number };

      return {
        total_memories: (stats as any).total_memories,
        total_contexts: (stats as any).total_contexts,
        total_subcontexts: (stats as any).total_subcontexts,
        avg_content_length: (stats as any).avg_content_length,
        last_update: (stats as any).last_update,
        index_size_bytes: dbSize.size,
        index_size_mb: dbSize.size / (1024 * 1024),
      };
    } catch (error) {
      throw new IndexError(
        `Failed to get index stats: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Optimize the FTS5 index
   */
  optimize(): void {
    try {
      this.db.exec("INSERT INTO memory_index(memory_index) VALUES('optimize')");
    } catch (error) {
      throw new IndexError(
        `Failed to optimize index: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Close database connection
   */
  close(): void {
    this.db.close();
  }
}
