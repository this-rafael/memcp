# Terminal e Gemini Executors para TypeScript/JavaScript

Este projeto inclui implementações em TypeScript dos executors similar aos criados em Go, adaptados para o projeto memcp.

## Arquivos Criados

### Executors Base

- **`src/executors/terminal-executor.ts`** - Executa comandos no terminal mantendo contexto de diretório e variáveis de ambiente
- **`src/executors/gemini-executor.ts`** - Executa avaliações críticas usando o CLI do Gemini
- **`src/executors/index.ts`** - Exporta os executors para facilitar imports

### Ferramentas MCP

- **`src/tools/critic.tool.ts`** - Ferramenta que combina os executors para análise crítica

### Teste

- **`test-executors.mjs`** - Script de teste para verificar funcionamento dos executors

## Funcionalidades

### TerminalExecutor

```typescript
import { TerminalExecutor } from "./src/executors/index.js";

const terminal = TerminalExecutor.create();

// Executar comandos
const result = await terminal.execute("ls -la");

// Gerenciar diretório de trabalho
await terminal.setWorkingDirectory("/path/to/project");

// Gerenciar variáveis de ambiente
terminal.setEnvironmentVariable("NODE_ENV", "development");
```

### GeminiExecutor

```typescript
import { GeminiExecutor } from "./src/executors/index.js";

const gemini = GeminiExecutor.create();

// Avaliação crítica completa
const kritiq = await gemini.execute(command, response);

// Avaliação simples
const evaluation = await gemini.evaluateWithGemini(command, response);

// Kritiq em português
const kritiqPt = await gemini.executeKritiq(command, response);
```

### CriticTools (Ferramenta MCP)

```typescript
import { CriticTools } from "./src/tools/critic.tool.js";

const critic = new CriticTools();

// Análise crítica
const analysis = await critic.kritiq(command, response);

// Execução de comandos
const output = await critic.executeCommand("npm test");
```

## Ferramentas MCP Disponíveis

### `kritiq`

Executa uma avaliação crítica completa de um artefato.

**Parâmetros:**

- `command` (string): Texto de solicitação original
- `generated_response` (string): Artefato ou resposta gerada a ser avaliada
- `timeout` (integer, opcional): Timeout em segundos (padrão: 600)

### `evaluate_with_gemini`

Avalia se um comando foi atendido por uma resposta gerada.

**Parâmetros:**

- `command` (string): O comando original que foi solicitado
- `generated_response` (string): A resposta gerada que deve ser avaliada
- `timeout` (integer, opcional): Timeout em segundos (padrão: 600)

### `execute_terminal_command`

Executa um comando no terminal e retorna o resultado.

**Parâmetros:**

- `command` (string): Comando a ser executado no terminal
- `working_directory` (string, opcional): Diretório de trabalho
- `timeout` (integer, opcional): Timeout em segundos

## Pré-requisitos

### Para usar o GeminiExecutor

O GeminiExecutor requer o CLI do Gemini instalado:

```bash
# Instalar via npm
npm install -g @google/generative-ai-cli

# Ou baixar do GitHub
# https://github.com/google/generative-ai-cli
```

### Configurar credenciais

```bash
# Configurar API key do Gemini
gemini config set api-key YOUR_API_KEY
```

## Execução dos Testes

```bash
# Compilar o projeto TypeScript
npm run build

# Executar testes
node test-executors.mjs
```

## Integração com MCP

Os executors são automaticamente disponibilizados como ferramentas MCP quando o servidor memcp é iniciado. Eles podem ser chamados por clientes MCP compatíveis.

## Características Técnicas

### TerminalExecutor

- ✅ Detecção automática de shell (zsh/bash)
- ✅ Carregamento de configurações de shell (ex: .zshrc)
- ✅ Gerenciamento de diretório de trabalho
- ✅ Controle de variáveis de ambiente
- ✅ Timeout configurável
- ✅ Tratamento de erros robusto
- ✅ Execução interativa e não-interativa

### GeminiExecutor

- ✅ Prompt crítico estruturado para análise técnica
- ✅ Múltiplos tipos de avaliação (crítica completa, simples, PT)
- ✅ Limpeza automática de output
- ✅ Controle de timeout
- ✅ Escape seguro de strings para shell
- ✅ Mesmo padrão de análise do projeto Go original

### CriticTools

- ✅ Combinação dos dois executors
- ✅ Interface unificada para análise crítica
- ✅ Gerenciamento consistente de diretório/ambiente
- ✅ Informações de execução detalhadas

## Compatibilidade

- ✅ Node.js 18+
- ✅ TypeScript 5+
- ✅ Linux/macOS (testado principalmente em Linux)
- ✅ Shell zsh/bash
- ✅ Integração completa com o protocolo MCP

## Comparação com a Versão Go

| Funcionalidade            | Go  | TypeScript/JavaScript |
| ------------------------- | --- | --------------------- |
| Execução de terminal      | ✅  | ✅                    |
| Detecção de shell         | ✅  | ✅                    |
| Gerenciamento de ambiente | ✅  | ✅                    |
| Timeout configurável      | ✅  | ✅                    |
| Análise crítica Gemini    | ✅  | ✅                    |
| Escape de strings shell   | ✅  | ✅                    |
| Prompt estruturado        | ✅  | ✅                    |
| Ferramentas MCP           | ❌  | ✅                    |
| Tipagem forte             | ✅  | ✅                    |
| Async/await nativo        | ❌  | ✅                    |
