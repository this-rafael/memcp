import * as path from "path";
import { MemoryCache } from "../cache/memory-cache.js";
import { SearchIndex } from "../indexing/search-index.js";
import { ValidationResult } from "../types.js";
import { FileSystemUtils } from "../utils/file-system.js";

/**
 * Maintenance and utility operations
 */
export class MaintenanceTools {
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
   * Clean up broken links
   */
  async cleanupBrokenLinks(): Promise<{ removed: number; details: string[] }> {
    const details: string[] = [];
    let removed = 0;

    try {
      if (!this.cache.isReady()) {
        await this.cache.loadAll();
      }

      const mainMemory = this.cache.getMainMemory();

      // Check each context
      for (const contextName of Object.keys(mainMemory.contexts)) {
        const links = this.cache.getLinks(contextName);

        for (let i = links.length - 1; i >= 0; i--) {
          const link = links[i];
          const fullPath = path.join(this.memoryPath, link.caminho_memoria);

          try {
            await FileSystemUtils.getFileSize(fullPath);
          } catch (error) {
            // File doesn't exist, remove link
            await this.cache.removeLink(contextName, i);
            details.push(
              `Removed broken link: ${contextName}/${link.subcontexto} -> ${link.caminho_memoria}`
            );
            removed++;
          }
        }
      }

      // Check submemory references
      const allSubmemories = this.cache.getAllSubmemories();

      for (const [submemoryPath, submemory] of allSubmemories) {
        let hasChanges = false;

        // Check memory references
        for (let i = submemory.memories.length - 1; i >= 0; i--) {
          const memoryRef = submemory.memories[i];
          const fullPath = path.join(this.memoryPath, memoryRef.path);

          try {
            await FileSystemUtils.getFileSize(fullPath);
          } catch (error) {
            // Memory file doesn't exist, remove reference
            submemory.memories.splice(i, 1);
            details.push(
              `Removed broken memory reference: ${submemoryPath} -> ${memoryRef.path}`
            );
            removed++;
            hasChanges = true;
          }
        }

        if (hasChanges) {
          await this.cache.setSubmemory(submemoryPath, submemory);
        }
      }

      return { removed, details };
    } catch (error) {
      throw new Error(
        `Failed to cleanup broken links: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Optimize search index
   */
  async optimizeIndex(): Promise<boolean> {
    try {
      this.searchIndex.optimize();
      return true;
    } catch (error) {
      console.error("Failed to optimize index:", error);
      return false;
    }
  }

  /**
   * Compact cache (refresh all data)
   */
  async compactCache(): Promise<{ before_mb: number; after_mb: number }> {
    try {
      const beforeStats = this.cache.getStats();
      const beforeSize = beforeStats.total_size_mb;

      // Reload all cache
      await this.cache.invalidate({ type: "all" });

      const afterStats = this.cache.getStats();
      const afterSize = afterStats.total_size_mb;

      return {
        before_mb: beforeSize,
        after_mb: afterSize,
      };
    } catch (error) {
      throw new Error(
        `Failed to compact cache: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Export entire memory system to JSON
   */
  async exportToJson(exportPath: string): Promise<boolean> {
    try {
      if (!this.cache.isReady()) {
        await this.cache.loadAll();
      }

      const exportData = {
        main_memory: this.cache.getMainMemory(),
        links: {},
        submemories: {},
        memories: {},
        export_timestamp: new Date().toISOString(),
        version: "1.0.0",
      };

      // Export links
      const mainMemory = this.cache.getMainMemory();
      for (const contextName of Object.keys(mainMemory.contexts)) {
        (exportData.links as any)[contextName] =
          this.cache.getLinks(contextName);
      }

      // Export submemories
      const allSubmemories = this.cache.getAllSubmemories();
      for (const [path, submemory] of allSubmemories) {
        (exportData.submemories as any)[path] = submemory;
      }

      // Export memories
      const memoriesPath = path.join(this.memoryPath, "memories");
      const markdownFiles = await FileSystemUtils.listFilesWithExtensions(
        memoriesPath,
        [".md", ".markdown"]
      );

      for (const fullPath of markdownFiles) {
        try {
          const relativePath = path.relative(this.memoryPath, fullPath);
          const memory = await FileSystemUtils.readMarkdown(fullPath);
          (exportData.memories as any)[relativePath] = memory;
        } catch (error) {
          // Skip files that can't be read
        }
      }

      // Write export file
      const exportJson = JSON.stringify(exportData, null, 2);
      await FileSystemUtils.writeSJSON(exportPath, exportData);

      return true;
    } catch (error) {
      console.error("Failed to export to JSON:", error);
      return false;
    }
  }

  /**
   * Import memory system from JSON
   */
  async importFromJson(
    importPath: string
  ): Promise<{ imported: number; errors: string[] }> {
    const errors: string[] = [];
    let imported = 0;

    try {
      const importData = (await FileSystemUtils.readSJSON(importPath)) as any;

      if (
        !importData.main_memory ||
        !importData.links ||
        !importData.submemories ||
        !importData.memories
      ) {
        throw new Error("Invalid import file format");
      }

      // Import main memory
      await this.cache.setMainMemory(importData.main_memory);
      imported++;

      // Import links
      for (const [contextName, links] of Object.entries(importData.links)) {
        try {
          const csvPath = path.join(
            this.memoryPath,
            "links",
            `${contextName}.csv`
          );
          await FileSystemUtils.writeCSV(csvPath, links as any);
          imported++;
        } catch (error) {
          errors.push(
            `Failed to import links for context ${contextName}: ${
              error instanceof Error ? error.message : String(error)
            }`
          );
        }
      }

      // Import submemories
      for (const [submemoryPath, submemory] of Object.entries(
        importData.submemories
      )) {
        try {
          await this.cache.setSubmemory(submemoryPath, submemory as any);
          imported++;
        } catch (error) {
          errors.push(
            `Failed to import submemory ${submemoryPath}: ${
              error instanceof Error ? error.message : String(error)
            }`
          );
        }
      }

      // Import memories
      for (const [memoryPath, memory] of Object.entries(importData.memories)) {
        try {
          const fullPath = path.join(this.memoryPath, memoryPath);
          await FileSystemUtils.writeMarkdown(fullPath, memory as any);

          // Index the memory
          await this.searchIndex.indexMemory(memoryPath);
          imported++;
        } catch (error) {
          errors.push(
            `Failed to import memory ${memoryPath}: ${
              error instanceof Error ? error.message : String(error)
            }`
          );
        }
      }

      // Refresh cache
      await this.cache.invalidate({ type: "all" });

      return { imported, errors };
    } catch (error) {
      throw new Error(
        `Failed to import from JSON: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Validate entire system integrity
   */
  async validateSystem(): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      if (!this.cache.isReady()) {
        await this.cache.loadAll();
      }

      // Validate main memory
      try {
        const mainMemory = this.cache.getMainMemory();
        if (!mainMemory.project_name)
          errors.push("Main memory missing project_name");
        if (!mainMemory.version) errors.push("Main memory missing version");
        if (!mainMemory.contexts) errors.push("Main memory missing contexts");
      } catch (error) {
        errors.push(
          `Main memory validation failed: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }

      // Validate links
      const mainMemory = this.cache.getMainMemory();
      for (const contextName of Object.keys(mainMemory.contexts)) {
        try {
          const links = this.cache.getLinks(contextName);

          for (const link of links) {
            const fullPath = path.join(this.memoryPath, link.caminho_memoria);

            try {
              const size = await FileSystemUtils.getFileSize(fullPath);
              if (size === 0) {
                warnings.push(`Empty file: ${link.caminho_memoria}`);
              }
            } catch (error) {
              errors.push(`Broken link: ${link.caminho_memoria}`);
            }
          }
        } catch (error) {
          errors.push(
            `Failed to validate links for context ${contextName}: ${
              error instanceof Error ? error.message : String(error)
            }`
          );
        }
      }

      // Validate submemories
      const allSubmemories = this.cache.getAllSubmemories();

      for (const [submemoryPath, submemory] of allSubmemories) {
        try {
          // Check required fields
          if (!submemory.id)
            errors.push(`Submemory missing id: ${submemoryPath}`);
          if (!submemory.context)
            errors.push(`Submemory missing context: ${submemoryPath}`);
          if (!submemory.subcontext)
            errors.push(`Submemory missing subcontext: ${submemoryPath}`);

          // Check memory references
          for (const memoryRef of submemory.memories) {
            const fullPath = path.join(this.memoryPath, memoryRef.path);

            try {
              await FileSystemUtils.getFileSize(fullPath);
            } catch (error) {
              errors.push(
                `Submemory references missing memory: ${submemoryPath} -> ${memoryRef.path}`
              );
            }
          }
        } catch (error) {
          errors.push(
            `Failed to validate submemory ${submemoryPath}: ${
              error instanceof Error ? error.message : String(error)
            }`
          );
        }
      }

      // Validate search index
      try {
        const indexStats = this.searchIndex.getStats();
        if (!indexStats.total_memories || indexStats.total_memories === 0) {
          warnings.push("Search index appears to be empty");
        }
      } catch (error) {
        warnings.push(
          `Search index validation failed: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }

      return {
        valid: errors.length === 0,
        errors,
        warnings,
      };
    } catch (error) {
      return {
        valid: false,
        errors: [
          `System validation failed: ${
            error instanceof Error ? error.message : String(error)
          }`,
        ],
        warnings,
      };
    }
  }

  /**
   * Get detailed system health report
   */
  async getHealthReport(): Promise<{
    overall_health: "good" | "warning" | "critical";
    checks: Array<{
      name: string;
      status: "pass" | "warning" | "fail";
      message: string;
      details?: any;
    }>;
  }> {
    const checks: Array<{
      name: string;
      status: "pass" | "warning" | "fail";
      message: string;
      details?: any;
    }> = [];

    // Check cache health
    try {
      const cacheStats = this.cache.getStats();

      if (cacheStats.total_size_mb > 100) {
        checks.push({
          name: "Cache Size",
          status: "warning",
          message: `Cache size is ${cacheStats.total_size_mb.toFixed(
            2
          )}MB (consider compacting)`,
          details: cacheStats,
        });
      } else {
        checks.push({
          name: "Cache Size",
          status: "pass",
          message: `Cache size is healthy (${cacheStats.total_size_mb.toFixed(
            2
          )}MB)`,
          details: cacheStats,
        });
      }
    } catch (error) {
      checks.push({
        name: "Cache Health",
        status: "fail",
        message: `Cache check failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      });
    }

    // Check index health
    try {
      const indexStats = this.searchIndex.getStats();

      if (indexStats.total_memories === 0) {
        checks.push({
          name: "Search Index",
          status: "warning",
          message: "Search index is empty (may need reindexing)",
          details: indexStats,
        });
      } else {
        checks.push({
          name: "Search Index",
          status: "pass",
          message: `Search index healthy (${indexStats.total_memories} memories indexed)`,
          details: indexStats,
        });
      }
    } catch (error) {
      checks.push({
        name: "Search Index",
        status: "fail",
        message: `Index check failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      });
    }

    // Check broken links
    try {
      const brokenLinksResult = await this.cleanupBrokenLinks();

      if (brokenLinksResult.removed > 0) {
        checks.push({
          name: "Link Integrity",
          status: "warning",
          message: `Found and cleaned ${brokenLinksResult.removed} broken links`,
          details: brokenLinksResult.details,
        });
      } else {
        checks.push({
          name: "Link Integrity",
          status: "pass",
          message: "All links are valid",
        });
      }
    } catch (error) {
      checks.push({
        name: "Link Integrity",
        status: "fail",
        message: `Link check failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      });
    }

    // Check disk space
    try {
      const memoryDirSize = await FileSystemUtils.getDirectorySize(
        this.memoryPath
      );
      const sizeMB = memoryDirSize / (1024 * 1024);

      if (sizeMB > 500) {
        checks.push({
          name: "Disk Usage",
          status: "warning",
          message: `Memory directory is ${sizeMB.toFixed(
            2
          )}MB (consider archiving old memories)`,
          details: { size_mb: sizeMB },
        });
      } else {
        checks.push({
          name: "Disk Usage",
          status: "pass",
          message: `Disk usage is healthy (${sizeMB.toFixed(2)}MB)`,
          details: { size_mb: sizeMB },
        });
      }
    } catch (error) {
      checks.push({
        name: "Disk Usage",
        status: "fail",
        message: `Disk check failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      });
    }

    // Determine overall health
    const failedChecks = checks.filter((c) => c.status === "fail").length;
    const warningChecks = checks.filter((c) => c.status === "warning").length;

    let overallHealth: "good" | "warning" | "critical";

    if (failedChecks > 0) {
      overallHealth = "critical";
    } else if (warningChecks > 2) {
      overallHealth = "warning";
    } else if (warningChecks > 0) {
      overallHealth = "warning";
    } else {
      overallHealth = "good";
    }

    return {
      overall_health: overallHealth,
      checks,
    };
  }

  /**
   * Close connections
   */
  close(): void {
    this.searchIndex.close();
  }
}
