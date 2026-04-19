# HOW TO RUN - RAG Evaluation Metrics Dashboard

## Prerequisites

- Docker & Docker Compose (recommended for full stack)
- OR Node.js 18+ and npm/pnpm (for local development)
- MongoDB 6.0+ (if running without Docker)
- PostgreSQL 15+ (if running without Docker)

---

## Option 1: Docker Compose (RECOMMENDED - Full Stack)

### Step 1: Setup Environment Variables

```bash
cp .env.docker.example .env
```

Edit `.env` with your configuration:
```env
# Frontend
NEXT_PUBLIC_API_URL=http://localhost:5000
NODE_ENV=development
PORT=3000

# Backend
BACKEND_PORT=5000
DATABASE_URL=mongodb://mongo:27017/rag-evaluation
POSTGRES_URL=postgresql://postgres:password@postgres:5432/rag_evaluation

# MongoDB
MONGO_INITDB_ROOT_USERNAME=root
MONGO_INITDB_ROOT_PASSWORD=rootpassword
MONGO_INITDB_DATABASE=rag-evaluation

# PostgreSQL
POSTGRES_USER=postgres
POSTGRES_PASSWORD=password
POSTGRES_DB=rag_evaluation
```

### Step 2: Start All Services

```bash
# Start all services (frontend, backend, MongoDB, PostgreSQL)
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Step 3: Access the Application

- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:5000
- **MongoDB:** localhost:27017
- **PostgreSQL:** localhost:5432

---

## Option 2: Local Development (Frontend & Backend Separate)

### Backend Setup

```bash
cd backend

# Install dependencies
npm install
# or
pnpm install

# Setup environment
cp .env.example .env

# Edit .env with local MongoDB/PostgreSQL URLs
# DATABASE_URL=mongodb://localhost:27017/rag-evaluation
# POSTGRES_URL=postgresql://postgres:password@localhost:5432/rag_evaluation

# Start development server (watches for changes)
npm run dev
# or
pnpm dev

# Backend runs at http://localhost:5000
```

### Frontend Setup (in another terminal)

```bash
# Install dependencies
npm install
# or
pnpm install

# Setup environment
cp .env.example .env

# Update API URL for local backend
# NEXT_PUBLIC_API_URL=http://localhost:5000

# Start development server
npm run dev
# or
pnpm dev

# Frontend runs at http://localhost:3000
```

### MongoDB & PostgreSQL (Local)

If you don't have MongoDB and PostgreSQL installed locally, you can use Docker for just the databases:

```bash
# Run only databases
docker-compose -f docker-compose.backend.yml up -d mongo postgres
```

---

## Option 3: Production Docker Deployment

### Step 1: Build Docker Images

```bash
# Build backend image
docker build -t rag-evaluation-backend:latest ./backend

# Build frontend image
docker build -t rag-evaluation-frontend:latest .
```

### Step 2: Run Production Stack

```bash
# Using production docker-compose
cp .env.docker.example .env
# Update .env with production values (SSL, real domains, etc.)

docker-compose -f docker-compose.prod.yml up -d

# View logs
docker-compose -f docker-compose.prod.yml logs -f
```

### Step 3: Production Features Enabled

- HTTPS/SSL support (configure in .env)
- Nginx reverse proxy
- Security headers
- Rate limiting
- gzip compression
- Health checks on all services

---

## Option 4: Separate Frontend & Backend Deployment

### Backend on Server A

```bash
cd backend
docker build -t rag-evaluation-backend:latest .
docker run -d \
  --name rag-backend \
  -p 5000:5000 \
  -e DATABASE_URL=mongodb://mongo:27017/rag-evaluation \
  -e POSTGRES_URL=postgresql://postgres:pass@postgres:5432/rag_eval \
  rag-evaluation-backend:latest
```

### Frontend on Server B

```bash
docker build -t rag-evaluation-frontend:latest .
docker run -d \
  --name rag-frontend \
  -p 3000:3000 \
  -e NEXT_PUBLIC_API_URL=http://SERVER_A_IP:5000 \
  rag-evaluation-frontend:latest
```

---

## Verification & Testing

### Check Backend Health

```bash
curl http://localhost:5000/api/health
```

Expected response:
```json
{
  "success": true,
  "message": "Backend is running",
  "metricsJobActive": true,
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### Check Frontend

Open browser to http://localhost:3000

You should see:
- Dashboard with evaluation metrics
- Settings page with all tabs
- Navigation menu

### Access MongoDB

```bash
# Connect to MongoDB
docker exec -it rag-evaluation-mongo mongosh -u root -p rootpassword

# List databases
show dbs

# Use rag-evaluation database
use rag-evaluation

# List collections
show collections
```

### Access PostgreSQL

```bash
# Connect to PostgreSQL
docker exec -it rag-evaluation-postgres psql -U postgres -d rag_evaluation

# List tables
\dt

# Query applications
SELECT * FROM applications;
```

---

## Troubleshooting

### Backend won't start

```bash
# Check logs
docker-compose logs backend

# Common issues:
# 1. Port 5000 already in use
#    - Change BACKEND_PORT in .env
# 
# 2. MongoDB not running
#    - docker-compose up -d mongo
#
# 3. TypeScript compilation error
#    - npm run typecheck
#    - Fix errors in backend code
```

### Frontend won't start

```bash
# Check logs
docker-compose logs frontend

# Common issues:
# 1. Port 3000 already in use
#    - Change PORT in .env
#
# 2. API URL configuration wrong
#    - Verify NEXT_PUBLIC_API_URL in .env
#
# 3. Dependencies missing
#    - npm install
```

### Can't connect to databases

```bash
# Check if containers are running
docker ps

# Restart specific service
docker-compose restart mongo
docker-compose restart postgres

# Check MongoDB connection
docker-compose exec backend npm run typecheck
```

### Local folder batch processing not working

Make sure the local folder is mounted in docker-compose:

```yaml
volumes:
  - ./data/local:/app/local-data  # Local folder mount
```

Update backend .env:
```env
LOCAL_BATCH_DATA_PATH=/app/local-data
```

---

## Development Workflow

### 1. Start Services

```bash
docker-compose up -d
```

### 2. Watch Logs

```bash
docker-compose logs -f backend frontend
```

### 3. Make Changes

- Backend: Edit files in `backend/src/`
  - Changes auto-recompile with `tsx watch`
- Frontend: Edit files in `app/` or `src/components/`
  - Changes auto-reload with Next.js hot reload

### 4. Test Changes

- Backend: Restart container or wait for auto-reload
  ```bash
  docker-compose restart backend
  ```
- Frontend: Auto-reloads in browser

### 5. Stop Services

```bash
docker-compose down
```

---

## Database Initialization

The first time you run the application, databases are automatically initialized:

**MongoDB:**
- User: `root` / `rootpassword`
- Database: `rag-evaluation`
- Collections auto-created on first write

**PostgreSQL:**
- User: `postgres` / `password`
- Database: `rag_evaluation`
- Tables auto-created by ORMs on first connection

---

## Performance Tips

1. **Frontend Build Time:**
   - First build: ~60 seconds
   - Subsequent builds: ~5 seconds (with caching)

2. **Backend Startup:**
   - First start: ~10 seconds (TypeScript compilation)
   - Subsequent starts: ~2 seconds (from cache)

3. **Local Development:**
   - Use `npm run dev` for both services
   - Auto-reload on file changes
   - No manual restart needed (except for env changes)

---

## Next Steps After Running

1. **Add an Application:**
   - Go to http://localhost:3000/apps/new
   - Follow the 4-step wizard
   - Select a data source (Local Folder, Azure Logs, Splunk, etc.)

2. **Configure Batch Processing:**
   - Go to Settings → Batch Processing
   - Create scheduled jobs for automatic data ingestion

3. **View Metrics:**
   - Dashboard shows real-time metrics
   - Click refresh button per application
   - No auto-updates (user-controlled)

4. **Check Logs:**
   - Backend logs: `docker-compose logs backend`
   - Frontend logs: Check browser console
   - Application logs: Check `/logs` directory in containers

---

## Production Deployment

For production, use `docker-compose.prod.yml`:

```bash
docker-compose -f docker-compose.prod.yml up -d
```

This enables:
- SSL/HTTPS
- Nginx reverse proxy
- Security headers
- Rate limiting
- Resource limits
- Health checks
- Restart policies

---

## Support & Documentation

- Architecture: `DOCKER_DEPLOYMENT_GUIDE.md`
- Backend: `LOCAL_FOLDER_BATCH_PROCESSING_IMPLEMENTATION.md`
- Frontend: Application pages in `/app` directory
- Models: `backend/src/models/` directory

Happy running!
