#!/bin/bash
# run-all-tmux.sh - Start all services in tmux (recommended for local development)

PROJECT_ROOT="/vercel/share/v0-project"
SESSION_NAME="dev-server"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}=========================================="
echo "Starting all services in tmux session"
echo "==========================================${NC}"
echo ""

# Kill existing session if it exists
tmux kill-session -t $SESSION_NAME 2>/dev/null || true

# Create main session
tmux new-session -d -s $SESSION_NAME -x 250 -y 50

# Create windows for each service
tmux new-window -t $SESSION_NAME -n frontend
tmux new-window -t $SESSION_NAME -n backend
tmux new-window -t $SESSION_NAME -n poller
tmux new-window -t $SESSION_NAME -n debugger
tmux new-window -t $SESSION_NAME -n knowledge
tmux new-window -t $SESSION_NAME -n template
tmux new-window -t $SESSION_NAME -n deepeval

# Start Frontend
tmux send-keys -t $SESSION_NAME:frontend "cd $PROJECT_ROOT && npm run dev" Enter
sleep 2

# Start Backend
tmux send-keys -t $SESSION_NAME:backend "cd $PROJECT_ROOT/backend && npm run dev" Enter
sleep 2

# Start Poller
tmux send-keys -t $SESSION_NAME:poller "cd $PROJECT_ROOT/poller && npm run dev" Enter
sleep 2

# Start Prompt Debugger
tmux send-keys -t $SESSION_NAME:debugger "cd $PROJECT_ROOT/services/prompt-debugger && npm run dev" Enter
sleep 2

# Start Knowledge Base
tmux send-keys -t $SESSION_NAME:knowledge "cd $PROJECT_ROOT/services/knowledge-base && npm run dev" Enter
sleep 2

# Start Template Creator
tmux send-keys -t $SESSION_NAME:template "cd $PROJECT_ROOT/services/template-creator && npm run dev" Enter
sleep 2

# Start DeepEval (Python)
tmux send-keys -t $SESSION_NAME:deepeval "cd $PROJECT_ROOT/deepeval-service && source venv/bin/activate && python main.py" Enter
sleep 2

# Display session info
echo ""
echo -e "${GREEN}✓ All services started in tmux session: $SESSION_NAME${NC}"
echo ""
echo "Available windows:"
echo "  - frontend   (http://localhost:3000)"
echo "  - backend    (http://localhost:4000)"
echo "  - poller     (http://localhost:4001)"
echo "  - debugger   (http://localhost:3001)"
echo "  - knowledge  (http://localhost:3002)"
echo "  - template   (http://localhost:3003)"
echo "  - deepeval   (http://localhost:8000)"
echo ""
echo "Commands:"
echo "  View all windows:    tmux list-windows -t $SESSION_NAME"
echo "  Attach to session:   tmux attach -t $SESSION_NAME"
echo "  View window 0:       tmux select-window -t $SESSION_NAME:frontend"
echo "  Kill session:        tmux kill-session -t $SESSION_NAME"
echo ""
echo "Example: tmux attach -t $SESSION_NAME"
echo ""

# Attach to the session
tmux attach -t $SESSION_NAME
