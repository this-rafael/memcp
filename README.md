# MemCP - Model Context Protocol Memory Server

A sophisticated MCP (Model Context Protocol) server implementation that provides advanced memory management capabilities for AI applications with parallel processing, global installation, and multi-path monitoring support.

## 🚀 Features

- **Structured Memory Management**: Organize memories by context and subcontext
- **Full-Text Search**: Advanced search capabilities across all memory content
- **Link Management**: Create connections between different memory entries
- **Context-Aware Operations**: Navigate and manage memories within specific contexts
- **Parallel Processing**: Worker threads and cluster management for high performance
- **Multi-Path Monitoring**: Monitor multiple project directories simultaneously
- **Heartbeat Monitoring**: Real-time system health monitoring with configurable intervals
- **Global Installation**: Available as global command-line tool
- **Validation System**: Ensure data integrity and consistency
- **TypeScript Support**: Full type safety and IntelliSense support

## 📦 Installation

### Local Installation

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Start with cluster mode (default)
npm start
```

### Global Installation

```bash
# Install globally
npm link

# Use anywhere as global command
memcp --help
```

## 🏃 Quick Start

### Basic Usage

```bash
# Initialize memory system for current directory
memcp init --project-path $(pwd)

# Start with automatic heartbeat monitoring (10s interval)
memcp

# Start with custom heartbeat interval
memcp --heartbeat 5

# Monitor multiple directories
memcp --paths "/home/user/project1,/home/user/project2"
```

### Memory Operations

```bash
# Create a new memory
memcp memory create --context "project" --subcontext "tasks" --title "Feature Implementation" --content "Implement user authentication system"

# Search memories
memcp search --query "authentication"

# Get system statistics
memcp stats
```

## 🔧 Configuration

### Environment Variables

- `MCP_SERVER_PORT`: Server port (default: 3000)
- `MCP_LOG_LEVEL`: Logging level (debug, info, warn, error)
- `MCP_PROJECT_PATH`: Default project path for memory operations
- `MCP_MONITORING_PATHS`: Comma-separated paths for multi-directory monitoring
- `MCP_HEARTBEAT_INTERVAL`: Heartbeat interval in seconds (default: 10)

### Command Line Options

```bash
memcp [options]

Options:
  --parallel              Enable parallel processing (default: true)
  --workers <number>      Number of worker threads (default: 4)
  --heartbeat <seconds>   Heartbeat interval in seconds (default: 10)
  --paths <paths>         Comma-separated paths to monitor
  --project-path <path>   Project path for memory operations
  --help                  Display help information
```

## 🏗️ Project Structure

```
src/
├── index.ts              # Main server implementation with heartbeat integration
├── types.ts              # TypeScript type definitions
├── tools/                # MCP tool implementations
│   ├── parallel-memory.tool.ts  # Parallel processing tools
│   └── ...               # Other tool implementations
├── utils/                # Utility functions
│   ├── background-tasks.ts      # Background task management
│   ├── heartbeat-monitor.ts     # Single-path heartbeat monitoring
│   ├── multi-path-heartbeat.ts  # Multi-path heartbeat monitoring
│   └── file-system.ts          # File system utilities
├── workers/              # Worker thread implementations
│   └── search-worker.ts  # Search worker pool
├── cluster/              # Cluster management
│   └── cluster-manager.ts       # MCP cluster manager
├── validation/           # Data validation system
├── cache/                # Memory caching layer
└── indexing/             # Search indexing system

bin/
├── memory-mcp.mjs              # Original MCP server launcher
├── memory-mcp-parallel.mjs     # Parallel MCP server launcher
└── memcp-global.mjs            # Global executable entry point
```

## 🔍 Monitoring System

### Heartbeat Files

The system creates `ia-memory/heartbeat.log` files in monitored directories with entries like:

```
2025-09-01T11:17:08.486Z - STARTED - PID:151868
2025-09-01T11:17:11.491Z - RUNNING - PID:151868
2025-09-01T11:17:14.494Z - RUNNING - PID:151868
2025-09-01T11:17:16.328Z - STOPPED - PID:151868
```

### Real-time Monitoring

```bash
# Monitor single path heartbeat
tail -f ia-memory/heartbeat.log

# Monitor multiple paths (in separate terminals)
tail -f /path/to/project1/ia-memory/heartbeat.log
tail -f /path/to/project2/ia-memory/heartbeat.log

# Check heartbeat status
memcp heartbeat_status --project-path /path/to/project
```

## 🔧 API Reference

### Memory Operations

- `memory_create`: Create a new memory entry
- `memory_read`: Read memory by path
- `memory_main_get`: Get main memory or specific section
- `memory_main_update`: Update main memory section
- `memory_main_add_context`: Add new context to main memory

### Search Operations

- `search_memories`: Full-text search across memories
- `get_memory_tree`: Get memory tree structure
- `get_filesystem_tree`: Get file system tree

### Link Management

- `links_create`: Create new link between memories
- `links_read`: Read links for context/subcontext

### System Operations

- `init`: Initialize memory system
- `stats`: Get system statistics
- `validate_system`: Validate system integrity
- `heartbeat_status`: Get heartbeat monitor status

### Parallel Processing

- `parallel_memory_tools`: Access to parallelized memory operations
- Background task queue management
- Worker thread pool management
- Cluster-based processing

## 📊 Performance Features

### Parallel Processing

- **Worker Threads**: Dedicated workers for search and indexing operations
- **Cluster Management**: Multiple server instances for load balancing
- **Background Tasks**: Non-blocking operations for system maintenance
- **Connection Pooling**: Efficient resource management

### Monitoring & Health

- **Heartbeat System**: Real-time health monitoring across multiple directories
- **Process Management**: Automatic PID tracking and lifecycle management
- **System Statistics**: Performance metrics and usage analytics
- **Validation Checks**: Continuous integrity monitoring

## 🎯 Usage Examples

### Single Project Monitoring

```bash
# Start in current directory with default settings
memcp

# Custom heartbeat interval
memcp --heartbeat 3
```

### Multi-Project Monitoring

```bash
# Monitor multiple projects
memcp --paths "/home/user/project1,/home/user/project2,/home/user/project3"

# Via environment variable
export MCP_MONITORING_PATHS="/path1,/path2"
memcp
```

### Development Workflow

```bash
# Initialize new project
cd /path/to/new/project
memcp init

# Start monitoring with faster heartbeat for development
memcp --heartbeat 2

# Check system health
memcp stats
memcp heartbeat_status
```

## 🧪 Testing

```bash
# Run integration tests
npm test

# Test heartbeat functionality
node test-heartbeat.mjs

# Test multi-path monitoring
MCP_MONITORING_PATHS="/path1,/path2" node test-multi-path-heartbeat.mjs
```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🔗 Related

- [Model Context Protocol](https://modelcontextprotocol.io/) - Official MCP specification
- [Claude MCP Integration](https://docs.anthropic.com/en/docs/build-with-claude/model-context-protocol) - Anthropic's MCP documentation

## 📁 Estrutura do Sistema

```
project/
├── .memory/
│   ├── main.sjson              # Configuração principal e contextos
│   ├── context1/
│   │   ├── links.csv           # Links para submemórias
│   │   ├── subcontext1/
│   │   │   ├── submemory.json5 # Metadados da submemória
│   │   │   └── memories/       # Arquivos de memória
│   │   │       ├── memory1.md
│   │   │       └── memory2.md
│   │   └── subcontext2/
│   │       └── ...
│   ├── context2/
│   │   └── ...
│   ├── .index/                 # Índices SQLite FTS5
│   │   ├── main.db
│   │   └── search.db
│   └── .cache/                 # Cache de performance
│       ├── main.json
│       ├── links.json
│       └── memories.json
└── .memoryignore              # Arquivos Git a ignorar
```

## 🛠️ Instalação

```bash
# Clone o projeto
git clone <repository-url>
cd memcp

# Instale dependências
pnpm install

# Compile o projeto
pnpm build

# Torne o binário executável
chmod +x bin/memcp.mjs
```

## 🎯 Uso Básico

### Inicialização do Sistema

```bash
# Inicializar sistema de memória em um projeto
./bin/memcp.mjs init /path/to/project
```

### Operações Principais via MCP

```javascript
// Criar um contexto principal
{
  "name": "memory_main_add_context",
  "arguments": {
    "project_path": "/path/to/project",
    "name": "desenvolvimento",
    "description": "Contexto para desenvolvimento de software",
    "priority": 8
  }
}

// Criar uma memória
{
  "name": "memory_create",
  "arguments": {
    "project_path": "/path/to/project",
    "context": "desenvolvimento",
    "subcontext": "backend",
    "title": "Arquitetura API REST",
    "content": "# Arquitetura API REST\n\nDescrição da arquitetura...",
    "tags": ["api", "rest", "arquitetura"],
    "importance": "high"
  }
}

// Buscar memórias
{
  "name": "search_memories",
  "arguments": {
    "project_path": "/path/to/project",
    "query": "arquitetura api",
    "options": {
      "contexts": ["desenvolvimento"],
      "tags": ["api"],
      "limit": 10
    }
  }
}
```

## 🔧 Ferramentas Disponíveis

### Inicialização e Setup

- `init` - Inicializar sistema de memória
- `validate_system` - Validar integridade do sistema

### Operações Main Memory

- `memory_main_get` - Obter memória principal ou seção
- `memory_main_update` - Atualizar seção da memória principal
- `memory_main_add_context` - Adicionar novo contexto

### Operações de Links

- `links_create` - Criar novo link
- `links_read` - Ler links para contexto/subcontexto
- `links_search` - Buscar links com correspondência fuzzy
- `links_validate` - Validar links em contexto

### Operações de Memória

- `memory_create` - Criar nova memória
- `memory_read` - Ler memória por caminho
- `memory_update` - Atualizar conteúdo e/ou frontmatter
- `memory_delete` - Deletar memória
- `memory_move` - Mover memória para diferente contexto/subcontexto

### Operações de Busca

- `search_memories` - Busca full-text de memórias
- `find_similar` - Encontrar memórias similares
- `reindex_all` - Reindexar todas as memórias

### Operações de Navegação

- `get_memory_tree` - Obter estrutura em árvore de memórias
- `get_related_memories` - Obter memórias relacionadas
- `get_memory_graph` - Obter representação em grafo de memórias
- `get_recent_memories` - Obter memórias recentes
- `get_important_memories` - Obter memórias importantes

### Operações de Manutenção

- `cleanup_broken_links` - Limpar links quebrados
- `optimize_index` - Otimizar índice de busca
- `compact_cache` - Compactar cache
- `stats` - Obter estatísticas do sistema
- `export_to_json` - Exportar sistema para JSON
- `import_from_json` - Importar sistema de JSON

## 📚 Recursos MCP

O servidor disponibiliza recursos via MCP:

- `memory://main` - Configuração da memória principal
- `memory://tree` - Visão hierárquica da estrutura de memória
- `memory://stats` - Estatísticas do sistema e informações de saúde

## 🏗️ Arquitetura Técnica

### Componentes Principais

1. **MemoryCache**: Cache write-through com invalidação inteligente
2. **FileSystemUtils**: Utilitários para leitura/escrita de múltiplos formatos
3. **SearchIndex**: Sistema de indexação SQLite FTS5 com ranking BM25
4. **ValidationSystem**: Validação Zod com auto-correção
5. **Tool Classes**: Classes especializadas para cada tipo de operação

### Fluxo de Dados

```
MCP Client → Server → Tool Class → Cache → FileSystem
                                      ↓
                                 SearchIndex
```

### Cache Strategy

- **Write-Through**: Atualizações simultâneas em cache e armazenamento
- **Invalidação Seletiva**: Apenas dados modificados são invalidados
- **Lazy Loading**: Carregamento sob demanda de dados não-críticos

## 🔍 Sistema de Validação

### Schemas Zod

- **MainMemorySchema**: Validação da configuração principal
- **SubmemorySchema**: Validação de metadados de submemórias
- **MemoryFrontmatterSchema**: Validação de frontmatter de memórias
- **LinkSchema**: Validação de estrutura de links

### Auto-Correção

- Formatação automática de tags
- Correção de caminhos de memória
- Validação de regras de negócio (nomes de contexto, etc.)

## 🚦 Configuração

### Variáveis de Ambiente

- `MEMORY_PROJECT_PATH` - Caminho padrão do projeto para recursos MCP
- `NODE_ENV` - Ambiente de execução (development/production)

### Configuração do Git

O sistema automaticamente cria `.memoryignore` para excluir arquivos temporários do Git:

```
.memory/.cache/
.memory/.index/
```

## 🧪 Testes

```bash
# Executar testes
pnpm test

# Executar testes com coverage
pnpm test:coverage

# Executar testes em modo watch
pnpm test:watch
```

## 📈 Performance

### Benchmarks Típicos

- **Inicialização**: ~50ms para projetos pequenos
- **Busca FTS5**: ~10ms para consultas simples, ~50ms para consultas complexas
- **Cache Hit**: ~1ms para dados em cache
- **Indexação**: ~100ms para 1000 memórias

### Otimizações

- Cache write-through para acesso rápido
- Índices SQLite otimizados
- Lazy loading de recursos não-críticos
- Compactação automática de cache

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📄 Licença

Este projeto está licenciado sob a MIT License - veja o arquivo [LICENSE](LICENSE) para detalhes.

## 🔗 Links Relacionados

- [Model Context Protocol (MCP)](https://github.com/modelcontextprotocol)
- [SQLite FTS5](https://www.sqlite.org/fts5.html)
- [Zod Validation](https://github.com/colinhacks/zod)
- [Projeto folderinfo-mcp](../folderinfo-mcp/)

---

**Desenvolvido com ❤️ para sistemas de memória inteligente**
