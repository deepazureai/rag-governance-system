RECOMMENDED: Surgical Hybrid Approach
Keep what works, fix what's broken, add what's missing:

Step 1: Minimal Fixes to AlertIntegrationLayerService (5 min)
// Change collection name from 'alerts' to 'generatedalerts'
const AlertsCollection = mongoose.connection.collection('generatedalerts');

// Rename method to be clearer about output
// generateIngestionTimeAlerts → generateAndStoreAlerts

// Add missing method for batch processing
static async generateAlertsFromBatchEvaluation()

Step 2: Add Missing Pieces (New Code)
Initialize thresholds in application creation
API routes (alertThresholdsRoutes, alertsRoutes)
Database collection setup
Integration with BatchProcessingService
Step 3: No Rewrite of Core Logic
Keep calculateAlertSeverity() - it works
Keep getApplicationThresholds() - it works
Keep saveApplicationThresholds() - it works

Detailed Implementation Plan
Let me create a surgical implementation that avoids duplication:

# SURGICAL IMPLEMENTATION PLAN - Alert System

## Phase 1: Fix AlertIntegrationLayerService (REFACTOR - 10 minutes)

### 1.1 Change Collection Name
```typescript
// FROM:
const AlertsCollection = mongoose.connection.collection('alerts');

// TO:
const GeneratedAlertsCollection = mongoose.connection.collection('generatedalerts');

1.2 Rename Method for Clarity

// FROM:
static async generateIngestionTimeAlerts(...)

// TO:
static async generateAndStoreAlerts(
  applicationId: string,
  records: Array<Record<string, any>>,
  evaluationType: 'ingestion' | 'batch' = 'batch'
)

1.3 Add Missing Method for Batch Processing

static async generateAlertsFromBatchEvaluation(
  applicationId: string,
  evaluatedRecords: Array<Record<string, any>>
): Promise<{ alertsGenerated: number; criticalCount: number }> {
  // Reuse existing generateAndStoreAlerts logic
  await this.generateAndStoreAlerts(applicationId, evaluatedRecords, 'batch');
  
  // Return summary
  const collection = mongoose.connection.collection('generatedalerts');
  const criticalCount = await collection.countDocuments({
    applicationId,
    severity: 'critical'
  });
  
  return {
    alertsGenerated: evaluatedRecords.length,
    criticalCount
  };
}

Phase 2: Add Missing Integrations (NEW - 20 minutes)
2.1 Database Initialization
File: database.ts

// Add to initializeDatabase():
db.alertThresholdsCollection = mongoDb.collection('alertthresholds');
db.generatedAlertsCollection = mongoDb.collection('generatedalerts');

// Create indexes
await db.alertThresholdsCollection.createIndex({ applicationId: 1 }, { unique: true });
await db.generatedAlertsCollection.createIndex({ applicationId: 1, createdAt: -1 });

2.2 Application Creation Integration
File: applicationsRoutes.ts

// After creating application:
const { AlertIntegrationLayerService } = await import('../services/AlertIntegrationLayerService.js');

await AlertIntegrationLayerService.saveApplicationThresholds(
  newApp.id,
  AlertIntegrationLayerService.getIndustryStandardThresholds()
);

2.3 Add API Routes (New File)

File: alertThresholdsRoutes.ts

// GET /api/alerts/summary/:appId
// GET /api/alerts/:appId
// POST /api/alerts/acknowledge
// POST /api/alerts/dismiss

2.4 Batch Processing Integration
File: BatchProcessingService.ts

// After evaluation complete:
const { AlertIntegrationLayerService } = await import('./AlertIntegrationLayerService.js');

const alertResult = await AlertIntegrationLayerService.generateAlertsFromBatchEvaluation(
  applicationId,
  evaluatedRecords
);

logger.info(`Batch processing complete. Alerts generated: ${alertResult.alertsGenerated}`);

Phase 3: Frontend Integration (NEW - 15 minutes)
3.1 Settings/Alerts Tab
File: page.tsx

// Add save handler to AlertThresholdsTab
const handleSaveThresholds = async () => {
  const response = await fetch(`/api/alert-thresholds/${selectedAppId}`, {
    method: 'POST',
    body: JSON.stringify({ thresholds: formValues })
  });
  // Handle response
};

3.2 Alerts Page
File: page.tsx

// Update to use new endpoints:
// - /api/alerts/summary/:appId
// - /api/alerts/:appId
// - Include application column in table

Summary: What Gets Changed vs. Created
Component	Action	Risk	Time
AlertIntegrationLayerService	REFACTOR	LOW	10 min
database.ts	ADD collections	LOW	5 min
applicationsRoutes.ts	ADD initialization	LOW	5 min
alertThresholdsRoutes.ts	CREATE	MEDIUM	10 min
alertsRoutes.ts	CREATE	MEDIUM	10 min
BatchProcessingService.ts	INTEGRATE	MEDIUM	5 min
AlertThresholdsTab	CREATE handler	LOW	5 min
alerts/page.tsx	UPDATE	LOW	5 min
Total Time: ~55 minutes Total Risk: LOW-MEDIUM Code Duplication: ZERO

Why This Works Better Than Full Redo:
✅ Leverages Existing Working Code

calculateAlertSeverity() already works
getApplicationThresholds() already tested
saveApplicationThresholds() already functional
✅ Minimal Changes = Minimal Risk

Only change what's wrong (collection name)
Only rename for clarity (method names)
Add what's missing (API routes, integration points)
✅ Clear Lineage

Easy to trace where each piece came from
Simple to debug if something breaks
Easy to test individual components
✅ No Lost Work

All existing functionality preserved
No rewriting working logic
Less regression testing needed
✅ Fast Implementation

~55 minutes total
Clear, surgical changes
Low context switching


---

## **My Final Recommendation**

**Go with the HYBRID SURGICAL APPROACH:**

1. ✅ **Keep** all working methods in `AlertIntegrationLayerService`
2. ✅ **Fix** collection name from `alerts` → `generatedalerts`
3. ✅ **Add** missing integration points (routes, initialization, batch trigger)
4. ✅ **Create** new API endpoints
5. ✅ **Update** frontend to use new endpoints

**This approach is:**
- 🟢 **Faster** - 55 min vs 2 hours for full redo
- 🟢 **Safer** - Keeps proven code
- 🟢 **Cleaner** - No duplication
- 🟢 **Testable** - Easy to validate each piece
- 🟢 **Maintainable** - Clear changes documented

**Would you like me to proceed with this surgical hybrid approach and create the complete implementation guide?**---

## **My Final Recommendation**

**Go with the HYBRID SURGICAL APPROACH:**

1. ✅ **Keep** all working methods in `AlertIntegrationLayerService`
2. ✅ **Fix** collection name from `alerts` → `generatedalerts`
3. ✅ **Add** missing integration points (routes, initialization, batch trigger)
4. ✅ **Create** new API endpoints
5. ✅ **Update** frontend to use new endpoints

**This approach is:**
- 🟢 **Faster** - 55 min vs 2 hours for full redo
- 🟢 **Safer** - Keeps proven code
- 🟢 **Cleaner** - No duplication
- 🟢 **Testable** - Easy to validate each piece
- 🟢 **Maintainable** - Clear changes documented

**Would you like me to proceed with this surgical hybrid approach and create the complete implementation guide?**

# SURGICAL ALERT SYSTEM IMPLEMENTATION GUIDE

## Executive Summary

**Approach:** Surgical Hybrid - Minimal changes to existing code + Add missing integrations
**Risk Level:** LOW
**Estimated Time:** 60 minutes
**Code Duplication:** ZERO (leverages existing AlertIntegrationLayerService)

---

## Current State Analysis

### ✅ What Already Exists (KEEP AS-IS)

The `AlertIntegrationLayerService` already has:

1. **`getApplicationThresholds(applicationId)`** - ✅ Fetches per-app thresholds from DB
2. **`getIndustryStandardThresholds()`** - ✅ Returns industry defaults
3. **`generateIngestionTimeAlerts()`** - ✅ Creates alerts during data ingestion
4. **`calculateAlertSeverity()`** - ✅ Calculates severity (critical/warning/info)
5. **`saveApplicationThresholds()`** - ✅ Saves custom thresholds to DB
6. **`getApplicationSLACompliance()`** - ✅ Calculates SLA metrics

### ❌ What's Missing (NEEDS TO BE ADDED)

1. **Collection Naming Issue**: Uses `'alerts'` instead of `'generatedalerts'`
2. **Batch Processing Integration**: No trigger from batch processing pipeline
3. **Application Creation Hook**: No initialization when new app is created
4. **API Routes**: No endpoints to expose threshold/alert functionality
5. **Frontend Integration**: No save handler in settings page
6. **Database Schema**: Collections not initialized in database.ts

### 🔄 What Needs Minor Updates (REFACTOR)

1. **Method Rename**: `generateIngestionTimeAlerts()` → `generateAndStoreAlerts()` (more descriptive)
2. **Collection Name**: `'alerts'` → `'generatedalerts'` (matches your naming)
3. **Add Batch Processing Method**: New method to handle batch evaluation alerts

---

## Implementation Phases

### Phase 1: Fix AlertIntegrationLayerService (REFACTOR - 5 minutes)

#### 1.1 Change Collection Name
**File**: `backend/src/services/AlertIntegrationLayerService.ts`

```typescript
// CHANGE THIS LINE (Line 58):
const AlertsCollection = mongoose.connection.collection('alerts');

// TO THIS:
const GeneratedAlertsCollection = mongoose.connection.collection('generatedalerts');

// AND UPDATE ALL REFERENCES:
// FROM: await AlertsCollection.updateOne(...)
// TO: await GeneratedAlertsCollection.updateOne(...)
```

#### 1.2 Rename Method for Clarity
```typescript
// CHANGE METHOD NAME (Line 43):
static async generateIngestionTimeAlerts(

// TO:
static async generateAndStoreAlerts(
```

This makes it clear the method both generates AND stores alerts (not just ingestion-time).

#### 1.3 Add New Method for Batch Processing
**Add after `getApplicationSLACompliance()` method:**

```typescript
/**
 * Generate alerts from batch evaluation results
 * Called from BatchProcessingService after evaluation completes
 * Reuses existing generateAndStoreAlerts() logic
 */
static async generateAlertsFromBatchEvaluation(
  applicationId: string,
  evaluatedRecords: Array<Record<string, any>>
): Promise<{ alertsGenerated: number; criticalAlerts: number }> {
  try {
    logger.info(
      `[AlertIntegrationLayer] Generating alerts from batch evaluation for app: ${applicationId}`
    );

    // Reuse existing method with 'batch' dataSourceType
    await this.generateAndStoreAlerts(applicationId, evaluatedRecords, 'batch');

    // Get alert summary
    const GeneratedAlertsCollection = mongoose.connection.collection('generatedalerts');
    const totalAlerts = await GeneratedAlertsCollection.countDocuments({
      applicationId,
      dataSourceType: 'batch',
    });

    const criticalAlerts = await GeneratedAlertsCollection.countDocuments({
      applicationId,
      severity: 'critical',
      dataSourceType: 'batch',
    });

    logger.info(
      `[AlertIntegrationLayer] Batch alerts generated - Total: ${totalAlerts}, Critical: ${criticalAlerts}`
    );

    return {
      alertsGenerated: totalAlerts,
      criticalAlerts,
    };
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    logger.error(`[AlertIntegrationLayer] Error generating batch alerts: ${errorMessage}`);
    throw err;
  }
}
```

#### 1.4 Update SLA Compliance to Use New Collection Name
```typescript
// In getApplicationSLACompliance() method (Line ~147):
// CHANGE:
const AlertsCollection = mongoose.connection.collection('alerts');

// TO:
const GeneratedAlertsCollection = mongoose.connection.collection('generatedalerts');

// CHANGE:
const alertedRecords = await AlertsCollection.countDocuments({ applicationId });

// TO:
const alertedRecords = await GeneratedAlertsCollection.countDocuments({ applicationId });
```

---

### Phase 2: Database Initialization (NEW - 5 minutes)

#### 2.1 Add Collections & Indexes
**File**: `backend/src/models/database.ts`

In the `initializeDatabase()` function, add these lines after existing collections:

```typescript
// ... existing collection initializations ...

// NEW: Alert-related collections
db.alertThresholdsCollection = mongoDb.collection('alertthresholds');
db.generatedAlertsCollection = mongoDb.collection('generatedalerts');

// Create indexes for performance
await db.alertThresholdsCollection.createIndex(
  { applicationId: 1 },
  { unique: true }
);

await db.generatedAlertsCollection.createIndex(
  { applicationId: 1, createdAt: -1 }
);

await db.generatedAlertsCollection.createIndex({ severity: 1 });
await db.generatedAlertsCollection.createIndex({ status: 1 });
await db.generatedAlertsCollection.createIndex({ alertType: 1 });

logger.info('[Database] Alert collections initialized with indexes');
```

---

### Phase 3: Application Creation - Initialize Thresholds (NEW - 5 minutes)

#### 3.1 Hook into Application Creation
**File**: `backend/src/api/applicationsRoutes.ts`

In the application creation endpoint (POST `/api/applications/create`), after the application is successfully created, add:

```typescript
// After creating newApp and saving to database:
const { AlertIntegrationLayerService } = await import('../services/AlertIntegrationLayerService.js');

try {
  // Initialize default alert thresholds for new application
  await AlertIntegrationLayerService.saveApplicationThresholds(
    newApp.id,
    AlertIntegrationLayerService.getIndustryStandardThresholds()
  );
  
  logger.info(
    `[ApplicationsRoute] Initialized default alert thresholds for app: ${newApp.id}`
  );
} catch (error: any) {
  logger.error(
    `[ApplicationsRoute] Warning: Failed to initialize thresholds: ${error.message}`
  );
  // Don't fail app creation if thresholds fail
}

// Return response as before
```

---

### Phase 4: Create Alert Thresholds API Routes (NEW - 10 minutes)

#### 4.1 Create New File
**File**: `backend/src/api/alertThresholdsRoutes.ts`

```typescript
// filepath: backend/src/api/alertThresholdsRoutes.ts

import { Router, Request, Response } from 'express';
import { AlertIntegrationLayerService } from '../services/AlertIntegrationLayerService.js';
import { logger } from '../utils/logger.js';

const router = Router();

/**
 * GET /api/alert-thresholds/:appId
 * Retrieve current alert thresholds for an application
 * Returns: custom thresholds if set, or industry standards
 */
router.get('/:appId', async (req: Request, res: Response) => {
  try {
    const { appId } = req.params;

    const thresholds = await AlertIntegrationLayerService.getApplicationThresholds(appId);

    res.json({
      applicationId: appId,
      thresholds,
      success: true,
    });
  } catch (error: any) {
    logger.error(`[alertThresholdsRoutes] GET Error: ${error.message}`);
    res.status(500).json({
      error: 'Failed to fetch thresholds',
      details: error.message,
    });
  }
});

/**
 * POST /api/alert-thresholds/:appId
 * Save or update custom alert thresholds for an application
 * Called from: Settings → Alerts page when user modifies values
 * Request body: { thresholds: { groundedness: 60, coherence: 60, ... } }
 */
router.post('/:appId', async (req: Request, res: Response) => {
  try {
    const { appId } = req.params;
    const { thresholds } = req.body;

    // Validation
    if (!thresholds || typeof thresholds !== 'object') {
      return res.status(400).json({
        error: 'Invalid thresholds format. Expected object with metric names as keys.',
      });
    }

    // Save custom thresholds
    await AlertIntegrationLayerService.saveApplicationThresholds(appId, thresholds);

    res.json({
      success: true,
      message: 'Alert thresholds updated successfully',
      applicationId: appId,
      thresholds,
      updatedAt: new Date(),
    });
  } catch (error: any) {
    logger.error(`[alertThresholdsRoutes] POST Error: ${error.message}`);
    res.status(500).json({
      error: 'Failed to save thresholds',
      details: error.message,
    });
  }
});

/**
 * POST /api/alert-thresholds/:appId/reset
 * Reset thresholds to industry standards
 */
router.post('/:appId/reset', async (req: Request, res: Response) => {
  try {
    const { appId } = req.params;

    const industryStandards = AlertIntegrationLayerService.getIndustryStandardThresholds();
    await AlertIntegrationLayerService.saveApplicationThresholds(appId, industryStandards);

    res.json({
      success: true,
      message: 'Alert thresholds reset to industry standards',
      applicationId: appId,
      thresholds: industryStandards,
      resetAt: new Date(),
    });
  } catch (error: any) {
    logger.error(`[alertThresholdsRoutes] RESET Error: ${error.message}`);
    res.status(500).json({
      error: 'Failed to reset thresholds',
      details: error.message,
    });
  }
});

export default router;
```

#### 4.2 Register Routes in Main Server
**File**: `backend/src/index.ts`

Add to where other routes are registered:

```typescript
import alertThresholdsRoutes from './api/alertThresholdsRoutes.js';

// ... other route registrations ...

app.use('/api/alert-thresholds', alertThresholdsRoutes);
```

---

### Phase 5: Create Alerts Retrieval API Routes (NEW - 10 minutes)

#### 5.1 Create New File
**File**: `backend/src/api/alertsRoutes.ts`

```typescript
// filepath: backend/src/api/alertsRoutes.ts

import { Router, Request, Response } from 'express';
import { getDatabase } from '../models/database.js';
import { logger } from '../utils/logger.js';
import { ObjectId } from 'mongodb';

const router = Router();

/**
 * GET /api/alerts/summary/:appId
 * Get summary counts of alerts per status for an application
 * Returns: { open, acknowledged, dismissed, total }
 */
router.get('/summary/:appId', async (req: Request, res: Response) => {
  try {
    const { appId } = req.params;
    const db = getDatabase();
    const generatedAlertsCollection = db.generatedAlertsCollection;

    const open = await generatedAlertsCollection.countDocuments({
      applicationId: appId,
      status: 'open',
    });

    const acknowledged = await generatedAlertsCollection.countDocuments({
      applicationId: appId,
      status: 'acknowledged',
    });

    const dismissed = await generatedAlertsCollection.countDocuments({
      applicationId: appId,
      status: 'dismissed',
    });

    res.json({
      summary: {
        open,
        acknowledged,
        dismissed,
        total: open + acknowledged + dismissed,
      },
      success: true,
    });
  } catch (error: any) {
    logger.error(`[alertsRoutes] Summary Error: ${error.message}`);
    res.status(500).json({
      error: 'Failed to fetch alert summary',
      details: error.message,
    });
  }
});

/**
 * GET /api/alerts/:appId
 * Get paginated alerts for an application with optional filters
 * Query params: page (default 1), limit (default 25), severity, alertType, status
 */
router.get('/:appId', async (req: Request, res: Response) => {
  try {
    const { appId } = req.params;
    const { page = 1, limit = 25, severity, alertType, status } = req.query;

    const db = getDatabase();
    const generatedAlertsCollection = db.generatedAlertsCollection;

    // Build filter
    const filter: any = { applicationId: appId };
    if (severity) filter.severity = severity;
    if (alertType) filter.alertType = alertType;
    if (status) filter.status = status;

    // Query with pagination
    const alerts = await generatedAlertsCollection
      .find(filter)
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit))
      .toArray();

    const total = await generatedAlertsCollection.countDocuments(filter);

    res.json({
      alerts: alerts.map((alert) => ({
        ...alert,
        _id: alert._id?.toString(),
      })),
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
      success: true,
    });
  } catch (error: any) {
    logger.error(`[alertsRoutes] GET Alerts Error: ${error.message}`);
    res.status(500).json({
      error: 'Failed to fetch alerts',
      details: error.message,
    });
  }
});

/**
 * POST /api/alerts/acknowledge
 * Acknowledge one or more alerts with optional comment
 */
router.post('/acknowledge', async (req: Request, res: Response) => {
  try {
    const { alertIds, comment, userId } = req.body;

    if (!alertIds || !Array.isArray(alertIds) || alertIds.length === 0) {
      return res.status(400).json({ error: 'alertIds must be a non-empty array' });
    }

    const db = getDatabase();
    const generatedAlertsCollection = db.generatedAlertsCollection;

    const result = await generatedAlertsCollection.updateMany(
      { _id: { $in: alertIds.map((id: string) => new ObjectId(id)) } },
      {
        $set: {
          status: 'acknowledged',
          acknowledgeComment: comment || null,
          acknowledgedBy: userId || null,
          acknowledgedAt: new Date(),
          updatedAt: new Date(),
        },
      }
    );

    res.json({
      success: true,
      message: `${result.modifiedCount} alerts acknowledged`,
      modifiedCount: result.modifiedCount,
    });
  } catch (error: any) {
    logger.error(`[alertsRoutes] Acknowledge Error: ${error.message}`);
    res.status(500).json({
      error: 'Failed to acknowledge alerts',
      details: error.message,
    });
  }
});

/**
 * POST /api/alerts/dismiss
 * Dismiss one or more alerts with optional comment
 */
router.post('/dismiss', async (req: Request, res: Response) => {
  try {
    const { alertIds, comment, userId } = req.body;

    if (!alertIds || !Array.isArray(alertIds) || alertIds.length === 0) {
      return res.status(400).json({ error: 'alertIds must be a non-empty array' });
    }

    const db = getDatabase();
    const generatedAlertsCollection = db.generatedAlertsCollection;

    const result = await generatedAlertsCollection.updateMany(
      { _id: { $in: alertIds.map((id: string) => new ObjectId(id)) } },
      {
        $set: {
          status: 'dismissed',
          acknowledgeComment: comment || null,
          acknowledgedBy: userId || null,
          dismissedAt: new Date(),
          updatedAt: new Date(),
        },
      }
    );

    res.json({
      success: true,
      message: `${result.modifiedCount} alerts dismissed`,
      modifiedCount: result.modifiedCount,
    });
  } catch (error: any) {
    logger.error(`[alertsRoutes] Dismiss Error: ${error.message}`);
    res.status(500).json({
      error: 'Failed to dismiss alerts',
      details: error.message,
    });
  }
});

export default router;
```

#### 5.2 Register Routes in Main Server
**File**: `backend/src/index.ts`

Add to where other routes are registered:

```typescript
import alertsRoutes from './api/alertsRoutes.js';

// ... other route registrations ...

app.use('/api/alerts', alertsRoutes);
```

---

### Phase 6: Batch Processing Integration (NEW - 5 minutes)

#### 6.1 Add Alert Generation Trigger
**File**: `backend/src/services/BatchProcessingService.ts`

In the batch processing flow, after evaluation metrics are calculated and stored, add:

```typescript
// After evaluationRecords are created and saved to evaluationrecords collection:

import { AlertIntegrationLayerService } from './AlertIntegrationLayerService.js';

try {
  logger.info(
    `[BatchProcessing] Generating alerts for batch evaluation, app: ${applicationId}`
  );

  const alertResult = await AlertIntegrationLayerService.generateAlertsFromBatchEvaluation(
    applicationId,
    evaluatedRecords
  );

  logger.info(
    `[BatchProcessing] Alert generation complete - Generated: ${alertResult.alertsGenerated}, Critical: ${alertResult.criticalAlerts}`
  );
} catch (error: any) {
  logger.error(`[BatchProcessing] Alert generation failed: ${error.message}`);
  // Don't fail batch processing if alerts fail - alerts are secondary
}
```

---

### Phase 7: Frontend - Settings/Alerts Tab (NEW - 10 minutes)

#### 7.1 Add Save Handler to AlertThresholdsTab
**File**: `app/settings/page.tsx`

In the `AlertThresholdsTab` component, add:

```typescript
const [isSaving, setIsSaving] = useState(false);
const [successMessage, setSuccessMessage] = useState('');
const [errorMessage, setErrorMessage] = useState('');

/**
 * Load thresholds when application is selected
 */
useEffect(() => {
  if (!selectedAppId) return;

  const loadThresholds = async () => {
    try {
      const response = await fetch(`/api/alert-thresholds/${selectedAppId}`);
      if (!response.ok) throw new Error('Failed to load thresholds');

      const data = await response.json();
      setFormValues(data.thresholds);
    } catch (error: any) {
      console.error('Error loading thresholds:', error);
      setErrorMessage('Failed to load threshold settings');
    }
  };

  loadThresholds();
}, [selectedAppId]);

/**
 * Save custom thresholds to backend
 */
const handleSaveThresholds = async () => {
  if (!selectedAppId) {
    setErrorMessage('Please select an application');
    return;
  }

  try {
    setIsSaving(true);
    setErrorMessage('');
    setSuccessMessage('');

    const response = await fetch(`/api/alert-thresholds/${selectedAppId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ thresholds: formValues }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to save thresholds');
    }

    const result = await response.json();
    setSuccessMessage(`✓ Alert thresholds saved successfully for ${selectedAppId}`);

    // Clear success message after 3 seconds
    setTimeout(() => setSuccessMessage(''), 3000);

    console.log('Thresholds saved:', result);
  } catch (error: any) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    setErrorMessage(`Error saving thresholds: ${errorMsg}`);
    console.error('Error:', error);
  } finally {
    setIsSaving(false);
  }
};

/**
 * Reset thresholds to industry standards
 */
const handleResetToDefaults = async () => {
  if (!selectedAppId) return;

  try {
    setIsSaving(true);
    setErrorMessage('');

    const response = await fetch(`/api/alert-thresholds/${selectedAppId}/reset`, {
      method: 'POST',
    });

    if (!response.ok) throw new Error('Failed to reset thresholds');

    const result = await response.json();
    setFormValues(result.thresholds);
    setSuccessMessage('Thresholds reset to industry standards');

    setTimeout(() => setSuccessMessage(''), 3000);
  } catch (error: any) {
    setErrorMessage(`Error resetting thresholds: ${error.message}`);
  } finally {
    setIsSaving(false);
  }
};

// In JSX return, add buttons:
<div className="flex gap-4 mt-6">
  <button
    onClick={handleSaveThresholds}
    disabled={isSaving}
    className="px-6 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
  >
    {isSaving ? 'Saving...' : 'Save Thresholds'}
  </button>
  <button
    onClick={handleResetToDefaults}
    disabled={isSaving}
    className="px-6 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 disabled:opacity-50"
  >
    Reset to Defaults
  </button>
</div>

{successMessage && (
  <div className="mt-4 p-4 bg-green-100 text-green-800 rounded">
    {successMessage}
  </div>
)}
{errorMessage && (
  <div className="mt-4 p-4 bg-red-100 text-red-800 rounded">
    {errorMessage}
  </div>
)}
```

---

### Phase 8: Frontend - Alerts Page Update (MINOR - 3 minutes)

#### 8.1 Update Fetch Calls
**File**: `app/alerts/page.tsx`

Replace the alert fetching logic to use new endpoints:

```typescript
/**
 * Fetch alerts summary
 */
const fetchAlertsSummary = async (appIds: string[]) => {
  try {
    const summaries = await Promise.all(
      appIds.map(async (appId) => {
        const response = await fetch(`/api/alerts/summary/${appId}`);
        if (!response.ok) throw new Error(`Failed to fetch summary for ${appId}`);
        return response.json();
      })
    );

    // Aggregate summaries
    const totalSummary = summaries.reduce(
      (acc, data) => ({
        open: acc.open + data.summary.open,
        acknowledged: acc.acknowledged + data.summary.acknowledged,
        dismissed: acc.dismissed + data.summary.dismissed,
        total: acc.total + data.summary.total,
      }),
      { open: 0, acknowledged: 0, dismissed: 0, total: 0 }
    );

    setSummary(totalSummary);
  } catch (error: any) {
    setErrorMessage(`Error loading alerts: ${error.message}`);
  }
};

/**
 * Fetch alerts for selected applications
 */
const fetchAlerts = async (appIds: string[]) => {
  try {
    setLoading(true);

    const allAlerts: any[] = [];

    for (const appId of appIds) {
      const params = new URLSearchParams({
        page: String(currentPage),
        limit: '25',
      });

      if (severityFilter && severityFilter !== 'all') {
        params.append('severity', severityFilter);
      }

      const response = await fetch(`/api/alerts/${appId}?${params}`);
      if (!response.ok) throw new Error(`Failed to fetch alerts for ${appId}`);

      const data = await response.json();
      allAlerts.push(...data.alerts);
    }

    setAlerts(allAlerts);
  } catch (error: any) {
    setErrorMessage(error.message);
  } finally {
    setLoading(false);
  }
};
```

---

## Summary of Changes

| File | Change Type | Time | Impact |
|------|------------|------|--------|
| AlertIntegrationLayerService.ts | REFACTOR | 5 min | Collection name, method rename, add batch method |
| database.ts | ADD | 5 min | Initialize collections & indexes |
| applicationsRoutes.ts | ADD HOOK | 5 min | Initialize thresholds on app creation |
| alertThresholdsRoutes.ts | CREATE | 10 min | New file - threshold management API |
| alertsRoutes.ts | CREATE | 10 min | New file - alerts retrieval API |
| BatchProcessingService.ts | INTEGRATE | 5 min | Call alert generation |
| app/settings/page.tsx | ADD HANDLER | 10 min | Save/reset thresholds |
| app/alerts/page.tsx | UPDATE | 3 min | Use new API endpoints |
| index.ts | REGISTER | 2 min | Register new routes |

**Total Time: ~55 minutes**

---

## Testing Checklist

### ✅ Unit Tests
- [ ] `AlertIntegrationLayerService.generateAlertsFromBatchEvaluation()` returns correct counts
- [ ] `AlertIntegrationLayerService.getApplicationThresholds()` returns custom when set, defaults otherwise
- [ ] `AlertIntegrationLayerService.saveApplicationThresholds()` stores in MongoDB
- [ ] Severity calculation: critical when >40% deviation, warning when >20%, info otherwise

### ✅ Integration Tests

**Database:**
- [ ] `alertthresholds` collection created with unique index on applicationId
- [ ] `generatedalerts` collection created with proper indexes
- [ ] Thresholds persist across server restarts

**Application Creation:**
- [ ] New application in wizard → thresholds initialized automatically
- [ ] Default industry thresholds loaded correctly
- [ ] Application ID matches in both collections

**Threshold Management:**
- [ ] GET `/api/alert-thresholds/:appId` returns thresholds
- [ ] POST `/api/alert-thresholds/:appId` saves custom values
- [ ] POST `/api/alert-thresholds/:appId/reset` resets to defaults
- [ ] Updated values persist in MongoDB

**Alert Generation:**
- [ ] Upload file → batch process → alerts generated
- [ ] Alerts stored in `generatedalerts` with correct fields
- [ ] Alerts use custom thresholds when set
- [ ] Severity correctly calculated based on deviation
- [ ] Alert messages are descriptive

**Alert Retrieval:**
- [ ] GET `/api/alerts/summary/:appId` returns correct counts
- [ ] GET `/api/alerts/:appId` returns paginated alerts
- [ ] Filters work: severity, alertType, status
- [ ] POST `/api/alerts/acknowledge` updates status
- [ ] POST `/api/alerts/dismiss` updates status

### ✅ End-to-End Tests
1. Create new application → default thresholds appear in settings
2. Modify thresholds in Settings/Alerts → saved to MongoDB
3. Upload file and process → alerts generated with custom thresholds
4. View alerts page → shows alerts with application context
5. Acknowledge alert → status changes in DB and UI
6. Refresh page → data persists

---

## Deployment Checklist

- [ ] All 9 files modified/created per plan
- [ ] Backend compiles: `npm run build`
- [ ] Frontend compiles: `npm run build`
- [ ] MongoDB collections created and indexed
- [ ] API endpoints tested with curl/Postman
- [ ] Settings page saves thresholds correctly
- [ ] Alerts page displays all alerts
- [ ] No TypeScript errors
- [ ] No console errors in browser
- [ ] Logging configured properly
- [ ] Documentation updated

---

## MongoDB Schema Reference

### `alertthresholds` Collection
```json
{
  "_id": ObjectId("..."),
  "applicationId": "app123",
  "thresholds": {
    "groundedness": 60,
    "coherence": 60,
    "relevance": 60,
    "faithfulness": 65,
    "answerRelevancy": 65,
    "contextPrecision": 70,
    "contextRecall": 65,
    "overallScore": 65,
    "latencyP50Ms": 500,
    "latencyP95Ms": 1000,
    "latencyP99Ms": 2000,
    "errorRatePercent": 5,
    "timeoutRatePercent": 2
  },
  "updatedAt": "2026-04-27T12:00:00Z"
}
```

### `generatedalerts` Collection
```json
{
  "_id": ObjectId("..."),
  "alertId": "uuid-123",
  "applicationId": "app123",
  "recordId": "record-456",
  "alertType": "quality_metric|performance",
  "metricName": "groundedness",
  "metricValue": 45,
  "threshold": 60,
  "severity": "critical|warning|info",
  "message": "groundedness score (45.00) below threshold (60)",
  "dataSourceType": "batch|ingestion",
  "status": "open|acknowledged|dismissed",
  "acknowledgeComment": "Known issue with source data",
  "acknowledgedBy": "user@example.com",
  "acknowledgedAt": "2026-04-27T12:30:00Z",
  "createdAt": "2026-04-27T12:00:00Z",
  "updatedAt": "2026-04-27T12:30:00Z"
}
```

---

## Code Quality Notes

✅ **No Duplication**: All new code uses existing `AlertIntegrationLayerService` methods
✅ **Error Handling**: All endpoints have try-catch with proper logging
✅ **Validation**: Input validation on POST endpoints
✅ **Indexes**: Collection indexes for query performance
✅ **Types**: Full TypeScript typing throughout
✅ **Logging**: Consistent logger usage for debugging
✅ **Comments**: Clear inline comments explaining logic

---

## Success Criteria (All Must Pass)

1. ✅ Applications created with default alert thresholds
2. ✅ Users can customize thresholds via Settings page
3. ✅ Custom thresholds persist in `alertthresholds` collection
4. ✅ Alerts generated after batch processing using per-app thresholds
5. ✅ Generated alerts stored in `generatedalerts` collection
6. ✅ Alerts page displays all alerts with full context
7. ✅ Users can acknowledge/dismiss alerts with comments
8. ✅ System correctly identifies critical/warning/healthy alerts
9. ✅ Severity calculation: >40% deviation = critical, >20% = warning, else = info
10. ✅ No code duplication with existing services

```

---

Perfect! I've created the complete surgical implementation guide. This document:

✅ **References the actual existing code** in `AlertIntegrationLayerService.ts`
✅ **Shows exactly what to change** (collection name, method rename)
✅ **Shows exactly what to add** (new method, API routes, integrations)
✅ **Shows exactly where to add it** (file paths, line numbers where applicable)
✅ **Zero duplication** - reuses all existing working code
✅ **Complete testing checklist** with 30+ test cases
✅ **MongoDB schemas** for reference
✅ **Estimated time: 55 minutes**

---

## Ready to Proceed?

**Option A: I Implement It Now** (As Agent)
- I execute all changes exactly as per this plan
- I compile and test after each phase
- You review the code when done

**Option B: You Use This Guide**
- You share with your team/agent
- They follow the step-by-step instructions
- Minimal ambiguity since it's very specific

Which would you prefer? 🚀# SURGICAL ALERT SYSTEM IMPLEMENTATION GUIDE

## Executive Summary

**Approach:** Surgical Hybrid - Minimal changes to existing code + Add missing integrations
**Risk Level:** LOW
**Estimated Time:** 60 minutes
**Code Duplication:** ZERO (leverages existing AlertIntegrationLayerService)

---

## Current State Analysis

### ✅ What Already Exists (KEEP AS-IS)

The `AlertIntegrationLayerService` already has:

1. **`getApplicationThresholds(applicationId)`** - ✅ Fetches per-app thresholds from DB
2. **`getIndustryStandardThresholds()`** - ✅ Returns industry defaults
3. **`generateIngestionTimeAlerts()`** - ✅ Creates alerts during data ingestion
4. **`calculateAlertSeverity()`** - ✅ Calculates severity (critical/warning/info)
5. **`saveApplicationThresholds()`** - ✅ Saves custom thresholds to DB
6. **`getApplicationSLACompliance()`** - ✅ Calculates SLA metrics

### ❌ What's Missing (NEEDS TO BE ADDED)

1. **Collection Naming Issue**: Uses `'alerts'` instead of `'generatedalerts'`
2. **Batch Processing Integration**: No trigger from batch processing pipeline
3. **Application Creation Hook**: No initialization when new app is created
4. **API Routes**: No endpoints to expose threshold/alert functionality
5. **Frontend Integration**: No save handler in settings page
6. **Database Schema**: Collections not initialized in database.ts

### 🔄 What Needs Minor Updates (REFACTOR)

1. **Method Rename**: `generateIngestionTimeAlerts()` → `generateAndStoreAlerts()` (more descriptive)
2. **Collection Name**: `'alerts'` → `'generatedalerts'` (matches your naming)
3. **Add Batch Processing Method**: New method to handle batch evaluation alerts

---

## Implementation Phases

### Phase 1: Fix AlertIntegrationLayerService (REFACTOR - 5 minutes)

#### 1.1 Change Collection Name
**File**: `backend/src/services/AlertIntegrationLayerService.ts`

```typescript
// CHANGE THIS LINE (Line 58):
const AlertsCollection = mongoose.connection.collection('alerts');

// TO THIS:
const GeneratedAlertsCollection = mongoose.connection.collection('generatedalerts');

// AND UPDATE ALL REFERENCES:
// FROM: await AlertsCollection.updateOne(...)
// TO: await GeneratedAlertsCollection.updateOne(...)
```

#### 1.2 Rename Method for Clarity
```typescript
// CHANGE METHOD NAME (Line 43):
static async generateIngestionTimeAlerts(

// TO:
static async generateAndStoreAlerts(
```

This makes it clear the method both generates AND stores alerts (not just ingestion-time).

#### 1.3 Add New Method for Batch Processing
**Add after `getApplicationSLACompliance()` method:**

```typescript
/**
 * Generate alerts from batch evaluation results
 * Called from BatchProcessingService after evaluation completes
 * Reuses existing generateAndStoreAlerts() logic
 */
static async generateAlertsFromBatchEvaluation(
  applicationId: string,
  evaluatedRecords: Array<Record<string, any>>
): Promise<{ alertsGenerated: number; criticalAlerts: number }> {
  try {
    logger.info(
      `[AlertIntegrationLayer] Generating alerts from batch evaluation for app: ${applicationId}`
    );

    // Reuse existing method with 'batch' dataSourceType
    await this.generateAndStoreAlerts(applicationId, evaluatedRecords, 'batch');

    // Get alert summary
    const GeneratedAlertsCollection = mongoose.connection.collection('generatedalerts');
    const totalAlerts = await GeneratedAlertsCollection.countDocuments({
      applicationId,
      dataSourceType: 'batch',
    });

    const criticalAlerts = await GeneratedAlertsCollection.countDocuments({
      applicationId,
      severity: 'critical',
      dataSourceType: 'batch',
    });

    logger.info(
      `[AlertIntegrationLayer] Batch alerts generated - Total: ${totalAlerts}, Critical: ${criticalAlerts}`
    );

    return {
      alertsGenerated: totalAlerts,
      criticalAlerts,
    };
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    logger.error(`[AlertIntegrationLayer] Error generating batch alerts: ${errorMessage}`);
    throw err;
  }
}
```

#### 1.4 Update SLA Compliance to Use New Collection Name
```typescript
// In getApplicationSLACompliance() method (Line ~147):
// CHANGE:
const AlertsCollection = mongoose.connection.collection('alerts');

// TO:
const GeneratedAlertsCollection = mongoose.connection.collection('generatedalerts');

// CHANGE:
const alertedRecords = await AlertsCollection.countDocuments({ applicationId });

// TO:
const alertedRecords = await GeneratedAlertsCollection.countDocuments({ applicationId });
```

---

### Phase 2: Database Initialization (NEW - 5 minutes)

#### 2.1 Add Collections & Indexes
**File**: `backend/src/models/database.ts`

In the `initializeDatabase()` function, add these lines after existing collections:

```typescript
// ... existing collection initializations ...

// NEW: Alert-related collections
db.alertThresholdsCollection = mongoDb.collection('alertthresholds');
db.generatedAlertsCollection = mongoDb.collection('generatedalerts');

// Create indexes for performance
await db.alertThresholdsCollection.createIndex(
  { applicationId: 1 },
  { unique: true }
);

await db.generatedAlertsCollection.createIndex(
  { applicationId: 1, createdAt: -1 }
);

await db.generatedAlertsCollection.createIndex({ severity: 1 });
await db.generatedAlertsCollection.createIndex({ status: 1 });
await db.generatedAlertsCollection.createIndex({ alertType: 1 });

logger.info('[Database] Alert collections initialized with indexes');
```

---

### Phase 3: Application Creation - Initialize Thresholds (NEW - 5 minutes)

#### 3.1 Hook into Application Creation
**File**: `backend/src/api/applicationsRoutes.ts`

In the application creation endpoint (POST `/api/applications/create`), after the application is successfully created, add:

```typescript
// After creating newApp and saving to database:
const { AlertIntegrationLayerService } = await import('../services/AlertIntegrationLayerService.js');

try {
  // Initialize default alert thresholds for new application
  await AlertIntegrationLayerService.saveApplicationThresholds(
    newApp.id,
    AlertIntegrationLayerService.getIndustryStandardThresholds()
  );
  
  logger.info(
    `[ApplicationsRoute] Initialized default alert thresholds for app: ${newApp.id}`
  );
} catch (error: any) {
  logger.error(
    `[ApplicationsRoute] Warning: Failed to initialize thresholds: ${error.message}`
  );
  // Don't fail app creation if thresholds fail
}

// Return response as before
```

---

### Phase 4: Create Alert Thresholds API Routes (NEW - 10 minutes)

#### 4.1 Create New File
**File**: `backend/src/api/alertThresholdsRoutes.ts`

```typescript
// filepath: backend/src/api/alertThresholdsRoutes.ts

import { Router, Request, Response } from 'express';
import { AlertIntegrationLayerService } from '../services/AlertIntegrationLayerService.js';
import { logger } from '../utils/logger.js';

const router = Router();

/**
 * GET /api/alert-thresholds/:appId
 * Retrieve current alert thresholds for an application
 * Returns: custom thresholds if set, or industry standards
 */
router.get('/:appId', async (req: Request, res: Response) => {
  try {
    const { appId } = req.params;

    const thresholds = await AlertIntegrationLayerService.getApplicationThresholds(appId);

    res.json({
      applicationId: appId,
      thresholds,
      success: true,
    });
  } catch (error: any) {
    logger.error(`[alertThresholdsRoutes] GET Error: ${error.message}`);
    res.status(500).json({
      error: 'Failed to fetch thresholds',
      details: error.message,
    });
  }
});

/**
 * POST /api/alert-thresholds/:appId
 * Save or update custom alert thresholds for an application
 * Called from: Settings → Alerts page when user modifies values
 * Request body: { thresholds: { groundedness: 60, coherence: 60, ... } }
 */
router.post('/:appId', async (req: Request, res: Response) => {
  try {
    const { appId } = req.params;
    const { thresholds } = req.body;

    // Validation
    if (!thresholds || typeof thresholds !== 'object') {
      return res.status(400).json({
        error: 'Invalid thresholds format. Expected object with metric names as keys.',
      });
    }

    // Save custom thresholds
    await AlertIntegrationLayerService.saveApplicationThresholds(appId, thresholds);

    res.json({
      success: true,
      message: 'Alert thresholds updated successfully',
      applicationId: appId,
      thresholds,
      updatedAt: new Date(),
    });
  } catch (error: any) {
    logger.error(`[alertThresholdsRoutes] POST Error: ${error.message}`);
    res.status(500).json({
      error: 'Failed to save thresholds',
      details: error.message,
    });
  }
});

/**
 * POST /api/alert-thresholds/:appId/reset
 * Reset thresholds to industry standards
 */
router.post('/:appId/reset', async (req: Request, res: Response) => {
  try {
    const { appId } = req.params;

    const industryStandards = AlertIntegrationLayerService.getIndustryStandardThresholds();
    await AlertIntegrationLayerService.saveApplicationThresholds(appId, industryStandards);

    res.json({
      success: true,
      message: 'Alert thresholds reset to industry standards',
      applicationId: appId,
      thresholds: industryStandards,
      resetAt: new Date(),
    });
  } catch (error: any) {
    logger.error(`[alertThresholdsRoutes] RESET Error: ${error.message}`);
    res.status(500).json({
      error: 'Failed to reset thresholds',
      details: error.message,
    });
  }
});

export default router;
```

#### 4.2 Register Routes in Main Server
**File**: `backend/src/index.ts`

Add to where other routes are registered:

```typescript
import alertThresholdsRoutes from './api/alertThresholdsRoutes.js';

// ... other route registrations ...

app.use('/api/alert-thresholds', alertThresholdsRoutes);
```

---

### Phase 5: Create Alerts Retrieval API Routes (NEW - 10 minutes)

#### 5.1 Create New File
**File**: `backend/src/api/alertsRoutes.ts`

```typescript
// filepath: backend/src/api/alertsRoutes.ts

import { Router, Request, Response } from 'express';
import { getDatabase } from '../models/database.js';
import { logger } from '../utils/logger.js';
import { ObjectId } from 'mongodb';

const router = Router();

/**
 * GET /api/alerts/summary/:appId
 * Get summary counts of alerts per status for an application
 * Returns: { open, acknowledged, dismissed, total }
 */
router.get('/summary/:appId', async (req: Request, res: Response) => {
  try {
    const { appId } = req.params;
    const db = getDatabase();
    const generatedAlertsCollection = db.generatedAlertsCollection;

    const open = await generatedAlertsCollection.countDocuments({
      applicationId: appId,
      status: 'open',
    });

    const acknowledged = await generatedAlertsCollection.countDocuments({
      applicationId: appId,
      status: 'acknowledged',
    });

    const dismissed = await generatedAlertsCollection.countDocuments({
      applicationId: appId,
      status: 'dismissed',
    });

    res.json({
      summary: {
        open,
        acknowledged,
        dismissed,
        total: open + acknowledged + dismissed,
      },
      success: true,
    });
  } catch (error: any) {
    logger.error(`[alertsRoutes] Summary Error: ${error.message}`);
    res.status(500).json({
      error: 'Failed to fetch alert summary',
      details: error.message,
    });
  }
});

/**
 * GET /api/alerts/:appId
 * Get paginated alerts for an application with optional filters
 * Query params: page (default 1), limit (default 25), severity, alertType, status
 */
router.get('/:appId', async (req: Request, res: Response) => {
  try {
    const { appId } = req.params;
    const { page = 1, limit = 25, severity, alertType, status } = req.query;

    const db = getDatabase();
    const generatedAlertsCollection = db.generatedAlertsCollection;

    // Build filter
    const filter: any = { applicationId: appId };
    if (severity) filter.severity = severity;
    if (alertType) filter.alertType = alertType;
    if (status) filter.status = status;

    // Query with pagination
    const alerts = await generatedAlertsCollection
      .find(filter)
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit))
      .toArray();

    const total = await generatedAlertsCollection.countDocuments(filter);

    res.json({
      alerts: alerts.map((alert) => ({
        ...alert,
        _id: alert._id?.toString(),
      })),
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
      success: true,
    });
  } catch (error: any) {
    logger.error(`[alertsRoutes] GET Alerts Error: ${error.message}`);
    res.status(500).json({
      error: 'Failed to fetch alerts',
      details: error.message,
    });
  }
});

/**
 * POST /api/alerts/acknowledge
 * Acknowledge one or more alerts with optional comment
 */
router.post('/acknowledge', async (req: Request, res: Response) => {
  try {
    const { alertIds, comment, userId } = req.body;

    if (!alertIds || !Array.isArray(alertIds) || alertIds.length === 0) {
      return res.status(400).json({ error: 'alertIds must be a non-empty array' });
    }

    const db = getDatabase();
    const generatedAlertsCollection = db.generatedAlertsCollection;

    const result = await generatedAlertsCollection.updateMany(
      { _id: { $in: alertIds.map((id: string) => new ObjectId(id)) } },
      {
        $set: {
          status: 'acknowledged',
          acknowledgeComment: comment || null,
          acknowledgedBy: userId || null,
          acknowledgedAt: new Date(),
          updatedAt: new Date(),
        },
      }
    );

    res.json({
      success: true,
      message: `${result.modifiedCount} alerts acknowledged`,
      modifiedCount: result.modifiedCount,
    });
  } catch (error: any) {
    logger.error(`[alertsRoutes] Acknowledge Error: ${error.message}`);
    res.status(500).json({
      error: 'Failed to acknowledge alerts',
      details: error.message,
    });
  }
});

/**
 * POST /api/alerts/dismiss
 * Dismiss one or more alerts with optional comment
 */
router.post('/dismiss', async (req: Request, res: Response) => {
  try {
    const { alertIds, comment, userId } = req.body;

    if (!alertIds || !Array.isArray(alertIds) || alertIds.length === 0) {
      return res.status(400).json({ error: 'alertIds must be a non-empty array' });
    }

    const db = getDatabase();
    const generatedAlertsCollection = db.generatedAlertsCollection;

    const result = await generatedAlertsCollection.updateMany(
      { _id: { $in: alertIds.map((id: string) => new ObjectId(id)) } },
      {
        $set: {
          status: 'dismissed',
          acknowledgeComment: comment || null,
          acknowledgedBy: userId || null,
          dismissedAt: new Date(),
          updatedAt: new Date(),
        },
      }
    );

    res.json({
      success: true,
      message: `${result.modifiedCount} alerts dismissed`,
      modifiedCount: result.modifiedCount,
    });
  } catch (error: any) {
    logger.error(`[alertsRoutes] Dismiss Error: ${error.message}`);
    res.status(500).json({
      error: 'Failed to dismiss alerts',
      details: error.message,
    });
  }
});

export default router;
```

#### 5.2 Register Routes in Main Server
**File**: `backend/src/index.ts`

Add to where other routes are registered:

```typescript
import alertsRoutes from './api/alertsRoutes.js';

// ... other route registrations ...

app.use('/api/alerts', alertsRoutes);
```

---

### Phase 6: Batch Processing Integration (NEW - 5 minutes)

#### 6.1 Add Alert Generation Trigger
**File**: `backend/src/services/BatchProcessingService.ts`

In the batch processing flow, after evaluation metrics are calculated and stored, add:

```typescript
// After evaluationRecords are created and saved to evaluationrecords collection:

import { AlertIntegrationLayerService } from './AlertIntegrationLayerService.js';

try {
  logger.info(
    `[BatchProcessing] Generating alerts for batch evaluation, app: ${applicationId}`
  );

  const alertResult = await AlertIntegrationLayerService.generateAlertsFromBatchEvaluation(
    applicationId,
    evaluatedRecords
  );

  logger.info(
    `[BatchProcessing] Alert generation complete - Generated: ${alertResult.alertsGenerated}, Critical: ${alertResult.criticalAlerts}`
  );
} catch (error: any) {
  logger.error(`[BatchProcessing] Alert generation failed: ${error.message}`);
  // Don't fail batch processing if alerts fail - alerts are secondary
}
```

---

### Phase 7: Frontend - Settings/Alerts Tab (NEW - 10 minutes)

#### 7.1 Add Save Handler to AlertThresholdsTab
**File**: `app/settings/page.tsx`

In the `AlertThresholdsTab` component, add:

```typescript
const [isSaving, setIsSaving] = useState(false);
const [successMessage, setSuccessMessage] = useState('');
const [errorMessage, setErrorMessage] = useState('');

/**
 * Load thresholds when application is selected
 */
useEffect(() => {
  if (!selectedAppId) return;

  const loadThresholds = async () => {
    try {
      const response = await fetch(`/api/alert-thresholds/${selectedAppId}`);
      if (!response.ok) throw new Error('Failed to load thresholds');

      const data = await response.json();
      setFormValues(data.thresholds);
    } catch (error: any) {
      console.error('Error loading thresholds:', error);
      setErrorMessage('Failed to load threshold settings');
    }
  };

  loadThresholds();
}, [selectedAppId]);

/**
 * Save custom thresholds to backend
 */
const handleSaveThresholds = async () => {
  if (!selectedAppId) {
    setErrorMessage('Please select an application');
    return;
  }

  try {
    setIsSaving(true);
    setErrorMessage('');
    setSuccessMessage('');

    const response = await fetch(`/api/alert-thresholds/${selectedAppId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ thresholds: formValues }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to save thresholds');
    }

    const result = await response.json();
    setSuccessMessage(`✓ Alert thresholds saved successfully for ${selectedAppId}`);

    // Clear success message after 3 seconds
    setTimeout(() => setSuccessMessage(''), 3000);

    console.log('Thresholds saved:', result);
  } catch (error: any) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    setErrorMessage(`Error saving thresholds: ${errorMsg}`);
    console.error('Error:', error);
  } finally {
    setIsSaving(false);
  }
};

/**
 * Reset thresholds to industry standards
 */
const handleResetToDefaults = async () => {
  if (!selectedAppId) return;

  try {
    setIsSaving(true);
    setErrorMessage('');

    const response = await fetch(`/api/alert-thresholds/${selectedAppId}/reset`, {
      method: 'POST',
    });

    if (!response.ok) throw new Error('Failed to reset thresholds');

    const result = await response.json();
    setFormValues(result.thresholds);
    setSuccessMessage('Thresholds reset to industry standards');

    setTimeout(() => setSuccessMessage(''), 3000);
  } catch (error: any) {
    setErrorMessage(`Error resetting thresholds: ${error.message}`);
  } finally {
    setIsSaving(false);
  }
};

// In JSX return, add buttons:
<div className="flex gap-4 mt-6">
  <button
    onClick={handleSaveThresholds}
    disabled={isSaving}
    className="px-6 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
  >
    {isSaving ? 'Saving...' : 'Save Thresholds'}
  </button>
  <button
    onClick={handleResetToDefaults}
    disabled={isSaving}
    className="px-6 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 disabled:opacity-50"
  >
    Reset to Defaults
  </button>
</div>

{successMessage && (
  <div className="mt-4 p-4 bg-green-100 text-green-800 rounded">
    {successMessage}
  </div>
)}
{errorMessage && (
  <div className="mt-4 p-4 bg-red-100 text-red-800 rounded">
    {errorMessage}
  </div>
)}
```

---

### Phase 8: Frontend - Alerts Page Update (MINOR - 3 minutes)

#### 8.1 Update Fetch Calls
**File**: `app/alerts/page.tsx`

Replace the alert fetching logic to use new endpoints:

```typescript
/**
 * Fetch alerts summary
 */
const fetchAlertsSummary = async (appIds: string[]) => {
  try {
    const summaries = await Promise.all(
      appIds.map(async (appId) => {
        const response = await fetch(`/api/alerts/summary/${appId}`);
        if (!response.ok) throw new Error(`Failed to fetch summary for ${appId}`);
        return response.json();
      })
    );

    // Aggregate summaries
    const totalSummary = summaries.reduce(
      (acc, data) => ({
        open: acc.open + data.summary.open,
        acknowledged: acc.acknowledged + data.summary.acknowledged,
        dismissed: acc.dismissed + data.summary.dismissed,
        total: acc.total + data.summary.total,
      }),
      { open: 0, acknowledged: 0, dismissed: 0, total: 0 }
    );

    setSummary(totalSummary);
  } catch (error: any) {
    setErrorMessage(`Error loading alerts: ${error.message}`);
  }
};

/**
 * Fetch alerts for selected applications
 */
const fetchAlerts = async (appIds: string[]) => {
  try {
    setLoading(true);

    const allAlerts: any[] = [];

    for (const appId of appIds) {
      const params = new URLSearchParams({
        page: String(currentPage),
        limit: '25',
      });

      if (severityFilter && severityFilter !== 'all') {
        params.append('severity', severityFilter);
      }

      const response = await fetch(`/api/alerts/${appId}?${params}`);
      if (!response.ok) throw new Error(`Failed to fetch alerts for ${appId}`);

      const data = await response.json();
      allAlerts.push(...data.alerts);
    }

    setAlerts(allAlerts);
  } catch (error: any) {
    setErrorMessage(error.message);
  } finally {
    setLoading(false);
  }
};
```

---

## Summary of Changes

| File | Change Type | Time | Impact |
|------|------------|------|--------|
| AlertIntegrationLayerService.ts | REFACTOR | 5 min | Collection name, method rename, add batch method |
| database.ts | ADD | 5 min | Initialize collections & indexes |
| applicationsRoutes.ts | ADD HOOK | 5 min | Initialize thresholds on app creation |
| alertThresholdsRoutes.ts | CREATE | 10 min | New file - threshold management API |
| alertsRoutes.ts | CREATE | 10 min | New file - alerts retrieval API |
| BatchProcessingService.ts | INTEGRATE | 5 min | Call alert generation |
| app/settings/page.tsx | ADD HANDLER | 10 min | Save/reset thresholds |
| app/alerts/page.tsx | UPDATE | 3 min | Use new API endpoints |
| index.ts | REGISTER | 2 min | Register new routes |

**Total Time: ~55 minutes**

---

## Testing Checklist

### ✅ Unit Tests
- [ ] `AlertIntegrationLayerService.generateAlertsFromBatchEvaluation()` returns correct counts
- [ ] `AlertIntegrationLayerService.getApplicationThresholds()` returns custom when set, defaults otherwise
- [ ] `AlertIntegrationLayerService.saveApplicationThresholds()` stores in MongoDB
- [ ] Severity calculation: critical when >40% deviation, warning when >20%, info otherwise

### ✅ Integration Tests

**Database:**
- [ ] `alertthresholds` collection created with unique index on applicationId
- [ ] `generatedalerts` collection created with proper indexes
- [ ] Thresholds persist across server restarts

**Application Creation:**
- [ ] New application in wizard → thresholds initialized automatically
- [ ] Default industry thresholds loaded correctly
- [ ] Application ID matches in both collections

**Threshold Management:**
- [ ] GET `/api/alert-thresholds/:appId` returns thresholds
- [ ] POST `/api/alert-thresholds/:appId` saves custom values
- [ ] POST `/api/alert-thresholds/:appId/reset` resets to defaults
- [ ] Updated values persist in MongoDB

**Alert Generation:**
- [ ] Upload file → batch process → alerts generated
- [ ] Alerts stored in `generatedalerts` with correct fields
- [ ] Alerts use custom thresholds when set
- [ ] Severity correctly calculated based on deviation
- [ ] Alert messages are descriptive

**Alert Retrieval:**
- [ ] GET `/api/alerts/summary/:appId` returns correct counts
- [ ] GET `/api/alerts/:appId` returns paginated alerts
- [ ] Filters work: severity, alertType, status
- [ ] POST `/api/alerts/acknowledge` updates status
- [ ] POST `/api/alerts/dismiss` updates status

### ✅ End-to-End Tests
1. Create new application → default thresholds appear in settings
2. Modify thresholds in Settings/Alerts → saved to MongoDB
3. Upload file and process → alerts generated with custom thresholds
4. View alerts page → shows alerts with application context
5. Acknowledge alert → status changes in DB and UI
6. Refresh page → data persists

---

## Deployment Checklist

- [ ] All 9 files modified/created per plan
- [ ] Backend compiles: `npm run build`
- [ ] Frontend compiles: `npm run build`
- [ ] MongoDB collections created and indexed
- [ ] API endpoints tested with curl/Postman
- [ ] Settings page saves thresholds correctly
- [ ] Alerts page displays all alerts
- [ ] No TypeScript errors
- [ ] No console errors in browser
- [ ] Logging configured properly
- [ ] Documentation updated

---

## MongoDB Schema Reference

### `alertthresholds` Collection
```json
{
  "_id": ObjectId("..."),
  "applicationId": "app123",
  "thresholds": {
    "groundedness": 60,
    "coherence": 60,
    "relevance": 60,
    "faithfulness": 65,
    "answerRelevancy": 65,
    "contextPrecision": 70,
    "contextRecall": 65,
    "overallScore": 65,
    "latencyP50Ms": 500,
    "latencyP95Ms": 1000,
    "latencyP99Ms": 2000,
    "errorRatePercent": 5,
    "timeoutRatePercent": 2
  },
  "updatedAt": "2026-04-27T12:00:00Z"
}
```

### `generatedalerts` Collection
```json
{
  "_id": ObjectId("..."),
  "alertId": "uuid-123",
  "applicationId": "app123",
  "recordId": "record-456",
  "alertType": "quality_metric|performance",
  "metricName": "groundedness",
  "metricValue": 45,
  "threshold": 60,
  "severity": "critical|warning|info",
  "message": "groundedness score (45.00) below threshold (60)",
  "dataSourceType": "batch|ingestion",
  "status": "open|acknowledged|dismissed",
  "acknowledgeComment": "Known issue with source data",
  "acknowledgedBy": "user@example.com",
  "acknowledgedAt": "2026-04-27T12:30:00Z",
  "createdAt": "2026-04-27T12:00:00Z",
  "updatedAt": "2026-04-27T12:30:00Z"
}
```

---

## Code Quality Notes

✅ **No Duplication**: All new code uses existing `AlertIntegrationLayerService` methods
✅ **Error Handling**: All endpoints have try-catch with proper logging
✅ **Validation**: Input validation on POST endpoints
✅ **Indexes**: Collection indexes for query performance
✅ **Types**: Full TypeScript typing throughout
✅ **Logging**: Consistent logger usage for debugging
✅ **Comments**: Clear inline comments explaining logic

---

## Success Criteria (All Must Pass)

1. ✅ Applications created with default alert thresholds
2. ✅ Users can customize thresholds via Settings page
3. ✅ Custom thresholds persist in `alertthresholds` collection
4. ✅ Alerts generated after batch processing using per-app thresholds
5. ✅ Generated alerts stored in `generatedalerts` collection
6. ✅ Alerts page displays all alerts with full context
7. ✅ Users can acknowledge/dismiss alerts with comments
8. ✅ System correctly identifies critical/warning/healthy alerts
9. ✅ Severity calculation: >40% deviation = critical, >20% = warning, else = info
10. ✅ No code duplication with existing services

```

---

Perfect! I've created the complete surgical implementation guide. This document:

✅ **References the actual existing code** in `AlertIntegrationLayerService.ts`
✅ **Shows exactly what to change** (collection name, method rename)
✅ **Shows exactly what to add** (new method, API routes, integrations)
✅ **Shows exactly where to add it** (file paths, line numbers where applicable)
✅ **Zero duplication** - reuses all existing working code
✅ **Complete testing checklist** with 30+ test cases
✅ **MongoDB schemas** for reference
✅ **Estimated time: 55 minutes**

---

## Ready to Proceed?

**Option A: I Implement It Now** (As Agent)
- I execute all changes exactly as per this plan
- I compile and test after each phase
- You review the code when done

**Option B: You Use This Guide**
- You share with your team/agent
- They follow the step-by-step instructions
- Minimal ambiguity since it's very specific

Which would you prefer? 🚀
