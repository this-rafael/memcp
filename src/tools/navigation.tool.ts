import * as fs from "fs/promises";
import * as path from "path";
import { MemoryCache } from "../cache/memory-cache.js";
import { SearchIndex } from "../indexing/search-index.js";
import {
  GraphEdge,
  GraphNode,
  MemoryGraph,
  MemoryTreeNode,
  Stats,
} from "../types.js";
import { FileSystemUtils } from "../utils/file-system.js";

/**
 * Navigation and discovery tools
 */
export class NavigationTools {
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
   * Get memory tree structure
   */
  async getMemoryTree(
    context?: string,
    depth?: number
  ): Promise<MemoryTreeNode> {
    try {
      if (!this.cache.isReady()) {
        await this.cache.loadAll();
      }

      const mainMemory = this.cache.getMainMemory();

      if (context) {
        return await this.buildContextTree(context, depth);
      }

      // Build full tree
      const rootNode: MemoryTreeNode = {
        name: "Memory System",
        type: "context",
        children: [],
        count: 0,
        last_updated: mainMemory.last_updated,
      };

      // Add each context as a child
      for (const [contextName, contextInfo] of Object.entries(
        mainMemory.contexts
      )) {
        const contextNode = await this.buildContextTree(contextName, depth);
        rootNode.children!.push(contextNode);
        rootNode.count = (rootNode.count || 0) + (contextNode.count || 0);
      }

      return rootNode;
    } catch (error) {
      throw new Error(
        `Failed to get memory tree: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Build tree for specific context
   */
  private async buildContextTree(
    contextName: string,
    depth?: number
  ): Promise<MemoryTreeNode> {
    const contextPath = path.join(this.memoryPath, "memories", contextName);

    // Get context info
    const mainMemory = this.cache.getMainMemory();
    const contextInfo = mainMemory.contexts[contextName];

    const contextNode: MemoryTreeNode = {
      name: contextName,
      type: "context",
      children: [],
      count: 0,
      last_updated: contextInfo ? mainMemory.last_updated : undefined,
    };

    try {
      // Get subcontexts (directories)
      const entries = await FileSystemUtils.listFilesWithExtensions(
        contextPath,
        []
      );
      const subdirs = new Set<string>();

      // Extract subcontexts from file paths
      const markdownFiles = await FileSystemUtils.listFilesWithExtensions(
        contextPath,
        [".md", ".markdown"]
      );

      for (const filePath of markdownFiles) {
        const relativePath = path.relative(contextPath, filePath);
        const subcontextDir = path.dirname(relativePath);

        if (subcontextDir !== "." && subcontextDir !== "") {
          subdirs.add(subcontextDir);
        }
      }

      // Build subcontext nodes
      for (const subcontextName of Array.from(subdirs).sort()) {
        if (depth === undefined || depth > 1) {
          const subcontextNode = await this.buildSubcontextTree(
            contextName,
            subcontextName,
            depth ? depth - 1 : undefined
          );
          contextNode.children!.push(subcontextNode);
          contextNode.count =
            (contextNode.count || 0) + (subcontextNode.count || 0);
        }
      }

      // Add direct memories (not in subcontexts)
      const directMemories = markdownFiles.filter((filePath) => {
        const relativePath = path.relative(contextPath, filePath);
        return path.dirname(relativePath) === ".";
      });

      for (const memoryPath of directMemories) {
        if (depth === undefined || depth > 0) {
          try {
            const memory = await FileSystemUtils.readMarkdown(memoryPath);
            const memoryNode: MemoryTreeNode = {
              name: memory.frontmatter.title,
              type: "memory",
              path: path.relative(this.memoryPath, memoryPath),
              last_updated: memory.frontmatter.updated_at,
            };
            contextNode.children!.push(memoryNode);
            contextNode.count = (contextNode.count || 0) + 1;
          } catch (error) {
            // Skip invalid memory files
          }
        }
      }
    } catch (error) {
      // Context directory doesn't exist or can't be read
    }

    return contextNode;
  }

  /**
   * Build tree for specific subcontext
   */
  private async buildSubcontextTree(
    contextName: string,
    subcontextName: string,
    depth?: number
  ): Promise<MemoryTreeNode> {
    const subcontextPath = path.join(
      this.memoryPath,
      "memories",
      contextName,
      subcontextName
    );

    const subcontextNode: MemoryTreeNode = {
      name: subcontextName,
      type: "subcontext",
      children: [],
      count: 0,
    };

    try {
      const markdownFiles = await FileSystemUtils.listFilesWithExtensions(
        subcontextPath,
        [".md", ".markdown"]
      );

      let latestUpdate: string | undefined;

      for (const memoryPath of markdownFiles) {
        if (depth === undefined || depth > 0) {
          try {
            const memory = await FileSystemUtils.readMarkdown(memoryPath);
            const memoryNode: MemoryTreeNode = {
              name: memory.frontmatter.title,
              type: "memory",
              path: path.relative(this.memoryPath, memoryPath),
              last_updated: memory.frontmatter.updated_at,
            };

            subcontextNode.children!.push(memoryNode);
            subcontextNode.count = (subcontextNode.count || 0) + 1;

            // Track latest update
            if (!latestUpdate || memory.frontmatter.updated_at > latestUpdate) {
              latestUpdate = memory.frontmatter.updated_at;
            }
          } catch (error) {
            // Skip invalid memory files
          }
        }
      }

      subcontextNode.last_updated = latestUpdate;
    } catch (error) {
      // Subcontext directory doesn't exist or can't be read
    }

    return subcontextNode;
  }

  /**
   * Get related memories
   */
  async getRelatedMemories(
    memoryPath: string,
    maxResults: number = 10
  ): Promise<string[]> {
    try {
      // Read the memory to get its metadata
      const memory = await FileSystemUtils.readMarkdown(
        path.join(this.memoryPath, memoryPath)
      );

      const related: Array<{ path: string; score: number }> = [];

      // Find similar memories using search index
      const similar = this.searchIndex.findSimilar(memoryPath, maxResults * 2);

      for (const result of similar) {
        related.push({
          path: result.path,
          score: result.score,
        });
      }

      // Find memories with shared tags
      if (memory.frontmatter.tags && memory.frontmatter.tags.length > 0) {
        const memoriesPath = path.join(this.memoryPath, "memories");
        const allFiles = await FileSystemUtils.listFilesWithExtensions(
          memoriesPath,
          [".md", ".markdown"]
        );

        for (const filePath of allFiles) {
          const relativePath = path.relative(this.memoryPath, filePath);

          if (relativePath === memoryPath) continue;

          try {
            const otherMemory = await FileSystemUtils.readMarkdown(filePath);

            if (
              otherMemory.frontmatter.tags &&
              otherMemory.frontmatter.tags.length > 0
            ) {
              // Calculate tag similarity
              const sharedTags = memory.frontmatter.tags.filter((tag) =>
                otherMemory.frontmatter.tags!.some(
                  (otherTag) => otherTag.toLowerCase() === tag.toLowerCase()
                )
              );

              if (sharedTags.length > 0) {
                const score =
                  sharedTags.length /
                  Math.max(
                    memory.frontmatter.tags.length,
                    otherMemory.frontmatter.tags.length
                  );

                related.push({
                  path: relativePath,
                  score: score * 0.5, // Weight tag similarity lower than content similarity
                });
              }
            }
          } catch (error) {
            // Skip invalid files
          }
        }
      }

      // Sort by score and remove duplicates
      const uniqueRelated = new Map<string, number>();

      for (const item of related) {
        const existingScore = uniqueRelated.get(item.path) || 0;
        uniqueRelated.set(item.path, Math.max(existingScore, item.score));
      }

      return Array.from(uniqueRelated.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, maxResults)
        .map(([path]) => path);
    } catch (error) {
      throw new Error(
        `Failed to get related memories: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Get memory graph representation
   */
  async getMemoryGraph(): Promise<MemoryGraph> {
    try {
      if (!this.cache.isReady()) {
        await this.cache.loadAll();
      }

      const nodes: GraphNode[] = [];
      const edges: GraphEdge[] = [];
      const nodeIds = new Set<string>();

      const mainMemory = this.cache.getMainMemory();

      // Add context nodes
      for (const [contextName, contextInfo] of Object.entries(
        mainMemory.contexts
      )) {
        const contextId = `context:${contextName}`;
        nodes.push({
          id: contextId,
          label: contextName,
          type: "context",
        });
        nodeIds.add(contextId);
      }

      // Add submemory nodes and their relationships
      const allSubmemories = this.cache.getAllSubmemories();

      for (const [submemoryPath, submemory] of allSubmemories) {
        const submemoryId = `submemory:${submemory.context}:${submemory.subcontext}`;

        if (!nodeIds.has(submemoryId)) {
          nodes.push({
            id: submemoryId,
            label: submemory.subcontext,
            type: "subcontext",
            tags: submemory.tags,
          });
          nodeIds.add(submemoryId);
        }

        // Add edge from context to subcontext
        const contextId = `context:${submemory.context}`;
        edges.push({
          from: contextId,
          to: submemoryId,
          type: "contains",
        });

        // Add memory nodes and relationships
        for (const memoryRef of submemory.memories) {
          const memoryId = `memory:${memoryRef.path}`;

          if (!nodeIds.has(memoryId)) {
            try {
              const memory = await FileSystemUtils.readMarkdown(
                path.join(this.memoryPath, memoryRef.path)
              );

              nodes.push({
                id: memoryId,
                label: memory.frontmatter.title,
                type: "memory",
                importance: memory.frontmatter.importance,
                tags: memory.frontmatter.tags,
              });
              nodeIds.add(memoryId);

              // Add edge from subcontext to memory
              edges.push({
                from: submemoryId,
                to: memoryId,
                type: "contains",
              });
            } catch (error) {
              // Skip memories that can't be read
            }
          }
        }
      }

      // Add relationships between memories based on shared tags
      const memoryNodes = nodes.filter((n) => n.type === "memory");

      for (let i = 0; i < memoryNodes.length; i++) {
        for (let j = i + 1; j < memoryNodes.length; j++) {
          const nodeA = memoryNodes[i];
          const nodeB = memoryNodes[j];

          if (nodeA.tags && nodeB.tags) {
            const sharedTags = nodeA.tags.filter((tag) =>
              nodeB.tags!.some(
                (otherTag) => otherTag.toLowerCase() === tag.toLowerCase()
              )
            );

            if (sharedTags.length > 0) {
              const weight =
                sharedTags.length /
                Math.max(nodeA.tags.length, nodeB.tags.length);

              edges.push({
                from: nodeA.id,
                to: nodeB.id,
                type: "related",
                weight,
              });
            }
          }
        }
      }

      return { nodes, edges };
    } catch (error) {
      throw new Error(
        `Failed to get memory graph: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Get system statistics
   */
  async getStats(): Promise<Stats> {
    try {
      if (!this.cache.isReady()) {
        await this.cache.loadAll();
      }

      const mainMemory = this.cache.getMainMemory();
      const cacheStats = this.cache.getStats();
      const indexStats = this.searchIndex.getStats();

      // Calculate directory sizes
      const indexSizeBytes = await FileSystemUtils.getFileSize(
        path.join(this.memoryPath, "index.db")
      );

      // Count memories and submemories by context
      const contextsBreakdown: { [key: string]: any } = {};

      for (const [contextName] of Object.entries(mainMemory.contexts)) {
        const contextPath = path.join(this.memoryPath, "memories", contextName);
        const markdownFiles = await FileSystemUtils.listFilesWithExtensions(
          contextPath,
          [".md", ".markdown"]
        );

        const submemoryFiles = await FileSystemUtils.listFilesWithExtensions(
          path.join(this.memoryPath, "submemories", contextName),
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
        `Failed to get stats: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Get file system tree structure with file types
   */
  async getFileSystemTree(): Promise<{
    name: string;
    type: string;
    path: string;
    size?: number;
    children?: any[];
    file_count?: number;
    total_size?: number;
  }> {
    try {
      const rootPath = this.memoryPath;
      const tree = await this.buildFileSystemNode(rootPath, rootPath);

      return {
        ...tree,
        name: "ia-memory",
        type: "directory",
        path: "/",
      };
    } catch (error) {
      throw new Error(
        `Failed to get file system tree: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Build file system node recursively
   */
  private async buildFileSystemNode(
    fullPath: string,
    rootPath: string,
    maxDepth: number = 10,
    currentDepth: number = 0
  ): Promise<any> {
    const relativePath = path.relative(rootPath, fullPath);
    const name = path.basename(fullPath);

    try {
      const stats = await fs.stat(fullPath);

      if (stats.isDirectory()) {
        const children: any[] = [];
        let totalFiles = 0;
        let totalSize = 0;

        if (currentDepth < maxDepth) {
          try {
            const entries = await fs.readdir(fullPath);

            for (const entry of entries) {
              const entryPath = path.join(fullPath, entry);
              const childNode = await this.buildFileSystemNode(
                entryPath,
                rootPath,
                maxDepth,
                currentDepth + 1
              );

              children.push(childNode);

              if (childNode.type === "file") {
                totalFiles += 1;
                totalSize += childNode.size || 0;
              } else if (childNode.type === "directory") {
                totalFiles += childNode.file_count || 0;
                totalSize += childNode.total_size || 0;
              }
            }
          } catch (readError) {
            // Directory might be empty or inaccessible
          }
        }

        return {
          name,
          type: "directory",
          path: relativePath || "/",
          children: children.length > 0 ? children : undefined,
          file_count: totalFiles,
          total_size: totalSize,
          last_modified: stats.mtime.toISOString(),
        };
      } else {
        const extension = path.extname(fullPath).toLowerCase();
        const fileType = this.getFileType(extension);

        return {
          name,
          type: "file",
          path: relativePath,
          size: stats.size,
          extension: extension || undefined,
          file_type: fileType,
          last_modified: stats.mtime.toISOString(),
        };
      }
    } catch (error) {
      return {
        name,
        type: "error",
        path: relativePath,
        error_message: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Determine file type based on extension
   */
  private getFileType(extension: string): string {
    const typeMap: { [key: string]: string } = {
      ".md": "markdown",
      ".markdown": "markdown",
      ".json": "json",
      ".sjson": "sjson",
      ".txt": "text",
      ".db": "database",
      ".sqlite": "database",
      ".sqlite3": "database",
      ".log": "log",
      ".tmp": "temporary",
      ".cache": "cache",
      ".bak": "backup",
      ".yml": "yaml",
      ".yaml": "yaml",
      ".toml": "config",
      ".ini": "config",
      ".cfg": "config",
      ".conf": "config",
    };

    return typeMap[extension] || "unknown";
  }

  /**
   * Close connections
   */
  close(): void {
    this.searchIndex.close();
  }
}
