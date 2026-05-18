#!/bin/bash
# build-all.sh - Build all services sequentially (safe, recommended for first-time builds)

set -e

echo "=========================================="
echo "Building all services, frontend, and backend"
echo "=========================================="
echo ""

PROJECT_ROOT="/vercel/share/v0-project"
SERVICES=(
  "backend"
  "poller"
  "services/prompt-debugger"
  "services/knowledge-base"
  "services/template-creator"
)

# Build each service
for service in "${SERVICES[@]}"; do
  echo "📦 Building $service..."
  cd "$PROJECT_ROOT/$service"
  npm install
  npm run build
  if [ $? -eq 0 ]; then
    echo "✓ $service built successfully"
  else
    echo "✗ $service build failed"
    exit 1
  fi
  echo ""
done

# Build frontend
echo "📦 Building frontend..."
cd "$PROJECT_ROOT"
npm install
npm run build
if [ $? -eq 0 ]; then
  echo "✓ Frontend built successfully"
else
  echo "✗ Frontend build failed"
  exit 1
fi

echo ""
echo "=========================================="
echo "✓ ALL BUILDS COMPLETED SUCCESSFULLY"
echo "=========================================="
