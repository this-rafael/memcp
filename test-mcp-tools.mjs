#!/usr/bin/env node

/**
 * Teste das ferramentas MCP dos Executors
 * 
 * Este script testa as ferramentas MCP diretamente, simulando
 * como elas seriam chamadas por um cliente MCP real.
 */

import { CriticTools } from './dist/tools/critic.tool.js';

// Simular as ferramentas MCP
async function simulateMCPTool(toolName, params) {
  console.log(`🔧 Executando ferramenta MCP: ${toolName}`);
  console.log(`📋 Parâmetros:`, JSON.stringify(params, null, 2));
  
  let result;
  
  try {
    switch (toolName) {
      case 'execute_terminal_command':
        const critic1 = new CriticTools(params.working_directory);
        if (params.working_directory) {
          await critic1.setWorkingDirectory(params.working_directory);
        }
        result = await critic1.executeCommand(params.command, params.timeout);
        break;
        
      case 'evaluate_with_gemini':
        const critic2 = new CriticTools(params.working_directory);
        result = await critic2.evaluateWithGemini(
          params.command,
          params.generated_response,
          params.timeout || 600
        );
        break;
        
      case 'kritiq':
        const critic3 = new CriticTools(params.working_directory);
        result = await critic3.kritiqPt(
          params.command,
          params.generated_response,
          params.timeout || 600
        );
        break;
        
      default:
        throw new Error(`Ferramenta desconhecida: ${toolName}`);
    }
    
    console.log(`✅ Resultado:`);
    console.log(result);
    return { success: true, result };
    
  } catch (error) {
    console.log(`❌ Erro: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function testExecuteTerminalCommand() {
  console.log('\n🧪 === TESTE: execute_terminal_command ===\n');
  
  const testCases = [
    {
      command: 'echo "Hello from MCP!"',
    },
    {
      command: 'ls -la | grep -E "^d" | head -3',
    },
    {
      command: 'pwd && whoami && date "+%Y-%m-%d %H:%M:%S"',
    }
  ];

  for (const testCase of testCases) {
    await simulateMCPTool('execute_terminal_command', testCase);
    console.log('\n' + '─'.repeat(50) + '\n');
  }
}

async function testEvaluateWithGemini() {
  console.log('\n🧪 === TESTE: evaluate_with_gemini ===\n');
  
  const testCases = [
    {
      command: 'Write a simple hello world in Python',
      generated_response: 'print("Hello, World!")',
      timeout: 30
    }
  ];

  for (const testCase of testCases) {
    await simulateMCPTool('evaluate_with_gemini', testCase);
    console.log('\n' + '─'.repeat(50) + '\n');
  }
}

async function testKritiq() {
  console.log('\n🧪 === TESTE: kritiq ===\n');
  
  const testCases = [
    {
      command: 'Escreva uma função que soma dois números',
      generated_response: 'function sum(a, b) { return a + b; }',
      timeout: 30
    }
  ];

  for (const testCase of testCases) {
    await simulateMCPTool('kritiq', testCase);
    console.log('\n' + '─'.repeat(50) + '\n');
  }
}

async function main() {
  console.log('🚀 === TESTE DAS FERRAMENTAS MCP EXECUTORS ===');
  console.log('Simulando chamadas de cliente MCP para as ferramentas criadas\n');

  // Sempre testar terminal (não depende de Gemini)
  await testExecuteTerminalCommand();
  
  // Verificar se Gemini está disponível antes de testar
  console.log('🔍 Verificando disponibilidade do Gemini...');
  const critic = new CriticTools();
  
  try {
    await critic.executeCommand('which gemini');
    console.log('✅ Gemini disponível - executando testes completos\n');
    
    await testEvaluateWithGemini();
    await testKritiq();
    
  } catch (error) {
    console.log('⚠️ Gemini não disponível - pulando testes de análise');
    console.log('   Para instalar: npm install -g @google/generative-ai-cli\n');
  }

  console.log('✨ === TESTES CONCLUÍDOS ===');
  console.log('\n📋 Resumo das ferramentas MCP disponíveis:');
  console.log('1. execute_terminal_command - Execução de comandos no terminal');
  console.log('2. evaluate_with_gemini - Avaliação simples usando Gemini');
  console.log('3. kritiq - Análise crítica detalhada usando Gemini');
  console.log('\n🔌 Para usar no MCP Server, inicie o memcp e use essas ferramentas via cliente MCP.');
}

main().catch(console.error);
