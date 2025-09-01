import { EventEmitter } from "events";

export interface BackgroundTask {
  id: string;
  name: string;
  execute: () => Promise<any>;
  onComplete?: (result: any) => void;
  onError?: (error: Error) => void;
}

/**
 * Simple background task manager for running operations in parallel
 * without blocking the main MCP server
 */
export class BackgroundTaskManager extends EventEmitter {
  private tasks = new Map<string, BackgroundTask>();
  private running = new Set<string>();
  private maxConcurrent = 3;

  constructor(maxConcurrent = 3) {
    super();
    this.maxConcurrent = maxConcurrent;
  }

  /**
   * Add a task to run in background
   */
  addTask(task: BackgroundTask): void {
    this.tasks.set(task.id, task);
    this.emit("taskAdded", task);

    // Try to run task immediately if slots available
    this.processQueue();
  }

  /**
   * Process task queue
   */
  private async processQueue(): Promise<void> {
    if (this.running.size >= this.maxConcurrent) {
      return;
    }

    for (const [id, task] of this.tasks) {
      if (this.running.has(id)) continue;
      if (this.running.size >= this.maxConcurrent) break;

      this.runTask(id, task);
    }
  }

  /**
   * Run a single task
   */
  private async runTask(id: string, task: BackgroundTask): Promise<void> {
    this.running.add(id);
    this.emit("taskStarted", { id, name: task.name });

    try {
      const result = await task.execute();

      this.emit("taskCompleted", { id, name: task.name, result });

      if (task.onComplete) {
        task.onComplete(result);
      }
    } catch (error) {
      this.emit("taskError", { id, name: task.name, error });

      if (task.onError) {
        task.onError(error as Error);
      }
    } finally {
      this.running.delete(id);
      this.tasks.delete(id);

      // Process next tasks in queue
      setImmediate(() => this.processQueue());
    }
  }

  /**
   * Get running tasks info
   */
  getStatus() {
    return {
      running: Array.from(this.running),
      queued: Array.from(this.tasks.keys()).filter(
        (id) => !this.running.has(id)
      ),
      maxConcurrent: this.maxConcurrent,
    };
  }

  /**
   * Stop all tasks
   */
  async shutdown(): Promise<void> {
    this.tasks.clear();
    // Wait for running tasks to complete (with timeout)
    const timeout = 10000; // 10 seconds
    const start = Date.now();

    while (this.running.size > 0 && Date.now() - start < timeout) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
}

// Global instance
export const backgroundTasks = new BackgroundTaskManager();
