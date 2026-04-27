#!/usr/bin/env node

const { execSync } = require('child_process');
const path = require('path');

console.log('==========================================');
console.log('Building Frontend with Strict TypeScript');
console.log('==========================================\n');

const frontendDir = '/vercel/share/v0-project';
let frontendSuccess = false;

try {
  console.log(`Current directory: ${frontendDir}`);
  console.log('Running: pnpm tsc --noEmit --strict\n');
  execSync('pnpm tsc --noEmit --strict', {
    cwd: frontendDir,
    stdio: 'inherit',
    shell: '/bin/bash',
  });
  frontendSuccess = true;
  console.log('\n✓ FRONTEND BUILD SUCCESS - No TypeScript errors\n');
} catch (error) {
  frontendSuccess = false;
  console.log('\n✗ FRONTEND BUILD FAILED - TypeScript errors detected\n');
}

console.log('==========================================');
console.log('Building Backend with Strict TypeScript');
console.log('==========================================\n');

const backendDir = '/vercel/share/v0-project/backend';
let backendSuccess = false;

try {
  console.log(`Current directory: ${backendDir}`);
  console.log('Running: pnpm tsc --noEmit --strict\n');
  execSync('pnpm tsc --noEmit --strict', {
    cwd: backendDir,
    stdio: 'inherit',
    shell: '/bin/bash',
  });
  backendSuccess = true;
  console.log('\n✓ BACKEND BUILD SUCCESS - No TypeScript errors\n');
} catch (error) {
  backendSuccess = false;
  console.log('\n✗ BACKEND BUILD FAILED - TypeScript errors detected\n');
}

console.log('==========================================');
console.log('BUILD SUMMARY');
console.log('==========================================\n');

if (frontendSuccess && backendSuccess) {
  console.log('✓ FRONTEND: PASSED');
  console.log('✓ BACKEND: PASSED');
  console.log('\n✅ ALL BUILDS PASSED - System is ready for deployment\n');
  process.exit(0);
} else {
  !frontendSuccess && console.log('✗ FRONTEND: FAILED');
  frontendSuccess && console.log('✓ FRONTEND: PASSED');
  !backendSuccess && console.log('✗ BACKEND: FAILED');
  backendSuccess && console.log('✓ BACKEND: PASSED');
  console.log('\n❌ SOME BUILDS FAILED - See errors above\n');
  process.exit(1);
}
