# Quick Start Guide - Local Development

## TL;DR

### One-time Setup
```bash
# 1. Setup databases (MongoDB and PostgreSQL)
docker run -d -p 27017:27017 --name mongodb mongo
docker run -d -p 5432:5432 -e POSTGRES_PASSWORD=password --name postgres postgres

# 2. Setup Python environment
cd deepeval-service
python -m venv venv
source venv/bin/activate  # or: venv\Scripts\activate on Windows
pip install -r requirements.txt

# 3. Build all services
./build-all-sequential.sh  # First time (slower)
# or
./build-all-parallel.sh    # If you want it faster

# 4. Create environment files (see LOCAL_DEVELOPMENT_GUIDE.md)
```

### Running All Services

**Option A: Using tmux (Recommended - cleanest UI)**
```bash
./run-all-tmux.sh
# To exit tmux: Ctrl+B then D (detach)
# To view: tmux attach -t dev-server
```

**Option B: 7 Terminal Windows**
```bash
# Terminal 1: Frontend
npm run dev

# Terminal 2: Backend
cd backend && npm run dev

# Terminal 3: Poller
cd poller && npm run dev

# Terminal 4: Prompt Debugger
cd services/prompt-debugger && npm run dev

# Terminal 5: Knowledge Base
cd services/knowledge-base && npm run dev

# Terminal 6: Template Creator
cd services/template-creator && npm run dev

# Terminal 7: DeepEval (Python)
cd deepeval-service
source venv/bin/activate
python main.py
```

## Answers to Your Questions

### Do I need 5 terminals?

**Answer: You need 7 terminals (or use tmux for all-in-one)**

| Terminal | Service | Type |
|----------|---------|------|
| 1 | Frontend | JavaScript/React (Next.js) |
| 2 | Backend | JavaScript (Node.js/Express) |
| 3 | Poller | JavaScript (Node.js) |
| 4 | Prompt Debugger | JavaScript (Node.js) |
| 5 | Knowledge Base | JavaScript (Node.js) |
| 6 | Template Creator | JavaScript (Node.js) |
| 7 | DeepEval | **Python** (FastAPI) |

**That's 6 JavaScript/Node.js + 1 Python = 7 total**

### Do I need a Python environment?

**Answer: YES, only for the DeepEval service**

```bash
# Create virtual environment
python -m venv venv

# Activate it
# macOS/Linux:
source venv/bin/activate

# Windows:
venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run the service
python main.py
```

The other 6 services use Node.js and don't require Python.

### Can I execute them all at the same time?

**Answer: YES, absolutely!**

**Methods:**

1. **tmux (Easiest - One Terminal Window)**
   ```bash
   ./run-all-tmux.sh
   ```
   - All services in one session
   - Switch between them with arrow keys
   - Best for development

2. **Manual (7 Terminal Windows)**
   - Open 7 separate terminal windows/tabs
   - Run one command in each
   - More visible but cluttered

3. **Script (Background)**
   ```bash
   ./run-all-dev.sh &
   ```
   - All services run in background
   - Harder to see output

### What command to run the Python service?

**Answer: Simple - Just 3 steps**

```bash
# Step 1: Go to directory
cd deepeval-service

# Step 2: Activate Python environment
source venv/bin/activate  # macOS/Linux
# or
venv\Scripts\activate     # Windows

# Step 3: Run it
python main.py
```

**Expected Output:**
```
INFO:     Uvicorn running on http://0.0.0.0:8000
INFO:     Application startup complete
```

## Architecture When Running Locally

```
User Browser
    ↓
Frontend (port 3000)
    ↓ HTTP requests
Backend API (port 4000)
    ↓ ↓ ↓
┌───┴─────┴───┐
│             │
MongoDB   PostgreSQL
│             │
↑             ↑
Poller (4001) - Polls data from PostgreSQL/MongoDB
│
Microservices:
├─ Prompt Debugger (3001) - Analyzes prompts with LLM
├─ Knowledge Base (3002) - Retrieves documents
├─ Template Creator (3003) - Manages templates
│
└─ DeepEval Service (8000) - Evaluates quality [Python]
```

## Port Reference

| Service | Port | URL |
|---------|------|-----|
| Frontend | 3000 | http://localhost:3000 |
| Backend | 4000 | http://localhost:4000 |
| Poller | 4001 | http://localhost:4001 |
| Prompt Debugger | 3001 | http://localhost:3001 |
| Knowledge Base | 3002 | http://localhost:3002 |
| Template Creator | 3003 | http://localhost:3003 |
| DeepEval | 8000 | http://localhost:8000 |

## Recommended Setup for Development

### Step-by-step:

1. **Start databases (Docker)**
   ```bash
   docker run -d -p 27017:27017 --name mongodb mongo
   docker run -d -p 5432:5432 -e POSTGRES_PASSWORD=password --name postgres postgres
   ```

2. **Setup Python environment** (one-time)
   ```bash
   cd deepeval-service
   python -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   cd ..
   ```

3. **Create environment files** (copy from .env.example files)
   - See `LOCAL_DEVELOPMENT_GUIDE.md` for full configuration

4. **Build all services**
   ```bash
   ./build-all-parallel.sh
   ```

5. **Start all services**
   ```bash
   ./run-all-tmux.sh
   # Or manually in 7 terminals
   ```

6. **Access the app**
   - Open http://localhost:3000 in your browser
   - Start using the app!

## Stopping Services

### If using tmux:
```bash
# Inside tmux: Ctrl+B then D (to detach)
# Or in terminal:
tmux kill-session -t dev-server
```

### If using separate terminals:
```bash
# In each terminal, press: Ctrl+C
# Or in one command:
pkill -f "npm run dev|python main.py"
```

## Troubleshooting

### Services won't start?
1. Check if ports are already in use: `lsof -i :3000`
2. Kill conflicting processes: `kill -9 <PID>`
3. Check if databases are running

### Python script fails?
```bash
# Reinstall Python dependencies
cd deepeval-service
source venv/bin/activate
pip install -r requirements.txt --force-reinstall
```

### Node services fail?
```bash
# Clear cache and reinstall
cd services/prompt-debugger  # or any service
rm -rf node_modules package-lock.json
npm install
npm run dev
```

## More Information

See `LOCAL_DEVELOPMENT_GUIDE.md` for:
- Detailed environment variable setup
- Database configuration
- Debugging tips
- Performance notes
- Full troubleshooting guide

## Summary

| Question | Answer |
|----------|--------|
| Terminals needed? | 7 (or 1 with tmux) |
| Python environment? | YES, for DeepEval only |
| Run simultaneously? | YES, absolutely! |
| Python run command? | `python main.py` |
| Best method? | Use `./run-all-tmux.sh` |

**Ready to start? Run:** `./run-all-tmux.sh`
