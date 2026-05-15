# Mock Data Elimination Plan - Production-Ready API Integration

## Overview
The codebase currently uses mock data in multiple places despite having a fully functional backend API infrastructure. This document outlines the plan to replace all mock data with actual API calls.

## Current Mock Data Usage

### Files Using Mock Data:
1. **src/components/dashboard/app-selector.tsx** - Uses `mockApps`
2. **src/components/settings/connections-tab.tsx** - Uses `mockApps`
3. **src/components/settings/data-sources-tab.tsx** - Uses `mockApps`
4. **src/utils/dashboardFilters.ts** - Uses `mockMetrics`, `mockQueryPerformance`, `mockRelevanceScores`, `mockAlerts`, `mockGovernanceMetrics`
5. **app/benchmarks/page.tsx** - Uses `mockBenchmarks`, `mockApps`
6. **app/explore/page.tsx** - Uses `mockApps`

### Mock Data File:
- **src/data/mockData.ts** - Contains all mock data (mockApps, mockAlerts, mockBenchmarks, etc.)

## Available API Infrastructure

### API Clients Ready to Use:
- `src/api/batchClient.ts` - Batch processing
- `src/api/client.ts` - Base HTTP client
- `src/api/connectionsClient.ts` - Connection management
- `src/api/dataIngestionClient.ts` - Data ingestion
- `src/api/dataSourcesClient.ts` - Data sources
- `src/api/evaluation-client.ts` - Evaluation metrics
- `src/api/metricsClient.ts` - Metrics
- `src/api/prompt-template-client.ts` - Prompt templates

### Backend Routes Already Implemented:
- Apps: GET/POST/PUT/DELETE operations
- Alerts: Threshold management endpoints
- Data sources: Connection and validation endpoints
- Batch processing: Status and history endpoints
- Evaluations: Batch and per-record evaluation endpoints

## Migration Strategy

### Phase 1: Replace mockApps with API Calls
**Priority: HIGH** - Affects dashboard, settings, and explore pages

**Components to Update:**
1. `app-selector.tsx` → Use API to fetch apps instead of mockApps
2. `connections-tab.tsx` → Fetch apps from API
3. `data-sources-tab.tsx` → Fetch apps from API
4. `app/explore/page.tsx` → Fetch apps from API
5. `app/benchmarks/page.tsx` → Fetch apps from API

**API Endpoint to Use:**
- GET `/api/apps` - Fetch all applications

**Hook/Client to Create:**
- `useApps()` hook - Replaces mockApps usage with SWR-cached API calls

---

### Phase 2: Replace Alert Metrics with API Calls
**Priority: HIGH** - Critical for alerts dashboard

**Components to Update:**
1. `src/utils/dashboardFilters.ts` → Replace mockAlerts with API fetch
2. Alert threshold tab → Already fetching from API ✓

**API Endpoints to Use:**
- GET `/api/alert-thresholds/app/:appId` - Already implemented ✓
- GET `/api/alerts?appId=:appId` - Fetch app alerts

**Hook to Create:**
- `useAlerts()` hook - Already exists, enhance to remove mock data fallback

---

### Phase 3: Replace Performance Metrics with API Calls
**Priority: MEDIUM** - Dashboard analytics

**Components to Update:**
1. `src/utils/dashboardFilters.ts` → Replace mockMetrics, mockQueryPerformance, mockRelevanceScores

**API Endpoints to Implement:**
- GET `/api/metrics/app/:appId` - Query performance metrics
- GET `/api/metrics/app/:appId/relevance` - Relevance scores
- GET `/api/evaluations/app/:appId` - Evaluation results

---

### Phase 4: Replace Benchmarks with API Calls
**Priority: MEDIUM** - Benchmarks page

**Components to Update:**
1. `app/benchmarks/page.tsx` → Replace mockBenchmarks

**API Endpoint to Use:**
- GET `/api/benchmarks?appId=:appId` - Fetch benchmarks

---

### Phase 5: Remove Mock Data File
**Priority: LOW** - Final cleanup

After all migrations complete:
1. Remove unused exports from `src/data/mockData.ts`
2. Delete `src/data/mockData.ts` entirely
3. Remove mock data from version control

## Implementation Checklist

### Phase 1: mockApps
- [ ] Create `useApps()` hook using SWR with apiClient
- [ ] Update app-selector.tsx to use useApps()
- [ ] Update connections-tab.tsx to use useApps()
- [ ] Update data-sources-tab.tsx to use useApps()
- [ ] Update explore/page.tsx to use useApps()
- [ ] Update benchmarks/page.tsx to use useApps()
- [ ] Remove mockApps import from all files

### Phase 2: Alert Metrics
- [ ] Create API endpoint GET `/api/alerts?appId=:appId` if not exists
- [ ] Update useAlerts() hook to fetch from API instead of mockAlerts
- [ ] Remove mock alert fallback in dashboardFilters.ts
- [ ] Remove mockAlerts import from all files

### Phase 3: Performance Metrics
- [ ] Create/implement GET `/api/metrics/app/:appId`
- [ ] Create/implement GET `/api/metrics/app/:appId/relevance`
- [ ] Create useMetrics() hook
- [ ] Update dashboardFilters.ts to use useMetrics()
- [ ] Remove mockMetrics, mockQueryPerformance, mockRelevanceScores imports

### Phase 4: Benchmarks
- [ ] Create/implement GET `/api/benchmarks?appId=:appId`
- [ ] Create useBenchmarks() hook
- [ ] Update benchmarks/page.tsx to use useBenchmarks()
- [ ] Remove mockBenchmarks import

### Phase 5: Cleanup
- [ ] Delete src/data/mockData.ts
- [ ] Remove src/data/ directory if empty
- [ ] Verify all builds pass
- [ ] Test all pages with real data from backend

## Expected Outcomes

✓ 100% real API integration
✓ No mock data in production codebase
✓ Better error handling for failed API calls
✓ Real-time data synchronization
✓ Proper data persistence in MongoDB
✓ SWR caching for performance
✓ Type-safe API responses

## Risk Mitigation

1. **Backend Availability**: Ensure backend services are running during migration
2. **Data Consistency**: Test API responses match expected data structures
3. **Error Handling**: Implement proper error boundaries and fallbacks
4. **Testing**: Create API integration tests alongside mock replacement

## Notes

- All API clients are already configured and ready to use
- Backend routes are mostly implemented
- Use SWR hooks for client-side caching to minimize API calls
- Implement proper loading and error states for better UX
- Consider implementing retry logic for failed API calls
