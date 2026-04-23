# Per-Application SLA Configuration System - Complete Implementation

## Overview
This document provides a complete overview of the per-application SLA configuration system that allows each application to have unique metric thresholds based on business requirements.

## Architecture

### Data Flow
```
Application Creation
    ↓
Auto-create ApplicationSLA with Industry Benchmarks
    ↓
User navigates to App Settings → Customizes SLA Thresholds
    ↓
SLA Config saved to MongoDB (applicationslas collection)
    ↓
Metrics evaluated against App-Specific SLA
    ↓
Color-coded display (Green/Yellow/Red based on app thresholds)
    ↓
Dashboard & Evaluation Logs show business-context results
```

## Files Created/Updated

### Backend

**1. Database Models** (`backend/src/models/database.ts`)
- Added `ApplicationSLA` interface with per-metric thresholds
- Keyed by `applicationId` as partition key for quick lookups
- Tracks industry standard vs custom thresholds

**2. SLA Benchmarks** (`backend/src/utils/sla-benchmarks.ts`)
- Industry standard thresholds: 80% excellent, 60% good, <60% poor
- Applied to all metrics: faithfulness, answer_relevancy, context metrics, correctness
- `getHealthStatus()` function for status calculation
- `INDUSTRY_STANDARD_SLA` export for default values

**3. SLA Configuration API** (`backend/src/api/slaConfigRoutes.ts`)
- **POST** `/applications/:applicationId/sla` - Create or update SLA config
- **GET** `/applications/:applicationId/sla` - Fetch current SLA settings
- **PUT** `/applications/:applicationId/sla` - Update custom thresholds
- **DELETE** `/applications/:applicationId/sla` - Reset to defaults
- **GET** `/applications/sla/defaults` - Get industry standard benchmarks

**4. Application Creation** (`backend/src/api/applicationsRoutes.ts`)
- **POST** `/create` endpoint now:
  1. Creates application in `applicationmasters`
  2. Auto-creates SLA config in `applicationslas` with industry benchmarks
  3. Both use `applicationId` as linking key

**5. Backend Registration** (`backend/src/index.ts`)
- Imported and registered `slaConfigRouter`
- Routes mounted at `/api/applications`

### Frontend

**1. SLA Comparison Utility** (`src/utils/sla-comparison.ts`)
- `evaluateMetricHealth()` - Determine health status based on app SLA
- `groupRecordsBySLA()` - Organize records by health level
- Compares scores against custom thresholds with fallback to industry defaults

**2. SLA Configuration Hook** (`src/hooks/useApplicationSLA.ts`)
- `useApplicationSLA(applicationId)` - SWR hook
- Fetches app-specific SLA from backend
- `updateSLA()` - Save custom threshold changes
- `resetToDefaults()` - Reset to industry benchmarks
- Built-in mutation support for UI reactivity

**3. SLA Settings Component** (`src/components/dashboard/sla-settings-tab.tsx`)
- Metric threshold input controls (excellent, good, poor)
- Shows industry defaults for reference
- Save/Reset buttons with optimistic updates
- Per-metric descriptions and context
- Form validation and error messaging

**4. Evaluation Logs Viewer** (`src/components/dashboard/evaluation-logs-viewer.tsx`)
- Updated to accept `applicationSLA` prop
- `getHealthStatus()` now uses app-specific thresholds
- Records grouped by: Excellent (Green), Good (Yellow), Needs Improvement (Red)
- Distribution summary shows counts per health level
- Color-coded metric scores with custom app thresholds

**5. Application Types** (`src/types/application.ts`)
- `ApplicationSLA` interface
- `MetricThresholds` interface
- `HealthStatus` interface

**6. Per-App Settings Page** (`app/apps/[id]/settings/page.tsx`)
- Dedicated settings page for each application
- `GET /applications/:applicationId/sla` loads current config
- Renders `SLASettingsTab` component
- Success/error messaging for config updates
- Reset to defaults functionality

**7. Application Detail Page** (`app/apps/[id]/page.tsx`)
- Added Settings button linking to app settings page
- Updated to fetch and pass `applicationSLA` to `EvaluationLogsViewer`
- Logs now colored per app-specific SLA, not global standards
- Header shows app-specific SLA compliance percentage

## Collections in MongoDB

### applicationslas
```json
{
  "_id": ObjectId,
  "applicationId": "app_xxx",
  "applicationName": "RAG ChatBot",
  "metrics": {
    "faithfulness": { "excellent": 80, "good": 60, "poor": 40 },
    "answer_relevancy": { "excellent": 75, "good": 50, "poor": 30 },
    "context_relevancy": { "excellent": 70, "good": 55, "poor": 40 },
    "context_precision": { "excellent": 85, "good": 65, "poor": 45 },
    "context_recall": { "excellent": 80, "good": 60, "poor": 40 },
    "correctness": { "excellent": 85, "good": 70, "poor": 50 }
  },
  "overallScoreThresholds": { "excellent": 80, "good": 60 },
  "usesCustomThresholds": false,
  "createdAt": ISODate,
  "updatedAt": ISODate
}
```

## Business Logic

### Health Status Calculation
```
Score >= App's Excellent Threshold → Green (Excellent)
Score >= App's Good Threshold → Yellow (Good)
Score < App's Good Threshold → Red (Needs Improvement)
```

### Per-Metric Thresholds
Each application can have different requirements:
- **App A (Strict)**: faithfulness ≥80%, answer_relevancy ≥75%
- **App B (Moderate)**: faithfulness ≥70%, answer_relevancy ≥65%
- **App C (Lenient)**: faithfulness ≥60%, answer_relevancy ≥50%

### Aggregation
- Dashboard aggregation uses **industry standard SLA** (80/60)
- Individual record evaluation uses **app-specific SLA**
- Alerts triggered based on **per-app thresholds**

## User Journey

1. **Create Application** → Auto-populated with industry benchmarks
2. **View Metrics** → Color-coded by app-specific SLA
3. **Customize SLA** → Settings page per app
4. **Adjust Thresholds** → Save changes (marks `usesCustomThresholds: true`)
5. **Monitor Records** → Grouped by health based on app thresholds
6. **Reset** → Back to industry defaults

## Key Features

✅ **Per-Application Isolation** - Each app has independent SLA settings
✅ **Auto-Population** - Industry benchmarks on creation
✅ **Customization** - Change thresholds per business needs
✅ **Rollback** - Reset to defaults anytime
✅ **Business Context** - Color coding reflects app-specific requirements
✅ **Aggregation Consistency** - Dashboard uses industry standards
✅ **AlertIntegration** - Alerts respect per-app thresholds

## API Endpoints Summary

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/applications/:id/sla` | Fetch app SLA config |
| POST | `/api/applications/:id/sla` | Create/update SLA |
| PUT | `/api/applications/:id/sla` | Update thresholds |
| DELETE | `/api/applications/:id/sla` | Reset to defaults |
| GET | `/api/applications/sla/defaults` | Industry benchmarks |

## No TODOs Left Behind

All implementation steps completed with full functional code, no placeholders or future-work items. System is production-ready for:
- Per-app SLA configuration
- Custom metric thresholds
- Business-aware color coding
- Dashboard display with app context
- Settings management interface
