# RAG Evaluation Platform - Windows Docker Deployment Guide (48-Hour Setup)

**Target:** Deploy on Windows office laptop with Docker for video demo  
**Timeline:** Deploy today, demo tomorrow, video day-after-tomorrow EOD

---

## Prerequisites Checklist

- [ ] Docker Desktop installed on Windows (with WSL2)
- [ ] MongoDB Atlas account (cloud) OR local MongoDB in container
- [ ] Node.js 18+ (for local dev if needed)
- [ ] Git installed
- [ ] Project code cloned

**Quick Check:**
```bash
docker --version
docker-compose --version
node --version
```

---

## Step 1: Prepare Docker Compose Setup (5 min)

Create `docker-compose.yml` in project root:

```yaml
version: '3.8'

services:
  # MongoDB (optional - use Atlas if available)
  mongodb:
    image: mongo:7.0
    container_name: rag-eval-mongo
    ports:
      - "27017:27017"
    environment:
      MONGO_INITDB_ROOT_USERNAME: root
      MONGO_INITDB_ROOT_PASSWORD: password123
    volumes:
      - mongo_data:/data/db
    networks:
      - rag-network

  # Backend API
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: rag-eval-backend
    ports:
      - "5001:5001"
    environment:
      NODE_ENV: production
      PORT: 5001
      MONGODB_URI: mongodb://root:password123@mongodb:27017/rag-eval?authSource=admin
      # Add other env vars from .env
    depends_on:
      - mongodb
    networks:
      - rag-network
    command: npm start

  # Frontend
  frontend:
    build:
      context: .
      dockerfile: Dockerfile.frontend
    container_name: rag-eval-frontend
    ports:
      - "3000:3000"
    environment:
      NEXT_PUBLIC_API_URL: http://backend:5001
    depends_on:
      - backend
    networks:
      - rag-network

volumes:
  mongo_data:

networks:
  rag-network:
    driver: bridge
```

---

## Step 2: Create Dockerfiles (10 min)

**Create `backend/Dockerfile`:**

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 5001

CMD ["npm", "start"]
```

**Create `Dockerfile.frontend`:**

```dockerfile
FROM node:18-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:18-alpine

WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY package*.json ./

EXPOSE 3000

CMD ["npm", "start"]
```

---

## Step 3: Environment Setup (5 min)

Create `.env.production` in project root:

```env
# MongoDB
MONGODB_URI=mongodb://root:password123@mongodb:27017/rag-eval?authSource=admin

# Backend
NODE_ENV=production
PORT=5001
BACKEND_URL=http://localhost:5001

# Frontend
NEXT_PUBLIC_API_URL=http://localhost:5001

# Azure OpenAI (from your settings)
AZURE_OPENAI_API_KEY=your-key-here
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/
AZURE_OPENAI_DEPLOYMENT_NAME=gpt-4-turbo
AZURE_OPENAI_API_VERSION=2024-02-15-preview

# Optional: Atlas MongoDB
# MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/rag-eval
```

---

## Step 4: Quick Build & Deploy (15 min)

```bash
# Navigate to project root
cd /path/to/rag-eval-project

# Build images
docker-compose build

# Start services
docker-compose up -d

# Check status
docker-compose ps
# Should show 3 containers running: mongodb, backend, frontend

# View logs (if issues)
docker-compose logs -f backend
docker-compose logs -f frontend
```

---

## Step 5: Verify Deployment (5 min)

**Backend Health Check:**
```bash
curl http://localhost:5001/health
# Should return 200 OK
```

**Frontend Access:**
```
http://localhost:3000
```

**Database Check:**
```bash
docker exec rag-eval-backend npm run db:status
# Should show connection successful
```

---

## Step 6: Load Demo Data (10 min)

Create `demo-data.json`:

```json
{
  "applicationId": "rag-eval-demo",
  "connectionId": "local-demo",
  "sourceType": "local-folder",
  "fileName": "demo-data.csv",
  "userPrompt": "What are the key differences between vector embeddings and keyword-based search in RAG systems?",
  "llmResponse": "Vector embeddings use semantic similarity while keyword search uses exact term matching. Embeddings capture meaning, keywords are faster.",
  "evaluationScores": [
    { "metricName": "answer_relevance", "value": 0.72 },
    { "metricName": "retrieval_precision", "value": 0.65 },
    { "metricName": "context_recall", "value": 0.58 }
  ],
  "contextRetrieved": [
    {
      "documentId": "doc-1",
      "content": "Embeddings capture semantic meaning...",
      "relevanceScore": 0.85
    }
  ]
}
```

**Upload via API:**
```bash
curl -X POST http://localhost:5001/api/raw-data/upload \
  -H "Content-Type: application/json" \
  -d @demo-data.json
```

---

## Step 7: Pre-Demo Checklist (Day Before Demo)

- [ ] All 3 containers running (`docker-compose ps`)
- [ ] Frontend loads at http://localhost:3000
- [ ] Backend responds at http://localhost:5001/health
- [ ] Demo data uploaded and visible in Raw Data tab
- [ ] Metrics calculated and displayed
- [ ] Can generate recommendations without errors
- [ ] Can save recommendations
- [ ] Can create template
- [ ] KB is populated with sample documents
- [ ] Can badge KB responses

---

## Troubleshooting

**Backend won't start:**
```bash
docker-compose logs backend
# Check MONGODB_URI in .env
# Check port 5001 not in use: netstat -ano | findstr :5001
```

**Frontend won't build:**
```bash
docker-compose logs frontend
# Check npm run build works locally first
npm run build
```

**MongoDB connection fails:**
```bash
# Check MongoDB is running
docker-compose ps mongodb

# Reset everything
docker-compose down -v
docker-compose up -d
```

**Port already in use:**
```yaml
# In docker-compose.yml, change ports:
ports:
  - "3001:3000"  # Frontend on 3001 instead
  - "5002:5001"  # Backend on 5002 instead
  - "27018:27017" # Mongo on 27018 instead
```

---

## Performance Tips for Video Recording

1. **Reduce animation delays** - Open DevTools → Settings → Disable animations
2. **Close unnecessary apps** - Free up RAM for smooth recording
3. **Use OBS Studio** (free) - Better quality than built-in screen recorder
4. **Record at 1080p 30fps** - Good quality, smaller file
5. **Disable notifications** - Windows key + Focus Assist

---

## Quick Rollback If Issues

```bash
# Stop everything
docker-compose down

# Remove containers and volumes
docker-compose down -v

# Fresh start
docker-compose build --no-cache
docker-compose up -d
```

---

## File Transfer After Recording

**Option 1: Transfer via OneDrive/Google Drive**
```bash
# Drag video to OneDrive folder (auto syncs to office network)
# Access from office desktop
```

**Option 2: Compress video**
```bash
# Using ffmpeg (install if needed)
ffmpeg -i demo.mp4 -crf 28 -preset slow demo-compressed.mp4
# Results: ~1GB → ~200-300MB
```

**Option 3: Split into chunks**
```bash
# Use 7-Zip to split into 100MB chunks
# Send via email or cloud storage
```

---

## Expected Timeline

- **Today (T-2):** Steps 1-5 (30 min total)
- **Tonight:** Steps 6-7 (verify everything works)
- **Tomorrow (T-1):** Record demo video (30-60 min)
- **Day-After-Tomorrow (T):** Final edits, send to customer EOD

You're on track. Let's go!

