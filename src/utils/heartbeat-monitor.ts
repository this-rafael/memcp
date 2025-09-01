import { EventEmitter } from "events";
import { promises as fs } from "fs";
import * as path from "path";

export interface HeartbeatOptions {
  interval?: number; // em segundos
  projectPath?: string;
  filename?: string;
  enabled?: boolean;
}

/**
 * Sistema de heartbeat que monitora se a aplicação está rodando
 * Escreve timestamps em um arquivo a cada intervalo configurado
 */
export class HeartbeatMonitor extends EventEmitter {
  private interval: NodeJS.Timeout | null = null;
  private options: Required<HeartbeatOptions>;
  private isRunning = false;
  private filePath: string;

  constructor(options: HeartbeatOptions = {}) {
    super();

    this.options = {
      interval: options.interval || 10, // 10 segundos por padrão
      projectPath: options.projectPath || process.cwd(),
      filename: options.filename || "heartbeat.log",
      enabled: options.enabled !== false, // habilitado por padrão
    };

    // Determinar o caminho do arquivo
    const memoryPath = path.join(this.options.projectPath, "ia-memory");
    this.filePath = path.join(memoryPath, this.options.filename);
  }

  /**
   * Inicia o monitoramento de heartbeat
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      console.error("Heartbeat monitor already running");
      return;
    }

    if (!this.options.enabled) {
      console.error("Heartbeat monitor disabled");
      return;
    }

    try {
      // Garantir que o diretório ia-memory existe
      await this.ensureMemoryDirectory();

      // Escrever entrada inicial
      await this.writeHeartbeat("STARTED");

      this.isRunning = true;

      // Configurar interval
      this.interval = setInterval(async () => {
        try {
          await this.writeHeartbeat("RUNNING");
          this.emit("heartbeat", { timestamp: new Date(), status: "RUNNING" });
        } catch (error) {
          this.emit("error", error);
          console.error("Heartbeat write error:", error);
        }
      }, this.options.interval * 1000);

      console.error(
        `Heartbeat monitor started - writing to ${this.filePath} every ${this.options.interval}s`
      );
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

    try {
      await this.writeHeartbeat("STOPPED");
      this.emit("stopped");
    } catch (error) {
      this.emit("error", error);
    }

    this.isRunning = false;
    console.error("Heartbeat monitor stopped");
  }

  /**
   * Garantir que o diretório ia-memory existe
   */
  private async ensureMemoryDirectory(): Promise<void> {
    const memoryPath = path.join(this.options.projectPath, "ia-memory");

    try {
      await fs.access(memoryPath);
    } catch {
      // Diretório não existe, criar
      await fs.mkdir(memoryPath, { recursive: true });
      console.error(`Created ia-memory directory: ${memoryPath}`);
    }
  }

  /**
   * Escrever entrada de heartbeat no arquivo
   */
  private async writeHeartbeat(status: string = "RUNNING"): Promise<void> {
    const timestamp = new Date().toISOString();
    const entry = `${timestamp} - ${status} - PID:${process.pid}\n`;

    try {
      await fs.appendFile(this.filePath, entry, "utf8");
    } catch (error) {
      // Se falhar ao escrever, tentar criar o arquivo
      await fs.writeFile(this.filePath, entry, "utf8");
    }
  }

  /**
   * Ler últimas entradas do heartbeat
   */
  async getRecentHeartbeats(lines: number = 10): Promise<string[]> {
    try {
      const content = await fs.readFile(this.filePath, "utf8");
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
   * Limpar arquivo de heartbeat (manter apenas últimas N entradas)
   */
  async cleanup(keepLines: number = 1000): Promise<void> {
    try {
      const content = await fs.readFile(this.filePath, "utf8");
      const lines = content
        .trim()
        .split("\n")
        .filter((line) => line.length > 0);

      if (lines.length > keepLines) {
        const toKeep = lines.slice(-keepLines);
        await fs.writeFile(this.filePath, toKeep.join("\n") + "\n", "utf8");
        console.error(
          `Heartbeat log cleaned up - kept last ${keepLines} entries`
        );
      }
    } catch (error) {
      console.error("Failed to cleanup heartbeat log:", error);
    }
  }

  /**
   * Status do monitor
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      filePath: this.filePath,
      interval: this.options.interval,
      pid: process.pid,
    };
  }
}

// Instância global
export const globalHeartbeat = new HeartbeatMonitor();
