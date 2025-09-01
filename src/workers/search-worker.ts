import { Worker, isMainThread, parentPort } from "worker_threads";
import { SearchIndex } from "../indexing/search-index.js";

export class SearchWorkerPool {
  private workers: Worker[] = [];
  private workerIndex = 0;
  private poolSize = 2; // Número de workers

  constructor() {
    if (!isMainThread) {
      throw new Error("SearchWorkerPool can only be used in main thread");
    }
    this.initWorkers();
  }

  private initWorkers() {
    for (let i = 0; i < this.poolSize; i++) {
      const worker = new Worker(__filename);
      this.workers.push(worker);
    }
  }

  async search(query: string, options: any): Promise<any> {
    const worker = this.workers[this.workerIndex];
    this.workerIndex = (this.workerIndex + 1) % this.poolSize;

    return new Promise((resolve, reject) => {
      worker.postMessage({ query, options });

      worker.once("message", (result) => {
        if (result.error) {
          reject(new Error(result.error));
        } else {
          resolve(result.data);
        }
      });

      worker.once("error", reject);
    });
  }

  destroy() {
    this.workers.forEach((worker) => worker.terminate());
  }
}

// Worker code - only runs in worker threads
if (!isMainThread) {
  // Código do worker
  parentPort?.on("message", async ({ query, options }) => {
    try {
      // Aqui você executaria a busca pesada
      const searchIndex = new SearchIndex(""); // Configurar path apropriado
      const result = await searchIndex.search(query, options);

      parentPort?.postMessage({ data: result });
    } catch (error) {
      parentPort?.postMessage({
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });
}
