#!/usr/bin/env node

import { spawn } from 'child_process';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Global executable for MemCP
 * This script can be installed globally and executed from anywhere
 */

function showHelp() {
  console.log(`
MemCP - Memory Context Protocol Server

Usage: memcp [options] [project-path]

Options:
  --workers <n>       Number of worker processes (default: 4)
  --heartbeat <n>     Heartbeat interval in seconds (default: 10)
  --no-heartbeat      Disable heartbeat monitoring
  --no-parallel      Disable parallel processing
  --no-background    Disable background tasks
  --paths <paths>     Comma-separated paths to monitor (e.g., "/path1,/path2")
  --help, -h         Show this help

Examples:
  memcp                           # Start in current directory with default cluster
  memcp --workers 2              # Start with 2 workers
  memcp --heartbeat 5            # Heartbeat every 5 seconds
  memcp /path/to/project         # Start in specific project directory
  memcp --no-heartbeat           # Disable monitoring
  memcp --paths "/home/user/proj1,/home/user/proj2"  # Monitor multiple paths

Environment Variables:
  MEMORY_PROJECT_PATH    Project path (overrides argument)
  MCP_MAX_WORKERS       Number of workers
  MCP_HEARTBEAT         Enable/disable heartbeat (true/false)
  MCP_HEARTBEAT_INTERVAL Heartbeat interval in seconds
  MCP_MONITORING_PATHS  Comma-separated paths to monitor
`);
}

function main() {
  const args = process.argv.slice(2);
  
  // Check for help
  if (args.includes('--help') || args.includes('-h')) {
    showHelp();
    process.exit(0);
  }

  // Default options
  let workers = 4;
  let heartbeatInterval = 10;
  let enableHeartbeat = true;
  let enableParallel = true;
  let enableBackground = true;
  let projectPath = process.cwd();
  let monitoringPaths = [];

  // Parse arguments
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === '--workers' && i + 1 < args.length) {
      workers = parseInt(args[++i]);
    } else if (arg === '--heartbeat' && i + 1 < args.length) {
      heartbeatInterval = parseInt(args[++i]);
    } else if (arg === '--no-heartbeat') {
      enableHeartbeat = false;
    } else if (arg === '--no-parallel') {
      enableParallel = false;
    } else if (arg === '--no-background') {
      enableBackground = false;
    } else if (arg === '--paths' && i + 1 < args.length) {
      const pathsString = args[++i];
      monitoringPaths = pathsString.split(',').map(p => p.trim()).filter(p => p.length > 0);
    } else if (!arg.startsWith('--')) {
      // Assume it's a project path
      projectPath = arg;
    }
  }

  // Override with environment variables
  if (process.env.MEMORY_PROJECT_PATH) {
    projectPath = process.env.MEMORY_PROJECT_PATH;
  }
  if (process.env.MCP_MAX_WORKERS) {
    workers = parseInt(process.env.MCP_MAX_WORKERS);
  }
  if (process.env.MCP_HEARTBEAT_INTERVAL) {
    heartbeatInterval = parseInt(process.env.MCP_HEARTBEAT_INTERVAL);
  }
  if (process.env.MCP_HEARTBEAT === 'false') {
    enableHeartbeat = false;
  }
  if (process.env.MCP_MONITORING_PATHS) {
    const envPaths = process.env.MCP_MONITORING_PATHS.split(',').map(p => p.trim()).filter(p => p.length > 0);
    if (envPaths.length > 0) {
      monitoringPaths = envPaths;
    }
  }

  // If no monitoring paths specified, use the main project path
  if (monitoringPaths.length === 0) {
    monitoringPaths = [projectPath];
  }

  console.error('Starting MemCP Server...');
  console.error(`Project Path: ${projectPath}`);
  console.error(`Monitoring Paths: ${monitoringPaths.join(', ')}`);
  console.error(`Workers: ${workers}`);
  console.error(`Heartbeat: ${enableHeartbeat ? heartbeatInterval + 's' : 'disabled'}`);
  console.error(`Parallel: ${enableParallel}`);
  console.error(`Background Tasks: ${enableBackground}`);
  console.error('');

  // Build command
  const launcherScript = join(__dirname, 'memory-mcp-parallel.mjs');
  const cmdArgs = ['--parallel', '--workers', workers.toString()];

  if (!enableBackground) {
    cmdArgs.push('--no-background');
  }
  if (!enableHeartbeat) {
    cmdArgs.push('--no-heartbeat');
  } else {
    cmdArgs.push('--heartbeat', heartbeatInterval.toString());
  }
  
  cmdArgs.push('--project', projectPath);

  // Set environment
  const env = {
    ...process.env,
    MEMORY_PROJECT_PATH: projectPath,
    MCP_MAX_WORKERS: workers.toString(),
    MCP_HEARTBEAT: enableHeartbeat.toString(),
    MCP_HEARTBEAT_INTERVAL: heartbeatInterval.toString(),
    MCP_PARALLEL: enableParallel.toString(),
    MCP_BACKGROUND_TASKS: enableBackground.toString(),
    MCP_MONITORING_PATHS: monitoringPaths.join(',')
  };

  // Spawn the launcher
  const child = spawn('node', [launcherScript, ...cmdArgs], {
    stdio: 'inherit',
    env,
    cwd: projectPath
  });

  // Handle events
  child.on('exit', (code) => {
    console.error(`MemCP Server exited with code ${code}`);
    process.exit(code || 0);
  });

  child.on('error', (error) => {
    console.error('Failed to start MemCP Server:', error);
    process.exit(1);
  });

  // Handle signals
  process.on('SIGTERM', () => {
    console.error('Received SIGTERM, shutting down...');
    child.kill('SIGTERM');
  });

  process.on('SIGINT', () => {
    console.error('Received SIGINT, shutting down...');
    child.kill('SIGINT');
  });
}

main();
