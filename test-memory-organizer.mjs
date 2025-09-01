#!/usr/bin/env node

/**
 * Test script for Memory Organizer functionality
 */

import { MemoryOrganizer, MultiPathMemoryOrganizer } from './dist/utils/memory-organizer.js';
import path from 'path';
import { promises as fs } from 'fs';

async function testSinglePathOrganizer() {
  console.log("🧪 Testing Single Path Memory Organizer\n");

  const testPath = process.env.TEST_PROJECT_PATH || '/tmp/memcp-test';
  
  try {
    // Create test directory structure
    const memoryPath = path.join(testPath, 'ia-memory');
    await fs.mkdir(memoryPath, { recursive: true });
    
    console.log(`📁 Test path: ${testPath}`);
    
    // Create organizer
    const organizer = new MemoryOrganizer(testPath);
    
    console.log("🚀 Starting organizer for 30 seconds...");
    organizer.start(0.5); // Every 30 seconds for testing
    
    // Wait for a few cycles
    await new Promise(resolve => setTimeout(resolve, 90000)); // 1.5 minutes
    
    console.log("🛑 Stopping organizer...");
    organizer.stop();
    
    console.log("✅ Single path test completed\n");
    
  } catch (error) {
    console.error("❌ Single path test failed:", error);
  }
}

async function testMultiPathOrganizer() {
  console.log("🧪 Testing Multi-Path Memory Organizer\n");

  const testPaths = [
    process.env.TEST_PROJECT_PATH1 || '/tmp/memcp-test1',
    process.env.TEST_PROJECT_PATH2 || '/tmp/memcp-test2'
  ];
  
  try {
    // Create test directory structures
    for (const testPath of testPaths) {
      const memoryPath = path.join(testPath, 'ia-memory');
      await fs.mkdir(memoryPath, { recursive: true });
      console.log(`📁 Test path: ${testPath}`);
    }
    
    // Create multi-path organizer
    const organizer = new MultiPathMemoryOrganizer();
    
    console.log("🚀 Starting multi-path organizer for 2 minutes...");
    organizer.start(testPaths, 0.5); // Every 30 seconds for testing
    
    // Wait for a few cycles
    await new Promise(resolve => setTimeout(resolve, 120000)); // 2 minutes
    
    console.log("🛑 Stopping multi-path organizer...");
    organizer.stop();
    
    console.log("✅ Multi-path test completed\n");
    
  } catch (error) {
    console.error("❌ Multi-path test failed:", error);
  }
}

async function testWithRealProject() {
  const realPaths = [];
  
  // Check if user provided real project paths
  if (process.env.MCP_MONITORING_PATHS) {
    realPaths.push(...process.env.MCP_MONITORING_PATHS.split(',').map(p => p.trim()));
  }
  
  if (realPaths.length === 0) {
    console.log("ℹ️  No real project paths provided. Set MCP_MONITORING_PATHS to test with real projects.\n");
    return;
  }
  
  console.log("🧪 Testing with Real Projects\n");
  console.log(`📂 Paths: ${realPaths.join(', ')}`);
  
  try {
    const organizer = new MultiPathMemoryOrganizer();
    
    console.log("🤖 Starting YOLO mode organizer for real projects...");
    console.log("   This will analyze and organize memory structures automatically!");
    console.log("   Press Ctrl+C to stop when ready\n");
    
    organizer.start(realPaths, 1); // Every 1 minute
    
    // Set up cleanup on exit
    const cleanup = () => {
      console.log("\n🛑 Stopping organizer...");
      organizer.stop();
      process.exit(0);
    };
    
    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);
    
    // Run indefinitely
    await new Promise(() => {});
    
  } catch (error) {
    console.error("❌ Real project test failed:", error);
  }
}

async function main() {
  console.log("🤖 MemCP Memory Organizer Test Suite\n");
  console.log("=====================================\n");
  
  const args = process.argv.slice(2);
  
  if (args.includes('--real') || args.includes('-r')) {
    await testWithRealProject();
  } else if (args.includes('--multi') || args.includes('-m')) {
    await testMultiPathOrganizer();
  } else if (args.includes('--single') || args.includes('-s')) {
    await testSinglePathOrganizer();
  } else {
    console.log("Usage:");
    console.log("  node test-memory-organizer.mjs [options]");
    console.log("");
    console.log("Options:");
    console.log("  --single, -s    Test single path organizer");
    console.log("  --multi, -m     Test multi-path organizer");
    console.log("  --real, -r      Test with real projects (use MCP_MONITORING_PATHS)");
    console.log("");
    console.log("Examples:");
    console.log("  node test-memory-organizer.mjs --single");
    console.log("  node test-memory-organizer.mjs --multi");
    console.log("  MCP_MONITORING_PATHS='/path1,/path2' node test-memory-organizer.mjs --real");
    console.log("");
    
    // Run a quick demo
    await testSinglePathOrganizer();
  }
}

main().catch(error => {
  console.error("💥 Test suite failed:", error);
  process.exit(1);
});
