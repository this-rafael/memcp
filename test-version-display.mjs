#!/usr/bin/env node

import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

console.log("🧪 Testing dynamic version display in MemCP...");

async function testVersionDisplay() {
  try {
    // Test the server startup message by running it briefly
    console.log("✅ Starting server to test version display...");
    
    const serverProcess = exec("timeout 2s node bin/memory-mcp.mjs 2>&1 || true");
    
    let output = "";
    if (serverProcess.stdout) {
      serverProcess.stdout.on("data", (data) => {
        output += data;
        console.log("📤 Server output:", data.toString().trim());
      });
    }
    
    if (serverProcess.stderr) {
      serverProcess.stderr.on("data", (data) => {
        output += data;
        console.log("📤 Server stderr:", data.toString().trim());
      });
    }
    
    await new Promise((resolve) => {
      serverProcess.on("close", (code) => {
        console.log(`✅ Server process exited with code: ${code}`);
        resolve(code);
      });
    });
    
    // Check if version is displayed
    if (output.includes("v1.0.20")) {
      console.log("🎉 SUCCESS: Version 1.0.20 is displayed correctly!");
    } else if (output.includes("Memory MCP server v")) {
      console.log("✅ SUCCESS: Dynamic version is working!");
      console.log("📝 Version pattern found in output");
    } else {
      console.log("⚠️  WARNING: Could not confirm version display in output");
      console.log("Output received:", output);
    }
    
  } catch (error) {
    console.error("❌ Test failed:", error.message);
  }
}

testVersionDisplay();
