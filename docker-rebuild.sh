#!/bin/bash
# Safe Docker rebuild script - preserves MongoDB data and volumes

set -e

echo "=== Safe Docker Rebuild Script ==="
echo ""
echo "This script will:"
echo "  1. Stop all containers (keeping volumes intact)"
echo "  2. Rebuild the backend image with fresh dependencies"
echo "  3. Rebuild all dependent service images"
echo "  4. Start docker compose up"
echo ""

# Step 1: Stop containers without removing volumes
echo "Step 1: Stopping containers (preserving volumes)..."
docker compose down

# Step 2: Rebuild backend image (this will pick up multer from package.json)
echo ""
echo "Step 2: Rebuilding backend image with updated dependencies..."
docker compose build --no-cache backend

# Step 3: Rebuild dependent services
echo ""
echo "Step 3: Rebuilding dependent services..."
docker compose build --no-cache poller prompt-debugger knowledge-base template-creator

# Step 4: Start everything
echo ""
echo "Step 4: Starting docker compose..."
docker compose up -d

# Step 5: Show status
echo ""
echo "=== Checking container status ==="
docker compose ps

echo ""
echo "=== Build complete! ==="
echo ""
echo "MongoDB data is preserved in the 'mongo_data' volume."
echo "All containers should be starting up."
echo ""
echo "To see logs: docker compose logs -f"
echo "To check backend health: curl http://localhost:5001/api/health"
echo ""
