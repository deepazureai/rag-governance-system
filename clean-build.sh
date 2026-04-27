#!/bin/bash
# Clean Next.js build cache to resolve Pages Router conflicts

echo "[v0] Cleaning Next.js build artifacts..."

# Remove build directories
rm -rf .next
rm -rf node_modules/.cache
rm -rf .turbo

echo "[v0] Build cache cleaned successfully"
echo "[v0] Please run: npm install && npm run dev"
