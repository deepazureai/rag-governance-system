#!/bin/bash

# ============================================================
# V0 LOCAL DEVELOPMENT SETUP FOR MAC
# ============================================================

echo "🚀 V0 Local Development Setup for Mac"
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker not found. Please install Docker Desktop for Mac:"
    echo "   https://www.docker.com/products/docker-desktop"
    exit 1
fi

# Check if Docker Compose is available
if ! docker compose version &> /dev/null; then
    echo "❌ Docker Compose not found. Please install Docker Desktop (includes Compose)"
    exit 1
fi

echo "✓ Docker and Docker Compose found"
echo ""

# ============================================================
# STEP 1: PREPARE ENVIRONMENT VARIABLES
# ============================================================
echo "Step 1: Setting up environment variables..."

if [ ! -f .env.local ]; then
    cp .env.example .env.local
    echo "✓ Created .env.local from template"
else
    echo "✓ .env.local already exists"
fi

# Make sure required vars are set
if [ -z "$ENCRYPTION_KEY" ]; then
    ENCRYPTION_KEY=$(openssl rand -base64 32)
    echo "export ENCRYPTION_KEY=$ENCRYPTION_KEY" >> .env.local
    echo "✓ Generated ENCRYPTION_KEY"
fi

if [ -z "$DEEPEVAL_API_KEY" ]; then
    DEEPEVAL_API_KEY=$(openssl rand -base64 16)
    echo "export DEEPEVAL_API_KEY=$DEEPEVAL_API_KEY" >> .env.local
    echo "✓ Generated DEEPEVAL_API_KEY"
fi

echo ""

# ============================================================
# STEP 2: BUILD DOCKER IMAGES
# ============================================================
echo "Step 2: Building Docker images..."
echo "This may take 5-10 minutes on first run"
echo ""

docker compose build --no-cache

if [ $? -ne 0 ]; then
    echo "❌ Docker build failed"
    exit 1
fi

echo "✓ Docker images built successfully"
echo ""

# ============================================================
# STEP 3: START SERVICES
# ============================================================
echo "Step 3: Starting services..."
echo ""

docker compose up -d

echo "⏳ Waiting for services to be healthy..."
sleep 10

# Check service health
echo ""
echo "Service Status:"
docker compose ps

echo ""
echo "============================================================"
echo "✅ SETUP COMPLETE!"
echo "============================================================"
echo ""
echo "Services running on:"
echo "  Frontend:    http://localhost:3000"
echo "  Backend:     http://localhost:5001"
echo "  DeepEval:    http://localhost:8000"
echo "  MongoDB:     localhost:27018"
echo ""
echo "Useful commands:"
echo "  View logs:        docker compose logs -f [service-name]"
echo "  Stop services:    docker compose down"
echo "  Rebuild:          docker compose build --no-cache"
echo ""
