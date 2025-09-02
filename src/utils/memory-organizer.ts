import fs, { promises as fsPromises } from "fs";
import path from "path";
import { GeminiExecutor } from "../executors/gemini-executor.js";
import { LinksTools } from "../tools/links.tool.js";
import { MainMemoryTools } from "../tools/main-memory.tool.js";
import { MemoryTools } from "../tools/memory.tool.js";
import { NavigationTools } from "../tools/navigation.tool.js";
import { SubmemoryTools } from "../tools/submemory.tool.js";

/**
 * Logger específico para Memory Organizer que escreve em arquivos
 */
class MemoryOrganizerLogger {
  private logFilePath: string;

  constructor(projectPath: string) {
    const memoryPath = path.join(projectPath, "ia-memory");
    this.logFilePath = path.join(memoryPath, "organizer.log");
  }

  private async ensureLogDirectory(): Promise<void> {
    const logDir = path.dirname(this.logFilePath);
    try {
      await fsPromises.access(logDir);
    } catch {
      await fsPromises.mkdir(logDir, { recursive: true });
    }
  }

  private async writeLog(level: string, message: string): Promise<void> {
    try {
      await this.ensureLogDirectory();
      const timestamp = new Date().toISOString();
      const logEntry = `${timestamp} [${level}] ${message}\n`;
      await fsPromises.appendFile(this.logFilePath, logEntry, "utf8");
    } catch (error) {
      // Silencioso: não faz fallback para console
    }
  }

  async info(message: string): Promise<void> {
    await this.writeLog("INFO", message);
  }

  async error(message: string): Promise<void> {
    await this.writeLog("ERROR", message);
  }

  async warn(message: string): Promise<void> {
    await this.writeLog("WARN", message);
  }

  async debug(message: string): Promise<void> {
    await this.writeLog("DEBUG", message);
  }

  getLogPath(): string {
    return this.logFilePath;
  }
}

/**
 * MemoryOrganizer uses Gemini AI to automatically organize and optimize memory structure
 */
export class MemoryOrganizer {
  private gemini: GeminiExecutor;
  private projectPath: string;
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning = false;
  private logger: MemoryOrganizerLogger;
  private geminiTimeout: number;

  // Tool instances
  private mainMemory: MainMemoryTools;
  private links: LinksTools;
  private memory: MemoryTools;
  private submemory: SubmemoryTools;
  private navigation: NavigationTools;

  constructor(projectPath: string) {
    this.projectPath = projectPath;
    this.gemini = GeminiExecutor.create();
    this.logger = new MemoryOrganizerLogger(projectPath);
    this.geminiTimeout = parseInt(process.env.GEMINI_TIMEOUT || "90");

    // Initialize tool instances with memory path
    const memoryPath = path.join(projectPath, "ia-memory");
    this.mainMemory = new MainMemoryTools(memoryPath);
    this.links = new LinksTools(memoryPath);
    this.memory = new MemoryTools(memoryPath);
    this.submemory = new SubmemoryTools(memoryPath);
    this.navigation = new NavigationTools(memoryPath);
  }

  /**
   * Start the automatic memory organization process
   */
  start(intervalMinutes = 1): void {
    if (this.isRunning) {
      this.logger.warn("Memory organizer already running");
      return;
    }

    this.logger.info(
      `Starting memory organizer for ${this.projectPath} (every ${intervalMinutes}min)`
    );
    this.isRunning = true;

    // Run immediately, then set interval
    this.runOrganization();

    this.intervalId = setInterval(() => {
      this.runOrganization();
    }, intervalMinutes * 60 * 1000);
  }

  /**
   * Stop the automatic memory organization process
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    this.logger.info("Memory organizer stopped");
  }

  /**
   * Check if the organizer is currently running
   */
  isActive(): boolean {
    return this.isRunning;
  }

  /**
   * Run a single organization cycle
   */
  private async runOrganization(): Promise<void> {
    try {
      await this.logger.info(
        `Running memory organization for ${this.projectPath}`
      );

      // Check if ia-memory directory exists
      const memoryPath = path.join(this.projectPath, "ia-memory");
      if (!fs.existsSync(memoryPath)) {
        await this.logger.warn(
          `No ia-memory directory found in ${this.projectPath}, skipping`
        );
        return;
      }

      // Check if we ran recently (prevent spam)
      const lastRunFile = path.join(memoryPath, ".last-organization");
      if (fs.existsSync(lastRunFile)) {
        const lastRun = new Date(fs.readFileSync(lastRunFile, "utf8"));
        const timeSinceLastRun = Date.now() - lastRun.getTime();
        if (timeSinceLastRun < 5 * 60 * 1000) {
          // 5 minutes minimum
          await this.logger.info("Organization skipped - ran recently");
          return;
        }
      }

      // 1. Analyze current memory structure
      const memoryAnalysis = await this.analyzeCurrentMemory();

      // 2. Get available MCP functions
      const availableFunctions = this.getAvailableFunctions();

      // 3. Generate organization recommendations using Gemini
      const recommendations = await this.generateRecommendations(
        memoryAnalysis,
        availableFunctions
      );

      // 4. Execute approved recommendations (yolo mode)
      await this.executeRecommendations(recommendations);

      // Update last run timestamp
      fs.writeFileSync(lastRunFile, new Date().toISOString());

      await this.logger.info(
        `Memory organization completed for ${this.projectPath}`
      );
    } catch (error) {
      await this.logger.error(
        `Error in memory organization for ${this.projectPath}: ${error}`
      );
    }
  }

  /**
   * Analyze the current memory structure
   */
  private async analyzeCurrentMemory(): Promise<any> {
    try {
      // Initialize tools
      await this.mainMemory.initialize();
      await this.links.initialize();
      await this.memory.initialize();
      await this.submemory.initialize();
      await this.navigation.initialize();

      // Get main memory
      const mainMemory = await this.mainMemory.memoryMainGet();

      // Get memory tree
      const memoryTree = await this.navigation.getMemoryTree();

      // Get system stats
      const stats = await this.navigation.getStats();

      // Get existing links
      let allLinks = [];
      try {
        if (mainMemory.contexts) {
          for (const context of mainMemory.contexts) {
            try {
              const contextLinks = await this.links.linksRead(context.name);
              allLinks.push(...contextLinks);
            } catch (linkError) {
              // Context may not have links yet
            }
          }
        }
      } catch (error) {
        // No links yet
      }

      return {
        mainMemory,
        memoryTree,
        stats,
        links: allLinks,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      await this.logger.error(`Error analyzing memory: ${error}`);
      return { error: (error as Error).message };
    }
  }

  /**
   * Get list of available MCP functions
   */
  private getAvailableFunctions(): string[] {
    return [
      // Main Memory Tools
      "memory_main_get - Get main memory or specific section",
      "memory_main_update - Update main memory section",
      "memory_main_add_context - Add new context to main memory",

      // Memory Tools
      "memory_create - Create a new memory entry",
      "memory_read - Read memory by path",

      // Links Tools
      "links_create - Create new link between memories",
      "links_read - Read links for context/subcontext",

      // Submemory Tools
      "submemory_create - Create new submemory",
      "submemory_read - Read submemory content",
      "submemory_update - Update submemory content",
      "submemory_delete - Delete submemory",

      // Navigation Tools
      "get_memory_tree - Get memory tree structure",
      "get_filesystem_tree - Get file system tree",
      "search_memories - Full-text search across memories",
      "stats - Get system statistics",

      // Maintenance Tools
      "validate_system - Validate system integrity",
      "heartbeat_status - Get heartbeat monitor status",
    ];
  }

  /**
   * Generate organization recommendations using Gemini AI
   */
  private async generateRecommendations(
    memoryAnalysis: any,
    availableFunctions: string[]
  ): Promise<any> {
    // Prepare a compact snapshot to avoid huge prompts
    const contexts = memoryAnalysis?.mainMemory?.contexts
      ? Object.keys(memoryAnalysis.mainMemory.contexts)
      : [];
    const stats = memoryAnalysis?.stats || {};
    const linkCount = memoryAnalysis?.links?.length || 0;

    // Detect potential dangling links (those whose files are missing)
    const danglingLinks: string[] = [];
    try {
      const fsPromises = (await import("fs")).promises;
      for (const link of memoryAnalysis.links || []) {
        try {
          await fsPromises.access(
            path.join(this.projectPath, "ia-memory", link.caminho_memoria)
          );
        } catch {
          danglingLinks.push(
            `${link.contexto}/${link.subcontexto} -> ${link.caminho_memoria}`
          );
        }
      }
    } catch {}

    const snapshot = {
      contexts,
      stats,
      linkCount,
      danglingLinks: danglingLinks.slice(0, 15), // cap
    };

    const prompt = `Você é um agente de organização de memórias. Gere no MÁXIMO 5 recomendações concisas para consolidar, corrigir links quebrados e remover redundâncias.
RETORNE SOMENTE JSON válido.

SNAPSHOT:
${JSON.stringify(snapshot)}

FORMAT JSON:
{
  "analysis": {"currentState": string, "issues": string[], "opportunities": string[]},
  "recommendations": [
    {"type": "create_memory|create_context|create_link|cleanup_link|consolidate", "priority": "high|medium|low", "description": string, "action": {"function": string, "params": object}}
  ]
}

Regras:
- Se houver danglingLinks, inclua ações cleanup_link usando links_delete.
- Para muitos contexts com poucos memories, sugira consolidate criando contexto 'consolidation'.
- Evite textos longos (>200 chars).`;

    try {
      const response = await this.gemini.executeDirectPrompt(
        prompt,
        parseInt(process.env.GEMINI_TIMEOUT || "90")
      );

      // Attempt to extract JSON (first {...})
      const jsonMatch = response.match(/\{[\s\S]*\}$/m);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      return JSON.parse(response);
    } catch (error) {
      await this.logger.error(`Error generating recommendations: ${error}`);
      return await this.createFallbackRecommendations(memoryAnalysis);
    }
  }

  /**
   * Create fallback recommendations when Gemini fails
   */
  private async createFallbackRecommendations(
    memoryAnalysis: any
  ): Promise<any> {
    const recommendations = [];

    try {
      // Basic analysis
      if (memoryAnalysis && memoryAnalysis.stats) {
        const stats = memoryAnalysis.stats;

        // Recommend creating links if there are many memories but no links
        if (
          stats.total_memories > 5 &&
          (!memoryAnalysis.links || memoryAnalysis.links.length === 0)
        ) {
          recommendations.push({
            type: "create_memory",
            priority: "medium",
            description:
              "Criar memória organizacional para estabelecer conexões entre conceitos relacionados",
            action: {
              function: "memory_create",
              params: {
                context: "general",
                subcontext: "organization",
                title: "Mapa de Conexões do Projeto",
                content:
                  "Esta memória serve como um índice organizacional para facilitar a navegação entre os diferentes conceitos e módulos do projeto. Links e relacionamentos serão estabelecidos gradualmente.",
                importance: "medium",
                tags: ["organização", "índice", "navegação"],
              },
            },
          });
        }

        // Recommend organizing contexts if there are too many
        if (stats.total_contexts > 8) {
          // Check if consolidation context already exists
          try {
            const mainMemory = await this.mainMemory.memoryMainGet();
            let contextExists = false;
            if (mainMemory.contexts) {
              if (Array.isArray(mainMemory.contexts)) {
                contextExists = mainMemory.contexts.some(
                  (ctx: any) => ctx.name === "consolidation"
                );
              } else if (typeof mainMemory.contexts === "object") {
                contextExists = Object.prototype.hasOwnProperty.call(
                  mainMemory.contexts,
                  "consolidation"
                );
              }
            }

            if (!contextExists) {
              recommendations.push({
                type: "create_context",
                priority: "low",
                description:
                  "Criar contexto para consolidar informações fragmentadas",
                action: {
                  function: "memory_main_add_context",
                  params: {
                    name: "consolidation",
                    description:
                      "Contexto para consolidar e organizar informações que estão espalhadas em múltiplos contextos",
                    priority: 6,
                  },
                },
              });
            }
          } catch (error) {
            // If we can't check, skip this recommendation to be safe
            await this.logger.warn(
              `Could not check existing contexts: ${error}`
            );
          }
        }
      }
    } catch (error) {
      await this.logger.error(
        `Error creating fallback recommendations: ${error}`
      );
    }

    return {
      analysis: {
        currentState: "Análise automática básica - Gemini indisponível",
        issues: ["Sistema Gemini não respondeu no tempo esperado"],
        opportunities: ["Aplicar organização básica baseada em heurísticas"],
      },
      recommendations,
    };
  }

  /**
   * Execute the approved recommendations (YOLO mode)
   */
  private async executeRecommendations(recommendations: any): Promise<void> {
    if (!recommendations || !recommendations.recommendations) {
      await this.logger.error("🤖 No recommendations to execute");
      return;
    }

    await this.logger.info(
      `🤖 Executing ${recommendations.recommendations.length} recommendations in YOLO mode`
    );

    // Sort by priority (high -> medium -> low)
    const sortedRecommendations = recommendations.recommendations.sort(
      (a: any, b: any) => {
        const priorityOrder: Record<string, number> = {
          high: 3,
          medium: 2,
          low: 1,
        };
        return (
          (priorityOrder[b.priority] || 1) - (priorityOrder[a.priority] || 1)
        );
      }
    );

    for (const recommendation of sortedRecommendations) {
      try {
        await this.logger.info(`🤖 Executing: ${recommendation.description}`);

        const action = recommendation.action;
        const params = { project_path: this.projectPath, ...action.params };

        switch (action.function) {
          case "links_create":
            await this.links.linksCreate(
              params.context,
              params.subcontext,
              params.description,
              params.memory_path
            );
            break;

          case "memory_main_add_context":
            try {
              // Check if context already exists
              const mainMemory = await this.mainMemory.memoryMainGet();
              let exists = false;
              if (mainMemory.contexts) {
                if (Array.isArray(mainMemory.contexts)) {
                  exists = mainMemory.contexts.some(
                    (ctx: any) => ctx.name === params.name
                  );
                } else if (typeof mainMemory.contexts === "object") {
                  exists = Object.prototype.hasOwnProperty.call(
                    mainMemory.contexts,
                    params.name
                  );
                }
              }
              if (exists) {
                await this.logger.info(
                  `Context '${params.name}' already exists, skipping`
                );
                break;
              }

              await this.mainMemory.memoryMainAddContext(
                params.name,
                params.description,
                params.priority
              );
            } catch (error) {
              await this.logger.error(
                `Failed to add context ${params.name}: ${error}`
              );
            }
            break;

          case "memory_create":
            try {
              await this.memory.memoryCreate(
                params.context,
                params.subcontext,
                params.title,
                params.content,
                params.importance,
                params.tags
              );
            } catch (error) {
              await this.logger.error(
                `Failed to create memory '${params.title}': ${error}`
              );
            }
            break;

          case "submemory_create":
            await this.submemory.submemoryCreate(
              params.context,
              params.name,
              params.content
            );
            break;

          default:
            await this.logger.warn(`🤖 Unknown function: ${action.function}`);
        }

        await this.logger.info(`✅ Executed: ${recommendation.description}`);
      } catch (error) {
        await this.logger.error(
          `❌ Failed to execute: ${recommendation.description} - ${error}`
        );
      }
    }
  }

  /**
   * Get the project path this organizer is managing
   */
  getProjectPath(): string {
    return this.projectPath;
  }
}

/**
 * Multi-path memory organizer that manages multiple projects
 */
export class MultiPathMemoryOrganizer {
  private organizers: Map<string, MemoryOrganizer> = new Map();
  private isRunning = false;

  /**
   * Start organizing memory for multiple paths
   */
  start(projectPaths: string[], intervalMinutes = 1): void {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;

    for (const projectPath of projectPaths) {
      const organizer = new MemoryOrganizer(projectPath);
      organizer.start(intervalMinutes);
      this.organizers.set(projectPath, organizer);
    }
  }

  /**
   * Stop all memory organizers
   */
  stop(): void {
    for (const organizer of this.organizers.values()) {
      organizer.stop();
    }

    this.organizers.clear();
    this.isRunning = false;
  }

  /**
   * Get status of all organizers
   */
  getStatus(): { path: string; active: boolean }[] {
    return Array.from(this.organizers.entries()).map(([path, organizer]) => ({
      path,
      active: organizer.isActive(),
    }));
  }

  /**
   * Check if the multi-path organizer is running
   */
  isActive(): boolean {
    return this.isRunning;
  }
}
