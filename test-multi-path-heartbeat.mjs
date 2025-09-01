#!/usr/bin/env node

import { promises as fs } from 'fs';
import { join } from 'path';

/**
 * Test script to verify multi-path heartbeat functionality
 */
async function testMultiPathHeartbeat() {
  const monitoringPaths = process.env.MCP_MONITORING_PATHS;
  
  if (!monitoringPaths) {
    console.log('⚠️  No MCP_MONITORING_PATHS environment variable found');
    console.log('💡 Testing single path (current directory)');
    await testSinglePath(process.cwd());
    return;
  }

  const paths = monitoringPaths.split(',').map(p => p.trim()).filter(p => p.length > 0);
  
  console.log('🔍 Testing Multi-Path Heartbeat Functionality');
  console.log(`Monitoring Paths: ${paths.length}`);
  paths.forEach((path, index) => {
    console.log(`  ${index + 1}. ${path}`);
  });
  console.log('');

  for (const [index, projectPath] of paths.entries()) {
    console.log(`📁 Testing Path ${index + 1}: ${projectPath}`);
    await testSinglePath(projectPath);
    console.log('');
  }

  // Summary
  console.log('📊 Summary:');
  for (const projectPath of paths) {
    const heartbeatFile = join(projectPath, 'ia-memory', 'heartbeat.log');
    try {
      await fs.access(heartbeatFile);
      console.log(`  ✅ ${projectPath} - heartbeat active`);
    } catch {
      console.log(`  ❌ ${projectPath} - no heartbeat`);
    }
  }
}

async function testSinglePath(projectPath) {
  const heartbeatFile = join(projectPath, 'ia-memory', 'heartbeat.log');

  console.log(`    Heartbeat File: ${heartbeatFile}`);

  try {
    // Check if heartbeat file exists
    await fs.access(heartbeatFile);
    console.log('    ✅ Heartbeat file exists');

    // Read recent entries
    const content = await fs.readFile(heartbeatFile, 'utf8');
    const lines = content.trim().split('\n').filter(line => line.length > 0);

    console.log(`    📊 Total heartbeat entries: ${lines.length}`);

    // Show last 5 entries
    const recent = lines.slice(-5);
    console.log('    🕒 Recent heartbeat entries:');
    recent.forEach((line, index) => {
      console.log(`      ${String(recent.length - index).padStart(2, ' ')}. ${line}`);
    });

    // Check if heartbeats are recent (within last 30 seconds)
    if (lines.length > 0) {
      const lastLine = lines[lines.length - 1];
      const timestampMatch = lastLine.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z)/);
      
      if (timestampMatch) {
        const lastTimestamp = new Date(timestampMatch[1]);
        const now = new Date();
        const diffSeconds = (now.getTime() - lastTimestamp.getTime()) / 1000;

        console.log(`    ⏰ Last heartbeat: ${lastTimestamp.toISOString()}`);
        console.log(`    ⏱️  Time difference: ${diffSeconds.toFixed(1)} seconds`);

        if (diffSeconds <= 30) {
          console.log('    ✅ Server appears to be running (recent heartbeat)');
        } else {
          console.log('    ⚠️  Server may not be running (old heartbeat)');
        }
      }
    }

  } catch (error) {
    if (error.code === 'ENOENT') {
      console.log('    ❌ Heartbeat file not found');
      console.log('    💡 This may mean:');
      console.log('       - Server is not running');
      console.log('       - Heartbeat is disabled');
      console.log('       - ia-memory directory does not exist');
    } else {
      console.log('    ❌ Error reading heartbeat file:', error.message);
    }
  }
}

async function showUsageExamples() {
  console.log('');
  console.log('🚀 Usage Examples:');
  console.log('');
  console.log('   # Single path (current directory)');
  console.log('   memcp');
  console.log('');
  console.log('   # Multiple paths');
  console.log('   memcp --paths "/home/user/proj1,/home/user/proj2"');
  console.log('');
  console.log('   # Via environment variable');
  console.log('   MCP_MONITORING_PATHS="/path1,/path2" memcp');
  console.log('');
  console.log('🔧 Real-time monitoring:');
  console.log('   # Single path');
  console.log('   tail -f ia-memory/heartbeat.log');
  console.log('');
  console.log('   # Multiple paths (in separate terminals)');
  if (process.env.MCP_MONITORING_PATHS) {
    const paths = process.env.MCP_MONITORING_PATHS.split(',').map(p => p.trim());
    paths.forEach(path => {
      console.log(`   tail -f ${path}/ia-memory/heartbeat.log`);
    });
  }
}

testMultiPathHeartbeat()
  .then(() => showUsageExamples())
  .catch(console.error);
