#!/usr/bin/env node

import { spawn } from 'child_process';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const main = join(__dirname, '..', 'dist', 'index.js');

/**
 * Enhanced launcher with parallel processing options and heartbeat monitoring
 */
class MCPLauncher {
  constructor(options = {}) {
    this.child = null;
    this.heartbeatEnabled = process.env.MCP_HEARTBEAT !== 'false';
    this.options = {
      // Default options
      enableParallel: process.env.MCP_PARALLEL === 'true',
      maxWorkers: parseInt(process.env.MCP_MAX_WORKERS || '4'),
      enableBackgroundTasks: process.env.MCP_BACKGROUND_TASKS !== 'false',
      heartbeatInterval: parseInt(process.env.MCP_HEARTBEAT_INTERVAL || '10'),
      projectPath: process.env.MEMORY_PROJECT_PATH || process.cwd(),
      ...options
    };
  }

  start() {
    console.error(`Starting MCP Server with options:`, this.options);
    console.error(`Heartbeat monitoring: ${this.heartbeatEnabled ? 'ENABLED' : 'DISABLED'}`);

    // Set environment variables for the server
    const env = {
      ...process.env,
      MCP_PARALLEL: this.options.enableParallel.toString(),
      MCP_MAX_WORKERS: this.options.maxWorkers.toString(),
      MCP_BACKGROUND_TASKS: this.options.enableBackgroundTasks.toString(),
      MCP_HEARTBEAT: this.heartbeatEnabled.toString(),
      MCP_HEARTBEAT_INTERVAL: this.options.heartbeatInterval.toString(),
      MEMORY_PROJECT_PATH: this.options.projectPath
    };

    // Spawn the server process
    this.child = spawn('node', [main], {
      stdio: 'inherit',
      env
    });

    // Handle process events
    this.child.on('exit', (code) => {
      console.error(`MCP Server exited with code ${code}`);
      process.exit(code || 0);
    });

    this.child.on('error', (error) => {
      console.error('Failed to start MCP Server:', error);
      process.exit(1);
    });

    // Handle graceful shutdown
    process.on('SIGTERM', () => this.shutdown());
    process.on('SIGINT', () => this.shutdown());
    process.on('SIGHUP', () => this.restart());
  }

  shutdown() {
    console.error('Shutting down MCP Server...');
    if (this.child) {
      this.child.kill('SIGTERM');
      
      // Force kill after timeout
      setTimeout(() => {
        if (this.child && !this.child.killed) {
          this.child.kill('SIGKILL');
        }
      }, 5000);
    }
  }

  restart() {
    console.error('Restarting MCP Server...');
    this.shutdown();
    setTimeout(() => this.start(), 1000);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const options = {};

// Parse options from command line
for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  
  if (arg === '--parallel') {
    options.enableParallel = true;
  } else if (arg === '--no-parallel') {
    options.enableParallel = false;
  } else if (arg === '--workers' && i + 1 < args.length) {
    options.maxWorkers = parseInt(args[++i]);
  } else if (arg === '--no-background') {
    options.enableBackgroundTasks = false;
  } else if (arg === '--heartbeat' && i + 1 < args.length) {
    options.heartbeatInterval = parseInt(args[++i]);
  } else if (arg === '--no-heartbeat') {
    process.env.MCP_HEARTBEAT = 'false';
  } else if (arg === '--project' && i + 1 < args.length) {
    options.projectPath = args[++i];
  }
}

// Start the launcher
const launcher = new MCPLauncher(options);
launcher.start();
