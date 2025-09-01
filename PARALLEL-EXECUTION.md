# Execução em Paralelo - MemCP

## **Visão Geral**

O MemCP agora suporta execução paralela e em background para melhorar a performance. Você tem várias opções:

## **Opções de Paralelização**

### **1. Background Tasks (Recomendado)**

Executa operações pesadas em background sem bloquear o servidor principal:

```bash
# Iniciar com background tasks habilitados (padrão)
npm run start

# Ou explicitamente:
MCP_BACKGROUND_TASKS=true npm run start
```

**Características:**

- ✅ Não bloqueia operações principais
- ✅ Operações de busca e indexação assíncronas
- ✅ Compatível com protocolo MCP
- ✅ Baixo overhead

### **2. Launcher Paralelo**

Usa o novo launcher com opções avançadas:

```bash
# Iniciar com paralelização básica
npm run start:parallel

# Iniciar com múltiplos workers
npm run start:cluster

# Opções manuais
node bin/memory-mcp-parallel.mjs --parallel --workers 4
```

**Características:**

- ✅ Controle sobre número de workers
- ✅ Restart automático em caso de falha
- ✅ Configuração via variáveis de ambiente

### **3. Worker Threads**

Para operações computacionalmente intensivas:

```typescript
import { SearchWorkerPool } from "./src/workers/search-worker.js";

const searchPool = new SearchWorkerPool();
const result = await searchPool.search(query, options);
```

## **Variáveis de Ambiente**

```bash
# Habilitar processamento paralelo
export MCP_PARALLEL=true

# Número máximo de workers
export MCP_MAX_WORKERS=4

# Habilitar background tasks
export MCP_BACKGROUND_TASKS=true

# Path do projeto (se necessário)
export MEMORY_PROJECT_PATH=/path/to/project
```

## **Exemplos Práticos**

### **Busca Assíncrona**

```typescript
import { ParallelMemoryTools } from "./src/tools/parallel-memory.tool.js";

const tools = new ParallelMemoryTools("/path/to/memory");

// Busca em background - retorna taskId imediatamente
const taskId = await tools.searchMemoriesAsync("minha consulta");

// Verificar status das tarefas
const status = tools.getTaskStatus();
console.log(status); // { running: ['search-123'], queued: [], maxConcurrent: 4 }
```

### **Operações Paralelas**

```typescript
// Executar múltiplas operações simultaneamente
const results = await tools.runParallelOperations([
  () => tools.searchMemoriesAsync("query1"),
  () => tools.rebuildIndexAsync(),
  () => tools.warmUpCacheAsync(),
]);
```

### **Reindexação em Background**

```typescript
// Não bloqueia outras operações
const taskId = await tools.rebuildIndexAsync();
console.log(`Reindexação iniciada: ${taskId}`);
```

## **Monitoramento**

### **Status das Tarefas**

```typescript
const status = tools.getTaskStatus();
/*
{
  running: ['search-1234567890', 'rebuild-index-1234567891'],
  queued: ['cache-warmup-1234567892'],
  maxConcurrent: 4
}
*/
```

### **Eventos de Background**

```typescript
tools.backgroundTasks.on("taskCompleted", ({ id, name, result }) => {
  console.log(`✅ Tarefa concluída: ${name} (${id})`);
});

tools.backgroundTasks.on("taskError", ({ id, name, error }) => {
  console.log(`❌ Tarefa falhou: ${name} (${id}):`, error);
});
```

## **Performance**

### **Antes (Síncrono)**

- Busca pesada: 2-5 segundos (bloqueia servidor)
- Reindexação: 10-30 segundos (bloqueia tudo)
- Cache reload: 1-3 segundos (bloqueia)

### **Depois (Paralelo)**

- Busca pesada: resposta imediata + resultado em background
- Reindexação: executa em paralelo com outras operações
- Cache reload: não impacta operações em andamento
- Múltiplas operações: executam simultaneamente

## **Limitações**

1. **Protocolo MCP**: Ainda depende de stdio (single process)
2. **Memória**: Workers compartilham heap do Node.js
3. **SQLite**: Database locks podem serializar algumas operações
4. **File System**: I/O ainda limitado pelo sistema

## **Recomendações**

- Use **Background Tasks** para a maioria dos casos
- Use **Worker Threads** apenas para CPU-intensive tasks
- Configure `MCP_MAX_WORKERS` baseado na sua CPU
- Monitor memory usage em produção

## **Troubleshooting**

### **High Memory Usage**

```bash
# Reduzir workers
export MCP_MAX_WORKERS=2

# Desabilitar background tasks se necessário
export MCP_BACKGROUND_TASKS=false
```

### **Task Queue Overflow**

```typescript
// Verificar se há muitas tarefas pendentes
const status = tools.getTaskStatus();
if (status.queued.length > 10) {
  console.warn("Many tasks queued, consider increasing workers");
}
```

### **Database Lock Issues**

- SQLite pode serializar writes
- Consider usando connection pooling se necessário
- Monitor lock contention nos logs
