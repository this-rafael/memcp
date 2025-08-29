// Core types for the Memory MCP System
import { z } from "zod";

// ====== MAIN MEMORY TYPES ======

export const CoreInfoSchema = z.object({
  architecture: z.string().optional(),
  objective: z.string().optional(),
  tech_stack: z.array(z.string()).optional(),
});

export const ContextSchema = z.object({
  description: z.string(),
  link_file: z.string(),
  priority: z.number().min(1).max(10),
});

export const MetadataSchema = z.object({
  total_memories: z.number(),
  total_submemories: z.number(),
  index_version: z.string(),
});

export const MainMemorySchema = z.object({
  project_name: z.string(),
  version: z.string(),
  created_at: z.string().datetime(),
  last_updated: z.string().datetime(),
  core_info: CoreInfoSchema,
  contexts: z.record(z.string(), ContextSchema),
  metadata: MetadataSchema,
});

export type MainMemory = z.infer<typeof MainMemorySchema>;
export type CoreInfo = z.infer<typeof CoreInfoSchema>;
export type Context = z.infer<typeof ContextSchema>;
export type Metadata = z.infer<typeof MetadataSchema>;

// ====== LINK/INDEX TYPES ======

export const LinkSchema = z.object({
  contexto: z
    .string()
    .max(50)
    .regex(/^[a-z_]+$/),
  subcontexto: z
    .string()
    .max(50)
    .regex(/^[a-z_]+$/),
  descricao_curta: z.string().max(200),
  caminho_memoria: z.string(),
});

export type Link = z.infer<typeof LinkSchema>;

// ====== SUBMEMORY TYPES ======

export const MemoryReferenceSchema = z.object({
  title: z.string(),
  path: z.string(),
  summary: z.string().max(500),
});

export const SubmemorySchema = z.object({
  id: z.string().uuid(),
  context: z.string(),
  subcontext: z.string(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  tags: z.array(z.string()).optional(),
  priority: z.number().min(1).max(10).default(5),
  memories: z.array(MemoryReferenceSchema),
  related_contexts: z.array(z.string()).optional(),
});

export type Submemory = z.infer<typeof SubmemorySchema>;
export type MemoryReference = z.infer<typeof MemoryReferenceSchema>;

// ====== MEMORY TYPES ======

export const ImportanceSchema = z.enum(["low", "medium", "high", "critical"]);

export const MemoryFrontmatterSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  context: z.string(),
  subcontext: z.string(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  tags: z.array(z.string()).optional(),
  importance: ImportanceSchema,
});

export const MemorySchema = z.object({
  frontmatter: MemoryFrontmatterSchema,
  content: z.string(),
});

export type Memory = z.infer<typeof MemorySchema>;
export type MemoryFrontmatter = z.infer<typeof MemoryFrontmatterSchema>;
export type Importance = z.infer<typeof ImportanceSchema>;

// ====== SEARCH TYPES ======

export const SearchOptionsSchema = z.object({
  contexts: z.array(z.string()).optional(),
  subcontexts: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  importance: z.array(ImportanceSchema).optional(),
  limit: z.number().positive().default(10),
  offset: z.number().min(0).default(0),
});

export const SearchResultSchema = z.object({
  path: z.string(),
  title: z.string(),
  context: z.string(),
  subcontext: z.string(),
  snippet: z.string(),
  importance: ImportanceSchema,
  score: z.number(),
  tags: z.array(z.string()).optional(),
});

export const SearchResponseSchema = z.object({
  results: z.array(SearchResultSchema),
  total: z.number(),
  facets: z.object({
    contexts: z.record(z.string(), z.number()),
    subcontexts: z.record(z.string(), z.number()),
    tags: z.record(z.string(), z.number()),
    importance: z.record(ImportanceSchema, z.number()),
  }),
});

export type SearchOptions = z.infer<typeof SearchOptionsSchema>;
export type SearchResult = z.infer<typeof SearchResultSchema>;
export type SearchResponse = z.infer<typeof SearchResponseSchema>;

// ====== TREE/NAVIGATION TYPES ======

export const MemoryTreeNodeSchema: z.ZodType<MemoryTreeNode> = z.object({
  name: z.string(),
  type: z.enum(["context", "subcontext", "memory"]),
  path: z.string().optional(),
  children: z.array(z.lazy(() => MemoryTreeNodeSchema)).optional(),
  count: z.number().optional(),
  last_updated: z.string().datetime().optional(),
});

export interface MemoryTreeNode {
  name: string;
  type: "context" | "subcontext" | "memory";
  path?: string;
  children?: MemoryTreeNode[];
  count?: number;
  last_updated?: string;
}

// ====== GRAPH TYPES ======

export const GraphNodeSchema = z.object({
  id: z.string(),
  label: z.string(),
  type: z.enum(["context", "subcontext", "memory"]),
  importance: ImportanceSchema.optional(),
  tags: z.array(z.string()).optional(),
});

export const GraphEdgeSchema = z.object({
  from: z.string(),
  to: z.string(),
  type: z.enum(["contains", "references", "related"]),
  weight: z.number().optional(),
});

export const MemoryGraphSchema = z.object({
  nodes: z.array(GraphNodeSchema),
  edges: z.array(GraphEdgeSchema),
});

export type GraphNode = z.infer<typeof GraphNodeSchema>;
export type GraphEdge = z.infer<typeof GraphEdgeSchema>;
export type MemoryGraph = z.infer<typeof MemoryGraphSchema>;

// ====== STATS TYPES ======

export const StatsSchema = z.object({
  total_memories: z.number(),
  total_submemories: z.number(),
  total_contexts: z.number(),
  cache_size_mb: z.number(),
  index_size_mb: z.number(),
  last_update: z.string().datetime(),
  contexts_breakdown: z.record(
    z.string(),
    z.object({
      memories: z.number(),
      submemories: z.number(),
      last_updated: z.string().datetime(),
    })
  ),
});

export type Stats = z.infer<typeof StatsSchema>;

// ====== CONFIG TYPES ======

export const ConfigSchema = z.object({
  name: z.string(),
  version: z.string(),
  transport: z.enum(["stdio"]),
  cache: z.object({
    enabled: z.boolean(),
    strategy: z.enum(["cache-first"]),
    max_size_mb: z.number().positive(),
  }),
  indexing: z.object({
    enabled: z.boolean(),
    engine: z.enum(["sqlite-fts5"]),
    auto_reindex: z.boolean(),
  }),
  validation: z.object({
    strict_mode: z.boolean(),
    auto_fix: z.boolean(),
  }),
  performance: z.object({
    lazy_loading: z.boolean(),
    compression: z.boolean(),
  }),
});

export type Config = z.infer<typeof ConfigSchema>;

// ====== TOOL PARAMETER TYPES ======

export interface ToolParams {
  [key: string]: any;
}

export interface InitParams extends ToolParams {
  project_path: string;
}

export interface MemoryCreateParams extends ToolParams {
  context: string;
  subcontext: string;
  title: string;
  content: string;
  tags?: string[];
  importance: Importance;
}

export interface SearchParams extends ToolParams {
  query: string;
  options?: Partial<SearchOptions>;
}

export interface LinkCreateParams extends ToolParams {
  context: string;
  subcontext: string;
  description: string;
  path: string;
}

export interface SubmemoryCreateParams extends ToolParams {
  context: string;
  subcontext: string;
  data: Partial<Submemory>;
}

// ====== VALIDATION RESULT TYPES ======

export const ValidationResultSchema = z.object({
  valid: z.boolean(),
  errors: z.array(z.string()),
  warnings: z.array(z.string()),
});

export type ValidationResult = z.infer<typeof ValidationResultSchema>;

// ====== CACHE TYPES ======

export interface CacheStats {
  total_size_mb: number;
  main_memory_size_kb: number;
  links_count: number;
  submemories_count: number;
  index_cache_size_kb: number;
  last_refresh: string;
}

export interface CacheInvalidation {
  type: "main" | "links" | "submemories" | "index" | "all";
  path?: string;
  context?: string;
}

// ====== ERROR TYPES ======

export class MemoryError extends Error {
  constructor(message: string, public code: string, public details?: any) {
    super(message);
    this.name = "MemoryError";
  }
}

export class ValidationError extends MemoryError {
  constructor(message: string, details?: any) {
    super(message, "VALIDATION_ERROR", details);
    this.name = "ValidationError";
  }
}

export class FileSystemError extends MemoryError {
  constructor(message: string, details?: any) {
    super(message, "FILESYSTEM_ERROR", details);
    this.name = "FileSystemError";
  }
}

export class IndexError extends MemoryError {
  constructor(message: string, details?: any) {
    super(message, "INDEX_ERROR", details);
    this.name = "IndexError";
  }
}

export class CacheError extends MemoryError {
  constructor(message: string, details?: any) {
    super(message, "CACHE_ERROR", details);
    this.name = "CacheError";
  }
}
