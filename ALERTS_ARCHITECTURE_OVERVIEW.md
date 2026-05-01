# ALERTS SYSTEM - ARCHITECTURE OVERVIEW

## System Design

The alerts system is built on a per-application threshold management model with multi-source alert generation.

```
┌─────────────────────────────────────────────────────────────────┐
│                    ALERTS SYSTEM ARCHITECTURE                    │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────┐         ┌──────────────────┐
│  Applications   │         │  User Settings   │
│   (Wizard)      │         │  (Alerts Tab)    │
└────────┬────────┘         └────────┬─────────┘
         │                           │
         │ 1. Create App             │ 4. Modify Thresholds
         │                           │
         ▼                           ▼
    ┌─────────────────────────────────────────┐
    │  alertThresholdsRoutes (API Layer)      │
    │  ─────────────────────────────────────  │
    │  POST   /api/alert-thresholds/:appId    │
    │  GET    /api/alert-thresholds/:appId    │
    │  POST   /api/alert-thresholds/:appId/... │
    └────────────────┬────────────────────────┘
                     │
                     │ 2. Initialize/Update
                     │ Thresholds
                     │
    ┌────────────────▼────────────────────┐
    │  AlertIntegrationLayerService       │
    │  ────────────────────────────────   │
    │  • getApplicationThresholds()        │
    │  • saveApplicationThresholds()       │
    │  • generateAndStoreAlerts()          │
    │  • generateAlertsFromBatchEvaluation│
    └────────────────┬────────────────────┘
                     │
                     │ 3. Read/Write
                     │
         ┌───────────▼────────────┐
         │   MongoDB Collections   │
         │   ─────────────────────  │
         │   alertthresholds       │
         │   (per-app defaults)    │
         │                         │
         │   generatedalerts       │
         │   (alert outcomes)      │
         └───────────┬────────────┘
                     │
        ┌────────────┴────────────┐
        │                         │
        │ 5a. Ingestion Flow      │ 5b. Batch Flow
        ▼                         ▼
    File Upload              Batch Process
        │                         │
        ▼                         ▼
    Evaluate                  Evaluate
        │                         │
        ▼                         ▼
    Generate Alerts          Generate Alerts
    (per-app thresh)         (per-app thresh)
        │                         │
        └────────────┬────────────┘
                     │
                     ▼
         ┌───────────────────────┐
         │  alertsRoutes (API)   │
         │ ─────────────────────  │
         │ GET /api/alerts/...   │
         │ POST /api/alerts/...  │
         └──────────┬────────────┘
                    │
                    ▼
         Frontend (Alerts Page)
         • View alerts
         • Filter/paginate
         • Acknowledge/dismiss
```

---

## Core Components

### 1. AlertIntegrationLayerService
**Location**: `backend/src/services/AlertIntegrationLayerService.ts`

**Responsibilities**:
- Fetch per-application thresholds from database
- Apply thresholds to evaluation records
- Calculate alert severity based on deviation
- Store generated alerts
- Provide backward compatibility

**Key Methods**:
```typescript
// Main alert generation (ingestion & batch)
static async generateAndStoreAlerts(
  applicationId: string,
  records: Array<Record<string, any>>,
  dataSourceType: 'ingestion' | 'batch' = 'ingestion'
): Promise<void>

// Batch-specific alert generation
static async generateAlertsFromBatchEvaluation(
  applicationId: string,
  evaluatedRecords: Array<Record<string, any>>
): Promise<{ alertsGenerated: number; criticalAlerts: number }>

// Fetch thresholds (custom or defaults)
static async getApplicationThresholds(
  applicationId: string
): Promise<Record<string, number>>

// Save custom thresholds for app
static async saveApplicationThresholds(
  applicationId: string,
  thresholds: Record<string, number>
): Promise<void>

// Calculate severity based on deviation
private static calculateAlertSeverity(
  metricValue: number,
  threshold: number
): 'critical' | 'warning' | 'info'
```

### 2. Alert Thresholds Routes
**Location**: `backend/src/api/alertThresholdsRoutes.ts`

**Endpoints**:
- `GET /api/alert-thresholds/app/:appId` - Fetch thresholds
- `POST /api/alert-thresholds/app/:appId` - Save thresholds
- `POST /api/alert-thresholds/:appId/reset` - Reset to defaults

**Request/Response Examples**:
```
GET /api/alert-thresholds/app/app_123
Response:
{
  "success": true,
  "applicationId": "app_123",
  "thresholds": { groundedness: 75, ... },
  "isCustom": true,
  "source": "custom"
}

POST /api/alert-thresholds/app/app_123
Body:
{
  "groundedness": 80,
  "coherence": 80,
  ...
}
Response:
{
  "success": true,
  "message": "Threshold configuration saved successfully",
  "applicationId": "app_123",
  "thresholds": { ... },
  "updatedAt": "2026-05-01T..."
}
```

### 3. Alerts Retrieval Routes
**Location**: `backend/src/api/alertsRoutes.ts`

**Endpoints**:
- `GET /api/alerts/applications/:applicationId` - Paginated alerts
- `GET /api/alerts/summary/:applicationId` - Summary counts
- `POST /api/alerts/bulk-action` - Acknowledge/dismiss

**Query Parameters**:
```
GET /api/alerts/applications/app_123?page=1&limit=25&severity=critical&alertType=evaluation

Response:
{
  "alerts": [
    {
      "_id": "alert_456",
      "applicationId": "app_123",
      "metric": "groundedness",
      "currentValue": 45,
      "threshold": 80,
      "severity": "critical",
      "alertType": "evaluation_metrics",
      "status": "open",
      "createdAt": "2026-05-01T..."
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 25,
    "total": 156,
    "pages": 7
  }
}
```

### 4. Frontend Components
**Location**: `src/components/settings/alert-thresholds-tab.tsx`
**Location**: `app/alerts/page.tsx`

**alert-thresholds-tab.tsx**:
- Loads thresholds from API
- Displays custom vs. defaults
- Provides input fields for modification
- Handles save and reset operations

**alerts/page.tsx**:
- Displays alerts list with pagination
- Filters by severity, type, status
- Shows summary counts
- Allows bulk acknowledge/dismiss

---

## Data Structures

### alertthresholds Collection
```javascript
{
  _id: ObjectId,
  applicationId: "app_xxx",          // Unique key
  thresholds: {
    // Quality metrics (0-100 scale)
    groundedness: 60,
    coherence: 60,
    relevance: 60,
    faithfulness: 65,
    answerRelevancy: 65,
    contextPrecision: 70,
    contextRecall: 65,
    overallScore: 65,
    
    // Performance metrics
    latencyP50Ms: 500,
    latencyP95Ms: 1000,
    latencyP99Ms: 2000,
    errorRatePercent: 5,
    timeoutRatePercent: 2
  },
  isCustom: false,                   // true if user modified
  createdAt: ISODate("..."),
  updatedAt: ISODate("...")
}
```

### generatedalerts Collection
```javascript
{
  _id: ObjectId,
  applicationId: "app_xxx",          // Indexed for filtering
  recordId: "record_xxx",            // Source record
  metric: "groundedness",            // Metric name
  currentValue: 45,                  // Actual value
  threshold: 60,                     // Configured threshold
  severity: "critical",              // Indexed for filtering
  alertType: "evaluation_metrics",   // Indexed for filtering
  status: "open",                    // Indexed for filtering
  acknowledgeComment: "...",
  acknowledgedBy: "user_123",
  acknowledgedAt: ISODate("..."),
  dismissedAt: ISODate("..."),
  dataSourceType: "ingestion",       // ingestion | batch
  createdAt: ISODate("..."),         // Composite index
  updatedAt: ISODate("...")
}
```

### Indexes
```javascript
// alertthresholds
db.alertthresholds.createIndex({ applicationId: 1 }, { unique: true })

// generatedalerts
db.generatedalerts.createIndex({ applicationId: 1, createdAt: -1 })
db.generatedalerts.createIndex({ severity: 1 })
db.generatedalerts.createIndex({ status: 1 })
db.generatedalerts.createIndex({ alertType: 1 })
```

---

## Alert Severity Calculation

```
Severity = f(currentValue, threshold)

Deviation % = ((threshold - currentValue) / threshold) × 100

IF deviation > 40%:
  severity = "critical"
  (e.g., threshold=100, value=55 → deviation=45% → critical)

ELSE IF deviation > 20%:
  severity = "warning"
  (e.g., threshold=100, value=80 → deviation=20% → warning)

ELSE:
  severity = "info"
  (e.g., threshold=100, value=90 → deviation=10% → info)
```

---

## Integration Points

### 1. Application Creation
**When**: New app created via wizard
**What**: Initialize alert thresholds collection entry
**Where**: `applicationsRoutes.ts` → POST `/api/applications/create`
**Code**:
```typescript
const industryThresholds = AlertIntegrationLayerService.getIndustryStandardThresholds();
await AlertIntegrationLayerService.saveApplicationThresholds(applicationId, industryThresholds);
```

### 2. Data Ingestion
**When**: File uploaded and evaluated
**What**: Generate alerts from evaluation results
**Where**: Data ingestion pipeline → evaluates records
**Trigger**: After records saved to database
**Code**:
```typescript
await AlertIntegrationLayerService.generateAndStoreAlerts(
  applicationId,
  records,
  'ingestion'
);
```

### 3. Batch Processing
**When**: Batch evaluation completes
**What**: Generate batch alerts with summary
**Where**: `BatchProcessingService.ts` → Phase 5
**Code**:
```typescript
const alertResult = await AlertIntegrationLayerService.generateAlertsFromBatchEvaluation(
  applicationId,
  evaluations
);
```

### 4. Governance Metrics
**When**: SLA compliance calculated
**What**: Use alert counts for compliance percentage
**Where**: `GovernanceMetricsService.ts`
**Relationship**: Fewer alerts = higher SLA compliance

### 5. User Settings
**When**: User modifies thresholds
**What**: Save custom thresholds for app
**Where**: Frontend → Settings → Alerts Tab
**Endpoint**: POST `/api/alert-thresholds/app/:appId`

---

## Sequence Diagrams

### Scenario 1: Application Creation
```
User (Wizard)
    │
    ├─ Fill app details
    │
    └──→ POST /api/applications/create
          │
          ├─ Create ApplicationMaster
          │
          ├─ Create SLA config (defaults)
          │
          ├─ Call AlertIntegrationLayerService
          │     │
          │     └─ saveApplicationThresholds()
          │           │
          │           └──→ MongoDB (alertthresholds)
          │                 [Insert industry defaults]
          │
          └─ Return app created
```

### Scenario 2: Data Ingestion with Alerts
```
File Upload
    │
    ├─ Save raw data
    │
    ├─ Evaluate records
    │
    └──→ AlertIntegrationLayerService.generateAndStoreAlerts()
          │
          ├─ Fetch app thresholds
          │     │
          │     └──→ MongoDB (alertthresholds)
          │
          ├─ For each record:
          │    ├─ Get metrics
          │    ├─ Compare against thresholds
          │    ├─ Calculate severity
          │    └─ Create alert object
          │
          └──→ MongoDB (generatedalerts)
                [Insert all created alerts]
```

### Scenario 3: User Views Alerts
```
User (Alert Page)
    │
    ├─ Select application(s)
    │
    ├──→ GET /api/alerts/summary/:appId
    │     │
    │     └──→ MongoDB (generatedalerts)
    │           [Count by status]
    │           Return: open, acknowledged, dismissed
    │
    └──→ GET /api/alerts/applications/:appId?page=1
          │
          └──→ MongoDB (generatedalerts)
                [Find with filter, limit 25, sort by date]
                Return: paginated alerts
```

---

## Error Handling Strategy

### Non-Critical Errors (Don't Block Operations)
```
Alert generation fails during ingestion
  → Log warning
  → Continue processing
  → Data still saved
  → Alerts may be missing, but app functional

Threshold fetch fails
  → Use industry standard thresholds
  → Log warning
  → Continue with defaults
```

### Critical Errors (Block Operations)
```
MongoDB connection fails
  → Cannot start application
  → Log error and fail startup

Invalid threshold format
  → Reject API request
  → Return 400 Bad Request
  → Don't save invalid data
```

### Logging Pattern
```typescript
// Info level: Normal flow
logger.info(`[AlertIntegrationLayer] Thresholds fetched for app: ${applicationId}`);

// Warning level: Non-critical failures
logger.warn(`[AlertIntegrationLayer] Error fetching thresholds, using defaults: ${error}`);

// Error level: Critical failures
logger.error(`[AlertIntegrationLayer] Failed to save thresholds: ${error}`);
```

---

## Performance Considerations

### Query Optimization
1. **Alert List Query**: Use composite index on (applicationId, createdAt)
   ```javascript
   db.generatedalerts.find({ applicationId: "app_xxx" })
     .sort({ createdAt: -1 })
     .limit(25)
     // Uses: { applicationId: 1, createdAt: -1 } index
   ```

2. **Summary Query**: Use simple index on applicationId
   ```javascript
   db.generatedalerts.countDocuments({ applicationId: "app_xxx", status: "open" })
     // Uses: { applicationId: 1 } implicitly
   ```

3. **Threshold Query**: Unique index on applicationId
   ```javascript
   db.alertthresholds.findOne({ applicationId: "app_xxx" })
     // Uses: { applicationId: 1 } unique index
   ```

### Scalability Factors
- Expected alerts per application: 100-10,000 per month
- Typical query time: < 100ms
- Bulk operations: Process in batches of 100+

---

## Version Compatibility

### Breaking Changes: NONE
- Old `generateIngestionTimeAlerts()` method still works (wrapper)
- Old 'alerts' collection references updated internally
- All endpoints maintain backward compatibility

### Migration Path: AUTOMATIC
- Collections created on first run
- Indexes created on startup
- No manual migration needed

---

## Future Extensibility

### Hook Points for Enhancement
1. **Alert Webhooks**: Hook after alert creation to send to Slack/email
2. **Alert Rules Engine**: Custom alert logic beyond thresholds
3. **Alert History**: Track threshold changes over time
4. **Alert Escalation**: Auto-escalate critical alerts
5. **Alert Clustering**: Group related alerts
6. **Alert Anomaly Detection**: ML-based alerting

### Design Principles for Extensions
- Keep threshold calculation separate from alert generation
- Use event-based approach for hooks
- Maintain per-application isolation
- Don't break existing APIs

---

## Monitoring & Observability

### Key Metrics to Track
```
- Alerts generated per hour
- Alerts by severity distribution
- Avg time to acknowledge
- Avg time to dismiss
- Alerts per application
- SLA impact per alert
```

### Recommended Monitoring Queries
```javascript
// Alerts by severity
db.generatedalerts.aggregate([
  { $match: { applicationId: "app_xxx", createdAt: { $gte: ISODate("2026-04-01") } } },
  { $group: { _id: "$severity", count: { $sum: 1 } } }
])

// Alerts by day (trend)
db.generatedalerts.aggregate([
  { $match: { applicationId: "app_xxx" } },
  { $group: {
    _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
    count: { $sum: 1 }
  } },
  { $sort: { _id: 1 } }
])

// Average alert lifespan
db.generatedalerts.aggregate([
  { $match: { status: "dismissed" } },
  { $project: {
    lifespan: { $subtract: [ "$dismissedAt", "$createdAt" ] }
  } },
  { $group: {
    _id: null,
    avgLifespan: { $avg: "$lifespan" }
  } }
])
```

---

**Architecture Version**: 1.0
**Last Updated**: May 1, 2026
**Status**: Production Ready
