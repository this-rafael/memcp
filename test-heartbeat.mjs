#!/usr/bin/env node

import { promises as fs } from 'fs';
import { join } from 'path';

/**
 * Test script to verify heartbeat functionality
 */
async function testHeartbeat() {
  const projectPath = process.cwd();
  const heartbeatFile = join(projectPath, 'ia-memory', 'heartbeat.log');

  console.log('🔍 Testing Heartbeat Functionality');
  console.log(`Project Path: ${projectPath}`);
  console.log(`Heartbeat File: ${heartbeatFile}`);
  console.log('');

  try {
    // Check if heartbeat file exists
    await fs.access(heartbeatFile);
    console.log('✅ Heartbeat file exists');

    // Read recent entries
    const content = await fs.readFile(heartbeatFile, 'utf8');
    const lines = content.trim().split('\n').filter(line => line.length > 0);

    console.log(`📊 Total heartbeat entries: ${lines.length}`);
    console.log('');

    // Show last 10 entries
    const recent = lines.slice(-10);
    console.log('🕒 Recent heartbeat entries:');
    recent.forEach((line, index) => {
      console.log(`  ${String(recent.length - index).padStart(2, ' ')}. ${line}`);
    });

    // Check if heartbeats are recent (within last 30 seconds)
    if (lines.length > 0) {
      const lastLine = lines[lines.length - 1];
      const timestampMatch = lastLine.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z)/);
      
      if (timestampMatch) {
        const lastTimestamp = new Date(timestampMatch[1]);
        const now = new Date();
        const diffSeconds = (now.getTime() - lastTimestamp.getTime()) / 1000;

        console.log('');
        console.log(`⏰ Last heartbeat: ${lastTimestamp.toISOString()}`);
        console.log(`🕐 Current time: ${now.toISOString()}`);
        console.log(`⏱️  Time difference: ${diffSeconds.toFixed(1)} seconds`);

        if (diffSeconds <= 30) {
          console.log('✅ Server appears to be running (recent heartbeat)');
        } else {
          console.log('⚠️  Server may not be running (old heartbeat)');
        }
      }
    }

  } catch (error) {
    if (error.code === 'ENOENT') {
      console.log('❌ Heartbeat file not found');
      console.log('💡 This may mean:');
      console.log('   - Server is not running');
      console.log('   - Heartbeat is disabled');
      console.log('   - ia-memory directory does not exist');
    } else {
      console.log('❌ Error reading heartbeat file:', error.message);
    }
  }

  console.log('');
  console.log('🚀 To start the server with heartbeat:');
  console.log('   npm start');
  console.log('   # or');
  console.log('   memcp');
  console.log('');
  console.log('🔧 To test heartbeat in real-time:');
  console.log('   tail -f ia-memory/heartbeat.log');
}

testHeartbeat().catch(console.error);
