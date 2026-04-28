#!/bin/bash

# RAG Evaluation Platform - Development Startup Script
# This script starts both frontend and backend applications

echo "================================================"
echo "RAG Evaluation Metrics Dashboard - Dev Server"
echo "================================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if running from correct directory
if [ ! -f "package.json" ] || [ ! -f "backend/package.json" ]; then
    echo "Error: Please run this script from the project root directory"
    exit 1
fi

echo -e "${BLUE}Starting development servers...${NC}"
echo ""

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "Installing frontend dependencies..."
    pnpm install
fi

if [ ! -d "backend/node_modules" ]; then
    echo "Installing backend dependencies..."
    cd backend && pnpm install && cd ..
fi

echo ""
echo -e "${GREEN}Starting Backend Server (Port 5001)${NC}"
echo "Running: cd backend && pnpm run dev"
echo ""

# Start backend in background
cd backend && pnpm run dev &
BACKEND_PID=$!

# Wait a bit for backend to start
sleep 3

cd ..

echo ""
echo -e "${GREEN}Starting Frontend Server (Port 3000)${NC}"
echo "Running: pnpm run dev"
echo ""

# Start frontend
pnpm run dev &
FRONTEND_PID=$!

# Wait for both servers
echo ""
echo -e "${GREEN}✓ Both servers are starting!${NC}"
echo ""
echo "Frontend: http://localhost:3000"
echo "Backend: http://localhost:5001"
echo ""
echo "Press Ctrl+C to stop both servers"
echo ""

# Handle cleanup on exit
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null" EXIT

# Wait for both processes
wait
