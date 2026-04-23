#!/usr/bin/env node

/**
 * Export Source Code as ZIP
 * Excludes: node_modules, build artifacts, cache, OS files
 * Creates: project-source.zip with all source code
 */

const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

// Files and directories to exclude
const EXCLUDE_PATTERNS = [
  'node_modules',
  'dist',
  '.next',
  'build',
  'out',
  '.git',
  '.DS_Store',
  'Thumbs.db',
  '*.log',
  '.env.local',
  '.env.*.local',
  'project-source.zip',
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

  // Create write stream
  const output = fs.createWriteStream(outputPath);
  const archive = archiver('zip', {
    zlib: { level: 9 }, // Maximum compression
  });

  let fileCount = 0;
  let totalSize = 0;

  // Listen for archive completion
  output.on('close', () => {
    console.log('\n✅ ZIP Created Successfully!');
    console.log(`📦 File: ${outputPath}`);
    console.log(`📊 Size: ${(totalSize / (1024 * 1024)).toFixed(2)} MB`);
    console.log(`📄 Files included: ${fileCount}`);
    console.log('\n📥 Ready to download!');
  });

  // Listen for errors
  archive.on('error', (err) => {
    console.error('❌ Error creating ZIP:', err);
    process.exit(1);
  });

  output.on('error', (err) => {
    console.error('❌ Error writing ZIP:', err);
    process.exit(1);
  });

  // Pipe archive to output
  archive.pipe(output);

  // Recursively add files
  function addFilesRecursive(directory, arcPath = '') {
    const files = fs.readdirSync(directory);

    files.forEach((file) => {
      const fullPath = path.join(directory, file);
      const relativePath = path.join(arcPath, file);
      const stat = fs.statSync(fullPath);

      // Skip excluded files
      if (shouldExclude(fullPath, file)) {
        console.log(`⏭️  Skipping: ${relativePath}`);
        return;
      }

      if (stat.isDirectory()) {
        addFilesRecursive(fullPath, relativePath);
      } else {
        const fileSize = stat.size;
        totalSize += fileSize;
        fileCount++;
        archive.file(fullPath, { name: relativePath });
        console.log(`✓ Adding: ${relativePath} (${(fileSize / 1024).toFixed(1)} KB)`);
      }
    });
  }

  console.log('🔄 Creating ZIP...\n');
  addFilesRecursive(projectRoot);

  // Finalize the archive
  archive.finalize();
}

// Run the script
createSourceZip();
