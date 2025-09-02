import { MemoryCache } from "../cache/memory-cache.js";
import { Context, MainMemory, Stats } from "../types.js";
import { FileSystemUtils } from "../utils/file-system.js";

/**
 * Main memory CRUD operations
 */
export class MainMemoryTools {
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
   * Get main memory or specific section
   */
  async memoryMainGet(section?: string): Promise<MainMemory | any> {
    if (!this.cache.isReady()) {
      await this.cache.loadAll();
    }

    return this.cache.getMainMemory(section);
  }

  /**
   * Update main memory section
   */
  async memoryMainUpdate(section: string, data: any): Promise<boolean> {
    try {
      if (!this.cache.isReady()) {
        await this.cache.loadAll();
      }

      await this.cache.updateMainMemory(section, data);
      return true;
    } catch (error) {
      console.error(`Failed to update main memory section ${section}:`, error);
      return false;
    }
  }

  /**
   * Add new context to main memory
   */
  async memoryMainAddContext(
    name: string,
    description: string,
    priority: number
  ): Promise<boolean> {
    if (!this.cache.isReady()) {
      await this.cache.loadAll();
    }

    // Basic validation
    if (!name || !name.trim()) {
      throw new Error("Context name cannot be empty");
    }
    if (name.includes("/")) {
      throw new Error("Context name cannot contain '/'");
    }

    const mainMemory = this.cache.getMainMemory() as MainMemory;

    // Check if context already exists
    if (mainMemory.contexts[name]) {
      throw new Error(`Context '${name}' already exists`);
    }

    const newContext: Context = {
      description,
      link_file: `${name}.csv`,
      priority,
    };

    // Update contexts
    const updatedContexts = {
      ...mainMemory.contexts,
      [name]: newContext,
    };

    await this.cache.updateMainMemory("contexts", updatedContexts);

    // Create empty CSV file for the context
    await FileSystemUtils.writeCSV(`${this.memoryPath}/links/${name}.csv`, []);

    return true;
  }

  /**
   * Remove context from main memory
   */
  async memoryMainRemoveContext(name: string): Promise<boolean> {
    try {
      if (!this.cache.isReady()) {
        await this.cache.loadAll();
      }

      const mainMemory = this.cache.getMainMemory() as MainMemory;

      // Check if context exists
      if (!mainMemory.contexts[name]) {
        throw new Error(`Context '${name}' does not exist`);
      }

      // Remove from contexts
      const updatedContexts = { ...mainMemory.contexts };
      delete updatedContexts[name];

      await this.cache.updateMainMemory("contexts", updatedContexts);

      // Remove CSV file
      await FileSystemUtils.safeDelete(`${this.memoryPath}/links/${name}.csv`);

      // Remove submemories directory
      await FileSystemUtils.safeDelete(
        `${this.memoryPath}/submemories/${name}`
      );

      // Remove memories directory
      await FileSystemUtils.safeDelete(`${this.memoryPath}/memories/${name}`);

      return true;
    } catch (error) {
      console.error(`Failed to remove context ${name}:`, error);
      return false;
    }
  }

  /**
   * Get main memory statistics
   */
  async memoryMainStats(): Promise<Stats> {
    try {
      if (!this.cache.isReady()) {
        await this.cache.loadAll();
      }

      const mainMemory = this.cache.getMainMemory() as MainMemory;
      const cacheStats = this.cache.getStats();

      // Calculate directory sizes
      const memoriesPath = `${this.memoryPath}/memories`;
      const indexPath = `${this.memoryPath}/index.db`;

      const indexSizeBytes = await FileSystemUtils.getFileSize(indexPath);

      // Count memories and submemories by context
      const contextsBreakdown: { [key: string]: any } = {};

      for (const [contextName] of Object.entries(mainMemory.contexts)) {
        const contextPath = `${memoriesPath}/${contextName}`;
        const markdownFiles = await FileSystemUtils.listFilesWithExtensions(
          contextPath,
          [".md", ".markdown"]
        );

        const submemoryFiles = await FileSystemUtils.listFilesWithExtensions(
          `${this.memoryPath}/submemories/${contextName}`,
          [".json", ".json5"]
        );

        contextsBreakdown[contextName] = {
          memories: markdownFiles.length,
          submemories: submemoryFiles.length,
          last_updated: mainMemory.last_updated,
        };
      }

      // Calculate totals
      const totalMemories = Object.values(contextsBreakdown).reduce(
        (sum: number, ctx: any) => sum + ctx.memories,
        0
      );
      const totalSubmemories = Object.values(contextsBreakdown).reduce(
        (sum: number, ctx: any) => sum + ctx.submemories,
        0
      );

      return {
        total_memories: totalMemories,
        total_submemories: totalSubmemories,
        total_contexts: Object.keys(mainMemory.contexts).length,
        cache_size_mb: cacheStats.total_size_mb,
        index_size_mb: indexSizeBytes / (1024 * 1024),
        last_update: mainMemory.last_updated,
        contexts_breakdown: contextsBreakdown,
      };
    } catch (error) {
      throw new Error(
        `Failed to get main memory stats: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Set entire main memory (advanced operation)
   */
  async memoryMainSet(memory: MainMemory): Promise<boolean> {
    try {
      await this.cache.setMainMemory(memory);
      return true;
    } catch (error) {
      console.error("Failed to set main memory:", error);
      return false;
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return this.cache.getStats();
  }

  /**
   * Invalidate cache sections
   */
  async invalidateCache(
    type: "main" | "links" | "submemories" | "index" | "all",
    path?: string,
    context?: string
  ): Promise<void> {
    await this.cache.invalidate({ type, path, context });
  }
}
