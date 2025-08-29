import * as path from "path";
import { MemoryCache } from "../cache/memory-cache.js";
import { SearchIndex } from "../indexing/search-index.js";
import {
  Importance,
  Memory,
  MemoryFrontmatter,
  SearchParams,
  SearchResponse,
  SearchResult,
} from "../types.js";
import { FileSystemUtils } from "../utils/file-system.js";

/**
 * Memory CRUD and search operations
 */
export class MemoryTools {
  private cache: MemoryCache;
  private searchIndex: SearchIndex;
  private memoryPath: string;

  constructor(memoryPath: string) {
    this.memoryPath = memoryPath;
    this.cache = new MemoryCache(memoryPath);
    this.searchIndex = new SearchIndex(memoryPath);
  }

  async initialize(): Promise<void> {
    await this.cache.loadAll();
  }

  /**
   * Create new memory
   */
  async memoryCreate(
    context: string,
    subcontext: string,
    title: string,
    content: string,
    tags: string[] = [],
    importance: Importance = "medium"
  ): Promise<string> {
    try {
      if (!this.cache.isReady()) {
        await this.cache.loadAll();
      }

      const id = FileSystemUtils.generateUUID();
      const now = new Date().toISOString();

      const frontmatter: MemoryFrontmatter = {
        id,
        title,
        context,
        subcontext,
        created_at: now,
        updated_at: now,
        tags,
        importance,
      };

      // Create the memory file
      const relativePath = await FileSystemUtils.createMarkdownMemory(
        this.memoryPath,
        context,
        subcontext,
        title,
        content,
        frontmatter
      );

      // Index the memory
      await this.searchIndex.indexMemory(relativePath);

      return relativePath;
    } catch (error) {
      throw new Error(
        `Failed to create memory: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Read memory by path
   */
  async memoryRead(relativePath: string): Promise<Memory> {
    try {
      const fullPath = path.join(this.memoryPath, relativePath);
      return await FileSystemUtils.readMarkdown(fullPath);
    } catch (error) {
      throw new Error(
        `Failed to read memory: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Update memory content and/or frontmatter
   */
  async memoryUpdate(
    relativePath: string,
    content?: string,
    frontmatter?: Partial<MemoryFrontmatter>
  ): Promise<boolean> {
    try {
      const memory = await this.memoryRead(relativePath);

      // Update content if provided
      if (content !== undefined) {
        memory.content = content;
      }

      // Update frontmatter if provided
      if (frontmatter) {
        memory.frontmatter = {
          ...memory.frontmatter,
          ...frontmatter,
          updated_at: new Date().toISOString(),
          // Preserve core fields
          id: memory.frontmatter.id,
          created_at: memory.frontmatter.created_at,
        };
      } else {
        // Just update the timestamp
        memory.frontmatter.updated_at = new Date().toISOString();
      }

      // Write back to disk
      const fullPath = path.join(this.memoryPath, relativePath);
      await FileSystemUtils.writeMarkdown(fullPath, memory);

      // Update search index
      await this.searchIndex.indexMemory(relativePath);

      return true;
    } catch (error) {
      console.error(`Failed to update memory ${relativePath}:`, error);
      return false;
    }
  }

  /**
   * Delete memory
   */
  async memoryDelete(relativePath: string): Promise<boolean> {
    try {
      const fullPath = path.join(this.memoryPath, relativePath);

      // Remove from disk
      await FileSystemUtils.safeDelete(fullPath);

      // Remove from search index
      this.searchIndex.removeMemory(relativePath);

      return true;
    } catch (error) {
      console.error(`Failed to delete memory ${relativePath}:`, error);
      return false;
    }
  }

  /**
   * Move memory to different context/subcontext
   */
  async memoryMove(
    oldPath: string,
    newContext: string,
    newSubcontext: string
  ): Promise<string> {
    try {
      // Read existing memory
      const memory = await this.memoryRead(oldPath);

      // Update frontmatter with new context/subcontext
      memory.frontmatter.context = newContext;
      memory.frontmatter.subcontext = newSubcontext;
      memory.frontmatter.updated_at = new Date().toISOString();

      // Create new path
      const newFileName = path.basename(oldPath);
      const newRelativePath = path.join(
        "memories",
        newContext,
        newSubcontext,
        newFileName
      );
      const newFullPath = path.join(this.memoryPath, newRelativePath);

      // Write to new location
      await FileSystemUtils.writeMarkdown(newFullPath, memory);

      // Remove old file
      await FileSystemUtils.safeDelete(path.join(this.memoryPath, oldPath));

      // Update search index
      this.searchIndex.removeMemory(oldPath);
      await this.searchIndex.indexMemory(newRelativePath);

      return newRelativePath;
    } catch (error) {
      throw new Error(
        `Failed to move memory: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Search memories with full-text search
   */
  async searchMemories(
    query: string,
    options: Partial<SearchParams["options"]> = {}
  ): Promise<SearchResponse> {
    try {
      return this.searchIndex.search(query, options);
    } catch (error) {
      throw new Error(
        `Failed to search memories: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Find similar memories
   */
  async findSimilar(
    memoryPath: string,
    limit: number = 5
  ): Promise<SearchResult[]> {
    try {
      return this.searchIndex.findSimilar(memoryPath, limit);
    } catch (error) {
      throw new Error(
        `Failed to find similar memories: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Reindex all memories
   */
  async reindexAll(): Promise<{ indexed: number; errors: string[] }> {
    try {
      return await this.searchIndex.reindexAll();
    } catch (error) {
      throw new Error(
        `Failed to reindex memories: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Reindex specific memory
   */
  async reindexMemory(relativePath: string): Promise<boolean> {
    try {
      await this.searchIndex.indexMemory(relativePath);
      return true;
    } catch (error) {
      console.error(`Failed to reindex memory ${relativePath}:`, error);
      return false;
    }
  }

  /**
   * Get recent memories
   */
  async getRecentMemories(limit: number = 10): Promise<Memory[]> {
    try {
      const memoriesPath = path.join(this.memoryPath, "memories");
      const markdownFiles = await FileSystemUtils.listFilesWithExtensions(
        memoriesPath,
        [".md", ".markdown"]
      );

      // Read and sort by updated_at
      const memories: Array<{ memory: Memory; path: string; updated: Date }> =
        [];

      for (const fullPath of markdownFiles) {
        try {
          const memory = await FileSystemUtils.readMarkdown(fullPath);
          memories.push({
            memory,
            path: fullPath,
            updated: new Date(memory.frontmatter.updated_at),
          });
        } catch (error) {
          // Skip files that can't be read
          continue;
        }
      }

      // Sort by updated date (newest first) and limit
      return memories
        .sort((a, b) => b.updated.getTime() - a.updated.getTime())
        .slice(0, limit)
        .map((item) => item.memory);
    } catch (error) {
      throw new Error(
        `Failed to get recent memories: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Get important memories
   */
  async getImportantMemories(
    importance: Importance = "high"
  ): Promise<Memory[]> {
    try {
      const memoriesPath = path.join(this.memoryPath, "memories");
      const markdownFiles = await FileSystemUtils.listFilesWithExtensions(
        memoriesPath,
        [".md", ".markdown"]
      );

      const importantMemories: Memory[] = [];

      for (const fullPath of markdownFiles) {
        try {
          const memory = await FileSystemUtils.readMarkdown(fullPath);

          if (
            memory.frontmatter.importance === importance ||
            (importance === "high" &&
              memory.frontmatter.importance === "critical")
          ) {
            importantMemories.push(memory);
          }
        } catch (error) {
          // Skip files that can't be read
          continue;
        }
      }

      // Sort by importance level and then by updated date
      const importanceOrder = { critical: 4, high: 3, medium: 2, low: 1 };

      return importantMemories.sort((a, b) => {
        const aLevel = importanceOrder[a.frontmatter.importance];
        const bLevel = importanceOrder[b.frontmatter.importance];

        if (aLevel !== bLevel) {
          return bLevel - aLevel;
        }

        return (
          new Date(b.frontmatter.updated_at).getTime() -
          new Date(a.frontmatter.updated_at).getTime()
        );
      });
    } catch (error) {
      throw new Error(
        `Failed to get important memories: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Get memories by tags
   */
  async getMemoriesByTags(tags: string[]): Promise<Memory[]> {
    try {
      const memoriesPath = path.join(this.memoryPath, "memories");
      const markdownFiles = await FileSystemUtils.listFilesWithExtensions(
        memoriesPath,
        [".md", ".markdown"]
      );

      const taggedMemories: Memory[] = [];

      for (const fullPath of markdownFiles) {
        try {
          const memory = await FileSystemUtils.readMarkdown(fullPath);

          if (memory.frontmatter.tags && memory.frontmatter.tags.length > 0) {
            // Check if any of the search tags match memory tags
            const hasMatchingTag = tags.some((tag) =>
              memory.frontmatter.tags!.some((memoryTag) =>
                memoryTag.toLowerCase().includes(tag.toLowerCase())
              )
            );

            if (hasMatchingTag) {
              taggedMemories.push(memory);
            }
          }
        } catch (error) {
          // Skip files that can't be read
          continue;
        }
      }

      // Sort by updated date (newest first)
      return taggedMemories.sort(
        (a, b) =>
          new Date(b.frontmatter.updated_at).getTime() -
          new Date(a.frontmatter.updated_at).getTime()
      );
    } catch (error) {
      throw new Error(
        `Failed to get memories by tags: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Get memory statistics
   */
  async getMemoryStats(): Promise<{
    total: number;
    by_context: { [context: string]: number };
    by_importance: { [importance: string]: number };
    by_tags: { [tag: string]: number };
    avg_content_length: number;
  }> {
    try {
      const memoriesPath = path.join(this.memoryPath, "memories");
      const markdownFiles = await FileSystemUtils.listFilesWithExtensions(
        memoriesPath,
        [".md", ".markdown"]
      );

      const byContext: { [context: string]: number } = {};
      const byImportance: { [importance: string]: number } = {};
      const byTags: { [tag: string]: number } = {};
      let totalContentLength = 0;
      let validMemories = 0;

      for (const fullPath of markdownFiles) {
        try {
          const memory = await FileSystemUtils.readMarkdown(fullPath);
          validMemories++;

          // Count by context
          byContext[memory.frontmatter.context] =
            (byContext[memory.frontmatter.context] || 0) + 1;

          // Count by importance
          byImportance[memory.frontmatter.importance] =
            (byImportance[memory.frontmatter.importance] || 0) + 1;

          // Count by tags
          if (memory.frontmatter.tags) {
            for (const tag of memory.frontmatter.tags) {
              byTags[tag] = (byTags[tag] || 0) + 1;
            }
          }

          // Add content length
          totalContentLength += memory.content.length;
        } catch (error) {
          // Skip files that can't be read
          continue;
        }
      }

      return {
        total: validMemories,
        by_context: byContext,
        by_importance: byImportance,
        by_tags: byTags,
        avg_content_length:
          validMemories > 0 ? totalContentLength / validMemories : 0,
      };
    } catch (error) {
      throw new Error(
        `Failed to get memory stats: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Close search index (cleanup)
   */
  close(): void {
    this.searchIndex.close();
  }
}
