# 🤖 Memory Organizer - Sistema de Organização Automática YOLO

## 📋 Visão Geral

O Memory Organizer é um sistema inteligente que roda em paralelo ao heartbeat monitor, analisando e organizando automaticamente a estrutura de memória dos projetos monitorados. Utiliza IA (Gemini) em **modo YOLO** para fazer melhorias proativas sem intervenção manual.

## 🚀 Funcionalidades Implementadas

### ✅ Sistema Base

- **Análise automática** de estrutura de memória
- **Integração com Gemini AI** para análise inteligente
- **Modo YOLO** para ações automáticas e agressivas
- **Multi-path support** para múltiplos projetos
- **Sistema de fallback** quando IA não está disponível
- **Execução em background** a cada 1 minuto (configurável)

### ✅ Análise Inteligente

- Detecção de padrões de organização
- Identificação de contextos fragmentados
- Análise de densidade de informações
- Detecção de oportunidades de linking
- Verificação de consistência estrutural

### ✅ Ações Automáticas

- **Criação de links** entre memórias relacionadas
- **Organização de contextos** similares
- **Criação de memórias organizacionais** como índices
- **Consolidação de informações** espalhadas
- **Estabelecimento de hierarquias** lógicas

## 🎯 Como Usar

### Comando Básico

```bash
# Iniciar com organizador ativo
memcp --yolo

# Multi-path com organizador
memcp --paths "/path1,/path2" --yolo --memory-organizer 2

# Desabilitar organizador
memcp --no-memory-organizer
```

### Configuração Avançada

```bash
# Intervalo customizado (em minutos)
memcp --memory-organizer 0.5  # A cada 30 segundos

# Via variáveis de ambiente
export MCP_MEMORY_ORGANIZER_INTERVAL=2
export MCP_YOLO_MODE=true
memcp
```

## 🔧 Arquitetura do Sistema

### Componentes Principais

1. **MemoryOrganizer** (Single-path)

   - Analisa um projeto específico
   - Executa ciclos de organização
   - Integra com ferramentas MCP

2. **MultiPathMemoryOrganizer** (Multi-path)

   - Gerencia múltiplos MemoryOrganizers
   - Coordena execução paralela
   - Status consolidado

3. **GeminiExecutor** (IA Backend)
   - Interface com Gemini AI
   - Prompts especializados
   - Sistema de timeout robusto

### Fluxo de Execução

```
┌─ MultiPathHeartbeatMonitor ─┐
│  ├─ Heartbeat (3s)          │
│  └─ MemoryOrganizer (1min)  │ ──┐
└──────────────────────────────┘   │
                                   │
┌─ MemoryOrganizer ─────────────────┼─┐
│  1. analyzeCurrentMemory()       │ │
│  2. getAvailableFunctions()      │ │
│  3. generateRecommendations()    │ │ ── Gemini AI
│  4. executeRecommendations()     │ │
│  5. YOLO Mode Actions            │ │
└───────────────────────────────────┼─┘
                                   │
┌─ Ferramentas MCP ─────────────────┘
│  ├─ MainMemoryTools
│  ├─ LinksTools
│  ├─ MemoryTools
│  ├─ SubmemoryTools
│  └─ NavigationTools
└─────────────────────────
```

## 📊 Exemplo de Análise Real

### Input: Projeto com 11 contextos

```json
{
  "contexts": {
    "architecture": "Clean Architecture / Hexagonal Architecture",
    "modules": "Módulos organizados",
    "stories-tasks-analysis": "9 memórias",
    "Arquitetura e Padronização": "4 memórias"
  }
}
```

### Output: Recomendações YOLO

```json
{
  "analysis": {
    "currentState": "Projeto bem estruturado com alta densidade de contextos",
    "issues": ["Muitos contextos podem dificultar navegação"],
    "opportunities": ["Criar links entre arquitetura e módulos"]
  },
  "recommendations": [
    {
      "type": "create_link",
      "priority": "high",
      "description": "Conectar módulos com padrões arquiteturais",
      "action": {
        "function": "links_create",
        "params": {
          "context": "modules",
          "subcontext": "pairs-module-analysis",
          "description": "Link para padrões arquiteturais aplicados",
          "memory_path": "memories/Arquitetura e Padronização/Geral/"
        }
      }
    }
  ]
}
```

## 🎛️ Configurações Disponíveis

### Flags de Comando

- `--yolo, -y`: Ativa modo agressivo
- `--memory-organizer <min>`: Intervalo em minutos
- `--no-memory-organizer`: Desabilita completamente

### Variáveis de Ambiente

- `MCP_MEMORY_ORGANIZER`: true/false
- `MCP_MEMORY_ORGANIZER_INTERVAL`: minutos
- `MCP_YOLO_MODE`: true/false
- `MCP_MONITORING_PATHS`: paths separados por vírgula

### Integração com Heartbeat

- Ativação automática com multi-path monitor
- Compartilha configurações de path
- Shutdown coordenado
- Status unificado

## 📈 Performance e Monitoramento

### Logs em Tempo Real

```
🤖 Starting memory organizer for 2 projects
🤖 [2025-09-01T12:20:17.306Z] Running memory organization for /project1
🤖 Executing: Conectar módulos com padrões arquiteturais
✅ Executed: Conectar módulos com padrões arquiteturais
🤖 Memory organization completed for /project1
```

### Status e Debugging

- PID tracking de cada organizador
- Timestamps de todas as operações
- Contadores de recomendações executadas
- Sistema de fallback para falhas de IA

## 🔒 Modo YOLO - Precauções

### O que o YOLO faz automaticamente:

- ✅ Cria links entre memórias relacionadas
- ✅ Adiciona contextos organizacionais
- ✅ Cria memórias índice para navegação
- ✅ Sugere consolidações estruturais

### O que o YOLO NÃO faz:

- ❌ Não deleta memórias existentes
- ❌ Não modifica conteúdo de memórias
- ❌ Não altera configurações principais
- ❌ Não sobrescreve dados críticos

### Sistema de Segurança:

- Fallback para heurísticas quando IA falha
- Timeout de 5 minutos para análises
- Limitação de 5-8 ações por ciclo
- Logs detalhados de todas as ações

## 🎯 Casos de Uso

### 1. Desenvolvimento Ativo

```bash
# Monitoramento rápido durante desenvolvimento
memcp --yolo --memory-organizer 0.5 --heartbeat 2
```

### 2. Projetos em Produção

```bash
# Organização suave, sem interferir no trabalho
memcp --yolo --memory-organizer 5 --heartbeat 30
```

### 3. Múltiplos Projetos

```bash
# Gerenciamento de portfolio de projetos
memcp --paths "/proj1,/proj2,/proj3" --yolo --memory-organizer 2
```

### 4. Análise e Relatórios

```bash
# Demo e testing
node demo-memory-organizer.mjs
node test-memory-organizer.mjs --real
```

## 🚀 Resultado Final

O Memory Organizer fornece:

1. **Organização Automática** - Sistema que aprende e melhora a estrutura
2. **Inteligência Distribuída** - IA + heurísticas + padrões
3. **Operação Não-Intrusiva** - Trabalha em background sem interferir
4. **Multi-Project Awareness** - Gerencia múltiplos projetos simultaneamente
5. **Resilência** - Fallbacks e tolerância a falhas
6. **Transparência** - Logs detalhados de todas as ações

### Status: ✅ COMPLETAMENTE IMPLEMENTADO E TESTADO

O sistema está pronto para uso em produção com todos os recursos solicitados:

- ✅ Execução paralela ao heartbeat
- ✅ Intervalo de 1 minuto (configurável)
- ✅ Modo YOLO com flag -y
- ✅ Integração com Gemini Executor
- ✅ Organização inteligente de memória
- ✅ Conhecimento de todas as funções MCP disponíveis
- ✅ Foco em submemórias e memórias principais
- ✅ Sistema multi-path para múltiplos projetos
