## 🚀 QUICK DEPLOYMENT CARD - RAG Evaluation Platform

### **Status: PRODUCTION READY** ✅

---

## **Option 1: Development (3 Terminals)**

```bash
# Terminal 1 - Frontend
npm run dev
# → http://localhost:3000

# Terminal 2 - Backend  
cd backend && npm run start:dev
# → http://localhost:5001

# Terminal 3 - MongoDB
docker run -d -p 27017:27017 --name mongodb mongo:6
```

---

## **Option 2: Production (Docker Compose)**

```bash
docker-compose build --no-cache
docker-compose up -d
# → Frontend: http://localhost:3000
# → Backend: http://localhost:5001
```

---

## **First-Time Setup (After Starting Services)**

1. Open http://localhost:3000
2. Go to **Settings → Applications** → Create app
3. Go to **Settings → LLM Configuration**
   - Select app from dropdown
   - Enter 4 Azure OpenAI fields:
     - `api_key`: Your API key
     - `azure_endpoint`: https://your-resource.openai.azure.com/
     - `api_version`: 2024-02-15-preview
     - `deployment`: gpt-4-deployment
   - Click **Save**

4. (Optional) **Settings → KB Configuration** - Same 4 fields for embeddings + KB LLM

---

## **Test the System (4 Tests)**

| Test | Steps | Expected |
|------|-------|----------|
| **Upload** | Dashboard → Raw Data → Upload | Records appear |
| **DeepEval** | Click record → "Evaluate Now" | Scores calculated |
| **Recommendations** | Click record → "Get LLM Recommendations" | Suggestions appear |
| **Templates** | Dashboard → Templates → Create | LLM assists creation |

---

## **Key Commands**

```bash
# View logs
docker logs rag-backend-1      # Backend logs
docker logs rag-frontend-1     # Frontend logs
docker logs mongodb            # Database logs

# Stop services
docker-compose down

# Rebuild
docker-compose build --no-cache

# Fresh start
docker-compose down -v && docker-compose up -d
```

---

## **Verify Everything Works**

✅ Frontend compiles: `✓ Compiled successfully in 16.1s`  
✅ Backend ready: All routes registered  
✅ MongoDB: Connected to localhost:27017  
✅ Azure OpenAI: Configured in Settings  
✅ KB System: ChromaDB ready  
✅ Python Services: 5 services deployed  

---

## **Documentation**

- **Full Setup**: See `DEPLOYMENT_GUIDE.md`
- **Implementation**: See `IMPLEMENTATION_SUMMARY.md`
- **Troubleshooting**: See `DEPLOYMENT_GUIDE.md` → Troubleshooting section

---

## **What This System Does**

```
Metrics Gap → Recommendations → Prompt Improvement → Score Uplift

User uploads evaluation data with low scores (e.g., 30/100)
↓
System identifies hallucinations & prompt gaps
↓
LLM generates improvement recommendations
↓
User combines recommendations + KB prompts + manual edits
↓
New template created to uplift scores to benchmark (e.g., 70/100)
```

---

**Ready to deploy. Commands above will have you running in < 5 minutes.** 🎯
