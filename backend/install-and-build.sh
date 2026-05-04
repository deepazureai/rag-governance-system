#!/bin/bash
cd /vercel/share/v0-project/backend
echo "Installing dependencies with pnpm..."
pnpm install --no-frozen-lockfile
echo "Build complete"
