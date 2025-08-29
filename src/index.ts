import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

// Import tools
import { init, validateSystem } from "./tools/init.tool.js";
import { LinksTools } from "./tools/links.tool.js";
import { MainMemoryTools } from "./tools/main-memory.tool.js";
import { MaintenanceTools } from "./tools/maintenance.tool.js";
import { MemoryTools } from "./tools/memory.tool.js";
import { NavigationTools } from "./tools/navigation.tool.js";
import { SubmemoryTools } from "./tools/submemory.tool.js";
import { FileSystemUtils } from "./utils/file-system.js";

import { ToolParams } from "./types.js";

const server = new Server(
  { name: "memory-mcp", version: "1.0.0" },
  { capabilities: { tools: {}, resources: {} } }
);

// Tool instances - will be initialized per project
let currentProjectPath: string | null = null;
let toolInstances: {
  mainMemory?: MainMemoryTools;
  links?: LinksTools;
  submemory?: SubmemoryTools;
  memory?: MemoryTools;
  navigation?: NavigationTools;
  maintenance?: MaintenanceTools;
} = {};

// Helper function to ensure tools are initialized
async function ensureToolsInitialized(projectPath: string) {
  if (currentProjectPath !== projectPath || !toolInstances.mainMemory) {
    const memoryPath = FileSystemUtils.getMemoryPath(projectPath);

    // Initialize all tool instances
    toolInstances.mainMemory = new MainMemoryTools(memoryPath);
    toolInstances.links = new LinksTools(memoryPath);
    toolInstances.submemory = new SubmemoryTools(memoryPath);
    toolInstances.memory = new MemoryTools(memoryPath);
    toolInstances.navigation = new NavigationTools(memoryPath);
    toolInstances.maintenance = new MaintenanceTools(memoryPath);

    // Initialize each tool's cache
    await toolInstances.mainMemory.initialize();
    await toolInstances.links.initialize();
    await toolInstances.submemory.initialize();
    await toolInstances.memory.initialize();
    await toolInstances.navigation.initialize();
    await toolInstances.maintenance.initialize();

    currentProjectPath = projectPath;
  }
}

// Define all tools
const TOOLS = [
  // Initialization and Setup
  {
    name: "init",
    description: "Initialize memory system for a project",
    inputSchema: {
      type: "object",
      properties: {
        project_path: {
          type: "string",
          description: "Path to the project directory",
        },
      },
      required: ["project_path"],
    },
  },
  {
    name: "validate_system",
    description: "Validate system integrity",
    inputSchema: {
      type: "object",
      properties: {
        project_path: {
          type: "string",
          description: "Path to the project directory",
        },
      },
      required: ["project_path"],
    },
  },

  // Main Memory Operations
  {
    name: "memory_main_get",
    description: "Get main memory or specific section",
    inputSchema: {
      type: "object",
      properties: {
        project_path: {
          type: "string",
          description: "Path to the project directory",
        },
        section: {
          type: "string",
          description: "Optional section to retrieve",
        },
      },
      required: ["project_path"],
    },
  },
  {
    name: "memory_main_update",
    description: "Update main memory section",
    inputSchema: {
      type: "object",
      properties: {
        project_path: {
          type: "string",
          description: "Path to the project directory",
        },
        section: { type: "string", description: "Section name to update" },
        data: { type: "object", description: "Data to update" },
      },
      required: ["project_path", "section", "data"],
    },
  },
  {
    name: "memory_main_add_context",
    description: "Add new context to main memory",
    inputSchema: {
      type: "object",
      properties: {
        project_path: {
          type: "string",
          description: "Path to the project directory",
        },
        name: { type: "string", description: "Context name" },
        description: { type: "string", description: "Context description" },
        priority: { type: "number", description: "Context priority (1-10)" },
      },
      required: ["project_path", "name", "description", "priority"],
    },
  },

  // Links Operations
  {
    name: "links_create",
    description: "Create new link",
    inputSchema: {
      type: "object",
      properties: {
        project_path: {
          type: "string",
          description: "Path to the project directory",
        },
        context: { type: "string", description: "Context name" },
        subcontext: { type: "string", description: "Subcontext name" },
        description: { type: "string", description: "Link description" },
        memory_path: { type: "string", description: "Path to memory file" },
      },
      required: [
        "project_path",
        "context",
        "subcontext",
        "description",
        "memory_path",
      ],
    },
  },
  {
    name: "links_read",
    description: "Read links for context/subcontext",
    inputSchema: {
      type: "object",
      properties: {
        project_path: {
          type: "string",
          description: "Path to the project directory",
        },
        context: { type: "string", description: "Context name" },
        subcontext: { type: "string", description: "Optional subcontext name" },
      },
      required: ["project_path", "context"],
    },
  },

  // Memory Operations
  {
    name: "memory_create",
    description: "Create new memory",
    inputSchema: {
      type: "object",
      properties: {
        project_path: {
          type: "string",
          description: "Path to the project directory",
        },
        context: { type: "string", description: "Context name" },
        subcontext: { type: "string", description: "Subcontext name" },
        title: { type: "string", description: "Memory title" },
        content: { type: "string", description: "Memory content" },
        tags: {
          type: "array",
          items: { type: "string" },
          description: "Memory tags",
        },
        importance: {
          type: "string",
          enum: ["low", "medium", "high", "critical"],
          description: "Memory importance",
        },
      },
      required: ["project_path", "context", "subcontext", "title", "content"],
    },
  },
  {
    name: "memory_read",
    description: "Read memory by path",
    inputSchema: {
      type: "object",
      properties: {
        project_path: {
          type: "string",
          description: "Path to the project directory",
        },
        memory_path: {
          type: "string",
          description: "Relative path to memory file",
        },
      },
      required: ["project_path", "memory_path"],
    },
  },

  // Search Operations
  {
    name: "search_memories",
    description: "Search memories with full-text search",
    inputSchema: {
      type: "object",
      properties: {
        project_path: {
          type: "string",
          description: "Path to the project directory",
        },
        query: { type: "string", description: "Search query" },
        options: {
          type: "object",
          properties: {
            contexts: { type: "array", items: { type: "string" } },
            subcontexts: { type: "array", items: { type: "string" } },
            tags: { type: "array", items: { type: "string" } },
            importance: { type: "array", items: { type: "string" } },
            limit: { type: "number" },
            offset: { type: "number" },
          },
        },
      },
      required: ["project_path", "query"],
    },
  },

  // Navigation Operations
  {
    name: "get_memory_tree",
    description: "Get memory tree structure",
    inputSchema: {
      type: "object",
      properties: {
        project_path: {
          type: "string",
          description: "Path to the project directory",
        },
        context: { type: "string", description: "Optional context filter" },
        depth: { type: "number", description: "Optional depth limit" },
      },
      required: ["project_path"],
    },
  },

  // Maintenance Operations
  {
    name: "stats",
    description: "Get system statistics",
    inputSchema: {
      type: "object",
      properties: {
        project_path: {
          type: "string",
          description: "Path to the project directory",
        },
      },
      required: ["project_path"],
    },
  },
];

// Register tools
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: TOOLS,
}));

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  const params = args as ToolParams;

  try {
    switch (name) {
      // Initialization and Setup
      case "init":
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                await init({ project_path: params.project_path }),
                null,
                2
              ),
            },
          ],
        };

      case "validate_system":
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                await validateSystem(params.project_path),
                null,
                2
              ),
            },
          ],
        };

      // Main Memory Operations
      case "memory_main_get":
        await ensureToolsInitialized(params.project_path);
        const mainResult = await toolInstances.mainMemory!.memoryMainGet(
          params.section
        );
        return {
          content: [
            { type: "text", text: JSON.stringify(mainResult, null, 2) },
          ],
        };

      case "memory_main_update":
        await ensureToolsInitialized(params.project_path);
        const updateResult = await toolInstances.mainMemory!.memoryMainUpdate(
          params.section,
          params.data
        );
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({ success: updateResult }, null, 2),
            },
          ],
        };

      case "memory_main_add_context":
        await ensureToolsInitialized(params.project_path);
        const addResult = await toolInstances.mainMemory!.memoryMainAddContext(
          params.name,
          params.description,
          params.priority
        );
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({ success: addResult }, null, 2),
            },
          ],
        };

      // Links Operations
      case "links_create":
        await ensureToolsInitialized(params.project_path);
        const linkId = await toolInstances.links!.linksCreate(
          params.context,
          params.subcontext,
          params.description,
          params.memory_path
        );
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({ link_id: linkId }, null, 2),
            },
          ],
        };

      case "links_read":
        await ensureToolsInitialized(params.project_path);
        const links = await toolInstances.links!.linksRead(
          params.context,
          params.subcontext
        );
        return {
          content: [{ type: "text", text: JSON.stringify(links, null, 2) }],
        };

      // Memory Operations
      case "memory_create":
        await ensureToolsInitialized(params.project_path);
        const memoryPath = await toolInstances.memory!.memoryCreate(
          params.context,
          params.subcontext,
          params.title,
          params.content,
          params.tags,
          params.importance
        );
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({ memory_path: memoryPath }, null, 2),
            },
          ],
        };

      case "memory_read":
        await ensureToolsInitialized(params.project_path);
        const memory = await toolInstances.memory!.memoryRead(
          params.memory_path
        );
        return {
          content: [{ type: "text", text: JSON.stringify(memory, null, 2) }],
        };

      case "search_memories":
        await ensureToolsInitialized(params.project_path);
        const searchResponse = await toolInstances.memory!.searchMemories(
          params.query,
          params.options
        );
        return {
          content: [
            { type: "text", text: JSON.stringify(searchResponse, null, 2) },
          ],
        };

      case "get_memory_tree":
        await ensureToolsInitialized(params.project_path);
        const tree = await toolInstances.navigation!.getMemoryTree(
          params.context,
          params.depth
        );
        return {
          content: [{ type: "text", text: JSON.stringify(tree, null, 2) }],
        };

      case "stats":
        await ensureToolsInitialized(params.project_path);
        const systemStats = await toolInstances.navigation!.getStats();
        return {
          content: [
            { type: "text", text: JSON.stringify(systemStats, null, 2) },
          ],
        };

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Error executing ${name}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        },
      ],
      isError: true,
    };
  }
});

// Define resources
const RESOURCES = [
  {
    uri: "memory://main",
    name: "Main Memory",
    mimeType: "application/json",
    description: "Main memory configuration and contexts",
  },
  {
    uri: "memory://tree",
    name: "Memory Tree",
    mimeType: "application/json",
    description: "Hierarchical view of memory structure",
  },
  {
    uri: "memory://stats",
    name: "System Statistics",
    mimeType: "application/json",
    description: "Memory system statistics and health information",
  },
];

// Register resources
server.setRequestHandler(ListResourcesRequestSchema, async () => ({
  resources: RESOURCES,
}));

// Handle resource reads
server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const { uri } = request.params;

  // Extract project path from URI or use a default (in real usage, this would come from context)
  const projectPath = process.env.MEMORY_PROJECT_PATH;

  if (!projectPath) {
    throw new Error(
      "Project path not configured. Set MEMORY_PROJECT_PATH environment variable."
    );
  }

  try {
    await ensureToolsInitialized(projectPath);

    switch (uri) {
      case "memory://main":
        const mainMemory = await toolInstances.mainMemory!.memoryMainGet();
        return {
          contents: [
            {
              uri,
              mimeType: "application/json",
              text: JSON.stringify(mainMemory, null, 2),
            },
          ],
        };

      case "memory://tree":
        const tree = await toolInstances.navigation!.getMemoryTree();
        return {
          contents: [
            {
              uri,
              mimeType: "application/json",
              text: JSON.stringify(tree, null, 2),
            },
          ],
        };

      case "memory://stats":
        const stats = await toolInstances.navigation!.getStats();
        return {
          contents: [
            {
              uri,
              mimeType: "application/json",
              text: JSON.stringify(stats, null, 2),
            },
          ],
        };

      default:
        throw new Error(`Unknown resource: ${uri}`);
    }
  } catch (error) {
    throw new Error(
      `Error reading resource ${uri}: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Memory MCP server running on stdio");
}

main().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});
