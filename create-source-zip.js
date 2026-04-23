#!/usr/bin/env node

/**
 * Export Source Code as ZIP (No External Dependencies)
 * Uses Node.js built-in modules only
 * Excludes: node_modules, build artifacts, cache, OS files
 * Creates: project-source.zip with all source code
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Files and directories to exclude
const EXCLUDE_PATTERNS = [
  'node_modules',
  'dist',
  '.next',
  'build',
  'out',
  '.git',
  '.gitignore',
  '.DS_Store',
  'Thumbs.db',
  '*.log',
  '.env.local',
  '.env.*.local',
  'project-source.zip',
  'export-source.sh',
  'export-source.bat',
  'create-source-zip.js',
];

function shouldExclude(filePath, fileName) {
  return EXCLUDE_PATTERNS.some((pattern) => {
    if (pattern.includes('*')) {
      const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
      return regex.test(fileName);
    }
    return filePath.includes(pattern) || fileName === pattern;
  });
}

function createSourceZip() {
  const projectRoot = path.resolve(__dirname);
  const outputPath = path.join(projectRoot, 'project-source.zip');
  const tempDir = path.join(projectRoot, '.temp-zip-files');

  try {
    // Step 1: Create temp directory for files to include
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
    fs.mkdirSync(tempDir, { recursive: true });

    let fileCount = 0;
    let totalSize = 0;

    // Step 2: Copy files to temp directory
    console.log('🔄 Collecting source files...\n');

    function copyFilesRecursive(srcDir, destDir) {
      const files = fs.readdirSync(srcDir);

      files.forEach((file) => {
        const srcPath = path.join(srcDir, file);
        const destPath = path.join(destDir, file);
        const stat = fs.statSync(srcPath);

        // Skip excluded files
        if (shouldExclude(srcPath, file)) {
          console.log(`⏭️  Skipping: ${path.relative(projectRoot, srcPath)}`);
          return;
        }

        if (stat.isDirectory()) {
          fs.mkdirSync(destPath, { recursive: true });
          copyFilesRecursive(srcPath, destPath);
        } else {
          const fileSize = stat.size;
          totalSize += fileSize;
          fileCount++;
          fs.copyFileSync(srcPath, destPath);
          console.log(`✓ Including: ${path.relative(projectRoot, srcPath)} (${(fileSize / 1024).toFixed(1)} KB)`);
        }
      });
    }

    copyFilesRecursive(projectRoot, tempDir);

    // Step 3: Create ZIP using system command
    console.log('\n📦 Creating ZIP file...');

    try {
      // Try using 'zip' command (Linux/macOS)
      execSync(`cd "${projectRoot}" && zip -r project-source.zip .temp-zip-files/* -q`, {
        stdio: 'pipe',
      });
      // Rename the created zip contents
      execSync(`cd "${projectRoot}" && rm -f project-source.zip && cd .temp-zip-files && zip -r ../project-source.zip . -q`, {
        stdio: 'pipe',
      });
    } catch (e) {
      try {
        // Try using '7z' command (Windows or where available)
        execSync(`cd "${projectRoot}" && 7z a -r project-source.zip .temp-zip-files\\*`, {
          stdio: 'pipe',
        });
      } catch (e2) {
        // Fallback: Try PowerShell on Windows
        if (process.platform === 'win32') {
          execSync(`powershell -Command "Compress-Archive -Path '.temp-zip-files/*' -DestinationPath 'project-source.zip' -Force"`, {
            cwd: projectRoot,
            stdio: 'pipe',
          });
        } else {
          throw new Error('Could not create ZIP. Please ensure zip, 7z, or PowerShell is available.');
        }
      }
    }

    // Step 4: Verify ZIP was created
    if (fs.existsSync(outputPath)) {
      const zipSize = fs.statSync(outputPath).size;
      console.log('\n✅ ZIP Created Successfully!');
      console.log(`📦 File: ${outputPath}`);
      console.log(`📊 ZIP Size: ${(zipSize / (1024 * 1024)).toFixed(2)} MB`);
      console.log(`📄 Files included: ${fileCount}`);
      console.log(`📈 Uncompressed size: ${(totalSize / (1024 * 1024)).toFixed(2)} MB`);
      console.log(`✨ Compression ratio: ${((1 - zipSize / totalSize) * 100).toFixed(1)}%`);
      console.log('\n📥 Ready to download!');
    } else {
      throw new Error('ZIP file was not created');
    }

    // Step 5: Cleanup temp directory
    fs.rmSync(tempDir, { recursive: true, force: true });
  } catch (error) {
    console.error('\n❌ Error creating ZIP:', error.message);
    // Cleanup on error
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
    process.exit(1);
  }
}

// Run the script
createSourceZip();
