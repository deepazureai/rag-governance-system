# Metrics Aggregation Engine - Complete Implementation

## Overview

The metrics aggregation engine is the central component that:
1. Connects to configured data sources for each application
2. Fetches evaluation metrics (Groundedness, Relevance, Safety, etc.)
3. Normalizes metrics from different formats into a standard structure
4. Stores metrics in the database
5. Provides APIs for the dashboard to display real-time metrics
6. Automatically polls all configured applications every 5 minutes

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   Frontend Dashboard                         │
│  - Displays real-time metrics for selected applications      │
│  - Uses useMetrics hook to fetch data                       │
└──────────────┬──────────────────────────────────────────────┘
               │ metricsClient.ts (API calls)
               ▼
┌─────────────────────────────────────────────────────────────┐
│              Backend API Layer (Node.js)                     │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ GET /api/applications/:appId/metrics                  │ │
│  │ POST /api/metrics/batch (for multi-app)              │ │
│  │ POST /api/applications/:appId/metrics/fetch (manual) │ │
│  │ GET /api/applications/:appId/metrics/history         │ │
│  └────────────────────────────────────────────────────────┘ │
│                       ▲
│                       │ calls
│                       ▼
│  ┌────────────────────────────────────────────────────────┐ │
│  │      Metrics Aggregation Service                      │ │
│  │  - Orchestrates metric fetching                       │ │
│  │  - Selects appropriate adapter based on data source  │ │
│  │  - Normalizes metrics to standard format             │ │
│  └────────────────────────────────────────────────────────┘ │
│                       ▲
│                       │ uses
│                       ▼
│  ┌────────────────────────────────────────────────────────┐ │
│  │           Metric Adapters (Per Data Source)           │ │
│  │  - DatabaseMetricAdapter (PostgreSQL, MySQL, etc.)   │ │
│  │  - AzureMonitorAdapter (Azure Log Analytics)         │ │
│  │  - SplunkConnector (Splunk Enterprise/Cloud)         │ │
│  │  - DatadogConnector (Datadog)                        │ │
│  │  - AzureBlobMetricAdapter (Azure Blob Storage)       │ │
│  └────────────────────────────────────────────────────────┘ │
│                       │
└───────────────────────┼──────────────────────────────────────┘
                        │ connects to
        ┌───────────────┼───────────────┐
        ▼               ▼               ▼
   Database        Azure Logs       Splunk
   Connector       Connector        Connector
   (PostgreSQL)    (Monitor)        (SPL)
        │               │               │
        └───────────────┼───────────────┘
                        │ Data Source
                        ▼
            ┌───────────────────────┐
            │   Application's RAG   │
            │   Evaluation Metrics  │
            │  (Stored by App)      │
            └───────────────────────┘
```

## Files Created

### Backend - Models
- `backend/models/ApplicationMetric.js` - MongoDB schema for storing metrics with timestamps and status

### Backend - Services
- `backend/services/metricsAggregationService.js` - Main orchestration service that routes to appropriate adapter
- `backend/services/metricsRepository.js` - Data access layer for storing/retrieving metrics

### Backend - Controllers & Routes
- `backend/controllers/metricsController.js` - API request handlers with error handling
- `backend/routes/metricsRoutes.js` - RESTful API endpoints

### Backend - Jobs
- `backend/jobs/metricsCollectionJob.js` - Scheduled job that runs every 5 minutes to fetch metrics

### Frontend - API & Hooks
- `src/api/metricsClient.ts` - TypeScript API client for metrics endpoints
- `src/hooks/useMetrics.ts` - React hooks for fetching metrics with polling

### Configuration
- `backend/app.js` - Updated to include metrics routes and start scheduled jobs
- `backend/package.json` - Added node-cron dependency

## API Endpoints

### 1. Get Aggregated Metrics for Single App
```
GET /api/applications/:applicationId/metrics?hours=24
```
**Response:**
```json
{
  "success": true,
  "data": [
    {
      "name": "Groundedness",
      "unit": "%",
      "category": "quality",
      "latest": 92.5,
      "average": 90.2,
      "min": 88.5,
      "max": 93.1,
      "trend": "up",
      "history": [
        { "value": 92.5, "timestamp": "2024-04-16T10:30:00Z" },
        { "value": 91.8, "timestamp": "2024-04-16T10:25:00Z" }
      ]
    }
  ]
}
```

### 2. Get Metrics for Multiple Apps
```
POST /api/metrics/batch
Content-Type: application/json

{
  "applicationIds": ["app1", "app2", "app3"]
}
```

### 3. Trigger Manual Metrics Fetch
```
POST /api/applications/:applicationId/metrics/fetch
```
Manually triggers metrics collection immediately instead of waiting for scheduled job.

### 4. Get Metrics History
```
GET /api/applications/:applicationId/metrics/history?startDate=2024-04-01&endDate=2024-04-16
```

## Frontend Integration

### Using useMetrics Hook
```typescript
import { useMetrics } from '@/src/hooks/useMetrics';

export function MetricsDashboard({ appId }) {
  const { metrics, loading, error, refreshMetrics } = useMetrics(appId, 24);

  if (loading) return <div>Loading metrics...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <button onClick={refreshMetrics}>Refresh Now</button>
      {metrics.map(metric => (
        <MetricCard key={metric.name} metric={metric} />
      ))}
    </div>
  );
}
```

### Using useMultipleAppMetrics Hook
```typescript
import { useMultipleAppMetrics } from '@/src/hooks/useMetrics';

export function MultiAppDashboard({ appIds }) {
  const { metricsMap, loading, error } = useMultipleAppMetrics(appIds);

  return (
    <div>
      {appIds.map(appId => (
        <MetricsPanel key={appId} appId={appId} metrics={metricsMap[appId]} />
      ))}
    </div>
  );
}
```

## Data Source Adapters

### DatabaseMetricAdapter
Fetches from PostgreSQL, MySQL, SQL Server databases:
```sql
SELECT 
  metric_name as name,
  value,
  unit,
  category,
  trend,
  trend_percentage
FROM rag_evaluation_metrics
WHERE application_id = ? 
ORDER BY created_at DESC
LIMIT 10
```

### AzureMonitorAdapter
Queries Azure Log Analytics using KQL:
```kusto
rag_evaluation_metrics_CL
| where application_id_s == "app-id"
| project 
  metricName = metric_name_s,
  value = todouble(value_d),
  unit = unit_s,
  category = category_s,
  timestamp = TimeGenerated
| sort by timestamp desc
```

### SplunkConnector
Uses Splunk SPL queries:
```spl
index=rag_metrics application_id="app-id"
| stats latest(value) as value, latest(metric_name) as metric_name by category
| sort - latest(value)
```

### DatadogConnector
Queries Datadog metrics API:
```
Queries metrics like: rag.evaluation.groundedness, rag.evaluation.relevance
Uses Datadog SDK to fetch latest values with trend analysis
```

### AzureBlobMetricAdapter
Reads JSON files from Azure Blob Storage:
```json
[
  {
    "name": "Groundedness",
    "value": 92.5,
    "unit": "%",
    "category": "quality",
    "trend": "up",
    "trend_percentage": 2.3,
    "timestamp": "2024-04-16T10:30:00Z"
  }
]
```

## Metrics Normalization

All adapters normalize metrics to this standard format:
```typescript
interface NormalizedMetric {
  name: string;
  value: number;
  unit: string;
  category: string;
  trend: 'up' | 'down' | 'stable';
  trendPercentage: number;
  timestamp: Date;
}
```

## Scheduled Metrics Collection

The system automatically collects metrics every 5 minutes:

1. **Job Trigger**: `MetricsCollectionJob.startScheduledCollection(5)` starts cron job
2. **For Each Active App**:
   - Find application and its connection
   - Get stored connection credentials (encrypted)
   - Route to appropriate adapter based on data source type
   - Fetch metrics and normalize
   - Store in ApplicationMetric model with timestamp
3. **Error Handling**: Failures are logged and stored with error message

## Integration with Dashboard

The dashboard now displays metrics by:

1. **App Selection**: User selects apps to monitor
2. **Auto-Fetch**: Dashboard calls `useMetrics()` hook
3. **API Call**: Hook calls `/api/applications/:appId/metrics`
4. **Backend Query**: Repository fetches latest metrics from MongoDB
5. **Display**: Dashboard renders metric cards with trends and values

## Setup Instructions

### 1. Backend Setup
```bash
cd backend
npm install
npm run dev
```

### 2. Environment Variables
Add to `.env`:
```
DATABASE_URL=mongodb://localhost:27017/rag-evaluation
NODE_ENV=development
```

### 3. Database Initialization
MongoDB will auto-create collections on first insert.

### 4. Start Metrics Collection
Metrics collection starts automatically when backend starts.

### 5. Frontend Integration
Dashboard automatically uses metrics via hooks.

## Monitoring & Troubleshooting

### Check Metrics Collection Status
```bash
# In MongoDB
db.applicationmetrics.findOne({ applicationId: ObjectId("...") })
```

### View Collection Logs
```bash
# Backend console will show:
# [MetricsCollectionJob] Starting scheduled metrics collection every 5 minutes
# [MetricsCollectionJob] Successfully collected metrics for Application Name
```

### Manual Trigger
```bash
curl -X POST http://localhost:5001/api/applications/:appId/metrics/fetch
```

## Performance Notes

- Metrics stored with indexes on `applicationId` and `createdAt` for fast queries
- History retained for last 30 days (can be configured)
- Polling interval: 5 minutes (can be adjusted in `app.js`)
- Frontend polling: 5 minutes (can be adjusted in `useMetrics` hook)

## Future Enhancements

1. Add metric alerts/thresholds
2. Predictive trend analysis
3. Metric anomaly detection
4. Export metrics to external systems
5. Metric aggregation across multiple apps
6. Custom metric derivations
