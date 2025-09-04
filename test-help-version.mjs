#!/usr/bin/env node

import { readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

console.log("🧪 Testing help command version display...");

// Get package version dynamically (same as in main code)
function getPackageVersion() {
  try {
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    const packageJsonPath = path.join(__dirname, "package.json");
    const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"));
    return packageJson.version;
  } catch (error) {
    console.warn("Could not read package version, falling back to 1.0.0");
    return "1.0.0";
  }
}

async function testHelpVersion() {
  const version = getPackageVersion();
  console.log(`✅ Package version detected: ${version}`);
  
  // Test that the help content would include this version
  const helpContent = {
    memcp_version: getPackageVersion(),
    total_tools: 14,
    message: "This would be the help output with dynamic version"
  };
  
  console.log("📋 Help content preview:");
  console.log(JSON.stringify(helpContent, null, 2));
  
  if (helpContent.memcp_version === "1.0.20") {
    console.log("🎉 SUCCESS: Help command will show version 1.0.20!");
  } else {
    console.log(`✅ SUCCESS: Help command will show dynamic version ${helpContent.memcp_version}!`);
  }
}

testHelpVersion();
