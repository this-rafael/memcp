#!/usr/bin/env node

console.log('📋 === FERRAMENTAS E RECURSOS DO MCP MEMCP === 📋\n');

// Lista completa de ferramentas disponíveis
const tools = [
  {
    name: "init",
    category: "🔧 Inicialização",
    description: "Initialize memory system for a project",
    params: ["project_path"]
  },
  {
    name: "validate_system", 
    category: "🔧 Manutenção",
    description: "Validate system integrity",
    params: ["project_path"]
  },
  {
    name: "memory_main_get",
    category: "📄 Memória Principal", 
    description: "Get main memory or specific section",
    params: ["project_path", "section?"]
  },
  {
    name: "memory_main_update",
    category: "📄 Memória Principal",
    description: "Update main memory section", 
    params: ["project_path", "section", "data"]
  },
  {
    name: "memory_main_add_context",
    category: "📄 Memória Principal",
    description: "Add new context to main memory",
    params: ["project_path", "name", "description", "priority"]
  },
  {
    name: "links_create",
    category: "🔗 Links",
    description: "Create new link",
    params: ["project_path", "context", "subcontext", "description", "memory_path"]
  },
  {
    name: "links_read",
    category: "🔗 Links", 
    description: "Read links for context/subcontext",
    params: ["project_path", "context", "subcontext?"]
  },
  {
    name: "memory_create",
    category: "💭 Memórias",
    description: "Create new memory",
    params: ["project_path", "context", "subcontext", "title", "content", "tags?", "importance?"]
  },
  {
    name: "memory_read",
    category: "💭 Memórias",
    description: "Read memory by path", 
    params: ["project_path", "memory_path"]
  },
  {
    name: "search_memories",
    category: "🔍 Busca",
    description: "Search memories with full-text search",
    params: ["project_path", "query", "options?"]
  },
  {
    name: "get_memory_tree",
    category: "🌳 Navegação",
    description: "Get memory tree structure",
    params: ["project_path", "context?", "depth?"]
  },
  {
    name: "get_filesystem_tree", 
    category: "🌳 Navegação",
    description: "Get file system tree structure with file types",
    params: ["project_path"]
  },
  {
    name: "stats",
    category: "📊 Estatísticas",
    description: "Get system statistics",
    params: ["project_path"]
  }
];

// Recursos disponíveis
const resources = [
  {
    name: "Main Memory",
    uri: "memory://main",
    description: "Current main memory configuration and contexts"
  },
  {
    name: "Memory Tree", 
    uri: "memory://tree",
    description: "Hierarchical view of all memories organized by context"
  },
  {
    name: "System Statistics",
    uri: "memory://stats", 
    description: "System usage statistics and health metrics"
  }
];

console.log('🛠️  **FERRAMENTAS DISPONÍVEIS** 🛠️\n');

// Agrupar por categoria
const categories = {};
tools.forEach(tool => {
  if (!categories[tool.category]) {
    categories[tool.category] = [];
  }
  categories[tool.category].push(tool);
});

Object.entries(categories).forEach(([category, toolList]) => {
  console.log(`**${category}**`);
  toolList.forEach(tool => {
    console.log(`  ├─ \`${tool.name}\``);
    console.log(`  │  📝 ${tool.description}`);
    console.log(`  │  📋 Parâmetros: ${tool.params.join(', ')}`);
    console.log(`  │`);
  });
  console.log('');
});

console.log('📚 **RECURSOS DISPONÍVEIS** 📚\n');

resources.forEach(resource => {
  console.log(`  ├─ **${resource.name}**`);
  console.log(`  │  🔗 URI: \`${resource.uri}\``);
  console.log(`  │  📝 ${resource.description}`);
  console.log(`  │`);
});

console.log('\n📖 **COMO USAR AS FERRAMENTAS** 📖\n');

console.log('**Via Cliente MCP:**');
console.log('```json');
console.log('{');
console.log('  "method": "tools/call",');
console.log('  "params": {');
console.log('    "name": "memory_create",');
console.log('    "arguments": {');
console.log('      "project_path": "/path/to/project",');
console.log('      "context": "desenvolvimento",'); 
console.log('      "subcontext": "frontend",');
console.log('      "title": "Componentes React",');
console.log('      "content": "# Componentes\\n\\nDetalhes..."');
console.log('    }');
console.log('  }');
console.log('}');
console.log('```\n');

console.log('**Via Terminal (para teste):**');
console.log('```bash');
console.log('# Instalar o memcp globalmente');
console.log('npm install -g /path/to/memcp');
console.log('');
console.log('# Inicializar um projeto');
console.log('memcp init /path/to/project');
console.log('');
console.log('# Ver estatísticas');
console.log('memcp stats /path/to/project');
console.log('```\n');

console.log('📊 **ESTATÍSTICAS DO SISTEMA** 📊\n');
console.log(`Total de ferramentas: ${tools.length}`);
console.log(`Total de recursos: ${resources.length}`);
console.log(`Categorias disponíveis: ${Object.keys(categories).length}`);

const categoryBreakdown = Object.entries(categories)
  .map(([cat, tools]) => `${cat}: ${tools.length}`)
  .join(', ');

console.log(`Distribuição: ${categoryBreakdown}`);

console.log('\n✨ **O MCP memcp oferece um sistema completo para gerenciamento de memória inteligente!** ✨');
