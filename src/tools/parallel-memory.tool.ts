import { MemoryCache } from "../cache/memory-cache.js";
import { SearchIndex } from "../indexing/search-index.js";
import { BackgroundTaskManager } from "../utils/background-tasks.js";

/**
 * Enhanced memory tools with parallel processing capabilities
 */
export class ParallelMemoryTools {
  private backgroundTasks: BackgroundTaskManager;
  private searchIndex: SearchIndex;
  private memoryCache: MemoryCache;

  constructor(memoryPath: string) {
    this.backgroundTasks = new BackgroundTaskManager(4); // 4 concurrent tasks
    this.searchIndex = new SearchIndex(memoryPath);
    this.memoryCache = new MemoryCache(memoryPath);
    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    this.backgroundTasks.on("taskCompleted", ({ id, name, result }) => {
      console.error(`Background task completed: ${name} (${id})`);
    });

    this.backgroundTasks.on("taskError", ({ id, name, error }) => {
      console.error(`Background task failed: ${name} (${id}):`, error);
    });
  }

  /**
   * Run memory search in background
   */
  async searchMemoriesAsync(query: string, options: any = {}): Promise<string> {
    const taskId = `search-${Date.now()}`;

    return new Promise((resolve, reject) => {
      this.backgroundTasks.addTask({
        id: taskId,
        name: `Memory Search: ${query}`,
        execute: async () => {
          return await this.searchIndex.search(query, options);
        },
        onComplete: (result) => {
          resolve(taskId); // Return task ID immediately
        },
        onError: (error) => {
          reject(error);
        },
      });
    });
  }

  /**
   * Rebuild search index in background
   */
  async rebuildIndexAsync(): Promise<string> {
    const taskId = `rebuild-index-${Date.now()}`;

    this.backgroundTasks.addTask({
      id: taskId,
      name: "Rebuild Search Index",
      execute: async () => {
        // Use reindexAll method that exists
        return await this.searchIndex.reindexAll();
      },
      onComplete: (result) => {
        console.error("Search index rebuild completed");
      },
      onError: (error) => {
        console.error("Search index rebuild failed:", error);
      },
    });

    return taskId;
  }

  /**
   * Cache warm-up in background
   */
  async warmUpCacheAsync(): Promise<string> {
    const taskId = `cache-warmup-${Date.now()}`;

    this.backgroundTasks.addTask({
      id: taskId,
      name: "Cache Warm-up",
      execute: async () => {
        // Use loadAll method that exists
        await this.memoryCache.loadAll();
        return { status: "Cache warmed up successfully" };
      },
      onComplete: (result) => {
        console.error("Cache warm-up completed");
      },
      onError: (error) => {
        console.error("Cache warm-up failed:", error);
      },
    });

    return taskId;
  }

  /**
   * Run multiple operations in parallel
   */
  async runParallelOperations(
    operations: Array<() => Promise<any>>
  ): Promise<any[]> {
    try {
      // Run all operations in parallel using Promise.all
      return await Promise.all(operations.map((op) => op()));
    } catch (error) {
      console.error("Parallel operations failed:", error);
      throw error;
    }
  }

  /**
   * Get status of background tasks
   */
  getTaskStatus() {
    return this.backgroundTasks.getStatus();
  }

  /**
   * Shutdown background tasks
   */
  async shutdown() {
    await this.backgroundTasks.shutdown();
  }
}
