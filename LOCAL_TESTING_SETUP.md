# Sample Test Datasets for RAG/Agentic AI Evaluation Platform

This guide provides three sample datasets for testing the platform locally with MongoDB.

## Dataset Overview

### 1. Healthcare RAG Application (GOOD - High Metrics)
- **File**: healthcare_rag_evaluations.json
- **Type**: Medical Q&A RAG System
- **Records**: 75
- **Expected Metrics**: All above 85% (healthy)
- **Purpose**: Baseline good performance testing

### 2. Financial Data RAG Application (GOOD - Moderate Metrics)
- **File**: financial_rag_evaluations.json
- **Type**: Financial Analysis RAG System  
- **Records**: 80
- **Expected Metrics**: Most 80-90% (healthy to warning)
- **Purpose**: Moderate performance testing

### 3. Customer Support Agentic App (POOR - Below Thresholds)
- **File**: customer_support_agent_evaluations.json
- **Type**: Multi-agent Customer Support System
- **Records**: 65
- **Expected Metrics**: Many 60-75% (critical/warning alerts)
- **Purpose**: Alert and notification testing

## Data Structure

Each evaluation record follows this JSON schema:

```json
{
  "userPrompt": "User query/question",
  "context": "Retrieved documents or knowledge",
  "response": "System response",
  "retrievedDocuments": ["doc1", "doc2"],
  "groundedness": 85.5,
  "relevance": 88.2,
  "contextPrecision": 82.1,
  "contextRecall": 90.3,
  "answerRelevancy": 87.6,
  "coherence": 91.2,
  "faithfulness": 86.5,
  "successRate": 95,
  "latency": 1250,
  "tokenEfficiency": 850,
  "errorRate": 2,
  "timestamp": "2024-04-20T10:30:00Z"
}
```

## Industry Standard Thresholds (for Alert Testing)

- **Critical Alert**: Value below critical threshold
- **Warning Alert**: Value between critical and warning thresholds
- **Healthy**: Value at or above warning threshold

| Metric | Critical | Warning | Healthy |
|--------|----------|---------|---------|
| Groundedness | < 70% | 70-80% | > 80% |
| Relevance | < 75% | 75-85% | > 85% |
| Context Precision | < 70% | 70-80% | > 80% |
| Context Recall | < 75% | 75-85% | > 85% |
| Answer Relevancy | < 70% | 70-80% | > 80% |
| Coherence | < 75% | 75-85% | > 85% |
| Faithfulness | < 70% | 70-80% | > 80% |
| Success Rate | < 90% | 90-95% | > 95% |
| Latency (ms) | > 5001 | 3000-5001 | < 3000 |
| Token Efficiency | > 2000 | 1500-2000 | < 1500 |
| Error Rate | > 10% | 5-10% | < 5% |

## Local Testing Setup

### Step 1: Create Local Data Files

Create three JSON files in your local machine:

#### File 1: `healthcare_rag_evaluations.json` - Healthcare RAG (Good Performance)
75 records with metrics consistently > 85%

#### File 2: `financial_rag_evaluations.json` - Financial RAG (Moderate Performance)  
80 records with metrics mostly 80-90%

#### File 3: `customer_support_agent_evaluations.json` - Customer Support Agent (Poor Performance)
65 records with many metrics < 75% (triggers critical/warning alerts)

### Step 2: MongoDB Setup

```bash
# Start MongoDB locally
mongod

# Connect to MongoDB
mongo

# Create database
use rag_evaluation_platform

# Collections will be created automatically by the application
```

### Step 3: Add Applications in UI

1. Go to Applications page
2. Create 3 new applications:
   - **Name**: Healthcare RAG System
   - **Type**: RAG
   - **Source**: Local Folder
   - **Path**: /path/to/healthcare_rag_evaluations.json

   - **Name**: Financial Analysis RAG
   - **Type**: RAG
   - **Source**: Local Folder
   - **Path**: /path/to/financial_rag_evaluations.json

   - **Name**: Customer Support Agent
   - **Type**: Agentic AI
   - **Source**: Local Folder
   - **Path**: /path/to/customer_support_agent_evaluations.json

### Step 4: Run Batch Processing

1. Go to Settings > Batch Processing
2. For each application:
   - Select application
   - Click "Execute Batch"
   - Monitor progress

### Step 5: Verify Results

**Dashboard:**
- Healthcare RAG: Should show all metrics green (healthy)
- Financial RAG: Should show mostly green, some yellow (warning)
- Customer Support Agent: Should show many red (critical alerts)

**Settings > Alerts:**
- See "Active Alerts" section
- Customer Support Agent should trigger multiple critical alerts
- Verify alert messages and thresholds

**Notifications (if configured):**
- Email/Webhook notifications should be triggered for customer support agent
- Check notification logs in Settings > Notifications tab

## Expected Alert Triggers

### Healthcare RAG System
- **Alerts**: None (all metrics healthy)
- **Status**: ✅ All systems operational

### Financial RAG System
- **Alerts**: Possible warning alerts (if any metrics 75-85%)
- **Status**: ⚠️ Monitor performance

### Customer Support Agent
- **Alerts**: Multiple critical alerts
- **Metrics Below Threshold**:
  - Groundedness: 65-68% (critical)
  - Relevance: 70-74% (warning/critical)
  - Context Precision: 62-68% (critical)
  - Answer Relevancy: 68-72% (warning/critical)
  - Error Rate: 8-12% (warning/critical)
- **Status**: 🔴 Attention required - Investigate agent performance

## Testing Checklist

- [ ] MongoDB running locally
- [ ] Three applications created
- [ ] Batch processing completed for all applications
- [ ] Dashboard shows metrics for all apps
- [ ] Customer Support Agent shows critical alerts
- [ ] Alert thresholds configurable in Settings > Alerts
- [ ] Notification channels configured (Email/Webhook)
- [ ] Notifications sent for critical alerts
- [ ] Notification logs viewable in Settings > Notifications

## Next Steps

Once local testing is complete:
1. Proceed to **Explore Page** for evaluation pipeline UI
2. Build **Data Ingestion Enhancement** for production data sources
3. Add **Agent-level** evaluation metrics for Agentic AI applications
