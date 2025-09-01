#!/usr/bin/env node

/**
 * Demonstração prática das ferramentas MCP dos Executors
 * 
 * Este script simula o uso das ferramentas MCP através de chamadas diretas
 * às classes, mostrando como elas funcionariam quando invocadas por um cliente MCP.
 */

import { CriticTools } from './dist/tools/critic.tool.js';

async function demonstrateKritiq() {
  console.log('🔍 === DEMONSTRAÇÃO: Kritiq (Análise Crítica) ===\n');

  const critic = new CriticTools();

  const command = `
Crie uma função em JavaScript que calcule o fatorial de um número.
A função deve:
- Aceitar um número como parâmetro
- Retornar o fatorial do número
- Tratar casos especiais (0, 1, números negativos)
- Ser eficiente e legível
  `.trim();

  const generatedResponse = `
function factorial(n) {
  if (n < 0) return undefined;
  if (n === 0 || n === 1) return 1;
  return n * factorial(n - 1);
}
  `.trim();

  console.log('📄 **Comando Original:**');
  console.log(command);
  console.log('\n📦 **Resposta Gerada:**');
  console.log(generatedResponse);
  console.log('\n🔍 **Análise Crítica:**');

  try {
    const analysis = await critic.kritiqPt(command, generatedResponse, 60);
    console.log(analysis);
  } catch (error) {
    console.error('❌ Erro na análise:', error.message);
  }
}

async function demonstrateSimpleEvaluation() {
  console.log('\n\n✅ === DEMONSTRAÇÃO: Avaliação Simples ===\n');

  const critic = new CriticTools();

  const command = 'Liste os arquivos do diretório atual';
  const terminalResult = await critic.executeCommand('ls -la | head -5');

  console.log('📄 **Comando:** ' + command);
  console.log('\n📦 **Resultado do Terminal:**');
  console.log(terminalResult);

  console.log('\n🔍 **Avaliação do Resultado:**');

  try {
    const evaluation = await critic.evaluateWithGemini(command, terminalResult, 60);
    console.log(evaluation);
  } catch (error) {
    console.error('❌ Erro na avaliação:', error.message);
  }
}

async function demonstrateTerminalExecution() {
  console.log('\n\n⚡ === DEMONSTRAÇÃO: Execução de Terminal ===\n');

  const critic = new CriticTools();

  console.log('📋 **Informações do Sistema de Execução:**');
  const execInfo = critic.getExecutionInfo();
  console.log('- Diretório:', execInfo.workingDirectory);
  console.log('- Shell:', execInfo.terminalInfo.shell);

  console.log('\n📋 **Executando Comandos:**');

  const commands = [
    'pwd',
    'whoami',
    'date',
    'echo "Teste de executor funcionando!"'
  ];

  for (const cmd of commands) {
    console.log(`\n$ ${cmd}`);
    try {
      const result = await critic.executeCommand(cmd);
      console.log(result.trim());
    } catch (error) {
      console.error(`❌ Erro: ${error.message}`);
    }
  }
}

async function demonstrateEnvironmentManagement() {
  console.log('\n\n🌍 === DEMONSTRAÇÃO: Gerenciamento de Ambiente ===\n');

  const critic = new CriticTools();

  // Definir uma variável de ambiente
  console.log('📋 **Definindo variáveis de ambiente:**');
  critic.setEnvironmentVariable('DEMO_VAR', 'Hello from MemCP!');
  critic.setEnvironmentVariable('NODE_ENV', 'demonstration');

  // Verificar as variáveis
  const commands = [
    'echo "DEMO_VAR: $DEMO_VAR"',
    'echo "NODE_ENV: $NODE_ENV"',
    'echo "Current PATH (first 100 chars): ${PATH:0:100}..."'
  ];

  for (const cmd of commands) {
    console.log(`\n$ ${cmd}`);
    try {
      const result = await critic.executeCommand(cmd);
      console.log(result.trim());
    } catch (error) {
      console.error(`❌ Erro: ${error.message}`);
    }
  }

  // Verificar através do método getter
  console.log('\n📋 **Verificação via método getter:**');
  console.log('DEMO_VAR:', critic.getEnvironmentVariable('DEMO_VAR'));
  console.log('NODE_ENV:', critic.getEnvironmentVariable('NODE_ENV'));
  console.log('UNDEFINED_VAR:', critic.getEnvironmentVariable('UNDEFINED_VAR', 'valor_padrão'));
}

async function main() {
  console.log('🚀 === DEMONSTRAÇÃO COMPLETA DOS EXECUTORS MEMCP ===\n');
  console.log('Este script demonstra as capacidades dos executors criados em TypeScript\n');

  try {
    await demonstrateTerminalExecution();
    await demonstrateEnvironmentManagement();
    
    // Só executar testes do Gemini se estiver disponível
    try {
      const critic = new CriticTools();
      await critic.executeCommand('which gemini');
      
      await demonstrateSimpleEvaluation();
      await demonstrateKritiq();
    } catch (error) {
      console.log('\n⚠️ Gemini não disponível - pulando demonstrações de análise crítica');
      console.log('   Para testar análise crítica, instale o Gemini CLI:');
      console.log('   npm install -g @google/generative-ai-cli');
    }

  } catch (error) {
    console.error('❌ Erro durante demonstração:', error);
  }

  console.log('\n✨ === DEMONSTRAÇÃO CONCLUÍDA ===');
  console.log('\nOs executors estão prontos para uso via MCP!');
  console.log('Ferramentas disponíveis:');
  console.log('- kritiq: Análise crítica detalhada');
  console.log('- evaluate_with_gemini: Avaliação simples');
  console.log('- execute_terminal_command: Execução de comandos');
}

main().catch(console.error);
