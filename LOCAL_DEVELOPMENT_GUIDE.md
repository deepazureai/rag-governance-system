# Local Development Guide

## System Architecture Overview

The application consists of 6 services that run simultaneously:

| Service | Type | Port | Purpose |
|---------|------|------|---------|
| **Frontend** | Next.js (Node.js) | 3000 | Web UI dashboard |
| **Backend** | Express.js (Node.js) | 4000 | Core API server |
| **Poller** | Node.js service | 4001 | Data polling service |
| **Prompt Debugger** | Microservice (Node.js) | 3001 | LLM prompt debugging |
| **Knowledge Base** | Microservice (Node.js) | 3002 | Document retrieval |
| **Template Creator** | Microservice (Node.js) | 3003 | Template management |
| **DeepEval Service** | FastAPI (Python) | 8000 | Evaluation metrics |

## Prerequisites

### Node.js/npm
- **Node.js**: v18+ (https://nodejs.org/)
- **npm**: v9+ (comes with Node.js)
- Verify: `node --version && npm --version`

### Python (for DeepEval Service)
- **Python**: v3.9+ (https://www.python.org/)
- **pip**: Python package manager (comes with Python)
- Verify: `python --version && pip --version`

### Databases
- **MongoDB**: Running on `localhost:27017`
  - Start: `mongod` (if installed locally) or use Docker: `docker run -d -p 27017:27017 mongo`
- **PostgreSQL**: Running on `localhost:5432`
  - Start: `psql` (if installed locally) or use Docker: `docker run -d -p 5432:5432 -e POSTGRES_PASSWORD=password postgres`

## Step 1: Setup Environment Variables

### Create `.env.local` in project root

```bash
# Frontend Configuration
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_BACKEND_URL=http://localhost:4000

# DeepEval Service
DEEPEVAL_SERVICE_URL=http://localhost:8000
DEEPEVAL_API_KEY=deepeval-dev-key-12345678901234567890
```

### Create `backend/.env`

```bash
# Server
PORT=4000
NODE_ENV=development

# MongoDB
MONGODB_URL=mongodb://localhost:27017/eval_platform

# PostgreSQL (default connection)
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_USER=postgres
POSTGRES_PASSWORD=password
POSTGRES_DATABASE=postgres

# Logging
LOG_LEVEL=debug
```

### Create `poller/.env`

```bash
# MongoDB
MONGODB_URL=mongodb://localhost:27017/eval_platform

# PostgreSQL
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_USER=postgres
POSTGRES_PASSWORD=password
POSTGRES_DATABASE=postgres

# Polling Configuration
POLL_INTERVAL_MINUTES=5
BATCH_SIZE=1000
MAX_RETRIES=3

# Logging
LOG_LEVEL=debug
```

### Create `services/prompt-debugger/.env`

```bash
# Server
PORT=3001
NODE_ENV=development

# MongoDB
MONGODB_URI=mongodb://localhost:27017/eval_platform

# LLM Provider (choose one)
LLM_PROVIDER=openai
LLM_MODEL=gpt-4-turbo
LLM_API_KEY=your-openai-api-key-here

# Or use a local/free option:
# LLM_PROVIDER=custom
# LLM_MODEL=gpt-3.5-turbo
# LLM_API_KEY=sk-...
# LLM_BASE_URL=https://api.openai.com/v1
```

### Create `deepeval-service/.env`

```bash
# DeepEval Service
PORT=8000
DEEPEVAL_API_KEY=deepeval-dev-key-12345678901234567890
LOG_LEVEL=info
```

## Step 2: Install Dependencies

### Install Python environment for DeepEval

```bash
cd deepeval-service

# Create virtual environment
python -m venv venv

# Activate virtual environment
# On macOS/Linux:
source venv/bin/activate
# On Windows:
venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

### Install Node.js dependencies for all services

```bash
# Install dependencies for each service
cd /path/to/project

# Frontend
npm install

# Backend
cd backend && npm install && cd ..

# Poller
cd poller && npm install && cd ..

# Microservices
cd services/prompt-debugger && npm install && cd ../..
cd services/knowledge-base && npm install && cd ../..
cd services/template-creator && npm install && cd ../..
```

## Step 3: Run Services Locally

### Terminal 1: Frontend (Next.js)
```bash
cd /path/to/project
npm run dev
# Output: Ready on http://localhost:3000
```

### Terminal 2: Backend (Express.js)
```bash
cd /path/to/project/backend
npm run dev
# Output: Server running on port 4000
```

### Terminal 3: Poller Service
```bash
cd /path/to/project/poller
npm run dev
# Output: Poller started
```

### Terminal 4: Prompt Debugger Microservice
```bash
cd /path/to/project/services/prompt-debugger
npm run dev
# Output: Listening on port 3001
```

### Terminal 5: DeepEval Python Service
```bash
cd /path/to/project/deepeval-service

# Activate virtual environment
source venv/bin/activate  # macOS/Linux
# or
venv\Scripts\activate  # Windows

# Start service
python main.py
# Output: Uvicorn running on http://0.0.0.0:8000
```

### Additional Microservices (Optional Terminals 6 & 7)

**Terminal 6: Knowledge Base**
```bash
cd /path/to/project/services/knowledge-base
npm run dev
```

**Terminal 7: Template Creator**
```bash
cd /path/to/project/services/template-creator
npm run dev
```

## Running All Services Simultaneously

### Option A: Multiple Terminal Windows
Open 5-7 terminal tabs/windows and run the commands above in each one.

### Option B: Using Terminal Multiplexer (tmux/screen)

```bash
# Create tmux session
tmux new-session -d -s dev

# Create windows for each service
tmux new-window -t dev -n frontend
tmux new-window -t dev -n backend
tmux new-window -t dev -n poller
tmux new-window -t dev -n debugger
tmux new-window -t dev -n deepeval

# Send commands to each window
tmux send-keys -t dev:frontend "cd /path/to/project && npm run dev" Enter
tmux send-keys -t dev:backend "cd /path/to/project/backend && npm run dev" Enter
tmux send-keys -t dev:poller "cd /path/to/project/poller && npm run dev" Enter
tmux send-keys -t dev:debugger "cd /path/to/project/services/prompt-debugger && npm run dev" Enter
tmux send-keys -t dev:deepeval "cd /path/to/project/deepeval-service && source venv/bin/activate && python main.py" Enter

# View all windows
tmux list-windows -t dev

# Kill session when done
tmux kill-session -t dev
```

### Option C: Using Docker Compose (Recommended for Production)

See `docker-compose.yml` for containerized deployment.

## Accessing the Application

Once all services are running:

- **Frontend UI**: http://localhost:3000
- **Backend API**: http://localhost:4000
- **Prompt Debugger**: http://localhost:3001
- **Knowledge Base**: http://localhost:3002
- **Template Creator**: http://localhost:3003
- **DeepEval Service**: http://localhost:8000

## Verification Checklist

- [ ] MongoDB running on port 27017
- [ ] PostgreSQL running on port 5432
- [ ] Frontend running on port 3000
- [ ] Backend running on port 4000
- [ ] Poller running on port 4001
- [ ] Prompt Debugger running on port 3001
- [ ] DeepEval running on port 8000
- [ ] All .env files configured
- [ ] Python virtual environment activated for DeepEval
- [ ] No port conflicts

## Troubleshooting

### Port Already in Use
```bash
# Find process using port
lsof -i :3000
# Kill process
kill -9 <PID>

# Or use a different port
export PORT=3010 && npm run dev
```

### MongoDB Connection Refused
```bash
# Start MongoDB locally
mongod --dbpath /usr/local/var/mongodb

# Or with Docker
docker run -d -p 27017:27017 --name mongodb mongo
```

### PostgreSQL Connection Refused
```bash
# Start PostgreSQL locally (macOS)
brew services start postgresql

# Or with Docker
docker run -d -p 5432:5432 -e POSTGRES_PASSWORD=password --name postgres postgres
```

### Python Virtual Environment Issues
```bash
# Deactivate current env
deactivate

# Remove and recreate
rm -rf deepeval-service/venv
cd deepeval-service
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### Clear node_modules and reinstall
```bash
# For individual service
cd services/prompt-debugger
rm -rf node_modules package-lock.json
npm install
```

## Development Tips

- **Hot Reload**: All services support hot reload on file changes
- **Debug Mode**: Logs are verbose in development mode
- **API Documentation**: Swagger docs available at:
  - Backend: http://localhost:4000/api-docs
  - DeepEval: http://localhost:8000/docs

## Performance Notes

**Resource Requirements:**
- RAM: 4GB minimum (8GB+ recommended)
- CPU: Dual-core minimum (4+ cores recommended)
- Disk: 2GB free space

**Running all 7 services simultaneously uses approximately:**
- 2-3 GB RAM
- 50-100% CPU usage during processing
- 500MB-1GB disk I/O

## Next Steps

1. Access the frontend at http://localhost:3000
2. Create an application in the UI
3. Configure data sources and connections
4. Set up alert thresholds
5. Monitor metrics in real-time

## Getting Help

- Check logs in each terminal window
- Set `LOG_LEVEL=debug` in .env files for verbose logging
- Review API responses for error messages
- Check browser console for frontend errors
