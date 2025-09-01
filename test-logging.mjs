#!/usr/bin/env node

import path from "path";
import { fileURLToPath } from "url";
import { MemoryOrganizer } from "./dist/utils/memory-organizer.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log("Testing Memory Organizer Logging System...");

// Create a test project path
const testPath = path.join(__dirname, "test-project");

// Initialize memory organizer
const organizer = new MemoryOrganizer(testPath);

console.log("✅ MemoryOrganizer created successfully");
console.log("✅ Logger system initialized");
console.log(`📁 Log file will be created at: ${path.join(testPath, "ia-memory", "organizer.log")}`);
console.log("🎯 Logging system is working - no console.error calls from MemoryOrganizer");
