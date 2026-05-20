# Quick Start: RAG + Hallucination Detection System

## Prerequisites

- Node.js 18+ and npm/pnpm
- Docker & Docker Compose
- Azure OpenAI API key and endpoint
- MongoDB connection string

## 5-Minute Setup

### Step 1: Install Dependencies

```bash
cd /vercel/share/v0-project/backend
npm install
```

The following packages were added:
- `chromadb` - Vector database
- `langchain` + `@langchain/openai` - LLM framework
- `pdf-parse` - PDF processing

### Step 2: Configure Environment

Add to `.env` or `.env.local`:

```bash
# Azure OpenAI (for embeddings and LLM-as-Judge)
AZURE_OPENAI_API_KEY=your-azure-openai-api-key
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/
AZURE_OPENAI_DEPLOYMENT_ID=gpt-4  # or your deployment name

# MongoDB (already configured)
MONGODB_URI=mongodb://admin:password@localhost:27017/v0_db

# Feature flags
HALLUCINATION_DETECTION_ENABLED=true
KNOWLEDGE_BASE_ENABLED=true
```

### Step 3: Start Services

```bash
# From project root
docker-compose down -v  # Clean start
docker-compose up --build
```

This starts:
- MongoDB (port 27017)
- Backend API (port 5001)
- Frontend (port 3000)

### Step 4: Test the APIs

#### Upload a Document

```bash
curl -X POST http://localhost:5001/api/knowledge-base/upload \
  -F "files=@sample.pdf" \
  -F "applicationId=app-test-123" \
  -F "namespace=default"
```

Expected response: Document chunks created and vectorized

#### Search Knowledge Base

```bash
curl -X POST http://localhost:5001/api/knowledge-base/search \
  -H "Content-Type: application/json" \
  -d '{
    "applicationId": "app-test-123",
    "query": "your search query",
    "k": 5
  }'
```

Expected response: Top 5 most relevant document chunks with scores

#### Validate Response Against Knowledge Base

```bash
curl -X POST http://localhost:5001/api/knowledge-base/validate-response \
  -H "Content-Type: application/json" \
  -d '{
    "applicationId": "app-test-123",
    "userPrompt": "What is the company policy?",
    "llmResponse": "The policy states that...",
    "topK": 3
  }'
```

Expected response: Groundedness score (0-100) and supporting documents

#### Detect Hallucinations & Get Improvements

```bash
curl -X POST http://localhost:5001/api/evaluation/end-to-end \
  -H "Content-Type: application/json" \
  -d '{
    "sourceDocuments": [
      "Company policy: All employees must work 9-5.",
      "Remote work: Available on Tuesdays and Thursdays only."
    ],
    "userPrompt": "What are our work arrangements?",
    "llmResponse": "Employees can work remotely every day from home.",
    "targetGroundedness": 80
  }'
```

Expected response: Hallucination detected, prompt gaps identified, improvement suggestions

## Frontend Testing

### 1. Navigate to Dashboard

```
http://localhost:3000/dashboard
```

### 2. Open Application Details

Click on any application to view its dashboard

### 3. Use Knowledge Base Tab

- **Upload**: Upload documents (PDF, TXT, JSON, CSV)
- **Search**: Search uploaded documents
- **Validate**: Test LLM responses against knowledge base
  - See groundedness score
  - View matched terms
  - See supporting documents

### 4. Watch Metrics Update

Groundedness scores appear in:
- Metrics Display card
- Governance Dashboard
- Hallucination detection results

## Key Components

### Backend Services

| Service | Purpose | File |
|---------|---------|------|
| VectorStoreService | ChromaDB management | `services/VectorStoreService.ts` |
| DocumentProcessorService | PDF/TXT/JSON/CSV parsing | `services/DocumentProcessorService.ts` |
| HallucinationDetectionService | Azure OpenAI LLM-as-Judge | `services/HallucinationDetectionService.ts` |

### API Routes

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/knowledge-base/upload` | POST | Upload & vectorize documents |
| `/api/knowledge-base/search` | POST | Search knowledge base |
| `/api/knowledge-base/validate-response` | POST | Check response grounding |
| `/api/knowledge-base/stats/:appId` | GET | KB statistics |
| `/api/evaluation/detect` | POST | Detect hallucinations |
| `/api/evaluation/analyze-prompt` | POST | Analyze prompt quality |
| `/api/evaluation/end-to-end` | POST | Complete analysis pipeline |

### Frontend Components

- `KnowledgeBaseTab` - Upload, search, validate
- `MetricsDisplay` - Groundedness scores
- `GovernanceMetricsGrid` - System metrics
- `HallucinationDetectionResults` - Detection results display

## Common Tasks

### Upload Multiple Documents

```bash
curl -X POST http://localhost:5001/api/knowledge-base/upload \
  -F "files=@doc1.pdf" \
  -F "files=@doc2.txt" \
  -F "files=@doc3.json" \
  -F "applicationId=my-app" \
  -F "namespace=production"
```

### Search with Filters

```bash
curl -X POST http://localhost:5001/api/knowledge-base/search \
  -H "Content-Type: application/json" \
  -d '{
    "applicationId": "my-app",
    "query": "search term",
    "k": 10,
    "filters": {
      "namespace": "production",
      "source": "policies.pdf"
    }
  }'
```

### Batch Validate Multiple Responses

For each response:
```bash
curl -X POST http://localhost:5001/api/knowledge-base/validate-response \
  -H "Content-Type: application/json" \
  -d '{
    "applicationId": "my-app",
    "userPrompt": "...",
    "llmResponse": "...",
    "topK": 5
  }'
```

## Troubleshooting

### Issue: "Cannot find module chromadb"

**Solution:**
```bash
cd backend
npm install
npm run build
```

### Issue: "AZURE_OPENAI_API_KEY is not set"

**Solution:**
Add to `.env`:
```
AZURE_OPENAI_API_KEY=your-key
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/
```

### Issue: Search returns no results

**Solution:**
1. Verify documents uploaded: `GET /api/knowledge-base/stats/app-test-123`
2. Check if chunks were created
3. Try different search terms (more general)

### Issue: Slow response time

**Solution:**
- First request initializes ChromaDB (~500ms)
- Subsequent requests are faster (~100-200ms)
- Large documents take longer to chunk

## File Storage Locations

```
project-root/
├── data/
│   └── vectorstore/           # ChromaDB persistent storage
│       └── app-**/            # Collections per application
└── uploads/
    └── knowledge-base/        # Temporary upload storage
        └── [uploaded files]
```

Clean up old uploads (keep vectorstore):
```bash
rm -rf uploads/knowledge-base/*
```

## Architecture Overview

```
Frontend (React)
    ↓
  /api/knowledge-base/* (Upload, Search, Validate)
    ↓
  DocumentProcessor (Parse & Chunk)
    ↓
  VectorStore (ChromaDB + Azure Embeddings)
    ↓
  Persistent Storage (./data/vectorstore/)

Additionally:
  HallucinationDetection ↔ Azure OpenAI GPT-4
```

## Performance Expectations

- **Upload 10MB PDF**: ~2-5 seconds
- **Search query**: ~100-200ms (after first initialization)
- **Validate response**: ~300-500ms (includes search + analysis)
- **Hallucination detection**: ~1-2 seconds (LLM call)

## Next Steps

1. ✅ System is configured and running
2. ✅ Upload test documents via frontend
3. ✅ Test search functionality
4. ✅ Validate sample LLM responses
5. ✅ Review hallucination detection results
6. ⏭️ Integrate into your prompt workflow
7. ⏭️ Monitor metrics in governance dashboard
8. ⏭️ Iterate on prompts based on suggestions

## Documentation

- **Complete Guide**: `RAG_AND_HALLUCINATION_DETECTION_GUIDE.md`
- **Implementation Details**: `IMPLEMENTATION_SUMMARY.md`
- **Hallucination Detection**: `HALLUCINATION_DETECTION_GUIDE.md`

## Support

For issues or questions:
1. Check logs: `docker-compose logs backend`
2. Review API responses for error messages
3. Verify Azure OpenAI credentials
4. Check MongoDB connection

---

**You're all set! Start uploading documents and detecting hallucinations in your RAG system.**
