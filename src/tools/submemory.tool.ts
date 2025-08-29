import * as path from "path";
import { MemoryCache } from "../cache/memory-cache.js";
import { MemoryReference, Submemory } from "../types.js";
import { FileSystemUtils } from "../utils/file-system.js";

/**
 * Submemories CRUD operations
 */
export class SubmemoryTools {
  private cache: MemoryCache;
  private memoryPath: string;

  constructor(memoryPath: string) {
    this.memoryPath = memoryPath;
    this.cache = new MemoryCache(memoryPath);
  }

  async initialize(): Promise<void> {
    await this.cache.loadAll();
  }

  /**
   * Create new submemory
   */
  async submemoryCreate(
    context: string,
    subcontext: string,
    data: Partial<Submemory>
  ): Promise<string> {
    try {
      if (!this.cache.isReady()) {
        await this.cache.loadAll();
      }

      const now = new Date().toISOString();
      const id = FileSystemUtils.generateUUID();

      const submemory: Submemory = {
        id,
        context,
        subcontext,
        created_at: now,
        updated_at: now,
        tags: data.tags || [],
        priority: data.priority || 5,
        memories: data.memories || [],
        related_contexts: data.related_contexts || [],
        ...data,
      };

      // Create file path
      const fileName = `${subcontext}.json5`;
      const relativePath = path.join("submemories", context, fileName);

      // Save to cache and disk
      await this.cache.setSubmemory(relativePath, submemory);

      return relativePath;
    } catch (error) {
      throw new Error(
        `Failed to create submemory: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Read submemory by path
   */
  async submemoryRead(relativePath: string): Promise<Submemory | null> {
    try {
      if (!this.cache.isReady()) {
        await this.cache.loadAll();
      }

      return this.cache.getSubmemory(relativePath);
    } catch (error) {
      throw new Error(
        `Failed to read submemory: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Update submemory
   */
  async submemoryUpdate(
    relativePath: string,
    data: Partial<Submemory>
  ): Promise<boolean> {
    try {
      if (!this.cache.isReady()) {
        await this.cache.loadAll();
      }

      const existing = this.cache.getSubmemory(relativePath);
      if (!existing) {
        throw new Error(`Submemory not found: ${relativePath}`);
      }

      const updated: Submemory = {
        ...existing,
        ...data,
        updated_at: new Date().toISOString(),
        // Ensure core fields don't get overwritten accidentally
        id: existing.id,
        created_at: existing.created_at,
      };

      await this.cache.setSubmemory(relativePath, updated);
      return true;
    } catch (error) {
      console.error(`Failed to update submemory ${relativePath}:`, error);
      return false;
    }
  }

  /**
   * Delete submemory
   */
  async submemoryDelete(relativePath: string): Promise<boolean> {
    try {
      if (!this.cache.isReady()) {
        await this.cache.loadAll();
      }

      const existing = this.cache.getSubmemory(relativePath);
      if (!existing) {
        throw new Error(`Submemory not found: ${relativePath}`);
      }

      await this.cache.removeSubmemory(relativePath);
      return true;
    } catch (error) {
      console.error(`Failed to delete submemory ${relativePath}:`, error);
      return false;
    }
  }

  /**
   * Add memory reference to submemory
   */
  async submemoryAddMemory(
    submemoryPath: string,
    memoryPath: string,
    summary: string
  ): Promise<boolean> {
    try {
      if (!this.cache.isReady()) {
        await this.cache.loadAll();
      }

      const submemory = this.cache.getSubmemory(submemoryPath);
      if (!submemory) {
        throw new Error(`Submemory not found: ${submemoryPath}`);
      }

      // Extract title from memory path or use filename
      const title = path
        .basename(memoryPath, path.extname(memoryPath))
        .replace(/^\d+-/, ""); // Remove timestamp prefix

      const newMemoryRef: MemoryReference = {
        title,
        path: memoryPath,
        summary,
      };

      // Check if memory reference already exists
      const existingIndex = submemory.memories.findIndex(
        (m) => m.path === memoryPath
      );
      if (existingIndex >= 0) {
        // Update existing
        submemory.memories[existingIndex] = newMemoryRef;
      } else {
        // Add new
        submemory.memories.push(newMemoryRef);
      }

      await this.cache.setSubmemory(submemoryPath, submemory);
      return true;
    } catch (error) {
      console.error(`Failed to add memory to submemory:`, error);
      return false;
    }
  }

  /**
   * Remove memory reference from submemory
   */
  async submemoryRemoveMemory(
    submemoryPath: string,
    memoryPath: string
  ): Promise<boolean> {
    try {
      if (!this.cache.isReady()) {
        await this.cache.loadAll();
      }

      const submemory = this.cache.getSubmemory(submemoryPath);
      if (!submemory) {
        throw new Error(`Submemory not found: ${submemoryPath}`);
      }

      // Remove memory reference
      submemory.memories = submemory.memories.filter(
        (m) => m.path !== memoryPath
      );

      await this.cache.setSubmemory(submemoryPath, submemory);
      return true;
    } catch (error) {
      console.error(`Failed to remove memory from submemory:`, error);
      return false;
    }
  }

  /**
   * Get all submemories
   */
  async submemoryGetAll(): Promise<Map<string, Submemory>> {
    try {
      if (!this.cache.isReady()) {
        await this.cache.loadAll();
      }

      return this.cache.getAllSubmemories();
    } catch (error) {
      throw new Error(
        `Failed to get all submemories: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Get submemories by context
   */
  async submemoryGetByContext(context: string): Promise<Submemory[]> {
    try {
      if (!this.cache.isReady()) {
        await this.cache.loadAll();
      }

      const allSubmemories = this.cache.getAllSubmemories();
      const result: Submemory[] = [];

      for (const [relativePath, submemory] of allSubmemories) {
        if (submemory.context === context) {
          result.push(submemory);
        }
      }

      return result;
    } catch (error) {
      throw new Error(
        `Failed to get submemories by context: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Get submemories by subcontext
   */
  async submemoryGetBySubcontext(
    context: string,
    subcontext: string
  ): Promise<Submemory[]> {
    try {
      if (!this.cache.isReady()) {
        await this.cache.loadAll();
      }

      const allSubmemories = this.cache.getAllSubmemories();
      const result: Submemory[] = [];

      for (const [relativePath, submemory] of allSubmemories) {
        if (
          submemory.context === context &&
          submemory.subcontext === subcontext
        ) {
          result.push(submemory);
        }
      }

      return result;
    } catch (error) {
      throw new Error(
        `Failed to get submemories by subcontext: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Search submemories by tags
   */
  async submemorySearchByTags(tags: string[]): Promise<Submemory[]> {
    try {
      if (!this.cache.isReady()) {
        await this.cache.loadAll();
      }

      const allSubmemories = this.cache.getAllSubmemories();
      const result: Submemory[] = [];

      for (const [relativePath, submemory] of allSubmemories) {
        if (submemory.tags && submemory.tags.length > 0) {
          // Check if any of the search tags match submemory tags
          const hasMatchingTag = tags.some((tag) =>
            submemory.tags!.some((submemoryTag) =>
              submemoryTag.toLowerCase().includes(tag.toLowerCase())
            )
          );

          if (hasMatchingTag) {
            result.push(submemory);
          }
        }
      }

      // Sort by priority (higher first) then by updated date
      return result.sort((a, b) => {
        if (a.priority !== b.priority) {
          return (b.priority || 5) - (a.priority || 5);
        }
        return (
          new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
        );
      });
    } catch (error) {
      throw new Error(
        `Failed to search submemories by tags: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Get submemory statistics
   */
  async submemoryGetStats(): Promise<{
    total: number;
    by_context: { [context: string]: number };
    by_priority: { [priority: string]: number };
    total_memory_references: number;
  }> {
    try {
      if (!this.cache.isReady()) {
        await this.cache.loadAll();
      }

      const allSubmemories = this.cache.getAllSubmemories();
      const byContext: { [context: string]: number } = {};
      const byPriority: { [priority: string]: number } = {};
      let totalMemoryReferences = 0;

      for (const [relativePath, submemory] of allSubmemories) {
        // Count by context
        byContext[submemory.context] = (byContext[submemory.context] || 0) + 1;

        // Count by priority
        const priority = (submemory.priority || 5).toString();
        byPriority[priority] = (byPriority[priority] || 0) + 1;

        // Count memory references
        totalMemoryReferences += submemory.memories.length;
      }

      return {
        total: allSubmemories.size,
        by_context: byContext,
        by_priority: byPriority,
        total_memory_references: totalMemoryReferences,
      };
    } catch (error) {
      throw new Error(
        `Failed to get submemory stats: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Validate submemory (check if referenced memories exist)
   */
  async submemoryValidate(relativePath: string): Promise<{
    valid: boolean;
    missing_memories: string[];
    warnings: string[];
  }> {
    try {
      if (!this.cache.isReady()) {
        await this.cache.loadAll();
      }

      const submemory = this.cache.getSubmemory(relativePath);
      if (!submemory) {
        return {
          valid: false,
          missing_memories: [],
          warnings: [`Submemory not found: ${relativePath}`],
        };
      }

      const missingMemories: string[] = [];
      const warnings: string[] = [];

      for (const memoryRef of submemory.memories) {
        const fullPath = path.join(this.memoryPath, memoryRef.path);

        try {
          const size = await FileSystemUtils.getFileSize(fullPath);
          if (size === 0) {
            warnings.push(`Memory file is empty: ${memoryRef.path}`);
          }
        } catch (error) {
          missingMemories.push(memoryRef.path);
        }
      }

      return {
        valid: missingMemories.length === 0,
        missing_memories: missingMemories,
        warnings,
      };
    } catch (error) {
      return {
        valid: false,
        missing_memories: [],
        warnings: [
          `Validation failed: ${
            error instanceof Error ? error.message : String(error)
          }`,
        ],
      };
    }
  }
}
