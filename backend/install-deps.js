#!/usr/bin/env node
const { execSync } = require('child_process');

console.log('[v0] Installing dependencies with pnpm...');

try {
  execSync('pnpm install', {
    cwd: '/vercel/share/v0-project/backend',
    stdio: 'inherit'
  });
  console.log('[v0] Dependencies installed successfully!');
} catch (error) {
  console.error('[v0] Error installing dependencies:', error.message);
  process.exit(1);
}
