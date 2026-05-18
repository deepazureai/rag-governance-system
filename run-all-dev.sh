#!/bin/bash
# run-all-dev.sh - Run all services in development mode with hot reload

set -e

PROJECT_ROOT="/vercel/share/v0-project"

echo "=========================================="
echo "Starting all services in development mode"
echo "=========================================="
echo ""
echo "Services will start in the following order:"
echo "1. Frontend (http://localhost:3000)"
echo "2. Backend (http://localhost:4000)"
echo "3. Poller (http://localhost:4001)"
echo "4. Prompt Debugger (http://localhost:3001)"
echo "5. Knowledge Base (http://localhost:3002)"
echo "6. Template Creator (http://localhost:3003)"
echo "7. DeepEval (http://localhost:8000)"
echo ""
echo "Note: You need 7 terminal windows or use tmux (see docs)"
echo "=========================================="
echo ""

# Function to run a service
run_service() {
  local service=$1
  local port=$2
  local is_python=$3
  
  echo "[$(date +'%H:%M:%S')] Starting $service on port $port..."
  
  if [ "$is_python" = "true" ]; then
    cd "$PROJECT_ROOT/$service"
    source venv/bin/activate
    python main.py
  else
    cd "$PROJECT_ROOT/$service"
    npm run dev
  fi
}

# Array of services to start
# Format: (service_path port is_python)
declare -a services=(
  "frontend:3000:false"
  "backend:4000:false"
  "poller:4001:false"
  "services/prompt-debugger:3001:false"
  "services/knowledge-base:3002:false"
  "services/template-creator:3003:false"
  "deepeval-service:8000:true"
)

# Start each service in background
for service_config in "${services[@]}"; do
  IFS=':' read -r service port is_python <<< "$service_config"
  run_service "$service" "$port" "$is_python" &
  sleep 2  # Stagger startup
done

echo ""
echo "✓ All services started!"
echo ""
echo "To stop all services, run: pkill -f 'npm run dev|python main.py'"
echo ""

# Wait for all background processes
wait
