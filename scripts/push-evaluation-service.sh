#!/bin/bash

cd /vercel/share/v0-project

# Stage the evaluation.ts file
echo "[v0] Staging evaluation.ts..."
git add backend/src/services/evaluation.ts

# Commit the changes
echo "[v0] Committing changes..."
git commit -m "Fix: Update evaluation.ts with proper type-safe code and fixed eval parameter naming"

# Push to GitHub
echo "[v0] Pushing to GitHub..."
git push origin master

echo "[v0] Complete! Changes pushed to GitHub."
