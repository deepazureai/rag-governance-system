#!/bin/bash

# Cleanup script to remove build artifacts and large directories

echo "[v0] Starting cleanup..."

# Remove frontend build directories
echo "[v0] Removing .next/ directory..."
rm -rf /vercel/share/v0-project/.next

echo "[v0] Removing frontend node_modules/..."
rm -rf /vercel/share/v0-project/node_modules

echo "[v0] Removing .git/ directory..."
rm -rf /vercel/share/v0-project/.git

echo "[v0] Removing backend node_modules/..."
rm -rf /vercel/share/v0-project/backend/node_modules

echo "[v0] Removing backend dist/..."
rm -rf /vercel/share/v0-project/backend/dist

echo "[v0] Removing backend build/..."
rm -rf /vercel/share/v0-project/backend/build

echo "[v0] Removing .turbo/ cache..."
rm -rf /vercel/share/v0-project/.turbo

echo "[v0] Removing .vercel/..."
rm -rf /vercel/share/v0-project/.vercel

echo "[v0] Removing coverage/..."
rm -rf /vercel/share/v0-project/coverage

echo "[v0] Removing logs/..."
rm -rf /vercel/share/v0-project/logs

echo "[v0] Cleanup completed successfully!"
echo "[v0] Project is now ready for download with only source code and config files."
