#!/bin/bash

# Clean up development artifacts before download
echo "Cleaning up development artifacts..."

# Remove Next.js build cache
rm -rf .next
echo "✓ Removed .next build cache"

# Remove node_modules
rm -rf node_modules
echo "✓ Removed node_modules"

# Remove backend node_modules if exists
if [ -d "backend/node_modules" ]; then
  rm -rf backend/node_modules
  echo "✓ Removed backend/node_modules"
fi

# Remove log files
rm -rf logs
echo "✓ Removed logs"

# Remove OS artifacts
find . -name ".DS_Store" -delete
find . -name "Thumbs.db" -delete
echo "✓ Removed OS artifacts"

# Remove temporary files
rm -rf tmp
rm -rf temp
echo "✓ Removed temporary files"

echo ""
echo "✓ Project cleaned! Ready for download."
echo "Project size is now minimal and contains only source code."
