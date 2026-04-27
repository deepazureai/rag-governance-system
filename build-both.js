#!/usr/bin/env node

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const projectRoot = '/vercel/share/v0-project';
const backendRoot = path.join(projectRoot, 'backend');

console.log('\n='.repeat(80));
console.log('STRICT TYPESCRIPT BUILD - FRONTEND AND BACKEND');
console.log('='.repeat(80));

try {
  // Frontend Build with Strict TypeScript
  console.log('\n📦 Frontend: Running TypeScript Strict Mode Check...');
  console.log('-'.repeat(80));
  
  try {
    const tscPath = path.join(projectRoot, 'node_modules', '.bin', 'tsc');
    execSync(`${tscPath} --noEmit --strict`, { 
      cwd: projectRoot,
      stdio: 'inherit',
      env: { ...process.env, NODE_ENV: 'production' }
    });
    console.log('\n✅ Frontend TypeScript Check: PASSED');
  } catch (error) {
    console.error('\n❌ Frontend TypeScript Check: FAILED');
    process.exit(1);
  }

  // Frontend Production Build
  console.log('\n📦 Frontend: Building for Production...');
  console.log('-'.repeat(80));
  try {
    execSync('pnpm build', {
      cwd: projectRoot,
      stdio: 'inherit',
      env: { ...process.env, NODE_ENV: 'production' }
    });
    console.log('\n✅ Frontend Build: PASSED');
  } catch (error) {
    console.error('\n❌ Frontend Build: FAILED');
    process.exit(1);
  }

  // Backend TypeScript Check
  console.log('\n\n📦 Backend: Running TypeScript Strict Mode Check...');
  console.log('-'.repeat(80));
  
  try {
    const backendTscPath = path.join(backendRoot, 'node_modules', '.bin', 'tsc');
    if (!fs.existsSync(backendTscPath)) {
      console.log('Backend dependencies not installed. Installing...');
      execSync('pnpm install', {
        cwd: backendRoot,
        stdio: 'inherit'
      });
    }
    
    execSync(`${backendTscPath} --noEmit --strict`, {
      cwd: backendRoot,
      stdio: 'inherit',
      env: { ...process.env, NODE_ENV: 'production' }
    });
    console.log('\n✅ Backend TypeScript Check: PASSED');
  } catch (error) {
    console.error('\n❌ Backend TypeScript Check: FAILED');
    process.exit(1);
  }

  // Backend Production Build
  console.log('\n📦 Backend: Building for Production...');
  console.log('-'.repeat(80));
  try {
    execSync('pnpm build', {
      cwd: backendRoot,
      stdio: 'inherit',
      env: { ...process.env, NODE_ENV: 'production' }
    });
    console.log('\n✅ Backend Build: PASSED');
  } catch (error) {
    console.error('\n❌ Backend Build: FAILED');
    process.exit(1);
  }

  // Summary
  console.log('\n' + '='.repeat(80));
  console.log('✅ ALL BUILDS SUCCESSFUL');
  console.log('='.repeat(80));
  console.log('\n📋 Build Summary:');
  console.log('  ✓ Frontend TypeScript strict check passed');
  console.log('  ✓ Frontend production build completed');
  console.log('  ✓ Backend TypeScript strict check passed');
  console.log('  ✓ Backend production build completed');
  console.log('\n🚀 Both applications are ready for deployment!\n');

} catch (error) {
  console.error('\n' + '='.repeat(80));
  console.error('❌ BUILD FAILED');
  console.error('='.repeat(80));
  console.error(error);
  process.exit(1);
}
