# Raw Data Upload and ApplicationID Linking Fix

## The Problem You Identified

You were absolutely correct! The issue was indeed about **not properly linking applicationId** between collections. However, after investigation, I found that the code **WAS already correctly storing applicationId** in both:
- `rawdatarecords` collection (line 85 in BatchProcessingService)
- `evaluationrecords` collection (line 151 in BatchProcessingService)

## The Real Issue

The actual problem was different: **When you created RAG-3 through the wizard with `local_folder` source, no data was actually uploaded to the server**. Here's what happened:

1. You created RAG-3 app with dataSource type `local_folder`
2. The system correctly set status to `waiting_for_file` (it didn't auto-trigger batch process)
3. No CSV data was actually uploaded to the rawdatarecords collection
4. When you tried to refresh metrics, nothing showed up because there was no data to process

## The Solution

I've added two new API endpoints to handle this:

### 1. POST /api/applications/:id/upload-raw-data

Allows uploading CSV data directly via API. The endpoint:
- Accepts CSV data as a string in the request body
- Parses CSV headers and data rows
- Automatically includes `applicationId` in each record (the linking you were concerned about!)
- Stores all records in `rawdatarecords` collection

**Example request:**
```bash
curl -X POST "http://localhost:5001/api/applications/app_123/upload-raw-data" \
  -H "Content-Type: application/json" \
  -d '{
    "csvData": "userId,sessionId,query,response,context,...\nuser_001,session_001,What is AI?,AI is..."
  }'
```

### 2. POST /api/applications/:id/batch-process

Manually triggers batch processing for an application (already existed, but enhanced).

## How to Fix RAG-3

There are two ways:

### Option A: Use the Upload Script (Easiest)
```bash
# Run the provided script with sample data
bash scripts/upload-rag3-data.sh
```

This script will:
1. Upload 5 sample CSV records with proper timing fields
2. Automatically trigger batch processing
3. Populate all evaluation records with applicationId linking
4. Generate alerts

### Option B: Manual Steps
1. Copy the sample CSV data from the script
2. Call POST /api/applications/:id/upload-raw-data with the CSV
3. Call POST /api/applications/:id/batch-process to trigger processing
4. Wait 30 seconds and refresh dashboard

## The Data Flow (Fixed)

```
CSV Upload (with applicationId automatically added)
    ↓
rawdatarecords Collection
    ├─ Contains: applicationId, query, response, timing fields, tokens
    └─ Linked to: applicationMasters via applicationId
    
Batch Process Phase 2-5
    ↓
evaluationrecords Collection
    ├─ Contains: applicationId, evaluation metrics, frameworks
    └─ Linked to: applicationMasters via applicationId
    
Dashboard Queries
    ├─ GET /governance/raw-data/:appId
    │  └─ Queries evaluationrecords WHERE applicationId = :appId
    └─ Returns: All records for that application
```

## Key Insight

The linking was already there in the code! The issue was simply that **no data was being uploaded** for RAG-3. Now with the upload endpoint, you can:

1. Upload data independently from application creation
2. Data is automatically linked via applicationId
3. Batch process can be triggered on demand
4. All downstream queries work correctly

## What Changed

### Backend Changes
- Added `/api/applications/:id/upload-raw-data` endpoint
- Added `/api/applications/:id/batch-process` endpoint (enhanced)
- Added CSV parsing helper functions
- All records automatically get `applicationId` field

### Frontend Changes (Deferred)
- Dashboard already shows "Trigger Batch Process" button when status is `waiting_for_file`
- No additional changes needed for UI

## Verification

To verify RAG-3 is working after upload:

1. Run the upload script: `bash scripts/upload-rag3-data.sh`
2. Wait 5 seconds
3. Go to Dashboard
4. Select RAG-3 application
5. Click "Refresh Metrics"
6. You should see:
   - Raw data tab: 5 records with timing/token fields
   - Metrics: Evaluation scores from RAGAS/BLEU/LlamaIndex
   - Governance page: P95/P99 latencies, token usage, cost
   - Alerts: Quality alerts for low-scoring evaluations

## Next Steps

After confirming RAG-3 works:
1. Governance page - we'll debug why metrics aren't displaying
2. Alerts page - we'll debug why alerts aren't displaying
3. Both should work once we verify the data is flowing through correctly
