#!/bin/bash

# Source Code Export Script for Linux/macOS
# Creates a clean ZIP file excluding node_modules, build artifacts, and cache files

set -e

echo "================================"
echo "  Source Code Export Script"
echo "================================"
echo ""

# Check if we're in the project directory
if [ ! -f "package.json" ]; then
    echo "Error: package.json not found!"
    echo "Please run this script from the project root directory."
    exit 1
fi

# Define directories to exclude
EXCLUDE_PATTERNS=(
    "node_modules"
    ".next"
    "dist"
    "build"
    "coverage"
    ".git"
    ".env.local"
    ".env.*.local"
    "*.log"
    ".DS_Store"
    ".turbo"
    ".vercel"
    "project-source.zip"
    ".pnpm-store"
)

# Create exclude arguments for tar
EXCLUDE_ARGS=""
for pattern in "${EXCLUDE_PATTERNS[@]}"; do
    EXCLUDE_ARGS="$EXCLUDE_ARGS --exclude=$pattern"
done

# Create the ZIP file
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
ZIP_NAME="project-source_${TIMESTAMP}.zip"

echo "Creating ZIP file: $ZIP_NAME"
echo ""
echo "Excluding:"
for pattern in "${EXCLUDE_PATTERNS[@]}"; do
    echo "  - $pattern"
done
echo ""

# Count files to include
FILE_COUNT=$(find . -type f $EXCLUDE_ARGS 2>/dev/null | wc -l)
echo "Total files to include: $FILE_COUNT"
echo ""

# Create the ZIP using tar and gzip
tar $EXCLUDE_ARGS -czf "$ZIP_NAME" .

# Get file size
FILE_SIZE=$(du -h "$ZIP_NAME" | cut -f1)

echo ""
echo "================================"
echo "✓ Export Complete!"
echo "================================"
echo "File: $ZIP_NAME"
echo "Size: $FILE_SIZE"
echo ""
echo "Next steps:"
echo "1. Transfer this ZIP to your local machine"
echo "2. Extract: unzip $ZIP_NAME"
echo "3. Install: pnpm install"
echo "4. Build: pnpm build"
echo ""
