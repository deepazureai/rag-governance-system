# Complete Architecture Flow - Layer by Layer

## Overview
The RAG Eval platform uses a standardized three-layer architecture:
- **Frontend (React/Next.js)** - Pages & Hooks
- **API Layer (Next.js/Express)** - Routes that handle requests
- **Backend (Node.js/Express)** - Services that perform business logic

All pages follow the same pattern: Page → Hook → API → Backend Service

---

## 1. DASHBOARD METRICS FLOW (Existing Pattern - Standard)

### Layer 1: Frontend
**Page: `/src/pages/dashboard.tsx` (or app-based routing)**
- Functions defined:
  - `Dashboard()` - Main component
  - Uses `useMetricsFetch()` hook
  - Renders application selector + metrics display components
- Calls:
  - `fetchMetrics(applicationIds)` - Initial load
  - `refreshMetrics(applicationIds)` - Manual refresh

**Hook: `/src/hooks/useMetricsFetch.ts`**
- Functions defined:
  - `useMetricsFetch()` - Hook that manages metrics state and API calls
- State managed:
  - `metrics` - Fetched metrics data
  - `isLoading` - Loading state
  - `error` - Error messages
- Calls API endpoints:
  - POST `/api/metrics/fetch-multiple` (or similar)
  - POST `/api/metrics/refresh`

### Layer 2: API Layer (Frontend-side)
**File: `/src/pages/api/metrics.ts` (if exists) or routes via backend**
- Functions defined:
  - `GET /api/metrics/:applicationId` - Fetch single app metrics
  - `POST /api/metrics/fetch-multiple` - Fetch multiple apps metrics
  - `POST /api/metrics/refresh` - Recalculate metrics
- These are typically proxy calls to backend API

### Layer 3: Backend API
**File: `/backend/src/api/metricsRoutes.ts`**
- Functions defined:
  - `GET /:applicationId` - Fetch metrics for single app
  - `POST /refresh` - Refresh metrics for multiple apps
  - `POST /fetch-multiple` - Fetch multiple apps metrics
- Calls:
  - `metricsService.fetchMetricsForApp(applicationId)`
  - `metricsService.fetchMetricsForApps(applicationIds[])`
  - `metricsService.calculateAggregatedMetrics()`

### Layer 4: Backend Services
**File: `/backend/src/services/ApplicationMetricsService.ts`**
- Functions defined:
  - `fetchMetricsForApp(applicationId)` - Get metrics for single app from MongoDB
  - `fetchMetricsForApps(applicationIds[])` - Get metrics for multiple apps
  - `calculateAverageMetrics(evaluations[])` - Average metrics across evaluations
  - `aggregateMetrics(metricsArray[])` - Aggregate multiple apps' metrics
  - `calculateSLACompliance(metrics)` - Calculate SLA compliance score
  - `extractFrameworksUsed(evaluations[])` - Get frameworks used
- Database calls:
  - Queries `evaluationrecords` collection
  - Aggregates data from MongoDB

**Data Flow:**
```
Dashboard.tsx 
  ↓ useMetricsFetch()
  ↓ fetchMetrics([appIds])
  ↓ POST /api/metrics/fetch-multiple
  ↓ metricsRoutes.ts
  ↓ ApplicationMetricsService.fetchMetricsForApps()
  ↓ MongoDB evaluationrecords collection
  ↓ Returns MetricsData[]
  ↓ Render metrics on page
```

---

## 2. GOVERNANCE METRICS FLOW (New Pattern - Should Follow Same Standard)

### Layer 1: Frontend
**Page: `/src/pages/governance.tsx`**
- Functions defined:
  - `GovernancePage()` - Main component
  - Uses `useApplications()` hook - Get list of apps
  - Uses `useGovernanceMetrics()` hook - Get metrics for selected app
  - Renders application selector + governance metrics display
- State managed:
  - `selectedApplicationId` - Currently selected app
- Calls:
  - `fetchApplications()` - Get app list on mount
  - `fetchGovernanceMetrics(applicationId)` - Fetch metrics when app selected
  - `refreshGovernanceMetrics(applicationId)` - Per-app refresh button

**Hook 1: `/src/hooks/useApplications.ts`**
- Functions defined:
  - `useApplications()` - Hook for managing applications list
- State managed:
  - `applications` - List of apps
  - `isLoading` - Loading state
  - `error` - Error messages
- Calls API:
  - GET `/api/applications` - Fetch all applications

**Hook 2: `/src/hooks/useGovernanceMetrics.ts`**
- Functions defined:
  - `useGovernanceMetrics(applicationId, enabled)` - Hook for governance metrics
- State managed:
  - `metrics` - Governance metrics
  - `isLoading` - Loading state
  - `isRefreshing` - Refresh loading state
  - `error` - Error messages
- Calls API:
  - GET `/api/governance-metrics/ai-activity/:applicationId/latest` - Fetch latest
  - POST `/api/governance-metrics/ai-activity/:applicationId/calculate` - Recalculate

### Layer 2: API Layer (Frontend-side)
**File: `/src/pages/api/applications.ts`**
- Functions defined:
  - `GET /api/applications` - Get list of all applications
- Proxy calls to backend

**File: `/src/pages/api/governance-metrics.ts` (if needed as proxy)**
- Would proxy calls to backend governance metrics endpoints

### Layer 3: Backend API
**File: `/backend/src/api/governanceMetricsRoutes.ts`** (Already exists - 902 lines)
- Functions defined:
  - `GET /ai-activity/:applicationId/latest` - Get latest calculated metrics
  - `POST /ai-activity/:applicationId/calculate` - Trigger metrics recalculation
  - `GET /ai-activity/:applicationId/trends` - Get metric trends over time
  - `GET /audit-trail/:applicationId` - Get audit/compliance trail
- Calls:
  - `AIActivityGovernanceService.calculateAIActivityMetrics(applicationId)`
  - `AIActivityGovernanceService.fetchLatestMetrics(applicationId)`
  - Stores results in `governancemetrics` collection

**File: `/backend/src/api/applicationsRoutes.ts`** (Already exists)
- Functions defined:
  - `GET /` - List all applications
  - `POST /create` - Create new application
  - `GET /:applicationId` - Get single application details
- Calls:
  - Queries `applicationmasters` collection

### Layer 4: Backend Services
**File: `/backend/src/services/AIActivityGovernanceService.ts`** (Already exists)
- Functions defined:
  - `calculateAIActivityMetrics(applicationId)` - Calculate governance metrics:
    - Latency (avg, p95, p99)
    - Throughput (queries per minute)
    - Error rate
    - Token usage (total, average per query)
    - User metrics (unique users, active users)
    - Compliance rate
  - `fetchLatestMetrics(applicationId)` - Get last calculated metrics
  - `calculateCompliance(metrics)` - Calculate compliance percentage
  - `calculateMetricTrends(applicationId, timeRange)` - Calculate metric changes
- Database calls:
  - Queries `evaluationrecords` collection
  - Reads from `governancemetrics` collection
  - Stores calculations in `governancemetrics` collection

**Data Flow:**
```
GovernancePage.tsx
  ├─ useApplications()
  │   ↓ GET /api/applications
  │   ↓ applicationsRoutes.ts → Query applicationmasters collection
  │   ↓ Return app list
  │
  └─ useGovernanceMetrics(selectedAppId)
      ↓ GET /api/governance-metrics/ai-activity/:appId/latest
      ↓ governanceMetricsRoutes.ts
      ↓ AIActivityGovernanceService.fetchLatestMetrics()
      ↓ MongoDB governancemetrics collection
      ↓ Return metrics
      ↓ Render governance dashboard
      
      When "Refresh" button clicked:
      ↓ POST /api/governance-metrics/ai-activity/:appId/calculate
      ↓ AIActivityGovernanceService.calculateAIActivityMetrics()
      ↓ Query evaluationrecords, calculate new metrics
      ↓ Store in governancemetrics collection
      ↓ Return updated metrics
      ↓ Re-render dashboard
```

---

## 3. COMPARISON - Standardized Pattern

Both flows follow the **exact same 4-layer architecture**:

| Layer | Dashboard Metrics | Governance Metrics |
|-------|-------------------|-------------------|
| **Frontend Page** | dashboard.tsx | governance.tsx |
| **Frontend Hooks** | useMetricsFetch() | useApplications() + useGovernanceMetrics() |
| **Frontend API** | POST /api/metrics/fetch-multiple | GET /api/applications, GET /api/governance-metrics/* |
| **Backend Routes** | metricsRoutes.ts | governanceMetricsRoutes.ts + applicationsRoutes.ts |
| **Backend Service** | ApplicationMetricsService | AIActivityGovernanceService + ApplicationsService |
| **Database** | evaluationrecords collection | governancemetrics collection (calculated), evaluationrecords collection (source data) |

---

## 4. KEY DESIGN PRINCIPLES

### Separation of Concerns
- **Metrics (RAGAS/BLEU/LLAMAIndex)**: Calculation from raw data → stored in `evaluationrecords`
- **Governance**: Analysis of calculated metrics → stored in `governancemetrics`
- **Never modify** RAGAS/BLEU/LLAMAIndex calculation code
- **Governance reads** evaluation records but doesn't modify calculation logic

### Standardized Pattern
Every page follows:
1. **Page Component** - Renders UI, manages selected items
2. **Custom Hook** - Manages API calls, state, error handling
3. **Frontend API** - Receives request, validates, proxies to backend
4. **Backend Route** - Exposes endpoints, calls services
5. **Backend Service** - Business logic, database queries
6. **MongoDB** - Data storage and retrieval

### Per-Application Refresh
- Governance page has application selector dropdown
- Refresh button is disabled until app selected
- Each app has its own refresh endpoint:
  - POST `/api/governance-metrics/ai-activity/:appId/calculate`
- Recalculates governance metrics for that app only
- Stores in `governancemetrics` collection with appId key

---

## 5. Code Function Reference

### Frontend Functions

**Dashboard Page:**
- `Dashboard()` - Main component that renders metrics
- Calls: `useMetricsFetch()` hook

**Dashboard Hook:**
- `useMetricsFetch()` - Returns { metrics, isLoading, error, fetchMetrics, refreshMetrics }
- Calls: `POST /api/metrics/fetch-multiple`, `POST /api/metrics/refresh`

**Governance Page:**
- `GovernancePage()` - Main component
- Calls: `useApplications()`, `useGovernanceMetrics()`

**Applications Hook:**
- `useApplications()` - Returns { applications, isLoading, error }
- Calls: `GET /api/applications`

**Governance Hook:**
- `useGovernanceMetrics(appId, enabled)` - Returns { metrics, isLoading, isRefreshing, error, refreshMetrics }
- Calls: `GET /api/governance-metrics/ai-activity/:appId/latest`, `POST /api/governance-metrics/ai-activity/:appId/calculate`

### Backend Functions

**Metrics Routes:**
- `GET /:applicationId` - Single app metrics
- `POST /refresh` - Refresh multiple apps
- `POST /fetch-multiple` - Fetch multiple apps

**Governance Metrics Routes:**
- `GET /ai-activity/:applicationId/latest` - Latest metrics
- `POST /ai-activity/:applicationId/calculate` - Calculate metrics
- `GET /ai-activity/:applicationId/trends` - Metric trends

**Applications Routes:**
- `GET /` - List all apps
- `POST /create` - Create app
- `GET /:applicationId` - Get app details

**Metrics Service:**
- `fetchMetricsForApp(appId)` - Get metrics for single app
- `fetchMetricsForApps(appIds[])` - Get metrics for multiple apps
- `calculateAverageMetrics(evaluations[])` - Average evaluations
- `aggregateMetrics(metricsArray[])` - Aggregate multiple apps

**Governance Service:**
- `calculateAIActivityMetrics(appId)` - Calculate all governance metrics
- `fetchLatestMetrics(appId)` - Get cached metrics
- `calculateCompliance(metrics)` - Calculate compliance %
- `calculateMetricTrends(appId, timeRange)` - Get trends

---

## 6. Database Collections

| Collection | Used By | Purpose |
|------------|---------|---------|
| `applicationmasters` | Applications page, Governance page | Stores all applications |
| `evaluationrecords` | Dashboard metrics, Governance metrics | Raw evaluation data with RAGAS/BLEU/LLAMAIndex scores |
| `governancemetrics` | Governance page | Calculated governance metrics (latency, throughput, compliance, etc.) |
| `rawdatarecords` | Batch processing, Data ingestion | Raw input data before evaluation |
| `batchprocesses` | Batch processing | Tracks batch job status and progress |

---

## 7. Governance Page Ready for Implementation

The architecture is complete and ready:
✅ Database collections exist
✅ Backend routes exist in governanceMetricsRoutes.ts
✅ Backend service exists (AIActivityGovernanceService)
✅ Frontend page created (governance.tsx)
✅ Frontend hooks created (useApplications, useGovernanceMetrics)
✅ Frontend API proxy created (applications.ts)

**No modifications needed to RAGAS/BLEU/LLAMAIndex calculation code.**
