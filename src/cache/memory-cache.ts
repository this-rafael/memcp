import * as fs from "fs/promises";
import * as path from "path";
import {
  CacheError,
  CacheInvalidation,
  CacheStats,
  Link,
  MainMemory,
  Submemory,
} from "../types.js";

/**
 * Cache-first memory system with write-through strategy
 * All data is loaded into RAM at startup for fast access
 */
export class MemoryCache {
  private mainMemory: MainMemory | null = null;
  private links: Map<string, Link[]> = new Map(); // context -> links[]
  private submemories: Map<string, Submemory> = new Map(); // path -> submemory
  private indexCache: Map<string, any[]> = new Map(); // query -> results cache
  private memoryPath: string;
  private isLoaded: boolean = false;

  constructor(memoryPath: string) {
    this.memoryPath = memoryPath;
  }

  // ====== INITIALIZATION ======

  /**
   * Load all memory data into cache
   */
  async loadAll(): Promise<void> {
    try {
      await this.loadMainMemory();
      await this.loadAllLinks();
      await this.loadAllSubmemories();
      this.isLoaded = true;
    } catch (error) {
      throw new CacheError(
        `Failed to load cache: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Check if cache is loaded and ready
   */
  isReady(): boolean {
    return this.isLoaded && this.mainMemory !== null;
  }

  // ====== MAIN MEMORY OPERATIONS ======

  /**
   * Load main memory from SJSON file
   */
  private async loadMainMemory(): Promise<void> {
    const mainPath = path.join(this.memoryPath, "main.sjson");

    try {
      const data = await fs.readFile(mainPath, "utf-8");
      // Parse SJSON (simplified JSON for this implementation)
      this.mainMemory = JSON.parse(data);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        this.mainMemory = null;
      } else {
        throw new CacheError(
          `Failed to load main memory: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }
    }
  }

  /**
   * Get main memory (or section of it)
   */
  getMainMemory(section?: string): MainMemory | any {
    if (!this.mainMemory) {
      throw new CacheError("Main memory not loaded");
    }

    if (section) {
      return (this.mainMemory as any)[section];
    }

    return this.mainMemory;
  }

  /**
   * Update main memory with write-through
   */
  async updateMainMemory(section: string, data: any): Promise<void> {
    if (!this.mainMemory) {
      throw new CacheError("Main memory not loaded");
    }

    // Update cache
    (this.mainMemory as any)[section] = data;
    this.mainMemory.last_updated = new Date().toISOString();

    // Write-through to disk
    await this.persistMainMemory();
  }

  /**
   * Set entire main memory
   */
  async setMainMemory(memory: MainMemory): Promise<void> {
    this.mainMemory = memory;
    await this.persistMainMemory();
  }

  /**
   * Persist main memory to disk
   */
  private async persistMainMemory(): Promise<void> {
    if (!this.mainMemory) return;

    const mainPath = path.join(this.memoryPath, "main.sjson");
    const data = JSON.stringify(this.mainMemory, null, 2);

    await fs.writeFile(mainPath, data, "utf-8");
  }

  // ====== LINKS OPERATIONS ======

  /**
   * Load all link files into cache
   */
  private async loadAllLinks(): Promise<void> {
    const linksPath = path.join(this.memoryPath, "links");

    try {
      const files = await fs.readdir(linksPath);
      const csvFiles = files.filter((f) => f.endsWith(".csv"));

      for (const file of csvFiles) {
        const context = path.basename(file, ".csv");
        await this.loadLinksForContext(context);
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        throw new CacheError(
          `Failed to load links: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }
    }
  }

  /**
   * Load links for specific context
   */
  private async loadLinksForContext(context: string): Promise<void> {
    const filePath = path.join(this.memoryPath, "links", `${context}.csv`);

    try {
      const data = await fs.readFile(filePath, "utf-8");
      const links = this.parseCSV(data);
      this.links.set(context, links);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        throw new CacheError(
          `Failed to load links for context ${context}: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }
    }
  }

  /**
   * Get links for context(s)
   */
  getLinks(context?: string): Link[] {
    if (context) {
      return this.links.get(context) || [];
    }

    // Return all links
    const allLinks: Link[] = [];
    for (const contextLinks of this.links.values()) {
      allLinks.push(...contextLinks);
    }
    return allLinks;
  }

  /**
   * Add link with write-through
   */
  async addLink(context: string, link: Link): Promise<void> {
    // Update cache
    const existing = this.links.get(context) || [];
    existing.push(link);
    this.links.set(context, existing);

    // Write-through to disk
    await this.persistLinksForContext(context);
  }

  /**
   * Update link with write-through
   */
  async updateLink(
    context: string,
    linkIndex: number,
    updatedLink: Link
  ): Promise<void> {
    const existing = this.links.get(context) || [];
    if (linkIndex >= 0 && linkIndex < existing.length) {
      existing[linkIndex] = updatedLink;
      this.links.set(context, existing);
      await this.persistLinksForContext(context);
    } else {
      throw new CacheError(
        `Link index ${linkIndex} not found in context ${context}`
      );
    }
  }

  /**
   * Remove link with write-through
   */
  async removeLink(context: string, linkIndex: number): Promise<void> {
    const existing = this.links.get(context) || [];
    if (linkIndex >= 0 && linkIndex < existing.length) {
      existing.splice(linkIndex, 1);
      this.links.set(context, existing);
      await this.persistLinksForContext(context);
    } else {
      throw new CacheError(
        `Link index ${linkIndex} not found in context ${context}`
      );
    }
  }

  /**
   * Persist links for context to disk
   */
  private async persistLinksForContext(context: string): Promise<void> {
    const links = this.links.get(context) || [];
    const filePath = path.join(this.memoryPath, "links", `${context}.csv`);

    const csvData = this.generateCSV(links);

    // Ensure directory exists
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, csvData, "utf-8");
  }

  // ====== SUBMEMORIES OPERATIONS ======

  /**
   * Load all submemories into cache
   */
  private async loadAllSubmemories(): Promise<void> {
    const submemoriesPath = path.join(this.memoryPath, "submemories");

    try {
      await this.loadSubmemoriesRecursively(submemoriesPath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        throw new CacheError(
          `Failed to load submemories: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }
    }
  }

  /**
   * Recursively load submemories from directory
   */
  private async loadSubmemoriesRecursively(dirPath: string): Promise<void> {
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);

        if (entry.isDirectory()) {
          await this.loadSubmemoriesRecursively(fullPath);
        } else if (
          entry.name.endsWith(".json5") ||
          entry.name.endsWith(".json")
        ) {
          await this.loadSubmemory(fullPath);
        }
      }
    } catch (error) {
      // Ignore ENOENT errors for individual files/directories
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        throw error;
      }
    }
  }

  /**
   * Load individual submemory file
   */
  private async loadSubmemory(filePath: string): Promise<void> {
    try {
      const data = await fs.readFile(filePath, "utf-8");
      const submemory = JSON.parse(data) as Submemory;

      // Store relative path as key
      const relativePath = path.relative(this.memoryPath, filePath);
      this.submemories.set(relativePath, submemory);
    } catch (error) {
      throw new CacheError(
        `Failed to load submemory ${filePath}: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Get submemory by path
   */
  getSubmemory(relativePath: string): Submemory | null {
    return this.submemories.get(relativePath) || null;
  }

  /**
   * Get all submemories
   */
  getAllSubmemories(): Map<string, Submemory> {
    return new Map(this.submemories);
  }

  /**
   * Set submemory with write-through
   */
  async setSubmemory(
    relativePath: string,
    submemory: Submemory
  ): Promise<void> {
    // Update cache
    this.submemories.set(relativePath, submemory);

    // Write-through to disk
    await this.persistSubmemory(relativePath, submemory);
  }

  /**
   * Remove submemory with write-through
   */
  async removeSubmemory(relativePath: string): Promise<void> {
    // Remove from cache
    this.submemories.delete(relativePath);

    // Remove from disk
    const fullPath = path.join(this.memoryPath, relativePath);
    await fs.unlink(fullPath);
  }

  /**
   * Persist submemory to disk
   */
  private async persistSubmemory(
    relativePath: string,
    submemory: Submemory
  ): Promise<void> {
    const fullPath = path.join(this.memoryPath, relativePath);
    const data = JSON.stringify(submemory, null, 2);

    // Ensure directory exists
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, data, "utf-8");
  }

  // ====== INDEX CACHE OPERATIONS ======

  /**
   * Get cached search results
   */
  getCachedSearch(query: string): any[] | null {
    return this.indexCache.get(query) || null;
  }

  /**
   * Cache search results
   */
  setCachedSearch(query: string, results: any[]): void {
    this.indexCache.set(query, results);
  }

  /**
   * Clear search cache
   */
  clearSearchCache(): void {
    this.indexCache.clear();
  }

  // ====== CACHE INVALIDATION ======

  /**
   * Invalidate and reload specific cache sections
   */
  async invalidate(invalidation: CacheInvalidation): Promise<void> {
    switch (invalidation.type) {
      case "main":
        await this.loadMainMemory();
        break;

      case "links":
        if (invalidation.context) {
          await this.loadLinksForContext(invalidation.context);
        } else {
          this.links.clear();
          await this.loadAllLinks();
        }
        break;

      case "submemories":
        if (invalidation.path) {
          await this.loadSubmemory(
            path.join(this.memoryPath, invalidation.path)
          );
        } else {
          this.submemories.clear();
          await this.loadAllSubmemories();
        }
        break;

      case "index":
        this.clearSearchCache();
        break;

      case "all":
        await this.loadAll();
        break;
    }
  }

  // ====== STATISTICS ======

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const mainMemorySize = this.mainMemory
      ? Buffer.byteLength(JSON.stringify(this.mainMemory), "utf8")
      : 0;

    const linksCount = Array.from(this.links.values()).reduce(
      (sum, links) => sum + links.length,
      0
    );

    const indexCacheSize = Array.from(this.indexCache.values()).reduce(
      (sum, results) =>
        sum + Buffer.byteLength(JSON.stringify(results), "utf8"),
      0
    );

    return {
      total_size_mb: (mainMemorySize + indexCacheSize) / (1024 * 1024),
      main_memory_size_kb: mainMemorySize / 1024,
      links_count: linksCount,
      submemories_count: this.submemories.size,
      index_cache_size_kb: indexCacheSize / 1024,
      last_refresh: new Date().toISOString(),
    };
  }

  // ====== UTILITY METHODS ======

  /**
   * Simple CSV parser for links
   */
  private parseCSV(data: string): Link[] {
    const lines = data.trim().split("\n");
    if (lines.length <= 1) return [];

    const headers = lines[0].split(",").map((h) => h.trim());
    const links: Link[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(",").map((v) => v.trim());
      if (values.length >= 4) {
        links.push({
          contexto: values[0],
          subcontexto: values[1],
          descricao_curta: values[2],
          caminho_memoria: values[3],
        });
      }
    }

    return links;
  }

  /**
   * Generate CSV data from links
   */
  private generateCSV(links: Link[]): string {
    const headers = [
      "contexto",
      "subcontexto",
      "descricao_curta",
      "caminho_memoria",
    ];
    const rows = [headers.join(",")];

    for (const link of links) {
      const row = [
        link.contexto,
        link.subcontexto,
        link.descricao_curta,
        link.caminho_memoria,
      ].join(",");
      rows.push(row);
    }

    return rows.join("\n");
  }
}
