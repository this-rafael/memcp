# Memory MCP Server

Um servidor MCP (Model Context Protocol) avançado para gerenciamento hierárquico e inteligente de memórias, similar ao projeto folderinfo-mcp, mas com funcionalidades expandidas para sistemas de memória empresariais.

## 🚀 Características Principais

- **Sistema de 4 Camadas**: Main Memory (SJSON) → Links (CSV) → Submemories (JSON5) → Memories (Markdown)
- **Cache Inteligente**: Estratégia write-through com invalidação seletiva
- **Busca Full-Text**: SQLite FTS5 com ranking BM25 e busca facetada
- **Validação Robusta**: Sistema Zod com auto-correção e validação de regras de negócio
- **Navegação Hierárquica**: Árvore de memórias e grafos de relacionamento
- **Operações CRUD Completas**: Para todas as camadas do sistema
- **Manutenção Automatizada**: Limpeza, otimização e compactação

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
