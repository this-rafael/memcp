import cluster, { Worker } from "cluster";
import { cpus } from "os";

const numCPUs = cpus().length;

export class MCPClusterManager {
  private workers: Worker[] = [];

  start() {
    if (cluster.isPrimary) {
      console.error(`Primary process ${process.pid} is running`);

      // Criar workers
      for (let i = 0; i < Math.min(numCPUs, 4); i++) {
        this.forkWorker();
      }

      cluster.on("exit", (worker: Worker, code: number, signal: string) => {
        console.error(`Worker ${worker.process.pid} died`);
        this.forkWorker(); // Restart worker
      });

      // Handle graceful shutdown
      process.on("SIGTERM", () => {
        this.shutdown();
      });

      process.on("SIGINT", () => {
        this.shutdown();
      });
    } else {
      // Worker process - run the MCP server
      this.startMCPServer();
    }
  }

  private forkWorker() {
    const worker = cluster.fork();
    this.workers.push(worker);

    worker.on("message", (message: any) => {
      // Handle inter-process communication
      this.handleWorkerMessage(worker, message);
    });
  }

  private async startMCPServer() {
    try {
      // Start the MCP server in worker process
      await this.runMCPServer();
    } catch (error) {
      console.error(`Worker ${process.pid} failed to start:`, error);
      process.exit(1);
    }
  }

  private async runMCPServer() {
    // Import your MCP server components
    const { Server } = await import(
      "@modelcontextprotocol/sdk/server/index.js"
    );
    const { StdioServerTransport } = await import(
      "@modelcontextprotocol/sdk/server/stdio.js"
    );

    const server = new Server(
      { name: "memory-mcp", version: "1.0.0" },
      { capabilities: { tools: {}, resources: {} } }
    );

    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error(`Memory MCP server running on stdio (Worker ${process.pid})`);
  }

  private handleWorkerMessage(worker: Worker, message: any) {
    // Handle communication between workers if needed
    // For example, cache invalidation, load balancing, etc.
  }

  private shutdown() {
    console.error("Shutting down cluster...");

    this.workers.forEach((worker) => {
      worker.kill("SIGTERM");
    });

    setTimeout(() => {
      this.workers.forEach((worker) => {
        if (!worker.isDead()) {
          worker.kill("SIGKILL");
        }
      });
      process.exit(0);
    }, 5000);
  }
}
