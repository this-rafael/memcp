# Nova Ferramenta: get_filesystem_tree - v1.0.8

## 🆕 Funcionalidade Adicionada

### **`get_filesystem_tree` - Visualização Completa da Estrutura de Arquivos**

Uma nova ferramenta que fornece uma representação hierárquica completa do sistema de arquivos de memória em formato JSON estruturado.

## 🎯 **Propósito**

Permite visualizar toda a estrutura de arquivos do sistema de memória (`ia-memory`) de forma organizada, com informações detalhadas sobre:

- ✅ **Hierarquia completa** de diretórios e arquivos
- ✅ **Tipos de arquivo** automaticamente identificados
- ✅ **Tamanhos** individuais e totais
- ✅ **Contagem de arquivos** por diretório
- ✅ **Timestamps** de última modificação
- ✅ **Extensões** e classificações de arquivo

## 📋 **Como Usar**

### Via MCP Server:

```json
{
  "tool": "get_filesystem_tree",
  "arguments": {
    "project_path": "/path/to/your/project"
  }
}
```

### Exemplo de Resposta:

```json
{
  "name": "ia-memory",
  "type": "directory",
  "path": "/",
  "file_count": 7,
  "total_size": 49648,
  "children": [
    {
      "name": "main.sjson",
      "type": "file",
      "path": "main.sjson",
      "size": 146,
      "extension": ".sjson",
      "file_type": "sjson",
      "last_modified": "2025-08-29T10:43:31.250Z"
    },
    {
      "name": "memories",
      "type": "directory",
      "path": "memories",
      "file_count": 3,
      "total_size": 319,
      "children": [
        {
          "name": "projeto-web",
          "type": "directory",
          "path": "memories/projeto-web",
          "file_count": 2,
          "total_size": 225,
          "children": [
            {
              "name": "frontend",
              "type": "directory",
              "path": "memories/projeto-web/frontend",
              "children": [
                {
                  "name": "20250829T100000-componentes-react.md",
                  "type": "file",
                  "path": "memories/projeto-web/frontend/20250829T100000-componentes-react.md",
                  "size": 126,
                  "extension": ".md",
                  "file_type": "markdown",
                  "last_modified": "2025-08-29T10:43:31.250Z"
                }
              ]
            }
          ]
        }
      ]
    }
  ]
}
```

## 🔧 **Tipos de Arquivo Suportados**

A ferramenta identifica automaticamente os seguintes tipos:

| Extensão                         | Tipo       | Descrição                |
| -------------------------------- | ---------- | ------------------------ |
| `.md`, `.markdown`               | `markdown` | Arquivos de memória      |
| `.sjson`                         | `sjson`    | Configurações do sistema |
| `.json`                          | `json`     | Dados estruturados       |
| `.db`, `.sqlite`, `.sqlite3`     | `database` | Banco de dados SQLite    |
| `.csv`                           | `unknown`  | Arquivos de links        |
| `.txt`                           | `text`     | Arquivos de texto        |
| `.log`                           | `log`      | Arquivos de log          |
| `.yml`, `.yaml`                  | `yaml`     | Configurações YAML       |
| `.toml`, `.ini`, `.cfg`, `.conf` | `config`   | Arquivos de configuração |

## 📊 **Informações Fornecidas**

### Para Diretórios:

- `name`: Nome do diretório
- `type`: "directory"
- `path`: Caminho relativo
- `file_count`: Total de arquivos (recursivo)
- `total_size`: Tamanho total em bytes (recursivo)
- `children`: Array de filhos (arquivos e subdiretórios)
- `last_modified`: Timestamp da última modificação

### Para Arquivos:

- `name`: Nome do arquivo
- `type`: "file"
- `path`: Caminho relativo
- `size`: Tamanho em bytes
- `extension`: Extensão do arquivo
- `file_type`: Tipo classificado automaticamente
- `last_modified`: Timestamp da última modificação

## ⚡ **Características Técnicas**

- ✅ **Recursão controlada**: Máximo de 10 níveis de profundidade
- ✅ **Tratamento de erros**: Arquivos inacessíveis são marcados como "error"
- ✅ **Performance otimizada**: Processamento assíncrono
- ✅ **Segurança**: Não segue symlinks maliciosos
- ✅ **Memória eficiente**: Não carrega conteúdo dos arquivos

## 🎯 **Casos de Uso**

### 1. **Auditoria do Sistema**

Verificar rapidamente todos os arquivos presentes no sistema de memória.

### 2. **Análise de Espaço**

Identificar diretórios ou arquivos que estão ocupando mais espaço.

### 3. **Organização**

Visualizar a estrutura hierárquica para melhor organização.

### 4. **Debug**

Identificar arquivos inesperados ou com problemas de acesso.

### 5. **Backup/Migração**

Mapear todos os arquivos antes de operações críticas.

### 6. **Relatórios**

Gerar relatórios sobre o estado do sistema de arquivos.

## 🔄 **Diferença de `get_memory_tree`**

| Ferramenta            | Foco                 | Dados                                      |
| --------------------- | -------------------- | ------------------------------------------ |
| `get_memory_tree`     | **Conteúdo lógico**  | Estrutura conceitual de contextos/memórias |
| `get_filesystem_tree` | **Estrutura física** | Arquivos reais no sistema de arquivos      |

## 📁 **Exemplo de Estrutura Típica**

```
ia-memory/
├── main.sjson              (sjson, 146 bytes)
├── index.db               (database, 49152 bytes)
├── memories/              (3 arquivos, 319 bytes)
│   ├── projeto-web/       (2 arquivos, 225 bytes)
│   │   ├── frontend/      (1 arquivo, 126 bytes)
│   │   │   └── componentes-react.md (markdown)
│   │   └── backend/       (1 arquivo, 99 bytes)
│   │       └── api-rest.md (markdown)
│   └── configuracao/      (1 arquivo, 94 bytes)
│       └── configuracao-docker.md (markdown)
├── submemories/           (1 arquivo, 2 bytes)
│   └── submemory1.sjson   (sjson)
└── links/                 (1 arquivo, 29 bytes)
    └── projeto-web.csv    (unknown)
```

## 🚀 **Benefícios**

- **Visibilidade Total**: Vê exatamente o que está no seu sistema
- **Informações Ricas**: Tamanhos, tipos, timestamps em um só lugar
- **Formato Padrão**: JSON fácil de processar programaticamente
- **Performance**: Rápido mesmo com muitos arquivos
- **Confiabilidade**: Tratamento robusto de erros

**A nova ferramenta `get_filesystem_tree` oferece visibilidade completa da estrutura física do seu sistema de memória! 📁🔍**
