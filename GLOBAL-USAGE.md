# Instalação e Uso Global - MemCP

## 🚀 Instalação Global

### Via npm (Recomendado)

```bash
# Instalar globalmente
npm install -g memcp

# Ou instalar localmente no projeto
npm install memcp
```

### Via código fonte

```bash
# Clonar repositório
git clone https://github.com/this-rafael/memcp.git
cd memcp

# Instalar dependências e compilar
npm install
npm run build

# Instalar globalmente
npm install -g .
```

## 📦 Uso Global

Uma vez instalado globalmente, você pode usar o comando `memcp` de qualquer lugar:

```bash
# Iniciar no diretório atual (modo cluster padrão)
memcp

# Iniciar em um projeto específico
memcp /path/to/my/project

# Configurar número de workers
memcp --workers 2

# Configurar intervalo do heartbeat
memcp --heartbeat 5

# Desabilitar heartbeat
memcp --no-heartbeat

# Ver ajuda
memcp --help
```

## 🔧 Configurações

### Variáveis de Ambiente

```bash
# Path do projeto (se não especificado via argumento)
export MEMORY_PROJECT_PATH=/path/to/project

# Número de workers
export MCP_MAX_WORKERS=4

# Intervalo do heartbeat em segundos
export MCP_HEARTBEAT_INTERVAL=10

# Habilitar/desabilitar heartbeat
export MCP_HEARTBEAT=true

# Habilitar processamento paralelo
export MCP_PARALLEL=true

# Habilitar tarefas em background
export MCP_BACKGROUND_TASKS=true
```

### Padrões

- **Workers**: 4 (modo cluster)
- **Heartbeat**: 10 segundos
- **Modo**: Paralelo com background tasks
- **Projeto**: Diretório atual

## 🔍 Monitoramento Automático

O sistema agora inclui **monitoramento automático por heartbeat**:

### O que faz:

- ✅ Escreve timestamp a cada 10s (configurável) no arquivo `ia-memory/heartbeat.log`
- ✅ Inclui PID do processo para identificação
- ✅ Marca início (STARTED) e fim (STOPPED) da execução
- ✅ Permite verificar se o servidor está rodando

### Arquivo de Heartbeat

```
ia-memory/heartbeat.log
```

**Exemplo de conteúdo:**

```
2025-09-01T10:30:15.123Z - STARTED - PID:12345
2025-09-01T10:30:25.234Z - RUNNING - PID:12345
2025-09-01T10:30:35.345Z - RUNNING - PID:12345
2025-09-01T10:30:45.456Z - RUNNING - PID:12345
2025-09-01T10:30:55.567Z - STOPPED - PID:12345
```

## 🧪 Testes

### Verificar se está funcionando

```bash
# Script de teste incluso
node test-heartbeat.mjs

# Ou monitorar em tempo real
tail -f ia-memory/heartbeat.log

# Via ferramenta MCP (se suportado pelo client)
# Tool: heartbeat_status
```

### Teste Manual

```bash
# Terminal 1: Iniciar servidor
memcp

# Terminal 2: Monitorar heartbeat
watch -n 1 "tail -5 ia-memory/heartbeat.log"

# Terminal 3: Testar script
node test-heartbeat.mjs
```

## 🏃‍♂️ Exemplos de Uso

### Desenvolvimento Local

```bash
# Iniciar com heartbeat rápido para desenvolvimento
memcp --heartbeat 5 --workers 2
```

### Produção

```bash
# Produção com 4 workers e heartbeat padrão
memcp --workers 4 /var/projects/my-app
```

### Debugging

```bash
# Sem heartbeat para debugging
memcp --no-heartbeat --workers 1
```

### Background Service

```bash
# Como serviço em background (usando nohup)
nohup memcp /path/to/project > memcp.log 2>&1 &

# Como serviço systemd (exemplo)
# Ver SYSTEMD-SERVICE.md para configuração completa
```

## 📊 Status e Monitoring

### Via Script de Teste

```bash
node test-heartbeat.mjs
```

**Output exemplo:**

```
🔍 Testing Heartbeat Functionality
Project Path: /home/user/project
Heartbeat File: /home/user/project/ia-memory/heartbeat.log

✅ Heartbeat file exists
📊 Total heartbeat entries: 15

🕒 Recent heartbeat entries:
  10. 2025-09-01T10:35:45.567Z - RUNNING - PID:12345
   9. 2025-09-01T10:35:35.456Z - RUNNING - PID:12345
   8. 2025-09-01T10:35:25.345Z - RUNNING - PID:12345

⏰ Last heartbeat: 2025-09-01T10:35:45.567Z
🕐 Current time: 2025-09-01T10:35:48.123Z
⏱️  Time difference: 2.6 seconds
✅ Server appears to be running (recent heartbeat)
```

### Via MCP Tool (se disponível)

```json
{
  "tool": "heartbeat_status",
  "arguments": {
    "project_path": "/path/to/project",
    "lines": 10
  }
}
```

## 🔄 Restart Automático

O launcher inclui restart automático em caso de falhas:

```bash
# O processo será reiniciado automaticamente se falhar
memcp --workers 4

# Logs mostrarão:
# "Worker 12345 died"
# "Starting new worker..."
```

## 🛑 Parar o Servidor

```bash
# Ctrl+C (SIGINT) ou kill (SIGTERM)
# O servidor fará shutdown graceful e marcará STOPPED no heartbeat
```

## 🐛 Troubleshooting

### Heartbeat não aparece

```bash
# Verificar se diretório ia-memory existe
ls -la ia-memory/

# Verificar permissões
ls -la ia-memory/heartbeat.log

# Verificar se heartbeat está habilitado
echo $MCP_HEARTBEAT
```

### Muitos workers

```bash
# Reduzir workers se usar muita CPU/memória
memcp --workers 1
```

### Performance issues

```bash
# Aumentar intervalo do heartbeat
memcp --heartbeat 30

# Ou desabilitar completamente
memcp --no-heartbeat
```

### Arquivo de heartbeat muito grande

O sistema faz limpeza automática mantendo apenas as últimas 1000 entradas. Para forçar limpeza:

```bash
# Manter apenas últimas 100 entradas
echo "$(tail -100 ia-memory/heartbeat.log)" > ia-memory/heartbeat.log
```
