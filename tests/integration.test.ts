import { mkdtemp, rm } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { init, validateSystem } from "../src/tools/init.tool.js";
import { LinksTools } from "../src/tools/links.tool.js";
import { MainMemoryTools } from "../src/tools/main-memory.tool.js";
import { MemoryTools } from "../src/tools/memory.tool.js";
import { NavigationTools } from "../src/tools/navigation.tool.js";
import { FileSystemUtils } from "../src/utils/file-system.js";

describe("Memory MCP System Integration Tests", () => {
  let testProjectPath: string;
  let memoryPath: string;

  beforeEach(async () => {
    // Create temporary directory for each test
    testProjectPath = await mkdtemp(join(tmpdir(), "memcp-test-"));
    memoryPath = FileSystemUtils.getMemoryPath(testProjectPath);
  });

  afterEach(async () => {
    // Clean up temporary directory
    await rm(testProjectPath, { recursive: true, force: true });
  });

  describe("System Initialization", () => {
    test("should initialize memory system successfully", async () => {
      const result = await init({ project_path: testProjectPath });

      expect(result.success).toBe(true);
      expect(result.message).toContain("Memory system initialized");
      expect(result.stats).toBeDefined();
      expect(result.stats.memory_path).toBeDefined();
    });

    test("should validate system integrity after initialization", async () => {
      await init({ project_path: testProjectPath });
      const validation = await validateSystem(testProjectPath);

      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });
  });

  describe("Main Memory Operations", () => {
    let mainMemoryTools: MainMemoryTools;

    beforeEach(async () => {
      await init({ project_path: testProjectPath });
      mainMemoryTools = new MainMemoryTools(memoryPath);
      await mainMemoryTools.initialize();
    });

    test("should get main memory after initialization", async () => {
      const mainMemory = await mainMemoryTools.memoryMainGet();

      expect(mainMemory).toBeDefined();
      expect(mainMemory.project).toBeDefined();
      expect(mainMemory.contexts).toBeDefined();
      expect(mainMemory.configuration).toBeDefined();
    });

    test("should add context to main memory", async () => {
      const success = await mainMemoryTools.memoryMainAddContext(
        "test-context",
        "Test context for unit tests",
        7
      );

      expect(success).toBe(true);

      const mainMemory = await mainMemoryTools.memoryMainGet();
      expect(mainMemory.contexts).toHaveProperty("test-context");
      expect(mainMemory.contexts["test-context"].description).toBe(
        "Test context for unit tests"
      );
      expect(mainMemory.contexts["test-context"].priority).toBe(7);
    });

    test("should get main memory statistics", async () => {
      await mainMemoryTools.memoryMainAddContext("ctx1", "Context 1", 5);
      await mainMemoryTools.memoryMainAddContext("ctx2", "Context 2", 8);

      const stats = await mainMemoryTools.memoryMainStats();

      expect(stats.total_contexts).toBe(2);
      expect(stats.contexts_breakdown).toHaveProperty("ctx1");
      expect(stats.contexts_breakdown).toHaveProperty("ctx2");
    });
  });

  describe("Links Operations", () => {
    let linksTools: LinksTools;

    beforeEach(async () => {
      await init({ project_path: testProjectPath });

      // Setup context first
      const mainMemoryTools = new MainMemoryTools(memoryPath);
      await mainMemoryTools.initialize();
      await mainMemoryTools.memoryMainAddContext(
        "test-context",
        "Test context",
        5
      );

      linksTools = new LinksTools(memoryPath);
      await linksTools.initialize();
    });

    test("should create and read links", async () => {
      const linkId = await linksTools.linksCreate(
        "test-context",
        "test-subcontext",
        "Test link description",
        "test-context/test-subcontext/memories/test-memory.md"
      );

      expect(linkId).toBeDefined();

      const links = await linksTools.linksRead(
        "test-context",
        "test-subcontext"
      );
      expect(links).toHaveLength(1);
      expect(links[0].descricao_curta).toBe("Test link description");
      expect(links[0].caminho_memoria).toBe(
        "test-context/test-subcontext/memories/test-memory.md"
      );
    });

    test("should search links with fuzzy matching", async () => {
      await linksTools.linksCreate(
        "test-context",
        "subcontext1",
        "API Documentation",
        "api-docs.md"
      );
      await linksTools.linksCreate(
        "test-context",
        "subcontext2",
        "Database Schema",
        "db-schema.md"
      );

      const results = await linksTools.linksSearch("api", true);
      expect(results).toHaveLength(1);
      expect(results[0].descricao_curta).toBe("API Documentation");
    });
  });

  describe("Memory Operations", () => {
    let memoryTools: MemoryTools;

    beforeEach(async () => {
      await init({ project_path: testProjectPath });

      // Setup context and links
      const mainMemoryTools = new MainMemoryTools(memoryPath);
      await mainMemoryTools.initialize();
      await mainMemoryTools.memoryMainAddContext(
        "dev",
        "Development context",
        8
      );

      const linksTools = new LinksTools(memoryPath);
      await linksTools.initialize();

      memoryTools = new MemoryTools(memoryPath);
      await memoryTools.initialize();
    });

    test("should create and read memory", async () => {
      const memoryPath = await memoryTools.memoryCreate(
        "dev",
        "backend",
        "Test Memory",
        "# Test Memory\\n\\nThis is a test memory content.",
        ["test", "memory"],
        "medium"
      );

      expect(memoryPath).toBeDefined();
      expect(memoryPath).toContain("memories/dev/backend/");
      expect(memoryPath.endsWith(".md")).toBe(true);

      const memory = await memoryTools.memoryRead(memoryPath);
      expect(memory.frontmatter.title).toBe("Test Memory");
      expect(memory.frontmatter.context).toBe("dev");
      expect(memory.frontmatter.subcontext).toBe("backend");
      expect(memory.frontmatter.tags).toEqual(["test", "memory"]);
      expect(memory.frontmatter.importance).toBe("medium");
      expect(memory.content).toContain("This is a test memory content");
    });

    test("should search memories", async () => {
      await memoryTools.memoryCreate(
        "dev",
        "backend",
        "API Design",
        "# API Design\\n\\nRESTful API patterns and best practices.",
        ["api", "design"],
        "high"
      );

      await memoryTools.memoryCreate(
        "dev",
        "frontend",
        "UI Components",
        "# UI Components\\n\\nReusable React components library.",
        ["ui", "react"],
        "medium"
      );

      const results = await memoryTools.searchMemories("API", {
        contexts: ["dev"],
        limit: 10,
      });

      expect(results.results).toHaveLength(1);
      expect(results.results[0].title).toBe("API Design");
      expect(results.total).toBe(1);
    });
  });

  describe("Navigation Operations", () => {
    let navigationTools: NavigationTools;

    beforeEach(async () => {
      await init({ project_path: testProjectPath });

      // Setup test data
      const mainMemoryTools = new MainMemoryTools(memoryPath);
      await mainMemoryTools.initialize();
      await mainMemoryTools.memoryMainAddContext("dev", "Development", 8);
      await mainMemoryTools.memoryMainAddContext("docs", "Documentation", 6);

      const memoryTools = new MemoryTools(memoryPath);
      await memoryTools.initialize();
      await memoryTools.memoryCreate(
        "dev",
        "backend",
        "API Docs",
        "API documentation",
        ["api"],
        "high"
      );
      await memoryTools.memoryCreate(
        "docs",
        "user",
        "User Guide",
        "User documentation",
        ["guide"],
        "medium"
      );

      navigationTools = new NavigationTools(memoryPath);
      await navigationTools.initialize();
    });

    test("should get memory tree structure", async () => {
      const tree = await navigationTools.getMemoryTree();

      expect(tree).toBeDefined();
      expect(tree.name).toBe("Memory System");
      expect(tree.children).toBeDefined();
      if (tree.children) {
        expect(tree.children.length).toBeGreaterThan(0);
      }
    });

    test("should get system statistics", async () => {
      const stats = await navigationTools.getStats();

      expect(stats.total_memories).toBe(2);
      expect(stats.total_contexts).toBe(2);
      expect(stats.cache_size_mb).toBeGreaterThanOrEqual(0);
      expect(stats.index_size_mb).toBeGreaterThanOrEqual(0);
    });
  });

  describe("Error Handling", () => {
    test("should handle invalid project path gracefully", async () => {
      await expect(
        init({ project_path: "/nonexistent/path" })
      ).rejects.toThrow();
    });

    test("should handle missing memory file gracefully", async () => {
      await init({ project_path: testProjectPath });
      const memoryTools = new MemoryTools(memoryPath);
      await memoryTools.initialize();

      await expect(
        memoryTools.memoryRead("nonexistent/path.md")
      ).rejects.toThrow();
    });
  });
});

describe("Memory MCP System Edge Cases", () => {
  let testProjectPath: string;

  beforeEach(async () => {
    testProjectPath = await mkdtemp(join(tmpdir(), "memcp-edge-test-"));
  });

  afterEach(async () => {
    await rm(testProjectPath, { recursive: true, force: true });
  });

  test("should handle reinitializing existing system", async () => {
    // First initialization
    const result1 = await init({ project_path: testProjectPath });
    expect(result1.success).toBe(true);

    // Second initialization should not fail
    const result2 = await init({ project_path: testProjectPath });
    expect(result2.success).toBe(true);
    expect(result2.message).toContain("already exists");
  });

  test("should handle empty context and subcontext names", async () => {
    await init({ project_path: testProjectPath });
    const memoryPath = FileSystemUtils.getMemoryPath(testProjectPath);

    const mainMemoryTools = new MainMemoryTools(memoryPath);
    await mainMemoryTools.initialize();

    // Should reject empty context name
    await expect(
      mainMemoryTools.memoryMainAddContext("", "Empty context", 5)
    ).rejects.toThrow();
  });

  test("should handle special characters in memory content", async () => {
    await init({ project_path: testProjectPath });
    const memoryPath = FileSystemUtils.getMemoryPath(testProjectPath);

    const mainMemoryTools = new MainMemoryTools(memoryPath);
    await mainMemoryTools.initialize();
    await mainMemoryTools.memoryMainAddContext("test", "Test context", 5);

    const memoryTools = new MemoryTools(memoryPath);
    await memoryTools.initialize();

    const specialContent =
      '# Special Content\\n\\nEmojis: 🚀🔥💯\\nCode: ```javascript\\nconsole.log("test");\\n```\\nUnicode: café, naïve, 中文';

    const memoryPath2 = await memoryTools.memoryCreate(
      "test",
      "special",
      "Special Characters Test",
      specialContent,
      ["unicode", "emoji"],
      "low"
    );

    const memory = await memoryTools.memoryRead(memoryPath2);
    expect(memory.content).toContain("🚀🔥💯");
    expect(memory.content).toContain("café, naïve, 中文");
  });
});
