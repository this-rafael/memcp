import * as path from "path";
import { MemoryCache } from "../cache/memory-cache.js";
import { Link, ValidationResult } from "../types.js";
import { FileSystemUtils } from "../utils/file-system.js";

/**
 * Links/Index CRUD operations
 */
export class LinksTools {
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
   * Create new link
   */
  async linksCreate(
    context: string,
    subcontext: string,
    description: string,
    memoryPath: string
  ): Promise<string> {
    try {
      if (!this.cache.isReady()) {
        await this.cache.loadAll();
      }

      // Normalize and validate inputs
      const normalizedContext = FileSystemUtils.normalizeAndValidateContext(
        context,
        "context"
      );
      const normalizedSubcontext = FileSystemUtils.normalizeAndValidateContext(
        subcontext,
        "subcontext"
      );
      if (description.length > 200) {
        throw new Error("Description must be 200 characters or less");
      }

      const newLink: Link = {
        contexto: normalizedContext,
        subcontexto: normalizedSubcontext,
        descricao_curta: description,
        caminho_memoria: memoryPath,
      };

      // Add to cache
      await this.cache.addLink(normalizedContext, newLink);

      // Return identifier
      return `${normalizedContext}/${normalizedSubcontext}`;
    } catch (error) {
      throw new Error(
        `Failed to create link: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Read links for context/subcontext
   */
  async linksRead(context: string, subcontext?: string): Promise<Link[]> {
    try {
      if (!this.cache.isReady()) {
        await this.cache.loadAll();
      }

      // Normalize context for consistent lookup
      const normalizedContext = FileSystemUtils.normalizeContextName(context);
      const links = this.cache.getLinks(normalizedContext);

      if (subcontext) {
        const normalizedSubcontext =
          FileSystemUtils.normalizeContextName(subcontext);
        return links.filter(
          (link) => link.subcontexto === normalizedSubcontext
        );
      }

      return links;
    } catch (error) {
      throw new Error(
        `Failed to read links: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Update existing link
   */
  async linksUpdate(
    context: string,
    subcontext: string,
    data: Partial<Link>
  ): Promise<boolean> {
    try {
      if (!this.cache.isReady()) {
        await this.cache.loadAll();
      }

      const links = this.cache.getLinks(context);
      const linkIndex = links.findIndex(
        (link) => link.contexto === context && link.subcontexto === subcontext
      );

      if (linkIndex === -1) {
        throw new Error(`Link not found: ${context}/${subcontext}`);
      }

      // Update link
      const updatedLink: Link = {
        ...links[linkIndex],
        ...data,
        contexto: context, // Ensure context doesn't change
        subcontexto: subcontext, // Ensure subcontext doesn't change
      };

      await this.cache.updateLink(context, linkIndex, updatedLink);
      return true;
    } catch (error) {
      console.error(`Failed to update link ${context}/${subcontext}:`, error);
      return false;
    }
  }

  /**
   * Delete link
   */
  async linksDelete(context: string, subcontext: string): Promise<boolean> {
    try {
      if (!this.cache.isReady()) {
        await this.cache.loadAll();
      }

      const links = this.cache.getLinks(context);
      const linkIndex = links.findIndex(
        (link) => link.contexto === context && link.subcontexto === subcontext
      );

      if (linkIndex === -1) {
        throw new Error(`Link not found: ${context}/${subcontext}`);
      }

      await this.cache.removeLink(context, linkIndex);
      return true;
    } catch (error) {
      console.error(`Failed to delete link ${context}/${subcontext}:`, error);
      return false;
    }
  }

  /**
   * Search links with fuzzy matching
   */
  async linksSearch(query: string, fuzzy: boolean = true): Promise<Link[]> {
    try {
      if (!this.cache.isReady()) {
        await this.cache.loadAll();
      }

      const allLinks = this.cache.getLinks();
      const normalizedQuery = query.toLowerCase();

      if (!fuzzy) {
        // Exact matching
        return allLinks.filter(
          (link) =>
            link.contexto.toLowerCase().includes(normalizedQuery) ||
            link.subcontexto.toLowerCase().includes(normalizedQuery) ||
            link.descricao_curta.toLowerCase().includes(normalizedQuery) ||
            link.caminho_memoria.toLowerCase().includes(normalizedQuery)
        );
      }

      // Fuzzy matching with scoring
      const scored = allLinks.map((link) => {
        let score = 0;

        // Exact matches get higher scores
        if (link.contexto.toLowerCase() === normalizedQuery) score += 100;
        if (link.subcontexto.toLowerCase() === normalizedQuery) score += 100;
        if (link.descricao_curta.toLowerCase().includes(normalizedQuery))
          score += 50;

        // Partial matches
        if (link.contexto.toLowerCase().includes(normalizedQuery)) score += 25;
        if (link.subcontexto.toLowerCase().includes(normalizedQuery))
          score += 25;
        if (link.caminho_memoria.toLowerCase().includes(normalizedQuery))
          score += 10;

        // Fuzzy matching for description (simple word matching)
        const queryWords = normalizedQuery.split(/\s+/);
        const descWords = link.descricao_curta.toLowerCase().split(/\s+/);
        const commonWords = queryWords.filter((word) =>
          descWords.some((descWord) => descWord.includes(word))
        );
        score += commonWords.length * 5;

        return { link, score };
      });

      // Filter and sort by score
      return scored
        .filter((item) => item.score > 0)
        .sort((a, b) => b.score - a.score)
        .map((item) => item.link);
    } catch (error) {
      throw new Error(
        `Failed to search links: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Validate links in context (check if referenced files exist)
   */
  async linksValidate(context: string): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      if (!this.cache.isReady()) {
        await this.cache.loadAll();
      }

      const links = this.cache.getLinks(context);
      const broken: string[] = [];

      for (const link of links) {
        const fullPath = path.join(this.memoryPath, link.caminho_memoria);

        try {
          const size = await FileSystemUtils.getFileSize(fullPath);
          if (size === 0) {
            broken.push(link.caminho_memoria);
            warnings.push(`File exists but is empty: ${link.caminho_memoria}`);
          }
        } catch (error) {
          broken.push(link.caminho_memoria);
          errors.push(`File not found: ${link.caminho_memoria}`);
        }
      }

      return {
        valid: errors.length === 0,
        errors,
        warnings: warnings.concat(
          broken.length > 0 ? [`Found ${broken.length} broken links`] : []
        ),
      };
    } catch (error) {
      return {
        valid: false,
        errors: [
          `Validation failed: ${
            error instanceof Error ? error.message : String(error)
          }`,
        ],
        warnings,
      };
    }
  }

  /**
   * Get all links across all contexts
   */
  async linksGetAll(): Promise<Link[]> {
    try {
      if (!this.cache.isReady()) {
        await this.cache.loadAll();
      }

      return this.cache.getLinks();
    } catch (error) {
      throw new Error(
        `Failed to get all links: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Get links grouped by context
   */
  async linksGetByContext(): Promise<{ [context: string]: Link[] }> {
    try {
      if (!this.cache.isReady()) {
        await this.cache.loadAll();
      }

      const result: { [context: string]: Link[] } = {};
      const allLinks = this.cache.getLinks();

      for (const link of allLinks) {
        if (!result[link.contexto]) {
          result[link.contexto] = [];
        }
        result[link.contexto].push(link);
      }

      return result;
    } catch (error) {
      throw new Error(
        `Failed to get links by context: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Clean up broken links
   */
  async linksCleanupBroken(): Promise<{ removed: number; details: string[] }> {
    const details: string[] = [];
    let removed = 0;

    try {
      if (!this.cache.isReady()) {
        await this.cache.loadAll();
      }

      const allContexts = this.cache.getAllSubmemories();

      for (const [contextName] of allContexts) {
        const validation = await this.linksValidate(contextName.split("/")[0]);

        if (!validation.valid) {
          // Remove broken links
          const links = this.cache.getLinks(contextName.split("/")[0]);

          for (let i = links.length - 1; i >= 0; i--) {
            const link = links[i];
            const fullPath = path.join(this.memoryPath, link.caminho_memoria);

            try {
              await FileSystemUtils.getFileSize(fullPath);
            } catch (error) {
              // File doesn't exist, remove link
              await this.cache.removeLink(link.contexto, i);
              details.push(
                `Removed broken link: ${link.contexto}/${link.subcontexto} -> ${link.caminho_memoria}`
              );
              removed++;
            }
          }
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
}
