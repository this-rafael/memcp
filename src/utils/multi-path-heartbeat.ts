import { EventEmitter } from "events";
import { promises as fs } from "fs";
import * as path from "path";
import { MultiPathMemoryOrganizer } from "./memory-organizer.js";

export interface MultiPathHeartbeatOptions {
  interval?: number; // em segundos
  paths?: string[];
  filename?: string;
  enabled?: boolean;
  memoryOrganizerEnabled?: boolean; // Nova opção para organização de memória
  memoryOrganizerInterval?: number; // Intervalo em minutos para organização
}

/**
 * Sistema de heartbeat que monitora múltiplos diretórios simultaneamente
 * Escreve timestamps em arquivos de heartbeat em cada path especificado
 */
export class MultiPathHeartbeatMonitor extends EventEmitter {
  private interval: NodeJS.Timeout | null = null;
  private options: Required<MultiPathHeartbeatOptions>;
  private isRunning = false;
  private heartbeatFiles: Map<string, string> = new Map();
  private memoryOrganizer: MultiPathMemoryOrganizer | null = null;

  constructor(options: MultiPathHeartbeatOptions = {}) {
    super();

    this.options = {
      interval: options.interval || 10, // 10 segundos por padrão
      paths: options.paths || [process.cwd()],
      filename: options.filename || "heartbeat.log",
      enabled: options.enabled !== false, // habilitado por padrão
      memoryOrganizerEnabled: options.memoryOrganizerEnabled !== false, // habilitado por padrão
      memoryOrganizerInterval: options.memoryOrganizerInterval || 1, // 1 minuto por padrão
    };

    // Configurar os caminhos dos arquivos de heartbeat
    this.setupHeartbeatFiles();

    // Inicializar organizador de memória se habilitado
    if (this.options.memoryOrganizerEnabled) {
      this.memoryOrganizer = new MultiPathMemoryOrganizer();
    }
  }

  /**
   * Configura os caminhos dos arquivos de heartbeat para cada path monitorado
   */
  private setupHeartbeatFiles(): void {
    this.heartbeatFiles.clear();

    for (const projectPath of this.options.paths) {
      const memoryPath = path.join(projectPath, "ia-memory");
      const filePath = path.join(memoryPath, this.options.filename);
      this.heartbeatFiles.set(projectPath, filePath);
    }
  }

  /**
   * Inicia o monitoramento de heartbeat para todos os paths
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      console.error("Multi-path heartbeat monitor is already running");
      return;
    }

    if (!this.options.enabled) {
      console.error("Multi-path heartbeat monitor is disabled");
      return;
    }

    this.isRunning = true;

    try {
      // Garantir que os diretórios ia-memory existem
      await this.ensureMemoryDirectories();

      // Escrever heartbeat inicial
      await this.writeHeartbeatToAll("STARTED");

      // Configurar o interval
      this.interval = setInterval(() => {
        this.writeHeartbeatToAll("RUNNING").catch((error) => {
          this.emit("error", error);
        });
      }, this.options.interval * 1000);

      console.error(
        `Multi-path heartbeat monitor started for ${this.options.paths.length} paths (${this.options.interval}s interval)`
      );
      this.options.paths.forEach((p) => {
        console.error(`  - ${this.heartbeatFiles.get(p)}`);
      });

      // Iniciar organizador de memória se habilitado
      if (this.memoryOrganizer && this.options.memoryOrganizerEnabled) {
        console.error("🤖 Starting memory organizer with YOLO mode");
        this.memoryOrganizer.start(
          this.options.paths,
          this.options.memoryOrganizerInterval
        );
      }

      this.emit("started");
    } catch (error) {
      this.emit("error", error);
      throw error;
    }
  }

  /**
   * Para o monitoramento de heartbeat
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }

    // Parar organizador de memória
    if (this.memoryOrganizer) {
      console.error("🤖 Stopping memory organizer");
      this.memoryOrganizer.stop();
    }

    try {
      await this.writeHeartbeatToAll("STOPPED");
      this.emit("stopped");
    } catch (error) {
      this.emit("error", error);
    }

    this.isRunning = false;
    console.error("Multi-path heartbeat monitor stopped");
  }

  /**
   * Garantir que os diretórios ia-memory existem em todos os paths
   */
  private async ensureMemoryDirectories(): Promise<void> {
    const promises = this.options.paths.map(async (projectPath) => {
      const memoryPath = path.join(projectPath, "ia-memory");

      try {
        await fs.access(memoryPath);
      } catch {
        // Diretório não existe, criar
        await fs.mkdir(memoryPath, { recursive: true });
        console.error(`Created ia-memory directory: ${memoryPath}`);
      }
    });

    await Promise.all(promises);
  }

  /**
   * Escrever entrada de heartbeat em todos os arquivos
   */
  private async writeHeartbeatToAll(status: string = "RUNNING"): Promise<void> {
    const timestamp = new Date().toISOString();
    const entry = `${timestamp} - ${status} - PID:${process.pid}\n`;

    const promises = Array.from(this.heartbeatFiles.entries()).map(
      async ([projectPath, filePath]) => {
        try {
          await fs.appendFile(filePath, entry, "utf8");
        } catch (error) {
          // Se falhar ao escrever, tentar criar o arquivo
          try {
            await fs.writeFile(filePath, entry, "utf8");
          } catch (createError) {
            console.error(
              `Failed to write heartbeat for ${projectPath}:`,
              createError
            );
            throw createError;
          }
        }
      }
    );

    await Promise.all(promises);
  }

  /**
   * Ler últimas entradas do heartbeat de um path específico
   */
  async getRecentHeartbeats(
    projectPath: string,
    lines: number = 10
  ): Promise<string[]> {
    const filePath = this.heartbeatFiles.get(projectPath);
    if (!filePath) {
      throw new Error(`Path not monitored: ${projectPath}`);
    }

    try {
      const content = await fs.readFile(filePath, "utf8");
      const allLines = content
        .trim()
        .split("\n")
        .filter((line) => line.length > 0);
      return allLines.slice(-lines);
    } catch (error) {
      return [];
    }
  }

  /**
   * Ler últimas entradas de todos os paths monitorados
   */
  async getAllRecentHeartbeats(
    lines: number = 10
  ): Promise<Record<string, string[]>> {
    const result: Record<string, string[]> = {};

    const promises = Array.from(this.heartbeatFiles.keys()).map(
      async (projectPath) => {
        try {
          const entries = await this.getRecentHeartbeats(projectPath, lines);
          result[projectPath] = entries;
        } catch (error) {
          result[projectPath] = [];
        }
      }
    );

    await Promise.all(promises);
    return result;
  }

  /**
   * Limpar arquivos de heartbeat (manter apenas últimas N entradas)
   */
  async cleanup(keepLines: number = 1000): Promise<void> {
    const promises = Array.from(this.heartbeatFiles.entries()).map(
      async ([projectPath, filePath]) => {
        try {
          const content = await fs.readFile(filePath, "utf8");
          const lines = content
            .trim()
            .split("\n")
            .filter((line) => line.length > 0);

          if (lines.length > keepLines) {
            const toKeep = lines.slice(-keepLines);
            await fs.writeFile(filePath, toKeep.join("\n") + "\n", "utf8");
            console.error(
              `Heartbeat log cleaned up for ${projectPath} - kept last ${keepLines} entries`
            );
          }
        } catch (error) {
          console.error(
            `Failed to cleanup heartbeat log for ${projectPath}:`,
            error
          );
        }
      }
    );

    await Promise.all(promises);
  }

  /**
   * Status do monitor
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      paths: this.options.paths,
      heartbeatFiles: Object.fromEntries(this.heartbeatFiles),
      interval: this.options.interval,
      pid: process.pid,
    };
  }

  /**
   * Atualizar paths monitorados
   */
  updatePaths(newPaths: string[]): void {
    this.options.paths = newPaths;
    this.setupHeartbeatFiles();
  }
}

// Função para criar instância baseada em variáveis de ambiente
export function createHeartbeatFromEnv(): MultiPathHeartbeatMonitor {
  const pathsEnv = process.env.MCP_MONITORING_PATHS;
  const paths = pathsEnv
    ? pathsEnv
        .split(",")
        .map((p) => p.trim())
        .filter((p) => p.length > 0)
    : [process.cwd()];

  return new MultiPathHeartbeatMonitor({
    paths,
    interval: parseInt(process.env.MCP_HEARTBEAT_INTERVAL || "10"),
    enabled: process.env.MCP_HEARTBEAT !== "false",
    memoryOrganizerEnabled: process.env.MCP_MEMORY_ORGANIZER !== "false",
    memoryOrganizerInterval: parseInt(
      process.env.MCP_MEMORY_ORGANIZER_INTERVAL || "1"
    ),
  });
}
