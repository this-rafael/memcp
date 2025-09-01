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
import { HeartbeatMonitor } from "./utils/heartbeat-monitor.js";

import { ToolParams } from "./types.js";

const server = new Server(
  { name: "memory-mcp", version: "1.0.0" },
  { capabilities: { tools: {}, resources: {} } }
);

// Heartbeat monitor instance
let heartbeatMonitor: HeartbeatMonitor | null = null;

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
  {
    name: "get_filesystem_tree",
    description: "Get file system tree structure with file types",
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
    name: "help",
    description: "List all available tools and resources with descriptions",
    inputSchema: {
      type: "object",
      properties: {},
      required: [],
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
  {
    name: "heartbeat_status",
    description: "Get heartbeat monitor status and recent entries",
    inputSchema: {
      type: "object",
      properties: {
        project_path: {
          type: "string",
          description: "Path to the project directory",
        },
        lines: {
          type: "number",
          description:
            "Number of recent heartbeat entries to retrieve (default: 10)",
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

      case "get_filesystem_tree":
        await ensureToolsInitialized(params.project_path);
        const fsTree = await toolInstances.navigation!.getFileSystemTree();
        return {
          content: [{ type: "text", text: JSON.stringify(fsTree, null, 2) }],
        };

      case "stats":
        await ensureToolsInitialized(params.project_path);
        const systemStats = await toolInstances.navigation!.getStats();
        return {
          content: [
            { type: "text", text: JSON.stringify(systemStats, null, 2) },
          ],
        };

      case "heartbeat_status":
        const lines = params.lines || 10;
        try {
          // Create temporary heartbeat monitor to read status
          const tempHeartbeat = new HeartbeatMonitor({
            projectPath: params.project_path,
            enabled: false, // Don't start monitoring, just read
          });

          const recentEntries = await tempHeartbeat.getRecentHeartbeats(lines);
          const status = tempHeartbeat.getStatus();

          const heartbeatStatus = {
            monitor: heartbeatMonitor
              ? heartbeatMonitor.getStatus()
              : { isRunning: false },
            recent_entries: recentEntries,
            file_status: status,
          };

          return {
            content: [
              { type: "text", text: JSON.stringify(heartbeatStatus, null, 2) },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  {
                    error:
                      error instanceof Error ? error.message : String(error),
                  },
                  null,
                  2
                ),
              },
            ],
          };
        }

      case "help":
        const helpContent = {
          memcp_version: "1.0.8",
          total_tools: 14,
          total_resources: 3,
          tools: [
            {
              category: "Inicialização",
              tools: [
                {
                  name: "init",
                  description: "Initialize memory system for a project",
                  params: ["project_path"],
                },
              ],
            },
            {
              category: "Manutenção",
              tools: [
                {
                  name: "validate_system",
                  description: "Validate system integrity",
                  params: ["project_path"],
                },
                {
                  name: "help",
                  description: "List all available tools and resources",
                  params: [],
                },
              ],
            },
            {
              category: "Memória Principal",
              tools: [
                {
                  name: "memory_main_get",
                  description: "Get main memory or specific section",
                  params: ["project_path", "section?"],
                },
                {
                  name: "memory_main_update",
                  description: "Update main memory section",
                  params: ["project_path", "section", "data"],
                },
                {
                  name: "memory_main_add_context",
                  description: "Add new context to main memory",
                  params: ["project_path", "name", "description", "priority"],
                },
              ],
            },
            {
              category: "Links",
              tools: [
                {
                  name: "links_create",
                  description: "Create new link",
                  params: [
                    "project_path",
                    "context",
                    "subcontext",
                    "description",
                    "memory_path",
                  ],
                },
                {
                  name: "links_read",
                  description: "Read links for context/subcontext",
                  params: ["project_path", "context", "subcontext?"],
                },
              ],
            },
            {
              category: "Memórias",
              tools: [
                {
                  name: "memory_create",
                  description: "Create new memory",
                  params: [
                    "project_path",
                    "context",
                    "subcontext",
                    "title",
                    "content",
                    "tags?",
                    "importance?",
                  ],
                },
                {
                  name: "memory_read",
                  description: "Read memory by path",
                  params: ["project_path", "memory_path"],
                },
              ],
            },
            {
              category: "Busca",
              tools: [
                {
                  name: "search_memories",
                  description: "Search memories with full-text search",
                  params: ["project_path", "query", "options?"],
                },
              ],
            },
            {
              category: "Navegação",
              tools: [
                {
                  name: "get_memory_tree",
                  description: "Get memory tree structure",
                  params: ["project_path", "context?", "depth?"],
                },
                {
                  name: "get_filesystem_tree",
                  description: "Get file system tree structure with file types",
                  params: ["project_path"],
                },
              ],
            },
            {
              category: "Estatísticas",
              tools: [
                {
                  name: "stats",
                  description: "Get system statistics",
                  params: ["project_path"],
                },
              ],
            },
          ],
          resources: [
            {
              name: "Main Memory",
              uri: "memory://main",
              description: "Current main memory configuration and contexts",
            },
            {
              name: "Memory Tree",
              uri: "memory://tree",
              description:
                "Hierarchical view of all memories organized by context",
            },
            {
              name: "System Statistics",
              uri: "memory://stats",
              description: "System usage statistics and health metrics",
            },
          ],
          usage_examples: {
            create_memory: {
              tool: "memory_create",
              params: {
                project_path: "/path/to/project",
                context: "desenvolvimento",
                subcontext: "frontend",
                title: "Componentes React",
                content: "# Componentes React\n\nDetalhes sobre componentes...",
              },
            },
            search: {
              tool: "search_memories",
              params: {
                project_path: "/path/to/project",
                query: "react components",
                options: { limit: 10 },
              },
            },
          },
        };
        return {
          content: [
            { type: "text", text: JSON.stringify(helpContent, null, 2) },
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

  // Inicializar heartbeat monitor se habilitado
  const heartbeatEnabled = process.env.MCP_HEARTBEAT !== "false";
  if (heartbeatEnabled) {
    const projectPath = process.env.MEMORY_PROJECT_PATH || process.cwd();
    const heartbeatInterval = parseInt(
      process.env.MCP_HEARTBEAT_INTERVAL || "10"
    );

    heartbeatMonitor = new HeartbeatMonitor({
      projectPath,
      interval: heartbeatInterval,
      enabled: true,
    });

    // Configurar eventos do heartbeat
    heartbeatMonitor.on("started", () => {
      console.error(
        `Heartbeat monitor started - interval: ${heartbeatInterval}s`
      );
    });

    heartbeatMonitor.on("error", (error) => {
      console.error("Heartbeat monitor error:", error);
    });

    // Iniciar monitoring
    try {
      await heartbeatMonitor.start();
    } catch (error) {
      console.error("Failed to start heartbeat monitor:", error);
    }
  }

  console.error("Memory MCP server running on stdio");
  console.error(`Process ID: ${process.pid}`);
  console.error(
    `Heartbeat monitoring: ${heartbeatEnabled ? "ENABLED" : "DISABLED"}`
  );
}

main().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.error("Received SIGTERM, shutting down gracefully...");
  if (heartbeatMonitor) {
    await heartbeatMonitor.stop();
  }
  process.exit(0);
});

process.on("SIGINT", async () => {
  console.error("Received SIGINT, shutting down gracefully...");
  if (heartbeatMonitor) {
    await heartbeatMonitor.stop();
  }
  process.exit(0);
});
