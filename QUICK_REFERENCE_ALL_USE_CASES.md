# Quick Reference: All 6 Use Cases Status

## ✅ USE CASE 1: Evaluation Quality Metrics on Dashboard
**Status**: Production Ready

**What It Does:**
- Displays AI evaluation quality scores (groundedness, coherence, relevance, etc.)
- Shows framework badges (RAGAS, BLEU/ROUGE, LlamaIndex)
- Shows SLA compliance percentage with color coding

**Key Files:**
- `backend/src/services/ApplicationMetricsService.ts` - Metric aggregation & SLA calculation
- `backend/src/api/metricsRoutes.ts` - API endpoints with framework/SLA fields
- `app/dashboard/page.tsx` - Dashboard display

**Data Flow:**
evaluationrecords → ApplicationMetricsService → Dashboard

---

## ✅ USE CASE 2: New Metrics Display on Dashboard
**Status**: Production Ready

**What It Does:**
- Shows AI system performance metrics (latency P95/P99, tokens, cost, errors)
- Displays trends with directional indicators
- Color-codes severity (green/orange/red)

**Key Files:**
- `backend/src/services/AIActivityGovernanceService.ts` - Governance metric calculation
- `app/dashboard/page.tsx` - Dashboard rendering
- `src/components/dashboard/MetricsDisplay.tsx` - Metrics component

**Data Flow:**
governancemetrics → Dashboard rendering with color coding

---

## ✅ USE CASE 3: Governance Metrics Calculation
**Status**: Production Ready

**What It Does:**
- Phase 4 of batch processing
- Calculates P95/P99 latencies, token stats, cost, error rates, trends
- Stores in governancemetrics collection

**Key Files:**
- `backend/src/services/BatchProcessingService.ts` - Phase 4 integration
- `backend/src/services/AIActivityGovernanceService.ts` - Calculation logic

**Data Flow:**
rawdatarecords (with timing/token fields) → AIActivityGovernanceService → governancemetrics

---

## ✅ USE CASE 4: Governance Metrics Display Page
**Status**: Production Ready

**What It Does:**
- Dedicated /governance page
- Shows latency by phase, token usage, cost analysis, reliability, trends
- Organized in 6 sections with color-coded severity

**Key Files:**
- `app/governance/page.tsx` - Complete governance dashboard page

**Data Flow:**
governancemetrics collection → /governance page rendering

---

## ✅ USE CASE 5: New Alerts Calculation
**Status**: Production Ready

**What It Does:**
- Phase 5 of batch processing
- Generates evaluation quality alerts (groundedness < 60, etc.)
- Generates performance alerts (P99 latency > 10s, error rate > 2%, etc.)
- Both types stored in alerts collection and filterable

**Key Files:**
- `backend/src/services/BatchProcessingService.ts` - Phase 5 integration
- `backend/src/services/AlertGenerationService.ts` - Alert logic
- `backend/src/api/alertsRoutes.ts` - Type filtering

**Data Flow:**
evaluationrecords + governancemetrics → AlertGenerationService → alerts collection (filterable by type)

---

## ✅ USE CASE 6: Raw Data File Upload from UI Wizard
**Status**: Production Ready

**What It Does:**
- Application creation wizard with CSV file upload
- Auto-detects CSV format
- Extracts timing fields (promptTimestamp, latencies)
- Extracts token counts
- Triggers complete batch processing pipeline

**Key Files:**
- `app/apps/new/page.tsx` - Application wizard
- `src/components/apps/local-folder-config.tsx` - File selector
- `backend/src/connectors/LocalFolderConnector.ts` - CSV parsing with auto-detection

**Data Flow:**
CSV file → LocalFolderConnector (auto-detect format) → rawdatarecords (with timing/tokens) → All 5 phases

---

## Complete Pipeline Overview

```
┌─────────────────────────────────────────────────────────────────┐
│ USE CASE 6: File Upload Wizard (/apps/new)                      │
│ • CSV file selection with validation                             │
│ • Auto-detect CSV format with proper parsing                     │
│ └─ Creates Application & triggers batch process                  │
└────────────────────────┬────────────────────────────────────────┘
                         │
          ┌──────────────▼──────────────┐
          │ BATCH PROCESSING PIPELINE    │
          ├──────────────────────────────┤
          │ Phase 1: Data Ingestion      │
          │ Phase 2: Extract Timing      │ ◄─── Use Case 6 data
          │ Phase 3: Evaluate (RAGAS)    │ ◄─── Use Case 1 data
          │ Phase 4: Governance Metrics  │ ◄─── Use Case 3 calculation
          │ Phase 5: Generate Alerts     │ ◄─── Use Case 5 calculation
          └──────────────┬───────────────┘
                         │
    ┌────────────────────┼────────────────────┐
    │                    │                    │
    ▼                    ▼                    ▼
┌────────────┐      ┌─────────────┐      ┌──────────┐
│ DASHBOARD  │      │ GOVERNANCE  │      │ ALERTS   │
│ USE CASE 1 │      │ USE CASE 4  │      │ USE CASE │
│ & 2        │      │             │      │ 5        │
│ • Metrics  │      │ • Latency   │      │ • Filter │
│ • Frameworks       │ • Tokens    │      │ • Sort   │
│ • SLA %    │      │ • Cost      │      │ • Status │
│ • Trends   │      │ • Errors    │      │          │
└────────────┘      │ • Trends    │      └──────────┘
                    └─────────────┘
```

---

## Implementation Checklist

### Backend Services
- ✅ ApplicationMetricsService - Metric aggregation & SLA
- ✅ AIActivityGovernanceService - Governance calculation
- ✅ AlertGenerationService - Alert generation
- ✅ BatchProcessingService - 5-phase pipeline with Phase 4 & 5
- ✅ LocalFolderConnector - CSV parsing with format auto-detection

### Database Collections
- ✅ applicationmasters - App metadata
- ✅ rawdatarecords - Raw data with timing/token fields
- ✅ evaluationrecords - Evaluation results with frameworks
- ✅ governancemetrics - Performance metrics
- ✅ alerts - Generated alerts (quality + performance)
- ✅ slaconfigurations - SLA benchmarks

### API Endpoints
- ✅ POST /applications/create - Create app with file upload
- ✅ GET /metrics/fetch-multiple - Get metrics with frameworks & SLA
- ✅ GET /governance-metrics/ai-activity/:appId - Governance metrics
- ✅ GET /alerts/applications/:appId - Alerts with type filter
- ✅ POST /batch/validate-file - File validation

### Frontend Pages
- ✅ /apps/new - Application wizard with CSV upload
- ✅ /dashboard - Evaluation + governance metrics display
- ✅ /governance - Governance metrics dashboard
- ✅ /alerts - Alerts with type filtering

### Data Flows
- ✅ CSV → Raw Data → Evaluation → Governance → Alerts
- ✅ Timing field extraction (promptTimestamp, latencies)
- ✅ Token count extraction/estimation
- ✅ Framework tracking (RAGAS, BLEU/ROUGE, LlamaIndex)
- ✅ SLA compliance calculation
- ✅ P95/P99 percentile calculation
- ✅ Cost analysis and trending
- ✅ Alert generation (quality + performance)
- ✅ Alert type filtering (evaluation vs performance)

---

## Verification Steps

### For Each Use Case:

**1. Create Application**
```
Navigate to /apps/new
→ Upload CSV file with timing fields
→ Creates ApplicationMaster record
→ Batch process starts automatically
```

**2. Check Raw Data**
```
MongoDB: db.rawdatarecords.findOne()
→ Verify: promptTimestamp, retrievalLatencyMs, llmLatencyMs, totalLatencyMs
→ Verify: promptTokenCount, responseTokenCount, totalTokenCount
```

**3. Check Evaluation Results**
```
MongoDB: db.evaluationrecords.findOne()
→ Verify: groundedness, coherence, relevance, faithfulness scores
→ Verify: frameworksUsed array ['RAGAS', 'BLEU/ROUGE', 'LlamaIndex']
```

**4. Check Dashboard (Use Cases 1 & 2)**
```
Navigate to /dashboard
→ See: Evaluation metrics (7 scores)
→ See: Framework badges (RAGAS, BLEU/ROUGE, LlamaIndex)
→ See: SLA compliance % with color
→ See: Governance metrics (latency, tokens, cost, errors)
→ See: Performance trends
```

**5. Check Governance Dashboard (Use Case 4)**
```
Navigate to /governance
→ See: Latency P50/P95/P99 by phase (retrieval, LLM, total)
→ See: Token usage (prompt, response, total)
→ See: Cost per query + daily estimate
→ See: Reliability rates (success, error, timeout, partial)
→ See: Trends (improving/degrading with % change)
```

**6. Check Alerts (Use Cases 5 & 6)**
```
Navigate to /alerts
→ Filter: type=evaluation → See only quality alerts
→ Filter: type=performance → See only performance alerts
→ Filter: type=all → See both alert types

MongoDB: db.alerts.find()
→ See: evaluation_groundedness alerts (if < 60)
→ See: p95Latency alerts (if > threshold)
→ See: errorRate alerts (if > threshold)
```

---

## Production Ready Checklist

- ✅ All 6 use cases fully implemented
- ✅ End-to-end data flow working
- ✅ CSV format support with auto-detection
- ✅ Timing field extraction operational
- ✅ 5-phase batch processing complete
- ✅ Metrics calculation and storage working
- ✅ Alert generation for quality + performance
- ✅ Dashboard visualizations functional
- ✅ API endpoints fully operational
- ✅ Error handling and validation in place
- ✅ Color-coded severity indicators
- ✅ Type filtering for alerts
- ✅ Trend analysis and calculations
- ✅ MongoDB collections populated
- ✅ Frontend responsive and working

**STATUS: READY FOR PRODUCTION DEPLOYMENT** ✅

