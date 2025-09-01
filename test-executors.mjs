#!/usr/bin/env node

import { GeminiExecutor, TerminalExecutor } from './dist/executors/index.js';
import { CriticTools } from './dist/tools/critic.tool.js';

async function testTerminalExecutor() {
  console.log('🧪 Testing TerminalExecutor...');
  
  const terminal = TerminalExecutor.create();
  
  try {
    // Test basic command execution
    console.log('📋 Current working directory:', terminal.getWorkingDirectory());
    
    const result1 = await terminal.execute('echo "Hello from Terminal Executor"');
    console.log('✅ Echo test:', result1.trim());
    
    const result2 = await terminal.execute('ls -la | head -5');
    console.log('✅ Directory listing (first 5 lines):', result2.trim());
    
    // Test environment variables
    terminal.setEnvironmentVariable('TEST_VAR', 'test_value');
    const envResult = await terminal.execute('echo $TEST_VAR');
    console.log('✅ Environment variable test:', envResult.trim());
    
    // Test shell info
    const shellInfo = terminal.getShellInfo();
    console.log('✅ Shell info:', {
      shell: shellInfo.shell,
      workingDirectory: shellInfo.workingDirectory
    });
    
  } catch (error) {
    console.error('❌ TerminalExecutor test failed:', error);
  }
}

async function testGeminiExecutor() {
  console.log('\n🧪 Testing GeminiExecutor...');
  
  // Check if gemini command is available
  const terminal = TerminalExecutor.create();
  try {
    await terminal.execute('which gemini');
    console.log('✅ Gemini command found');
  } catch (error) {
    console.log('⚠️ Gemini command not found, skipping Gemini tests');
    console.log('   To install Gemini: https://github.com/google/generative-ai-cli');
    return;
  }

  const gemini = GeminiExecutor.create();
  
  try {
    // Test simple evaluation
    const command = 'Create a simple "Hello World" program in JavaScript';
    const response = 'console.log("Hello, World!");';
    
    console.log('📋 Testing evaluation with command:', command);
    console.log('📋 Testing evaluation with response:', response);
    
    const evalResult = await gemini.evaluateWithGemini(command, response, 120);
    console.log('✅ Evaluation result (first 200 chars):', evalResult.substring(0, 200) + '...');
    
  } catch (error) {
    console.error('❌ GeminiExecutor test failed:', error);
  }
}

async function testCriticTools() {
  console.log('\n🧪 Testing CriticTools...');
  
  const critic = new CriticTools();
  
  try {
    // Test terminal command execution
    const terminalResult = await critic.executeCommand('pwd');
    console.log('✅ Current directory via CriticTools:', terminalResult.trim());
    
    // Test working directory info
    const workingDir = critic.getWorkingDirectory();
    console.log('✅ Working directory:', workingDir);
    
    // Test execution info
    const execInfo = critic.getExecutionInfo();
    console.log('✅ Execution info:', {
      workingDirectory: execInfo.workingDirectory,
      shell: execInfo.terminalInfo.shell
    });
    
  } catch (error) {
    console.error('❌ CriticTools test failed:', error);
  }
}

async function main() {
  console.log('🚀 Starting Executor Tests\n');
  
  await testTerminalExecutor();
  await testGeminiExecutor();
  await testCriticTools();
  
  console.log('\n✨ All tests completed!');
}

main().catch(console.error);
