import * as fs from "fs/promises";
import matter from "gray-matter";
import JSON5 from "json5";
import * as path from "path";
import {
  FileSystemError,
  Link,
  MainMemory,
  Memory,
  MemoryFrontmatter,
  Submemory,
} from "../types.js";

/**
 * File system utilities for different memory file formats
 */
export class FileSystemUtils {
  // ====== DIRECTORY OPERATIONS ======

  /**
   * Create memory directory structure
   */
  static async createMemoryStructure(projectPath: string): Promise<void> {
    const memoryPath = path.join(projectPath, "ia-memory");

    const directories = [
      memoryPath,
      path.join(memoryPath, "links"),
      path.join(memoryPath, "submemories"),
      path.join(memoryPath, "memories"),
    ];

    for (const dir of directories) {
      await fs.mkdir(dir, { recursive: true });
    }
  }

  /**
   * Check if memory system exists
   */
  static async memorySystemExists(projectPath: string): Promise<boolean> {
    const memoryPath = path.join(projectPath, "ia-memory");
    const mainPath = path.join(memoryPath, "main.sjson");

    try {
      await fs.access(mainPath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get memory path for project
   */
  static getMemoryPath(projectPath: string): string {
    return path.join(projectPath, "ia-memory");
  }

  // ====== SJSON OPERATIONS ======

  /**
   * Read SJSON file (simplified JSON)
   */
  static async readSJSON<T>(filePath: string): Promise<T> {
    try {
      const data = await fs.readFile(filePath, "utf-8");
      return JSON.parse(data);
    } catch (error) {
      throw new FileSystemError(`Failed to read SJSON file ${filePath}`, {
        originalError: error,
      });
    }
  }

  /**
   * Write SJSON file (simplified JSON with formatting)
   */
  static async writeSJSON<T>(filePath: string, data: T): Promise<void> {
    try {
      const jsonString = JSON.stringify(data, null, 2);
      await fs.writeFile(filePath, jsonString, "utf-8");
    } catch (error) {
      throw new FileSystemError(`Failed to write SJSON file ${filePath}`, {
        originalError: error,
      });
    }
  }

  /**
   * Read main memory from SJSON
   */
  static async readMainMemory(memoryPath: string): Promise<MainMemory | null> {
    const mainPath = path.join(memoryPath, "main.sjson");

    try {
      return await this.readSJSON<MainMemory>(mainPath);
    } catch (error) {
      if ((error as any).originalError?.code === "ENOENT") {
        return null;
      }
      throw error;
    }
  }

  /**
   * Write main memory to SJSON
   */
  static async writeMainMemory(
    memoryPath: string,
    memory: MainMemory
  ): Promise<void> {
    const mainPath = path.join(memoryPath, "main.sjson");
    await this.writeSJSON(mainPath, memory);
  }

  // ====== JSON5 OPERATIONS ======

  /**
   * Read JSON5 file
   */
  static async readJSON5<T>(filePath: string): Promise<T> {
    try {
      const data = await fs.readFile(filePath, "utf-8");
      return JSON5.parse(data);
    } catch (error) {
      throw new FileSystemError(`Failed to read JSON5 file ${filePath}`, {
        originalError: error,
      });
    }
  }

  /**
   * Write JSON5 file
   */
  static async writeJSON5<T>(filePath: string, data: T): Promise<void> {
    try {
      const json5String = JSON5.stringify(data, null, 2);
      await fs.writeFile(filePath, json5String, "utf-8");
    } catch (error) {
      throw new FileSystemError(`Failed to write JSON5 file ${filePath}`, {
        originalError: error,
      });
    }
  }

  /**
   * Read submemory from JSON5 file
   */
  static async readSubmemory(filePath: string): Promise<Submemory> {
    return await this.readJSON5<Submemory>(filePath);
  }

  /**
   * Write submemory to JSON5 file
   */
  static async writeSubmemory(
    filePath: string,
    submemory: Submemory
  ): Promise<void> {
    await this.writeJSON5(filePath, submemory);
  }

  // ====== CSV OPERATIONS ======

  /**
   * Read CSV file and parse into links
   */
  static async readCSV(filePath: string): Promise<Link[]> {
    try {
      const data = await fs.readFile(filePath, "utf-8");
      return this.parseCSV(data);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return [];
      }
      throw new FileSystemError(`Failed to read CSV file ${filePath}`, {
        originalError: error,
      });
    }
  }

  /**
   * Write links to CSV file
   */
  static async writeCSV(filePath: string, links: Link[]): Promise<void> {
    try {
      const csvData = this.generateCSV(links);
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, csvData, "utf-8");
    } catch (error) {
      throw new FileSystemError(`Failed to write CSV file ${filePath}`, {
        originalError: error,
      });
    }
  }

  /**
   * Parse CSV data into links array
   */
  private static parseCSV(data: string): Link[] {
    const lines = data.trim().split("\n");
    if (lines.length <= 1) return [];

    const links: Link[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const values = this.parseCSVLine(line);
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
   * Parse a single CSV line handling quotes and commas
   */
  private static parseCSVLine(line: string): string[] {
    const values: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++; // Skip next quote
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === "," && !inQuotes) {
        values.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }

    values.push(current.trim());
    return values;
  }

  /**
   * Generate CSV data from links
   */
  private static generateCSV(links: Link[]): string {
    const headers = [
      "contexto",
      "subcontexto",
      "descricao_curta",
      "caminho_memoria",
    ];
    const rows = [headers.join(",")];

    for (const link of links) {
      const row = [
        this.escapeCSVValue(link.contexto),
        this.escapeCSVValue(link.subcontexto),
        this.escapeCSVValue(link.descricao_curta),
        this.escapeCSVValue(link.caminho_memoria),
      ].join(",");
      rows.push(row);
    }

    return rows.join("\n");
  }

  /**
   * Escape CSV value if needed
   */
  private static escapeCSVValue(value: string): string {
    if (value.includes(",") || value.includes('"') || value.includes("\n")) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }

  // ====== MARKDOWN OPERATIONS ======

  /**
   * Read markdown memory file with frontmatter
   */
  static async readMarkdown(filePath: string): Promise<Memory> {
    try {
      const data = await fs.readFile(filePath, "utf-8");
      const parsed = matter(data);

      return {
        frontmatter: parsed.data as MemoryFrontmatter,
        content: parsed.content,
      };
    } catch (error) {
      throw new FileSystemError(`Failed to read markdown file ${filePath}`, {
        originalError: error,
      });
    }
  }

  /**
   * Write markdown memory file with frontmatter
   */
  static async writeMarkdown(filePath: string, memory: Memory): Promise<void> {
    try {
      const fileContent = matter.stringify(memory.content, memory.frontmatter);
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, fileContent, "utf-8");
    } catch (error) {
      throw new FileSystemError(`Failed to write markdown file ${filePath}`, {
        originalError: error,
      });
    }
  }

  /**
   * Create new markdown memory with proper frontmatter
   */
  static async createMarkdownMemory(
    memoryPath: string,
    context: string,
    subcontext: string,
    title: string,
    content: string,
    frontmatter: Partial<MemoryFrontmatter>
  ): Promise<string> {
    const fileName = this.generateMemoryFileName(title);
    const filePath = path.join(
      memoryPath,
      "memories",
      context,
      subcontext,
      fileName
    );

    const fullFrontmatter: MemoryFrontmatter = {
      id: frontmatter.id || this.generateUUID(),
      title,
      context,
      subcontext,
      created_at: frontmatter.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
      tags: frontmatter.tags || [],
      importance: frontmatter.importance || "medium",
    };

    const memory: Memory = {
      frontmatter: fullFrontmatter,
      content,
    };

    await this.writeMarkdown(filePath, memory);
    return path.relative(memoryPath, filePath);
  }

  // ====== GIT OPERATIONS ======

  /**
   * Check if directory is a git repository
   */
  static async isGitRepository(projectPath: string): Promise<boolean> {
    const gitPath = path.join(projectPath, ".git");

    try {
      const stat = await fs.stat(gitPath);
      return stat.isDirectory();
    } catch {
      return false;
    }
  }

  /**
   * Update .git/info/exclude to ignore memory directory
   */
  static async updateGitExclude(
    projectPath: string,
    memoryDirName: string = "ia-memory"
  ): Promise<void> {
    const excludePath = path.join(projectPath, ".git", "info", "exclude");
    const excludePatterns = [
      `./${memoryDirName}/**`,
      `./${memoryDirName}`,
      `./${memoryDirName}/*`,
      memoryDirName,
      `${memoryDirName}/**`,
      `${memoryDirName}/*`,
    ];

    try {
      // Read existing exclude file
      let content = "";
      try {
        content = await fs.readFile(excludePath, "utf-8");
      } catch (error) {
        // File doesn't exist, start with empty content
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
          throw error;
        }
      }

      // Check which patterns need to be added
      const patternsToAdd = excludePatterns.filter(
        (pattern) => !content.includes(pattern)
      );

      if (patternsToAdd.length > 0) {
        // Add patterns with newlines
        if (content && !content.endsWith("\n")) {
          content += "\n";
        }
        content += patternsToAdd.join("\n") + "\n";

        // Ensure directory exists
        await fs.mkdir(path.dirname(excludePath), { recursive: true });
        await fs.writeFile(excludePath, content, "utf-8");
      }
    } catch (error) {
      throw new FileSystemError(`Failed to update git exclude file`, {
        originalError: error,
      });
    }
  }

  // ====== UTILITY METHODS ======

  /**
   * Generate UUID v4
   */
  static generateUUID(): string {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(
      /[xy]/g,
      function (c) {
        const r = (Math.random() * 16) | 0;
        const v = c == "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      }
    );
  }

  /**
   * Generate memory file name from title
   */
  static generateMemoryFileName(title: string): string {
    const normalized = title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "") // Remove special chars
      .replace(/\s+/g, "-") // Replace spaces with hyphens
      .replace(/-+/g, "-") // Collapse multiple hyphens
      .replace(/^-|-$/g, ""); // Remove leading/trailing hyphens

    const timestamp = new Date()
      .toISOString()
      .replace(/[:.-]/g, "")
      .substring(0, 15);
    return `${timestamp}-${normalized}.md`;
  }

  /**
   * Safely delete file or directory
   */
  static async safeDelete(filePath: string): Promise<void> {
    try {
      const stat = await fs.stat(filePath);
      if (stat.isDirectory()) {
        await fs.rmdir(filePath, { recursive: true });
      } else {
        await fs.unlink(filePath);
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        throw new FileSystemError(`Failed to delete ${filePath}`, {
          originalError: error,
        });
      }
    }
  }

  /**
   * Get file size in bytes
   */
  static async getFileSize(filePath: string): Promise<number> {
    try {
      const stat = await fs.stat(filePath);
      return stat.size;
    } catch {
      return 0;
    }
  }

  /**
   * Get directory size recursively
   */
  static async getDirectorySize(dirPath: string): Promise<number> {
    let totalSize = 0;

    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);

        if (entry.isDirectory()) {
          totalSize += await this.getDirectorySize(fullPath);
        } else {
          totalSize += await this.getFileSize(fullPath);
        }
      }
    } catch {
      // Ignore errors for individual files/directories
    }

    return totalSize;
  }

  /**
   * List all files with specific extensions recursively
   */
  static async listFilesWithExtensions(
    dirPath: string,
    extensions: string[]
  ): Promise<string[]> {
    const files: string[] = [];

    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);

        if (entry.isDirectory()) {
          const subFiles = await this.listFilesWithExtensions(
            fullPath,
            extensions
          );
          files.push(...subFiles);
        } else {
          const ext = path.extname(entry.name).toLowerCase();
          if (extensions.includes(ext)) {
            files.push(fullPath);
          }
        }
      }
    } catch {
      // Ignore errors for directories that don't exist
    }

    return files;
  }

  // ====== NAME NORMALIZATION ======

  /**
   * Normalize context/subcontext names to be valid identifiers
   * Converts to lowercase, replaces spaces with hyphens, removes invalid characters
   */
  static normalizeContextName(name: string): string {
    return name
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "-") // Replace spaces with hyphens
      .replace(/[^a-z0-9_-]/g, "") // Remove invalid characters
      .replace(/^-+|-+$/g, "") // Remove leading/trailing hyphens
      .replace(/-+/g, "-"); // Collapse multiple hyphens
  }

  /**
   * Validate if a normalized name matches the expected pattern
   */
  static isValidContextName(name: string): boolean {
    return /^[a-z0-9_-]+$/.test(name) && name.length > 0;
  }

  /**
   * Normalize and validate context name, throwing descriptive error if invalid
   */
  static normalizeAndValidateContext(
    name: string,
    type: "context" | "subcontext" = "context"
  ): string {
    const original = name;
    const normalized = this.normalizeContextName(name);

    if (!this.isValidContextName(normalized)) {
      throw new Error(
        `Invalid ${type} name: "${original}". ` +
          `After normalization ("${normalized}"), it must contain only lowercase letters, numbers, underscores, and hyphens.`
      );
    }

    return normalized;
  }
}
