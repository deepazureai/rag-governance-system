import fs from 'fs';
import path from 'path';

const srcDir = '/vercel/share/v0-project/backend/src';

function addJsExtensionsToFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf-8');
    const originalContent = content;
    
    // Match imports from local files (relative paths starting with ./)
    // Pattern: from './path' or from "../path" but NOT from 'npm-package' or external modules
    content = content.replace(
      /from\s+['"](\.[^'"]*(?<!\.js|\.json|\.d\.ts))['"];/g,
      "from '$1.js';"
    );
    
    if (content !== originalContent) {
      fs.writeFileSync(filePath, content, 'utf-8');
      console.log(`✓ Fixed: ${filePath}`);
      return true;
    }
  } catch (error) {
    console.error(`✗ Error in ${filePath}:`, error.message);
  }
  return false;
}

function walkDir(dir) {
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      walkDir(fullPath);
    } else if (file.endsWith('.ts')) {
      addJsExtensionsToFile(fullPath);
    }
  }
}

console.log('Adding .js extensions to all local imports in backend/src...');
walkDir(srcDir);
console.log('✓ Done!');
