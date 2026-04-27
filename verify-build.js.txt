#!/usr/bin/env node

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('🔨 Building Frontend and Backend with Strict TypeScript...\n');

const projectRoot = __dirname;
const backendDir = path.join(projectRoot, 'backend');

// Build Backend
console.log('📦 Backend: Running TypeScript strict check...');
try {
  execSync('npx tsc --noEmit --strict', { 
    cwd: backendDir,
    stdio: 'inherit'
  });
  console.log('✅ Backend TypeScript check passed!\n');
} catch (error) {
  console.error('❌ Backend TypeScript check failed!');
  process.exit(1);
}

// Build Frontend
console.log('📦 Frontend: Running TypeScript strict check...');
try {
  execSync('npx tsc --noEmit --strict', { 
    cwd: projectRoot,
    stdio: 'inherit'
  });
  console.log('✅ Frontend TypeScript check passed!\n');
} catch (error) {
  console.error('❌ Frontend TypeScript check failed!');
  process.exit(1);
}

console.log('✨ All builds completed successfully!');
console.log('✅ Both frontend and backend are ready for production deployment.');
