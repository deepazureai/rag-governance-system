# RAG Evaluation Platform - Deployment Guide

## Overview
Complete end-to-end metrics improvement system with:
- Hallucination detection & recommendations
- Knowledge Base with ChromaDB + BM25 + MMR
- Azure OpenAI integration with exact parameter support
- Prompt template creation with LLM assistance

## Pre-Deployment Checklist

### 1. Environment Setup
```bash
# Clone or navigate to project
cd /path/to/rag-evaluation-platform

# Install dependencies
pnpm install

# Install backend dependencies
cd backend
pnpm install
cd ..
```

### 2. MongoDB Setup
```bash
# Start MongoDB locally (if not running)
docker run -d -p 27017:27017 --name mongodb mongo:6

# Or use Docker Compose (if mongodb service exists in docker-compose.yml)
docker-compose up -d mongodb
```

### 3. Environment Variables
Create `.env` files in root and backend directories:

**Root `.env`:**
```
NEXT_PUBLIC_API_URL=http://localhost:5001
MONGODB_URI=mongodb://localhost:27017/rag-evaluation
JWT_SECRET=your-secure-jwt-secret-key-here
NODE_ENV=development
```

**Backend `.env` (backend/.env):**
```
MONGODB_URI=mongodb://localhost:27017/rag-evaluation
API_PORT=5001
NODE_ENV=development
LOG_LEVEL=info
BETTER_AUTH_SECRET=your-better-auth-secret-key-here
```

## Deployment Steps

### Step 1: Build Frontend
```bash
npm run build
# Output: .next directory created
```

### Step 2: Build Backend
```bash
cd backend
npm run build
# Output: dist directory created
cd ..
```

### Step 3: Start Services

**Option A: Development Mode (Recommended for Testing)**
```bash
# Terminal 1 - Frontend
npm run dev
# Runs on http://localhost:3000

# Terminal 2 - Backend
cd backend
npm run start:dev
# Runs on http://localhost:5001

# Terminal 3 - MongoDB (if not using Docker Compose)
docker run -d -p 27017:27017 mongodb
```

**Option B: Production Mode with Docker Compose**
```bash
# Ensure docker-compose.yml includes:
# - mongodb service
# - backend service (build from ./backend/Dockerfile)
# - frontend service (build from ./Dockerfile)

docker-compose build --no-cache
docker-compose up -d

# Services will be available at:
# Frontend: http://localhost:3000
# Backend: http://localhost:5001
# MongoDB: localhost:27017
```

## Configuration & Testing

### 1. Initial Login
- Navigate to http://localhost:3000
- Use default credentials or create new account

### 2. Add Application
- Go to Settings → Applications
- Create new application (e.g., "RAG-app")
- Note the applicationId

### 3. Configure LLM (Azure OpenAI)
- Go to Settings → LLM Configuration
- **Select Application**: Choose your app from dropdown
- **Fill in all 4 required fields:**
  - `api_key`: Your Azure OpenAI API key
  - `azure_endpoint`: https://your-resource.openai.azure.com/
  - `api_version`: 2024-02-15-preview (or your API version)
  - `deployment`: Your deployment name (e.g., gpt-4-deployment)
- **SSL Verification**: Leave unchecked for production (check only for corporate proxy)
- Click Save

### 4. Configure Knowledge Base
- Go to Settings → Knowledge Base Configuration
- **Select Application**: Choose your app from dropdown
- **Embedding Configuration:**
  - Provider: azure-openai
  - embedding_api_key: Your API key
  - embedding_azure_endpoint: Your endpoint
  - embedding_api_version: 2024-02-15-preview
  - embedding_deployment: text-embedding-ada-002-deployment
- **KB LLM Configuration** (same 4 fields as LLM config)
- **Vector Store**: ChromaDB (with BM25 + MMR)
- Click Save

### 5. Test End-to-End Flow

**Test 1: Upload Raw Data**
1. Go to Dashboard → Raw Data
2. Upload evaluation records (CSV/JSON)
3. Verify records appear in table

**Test 2: Hallucination Detection & Recommendations**
1. Go to Dashboard → Raw Data
2. Click on a record to open modal
3. Click "Evaluate Now" (DeepEval with app LLM config)
4. Wait for evaluation scores
5. Click "Get LLM Recommendations" (uses saved LLM config)
6. Verify recommendations appear

**Test 3: Knowledge Base**
1. Go to Dashboard → Knowledge Base
2. Upload documents (PDF, DOCX, TXT, Excel, CSV, PPTX)
3. Verify documents are indexed
4. Search for content
5. Verify hybrid search results with relevance scores

**Test 4: Prompt Template Creation**
1. Go to Dashboard → Templates
2. Create new template
3. Use LLM assistance to combine recommendations from raw data
4. Select KB-created prompts to include
5. Click "Generate Improvement" (uses saved LLM config)
6. Review LLM suggestions, edit manually if needed
7. Save final template

## Troubleshooting

### Issue: "Missing required Azure OpenAI fields"
**Solution:**
- Go to Settings → LLM Configuration
- Ensure all 4 fields are filled:
  - api_key ✓
  - azure_endpoint ✓
  - api_version ✓
  - deployment ✓
- Save again

### Issue: "SSL verification failed" or certificate errors
**Solution:**
- If corporate proxy/self-signed cert:
  - Go to Settings → LLM Configuration
  - Check "Skip SSL Verification" (dev only)
  - Save
- Or set environment variable:
  ```bash
  export NODE_TLS_REJECT_UNAUTHORIZED=0
  ```

### Issue: MongoDB connection failed
**Solution:**
```bash
# Verify MongoDB is running
docker ps | grep mongo

# If not running, start it
docker run -d -p 27017:27017 --name mongodb mongo:6

# Check connection string in .env
cat .env | grep MONGODB_URI
```

### Issue: Recommendations not generating
**Solution:**
- Verify LLM config is saved (Settings → LLM Configuration)
- Check applicationId matches between UI and backend
- Review backend logs:
  ```bash
  cd backend
  tail -f logs/app.log
  ```

### Issue: KB search not returning results
**Solution:**
- Verify embedding config is saved (Settings → KB Configuration)
- Ensure documents are uploaded and indexed
- Check ChromaDB is properly initialized:
  ```bash
  ls -la backend/data/chroma  # ChromaDB data directory
  ```

## Monitoring & Logs

### Frontend Logs
```bash
# Browser DevTools Console
# Look for [v0] prefixed console.log statements
```

### Backend Logs
```bash
# Real-time logs
cd backend
npm run start:dev 2>&1 | tee logs/app.log

# View saved logs
tail -f logs/app.log
```

### MongoDB Logs
```bash
docker logs mongodb -f
```

## Performance Tuning

### For Large Datasets
1. **Embedding Batching**: Set batch size to 32 (default in embedding_service.py)
2. **Vector Store Indexing**: ChromaDB automatically handles indexing
3. **BM25 Re-ranking**: Enabled by default for hybrid search

### For High Volume
- Increase Node.js memory: `NODE_OPTIONS=--max-old-space-size=4096`
- Use production builds (no source maps)
- Enable caching for LLM responses

## Production Deployment

### Recommended Setup
```bash
# 1. Use environment-specific .env files
cp .env.production .env.local

# 2. Enable SSL/TLS
# - Set NODE_ENV=production
# - Use HTTPS certificates
# - Configure reverse proxy (nginx, etc.)

# 3. Use PM2 or similar for process management
npm install -g pm2
pm2 start backend/dist/index.js --name "rag-backend"
pm2 start "npm start" --name "rag-frontend"

# 4. Enable monitoring
npm install winston  # Already included for logging

# 5. Deploy with Docker
docker-compose -f docker-compose.prod.yml up -d
```

## Quick Reference

| Component | Port | Default | Status |
|-----------|------|---------|--------|
| Frontend | 3000 | http://localhost:3000 | ✓ Ready |
| Backend | 5001 | http://localhost:5001 | ✓ Ready |
| MongoDB | 27017 | localhost:27017 | ✓ Configured |
| ChromaDB | N/A | ./backend/data/chroma | ✓ Ready |

## Support

For issues, check:
1. Console logs: `[v0]` prefixed messages in browser/terminal
2. Backend logs: `backend/logs/app.log`
3. MongoDB connection: `mongo --host localhost:27017`
4. Azure OpenAI connectivity: Settings → LLM Configuration → Test connection

---

**Version**: 1.0  
**Last Updated**: 2026-05-29  
**Status**: Production Ready
