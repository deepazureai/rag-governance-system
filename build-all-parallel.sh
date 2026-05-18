#!/bin/bash
# build-all-parallel.sh - Build all services in parallel (faster, uses more resources)

echo "=========================================="
echo "Building all services in parallel"
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

# Function to build a service
build_service() {
  local service=$1
  local service_name="${service//\//-}"
  echo "📦 Building $service..."
  
  cd "$PROJECT_ROOT/$service"
  npm install > /tmp/${service_name}-install.log 2>&1
  npm run build > /tmp/${service_name}-build.log 2>&1
  
  if [ $? -eq 0 ]; then
    echo "✓ $service built successfully"
    return 0
  else
    echo "✗ $service build failed (see /tmp/${service_name}-build.log)"
    cat /tmp/${service_name}-build.log | tail -10
    return 1
  fi
}

# Build all services in parallel
failed=0
for service in "${SERVICES[@]}"; do
  build_service "$service" &
done

# Wait for all background jobs and collect results
wait
if [ $? -ne 0 ]; then
  failed=1
fi

# Build frontend (do this sequentially after services complete)
echo ""
echo "📦 Building frontend..."
cd "$PROJECT_ROOT"
npm install
npm run build
if [ $? -eq 0 ]; then
  echo "✓ Frontend built successfully"
else
  echo "✗ Frontend build failed"
  failed=1
fi

echo ""
if [ $failed -eq 0 ]; then
  echo "=========================================="
  echo "✓ ALL BUILDS COMPLETED SUCCESSFULLY"
  echo "=========================================="
else
  echo "=========================================="
  echo "✗ SOME BUILDS FAILED (check logs above)"
  echo "=========================================="
  exit 1
fi
