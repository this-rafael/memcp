#!/usr/bin/env node

import { spawn } from 'child_process';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const main = join(__dirname, '..', 'dist', 'index.js');

const child = spawn('node', [main], {
  stdio: 'inherit'
});

child.on('exit', (code) => {
  process.exit(code || 0);
});
