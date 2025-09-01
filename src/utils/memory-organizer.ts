import { GeminiExecutor } from "../executors/gemini-executor.js";
import { FileSystemUtils } from "./file-system.js";
import { MainMemoryTools } from "../tools/main-memory.tool.js";
import { LinksTools } from "../tools/links.tool.js";
import { MemoryTools } from "../tools/memory.tool.js";
import { SubmemoryTools } from "../tools/submemory.tool.js";
import { NavigationTools } from "../tools/navigation.tool.js";
import path from "path";
import fs from "fs";

/**
 * MemoryOrganizer uses Gemini AI to automatically organize and optimize memory structure
 */
export class MemoryOrganizer {
  private gemini: GeminiExecutor;
  private projectPath: string;
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning = false;

  // Tool instances
  private mainMemory: MainMemoryTools;
  private links: LinksTools;
  private memory: MemoryTools;
  private submemory: SubmemoryTools;
  private navigation: NavigationTools;

  constructor(projectPath: string) {
    this.projectPath = projectPath;
    this.gemini = GeminiExecutor.create();
    
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
      console.log("🤖 Memory organizer already running");
      return;
    }

    console.log(`🤖 Starting memory organizer for ${this.projectPath} (every ${intervalMinutes}min)`);
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
    console.log("🤖 Memory organizer stopped");
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
      console.log(`🤖 [${new Date().toISOString()}] Running memory organization for ${this.projectPath}`);
      
      // Check if ia-memory directory exists
      const memoryPath = path.join(this.projectPath, "ia-memory");
      if (!fs.existsSync(memoryPath)) {
        console.log(`🤖 No ia-memory directory found in ${this.projectPath}, skipping`);
        return;
      }

      // 1. Analyze current memory structure
      const memoryAnalysis = await this.analyzeCurrentMemory();
      
      // 2. Get available MCP functions
      const availableFunctions = this.getAvailableFunctions();
      
      // 3. Generate organization recommendations using Gemini
      const recommendations = await this.generateRecommendations(memoryAnalysis, availableFunctions);
      
      // 4. Execute approved recommendations (yolo mode)
      await this.executeRecommendations(recommendations);
      
      console.log(`🤖 Memory organization completed for ${this.projectPath}`);
      
    } catch (error) {
      console.error(`🤖 Error in memory organization for ${this.projectPath}:`, error);
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
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error("Error analyzing memory:", error);
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
      "heartbeat_status - Get heartbeat monitor status"
    ];
  }

  /**
   * Generate organization recommendations using Gemini AI
   */
  private async generateRecommendations(memoryAnalysis: any, availableFunctions: string[]): Promise<any> {
    const prompt = `
🤖 **MEMORY ORGANIZER AGENT - YOLO MODE** 🤖

Você é um agente especializado em organização inteligente de sistemas de memória MCP. Sua missão é analisar a estrutura atual e propor melhorias automáticas para otimizar a organização, criar links úteis e melhorar a usabilidade.

## 📊 ANÁLISE ATUAL DA MEMÓRIA

\`\`\`json
${JSON.stringify(memoryAnalysis, null, 2)}
\`\`\`

## 🛠️ FUNÇÕES DISPONÍVEIS

${availableFunctions.map(func => `- ${func}`).join('\n')}

## 🎯 OBJETIVOS DE ORGANIZAÇÃO

1. **Criar Links Inteligentes**: Identificar memórias relacionadas e criar conexões lógicas
2. **Otimizar Estrutura de Contextos**: Reorganizar contextos para melhor navegação
3. **Melhorar Submemórias**: Agrupar informações relacionadas em submemórias coerentes
4. **Limpar Redundâncias**: Identificar e consolidar informações duplicadas
5. **Estabelecer Hierarquias**: Criar estruturas hierárquicas lógicas

## 📋 FORMATO DE RESPOSTA

Responda APENAS com um JSON válido seguindo este formato:

\`\`\`json
{
  "analysis": {
    "currentState": "Breve descrição do estado atual",
    "issues": ["Problema 1", "Problema 2"],
    "opportunities": ["Oportunidade 1", "Oportunidade 2"]
  },
  "recommendations": [
    {
      "type": "create_link",
      "priority": "high|medium|low", 
      "description": "Descrição da ação",
      "action": {
        "function": "links_create",
        "params": {
          "context": "nome_contexto",
          "subcontext": "nome_subcontexto", 
          "description": "Descrição do link",
          "memory_path": "caminho/para/memoria"
        }
      }
    },
    {
      "type": "create_context",
      "priority": "high|medium|low",
      "description": "Descrição da ação", 
      "action": {
        "function": "memory_main_add_context",
        "params": {
          "name": "novo_contexto",
          "description": "Descrição do contexto",
          "priority": 5
        }
      }
    },
    {
      "type": "create_memory",
      "priority": "high|medium|low",
      "description": "Descrição da ação",
      "action": {
        "function": "memory_create", 
        "params": {
          "context": "contexto",
          "subcontext": "subcontexto",
          "title": "Título da memória",
          "content": "Conteúdo organizacional",
          "importance": "medium",
          "tags": ["organização", "automático"]
        }
      }
    }
  ]
}
\`\`\`

## ⚡ MODO YOLO ATIVADO

- Seja PROATIVO: Sugira melhorias mesmo sem solicitação explícita
- Seja INTELIGENTE: Use padrões e heurísticas para identificar oportunidades
- Seja ÚTIL: Foque em ações que realmente melhorem a organização
- Limite-se a 5-8 recomendações por execução para não sobrecarregar

Analise e organize! 🚀
    `;

    try {
      const response = await this.gemini.execute(
        "Analise a estrutura de memória e gere recomendações de organização",
        prompt,
        300 // 5 minutos para análise completa
      );
      
      // Extract JSON from response
      const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[1]);
      }
      
      // Try to parse the entire response as JSON
      return JSON.parse(response);
      
    } catch (error) {
      console.error("Error generating recommendations:", error);
      
      // Fallback: create simple recommendations based on analysis
      return this.createFallbackRecommendations(memoryAnalysis);
    }
  }

  /**
   * Create fallback recommendations when Gemini fails
   */
  private createFallbackRecommendations(memoryAnalysis: any): any {
    const recommendations = [];
    
    try {
      // Basic analysis
      if (memoryAnalysis && memoryAnalysis.stats) {
        const stats = memoryAnalysis.stats;
        
        // Recommend creating links if there are many memories but no links
        if (stats.total_memories > 5 && (!memoryAnalysis.links || memoryAnalysis.links.length === 0)) {
          recommendations.push({
            type: "create_memory",
            priority: "medium",
            description: "Criar memória organizacional para estabelecer conexões entre conceitos relacionados",
            action: {
              function: "memory_create",
              params: {
                context: "general",
                subcontext: "organization",
                title: "Mapa de Conexões do Projeto",
                content: "Esta memória serve como um índice organizacional para facilitar a navegação entre os diferentes conceitos e módulos do projeto. Links e relacionamentos serão estabelecidos gradualmente.",
                importance: "medium",
                tags: ["organização", "índice", "navegação"]
              }
            }
          });
        }
        
        // Recommend organizing contexts if there are too many
        if (stats.total_contexts > 8) {
          recommendations.push({
            type: "create_context",
            priority: "low",
            description: "Criar contexto para consolidar informações fragmentadas",
            action: {
              function: "memory_main_add_context",
              params: {
                name: "consolidation",
                description: "Contexto para consolidar e organizar informações que estão espalhadas em múltiplos contextos",
                priority: 6
              }
            }
          });
        }
      }
    } catch (error) {
      console.error("Error creating fallback recommendations:", error);
    }
    
    return {
      analysis: {
        currentState: "Análise automática básica - Gemini indisponível",
        issues: ["Sistema Gemini não respondeu no tempo esperado"],
        opportunities: ["Aplicar organização básica baseada em heurísticas"]
      },
      recommendations
    };
  }

  /**
   * Execute the approved recommendations (YOLO mode)
   */
  private async executeRecommendations(recommendations: any): Promise<void> {
    if (!recommendations || !recommendations.recommendations) {
      console.log("🤖 No recommendations to execute");
      return;
    }

    console.log(`🤖 Executing ${recommendations.recommendations.length} recommendations in YOLO mode`);
    
    // Sort by priority (high -> medium -> low)
    const sortedRecommendations = recommendations.recommendations.sort((a: any, b: any) => {
      const priorityOrder: Record<string, number> = { high: 3, medium: 2, low: 1 };
      return (priorityOrder[b.priority] || 1) - (priorityOrder[a.priority] || 1);
    });

    for (const recommendation of sortedRecommendations) {
      try {
        console.log(`🤖 Executing: ${recommendation.description}`);
        
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
            await this.mainMemory.memoryMainAddContext(
              params.name,
              params.description,
              params.priority
            );
            break;
            
          case "memory_create":
            await this.memory.memoryCreate(
              params.context,
              params.subcontext,
              params.title,
              params.content,
              params.importance,
              params.tags
            );
            break;
            
          case "submemory_create":
            await this.submemory.submemoryCreate(
              params.context,
              params.name,
              params.content
            );
            break;
            
          default:
            console.log(`🤖 Unknown function: ${action.function}`);
        }
        
        console.log(`✅ Executed: ${recommendation.description}`);
        
      } catch (error) {
        console.error(`❌ Failed to execute: ${recommendation.description}`, error);
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
      console.log("🤖 Multi-path memory organizer already running");
      return;
    }

    console.log(`🤖 Starting memory organizer for ${projectPaths.length} projects`);
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
    console.log("🤖 Stopping all memory organizers");
    
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
      active: organizer.isActive()
    }));
  }

  /**
   * Check if the multi-path organizer is running
   */
  isActive(): boolean {
    return this.isRunning;
  }
}
