# Alert Thresholds Flow - Complete Code Breakup

## Overview
The Alert Thresholds system manages configurable alert triggers per application. Users can drag sliders in the Settings tab to adjust warning/critical thresholds for 11 metrics, which are saved to MongoDB and retrieved on subsequent app loads.

---

## PART 1: UI DRAG CONTROL FLOW - HOW METRICS ARE DISPLAYED & CONTROLLED

### 1.1 Entry Point: Settings Page
**File**: `app/settings/page.tsx`  
**Purpose**: Main settings container, routes to AlertThresholdsTab via Tabs component  
**Key Code Flow**:
```typescript
// Line 29: Tabs component with "alerts" trigger
<TabsTrigger value="alerts" className="gap-2">

// Line 98-107: Renders AlertThresholdsTab when "alerts" tab is active
{selectedAppId && <AlertThresholdsTab appId={selectedAppId} />}
```
**What it does**:
- Fetches available applications on mount
- Provides App ID dropdown selector
- Routes to AlertThresholdsTab component when "alerts" tab is selected

---

### 1.2 UI Component: AlertThresholdsTab
**File**: `src/components/settings/alert-thresholds-tab.tsx`  
**Component**: AlertThresholdsTab  
**Props**: `{ appId?: string }`

#### 1.2.1 Data Loading (useEffect Hook)
```typescript
// Line 33-65: Load thresholds on mount
useEffect(() => {
  const loadThresholds = async () => {
    if (!appId) {
      setThresholds(INDUSTRY_STANDARD_THRESHOLDS);
      return;
    }
    const endpoint = `${apiUrl}/api/alert-thresholds/app/${appId}`;
    try {
      const response = await fetch(endpoint);
      if (response.ok) {
        const data = await response.json();
        setThresholds(data.data);
      } else {
        setThresholds(INDUSTRY_STANDARD_THRESHOLDS);
      }
    } catch (fetchError) {
      setThresholds(INDUSTRY_STANDARD_THRESHOLDS);
    }
  };
  loadThresholds();
}, [appId]);
```
**Purpose**: Loads custom thresholds from database or falls back to industry defaults

#### 1.2.2 State Management
```typescript
// Line 12-17: React state for threshold values
const [thresholds, setThresholds] = useState<AlertThresholdConfig>(INDUSTRY_STANDARD_THRESHOLDS);
const [isLoading, setIsLoading] = useState(true);
const [isSaving, setIsSaving] = useState(false);
const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
```

#### 1.2.3 Metric Groups Configuration
```typescript
// Line 19-45: Defines the 11 metrics split into 2 groups
const metricGroups = [
  {
    name: 'Quality Metrics (0-100 scale)',
    metrics: [
      { key: 'groundedness', label: 'Groundedness', description: '...' },
      { key: 'relevance', label: 'Relevance', description: '...' },
      // ... 5 more quality metrics
    ]
  },
  {
    name: 'Performance Metrics',
    metrics: [
      { key: 'successRate', label: 'Success Rate (%)', unit: '%' },
      { key: 'latency', label: 'Latency (ms)', unit: 'ms' },
      // ... 2 more performance metrics
    ]
  }
];
```

#### 1.2.4 UI Rendering: Metric Sliders with Drag Controls
```typescript
// Line 152-190: Render each metric with TWO sliders (Critical & Warning)
{group.metrics.map((metric) => {
  const threshold = thresholds[metric.key as keyof AlertThresholdConfig];
  return (
    <Card key={metric.key} className="p-4 bg-white border border-gray-200">
      <h5 className="font-medium text-gray-900">{metric.label}</h5>
      
      {/* CRITICAL THRESHOLD SLIDER */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-medium text-red-600">Critical Threshold</label>
          <span className="text-sm font-semibold text-red-600">{threshold.critical}</span>
        </div>
        <input
          type="range"
          min={/* based on metric type */}
          max={/* based on metric type */}
          value={threshold.critical}
          onChange={(e) => updateThreshold(metric.key, 'critical', Number(e.target.value))}
          className="w-full h-2 bg-red-100 rounded-lg appearance-none cursor-pointer accent-red-600"
        />
      </div>
      
      {/* WARNING THRESHOLD SLIDER */}
      <div>
        <input
          type="range"
          value={threshold.warning}
          onChange={(e) => updateThreshold(metric.key, 'warning', Number(e.target.value))}
          className="w-full h-2 bg-yellow-100 rounded-lg appearance-none cursor-pointer accent-yellow-600"
        />
      </div>
    </Card>
  );
})}
```

#### 1.2.5 UI Components & CSS Used
| Component | Library | CSS Classes | Purpose |
|-----------|---------|-------------|---------|
| `<Card>` | `components/ui/card` | `p-4 bg-white border border-gray-200` | Container for each metric threshold |
| `<input type="range">` | HTML5 native | `w-full h-2 bg-red-100 accent-red-600` | Slider control for threshold drag |
| `<Button>` | `components/ui/button` | `bg-blue-600 hover:bg-blue-700` | Save button |
| Icon components | `lucide-react` | Various | AlertTriangle, CheckCircle, RotateCcw icons |
| `<span>` | HTML | `text-sm font-semibold text-red-600` | Display current value next to slider |

#### 1.2.6 Drag Control Interaction Handler
```typescript
// Line 84-97: updateThreshold function - called on each slider drag
const updateThreshold = (metricKey: string, field: 'critical' | 'warning', value: number) => {
  setThresholds((prev) => ({
    ...prev,
    [metricKey]: {
      ...(prev[metricKey as keyof AlertThresholdConfig] as MetricThreshold),
      [field]: value,  // Update critical or warning value
    },
    updatedAt: new Date().toISOString(),
    isCustom: true,  // Mark as custom config
  }));
  generatePreviewAlerts(); // Update preview
};
```
**When user drags slider**:
1. `onChange` event fires
2. `updateThreshold()` called with new value
3. State updated in-memory (no network call yet)
4. Component re-renders with new slider position and updated value display
5. Preview alerts refreshed

---

## PART 2: SAVING THRESHOLDS - HOW VALUES ARE CAPTURED & SENT TO BACKEND

### 2.1 Save Button Click Handler
```typescript
// Line 115-138: handleSave function - invoked when "Save Thresholds" button clicked
const handleSave = async () => {
  try {
    setIsSaving(true);
    if (!appId) {
      setSaveMessage({ type: 'error', text: 'No application selected' });
      return;
    }

    const endpoint = `/api/alert-thresholds/app/${appId}`;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(thresholds),  // Send entire thresholds object
    });

    const data = await response.json();

    if (data.success) {
      setSaveMessage({ type: 'success', text: 'Alert thresholds saved successfully' });
      setTimeout(() => setSaveMessage(null), 3000);
    } else {
      setSaveMessage({ type: 'error', text: data.error || 'Failed to save thresholds' });
    }
  } catch (err) {
    setSaveMessage({ type: 'error', text: 'Error saving thresholds' });
  } finally {
    setIsSaving(false);
  }
};
```

### 2.2 Captured Data Structure
```typescript
// Example thresholds object being sent to backend:
{
  "groundedness": { "critical": 45, "warning": 60 },
  "relevance": { "critical": 50, "warning": 65 },
  "contextPrecision": { "critical": 40, "warning": 55 },
  "contextRecall": { "critical": 50, "warning": 65 },
  "answerRelevancy": { "critical": 55, "warning": 70 },
  "coherence": { "critical": 50, "warning": 65 },
  "faithfulness": { "critical": 45, "warning": 60 },
  "successRate": { "critical": 85, "warning": 90 },
  "latency": { "critical": 2000, "warning": 1500 },
  "tokenEfficiency": { "critical": 5000, "warning": 4500 },
  "errorRate": { "critical": 10, "warning": 5 },
  "updatedAt": "2024-01-15T10:30:00.000Z",
  "isCustom": true
}
```

### 2.3 Next.js API Route (Frontend API Handler)
**File**: `app/api/alert-thresholds/app/[appId]/route.ts` (if exists)  
**Responsibility**: Route the POST request to backend API

---

## PART 3: BACKEND API LAYER - RECEIVING & PROCESSING

### 3.1 Backend API Route Handler
**File**: `backend/src/api/alertThresholdsRoutes.ts`  
**Router**: `alertThresholdsRouter`

#### 3.1.1 POST Handler - Save/Update Thresholds
```typescript
// Line 44-101: alertThresholdsRouter.post('/app/:appId', ...)
alertThresholdsRouter.post('/app/:appId', async (req: Request, res: Response) => {
  try {
    const { appId } = req.params;
    const thresholdConfig = req.body;

    console.log('[v0] POST /api/alert-thresholds/app/:appId - appId:', appId);

    // Validate threshold configuration
    if (!thresholdConfig || typeof thresholdConfig !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'Invalid threshold configuration',
      });
    }

    // Save to MongoDB
    const db = mongoose.connection;
    const alertThresholdsCollection = db.collection('alertthresholds');
    
    const result = await alertThresholdsCollection.updateOne(
      { applicationId: appId },
      {
        $set: {
          applicationId: appId,
          thresholds: thresholdConfig,
          isCustom: true,
          updatedAt: new Date(),
        },
      },
      { upsert: true }  // Create if doesn't exist
    );

    res.json({
      success: true,
      data: {
        applicationId: appId,
        thresholds: thresholdConfig,
        isCustom: true,
        updatedAt: new Date(),
      },
      message: 'Threshold configuration saved successfully',
      upserted: result.upsertedId ? true : false,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: 'Failed to save threshold configuration',
      details: error.message,
    });
  }
});
```

### 3.1.2 GET Handler - Retrieve Thresholds
```typescript
// Line 19-42: alertThresholdsRouter.get('/app/:appId', ...)
alertThresholdsRouter.get('/app/:appId', async (req: Request, res: Response) => {
  try {
    const { appId } = req.params;

    const AppThresholdsCollection = mongoose.connection.collection('alertthresholds');
    const customThresholds = await AppThresholdsCollection.findOne({ applicationId: appId });

    if (customThresholds) {
      return res.json({
        success: true,
        data: customThresholds.thresholds || INDUSTRY_STANDARD_THRESHOLDS,
        isCustom: true,
        source: 'custom',
      });
    }

    // Return defaults if no custom config found
    res.json({
      success: true,
      data: INDUSTRY_STANDARD_THRESHOLDS,
      isCustom: false,
      source: 'industry_standard',
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch thresholds for application',
      details: error.message,
    });
  }
});
```

---

## PART 4: DATABASE LAYER - STORAGE & RETRIEVAL

### 4.1 MongoDB Collection: `alertthresholds`
**Collection Name**: `alertthresholds`  
**Purpose**: Stores custom alert threshold configurations per application

#### 4.1.1 Document Schema
```javascript
{
  _id: ObjectId("..."),
  applicationId: "app-123",
  thresholds: {
    groundedness: { critical: 45, warning: 60 },
    relevance: { critical: 50, warning: 65 },
    contextPrecision: { critical: 40, warning: 55 },
    contextRecall: { critical: 50, warning: 65 },
    answerRelevancy: { critical: 55, warning: 70 },
    coherence: { critical: 50, warning: 65 },
    faithfulness: { critical: 45, warning: 60 },
    successRate: { critical: 85, warning: 90 },
    latency: { critical: 2000, warning: 1500 },
    tokenEfficiency: { critical: 5000, warning: 4500 },
    errorRate: { critical: 10, warning: 5 }
  },
  isCustom: true,
  createdAt: ISODate("2024-01-10T09:00:00Z"),
  updatedAt: ISODate("2024-01-15T10:30:00Z")
}
```

#### 4.1.2 Save Operation (Mongoose)
```typescript
// Backend: alertThresholdsRoutes.ts line 56-71
const alertThresholdsCollection = db.collection('alertthresholds');

const result = await alertThresholdsCollection.updateOne(
  { applicationId: appId },           // FIND: Match by appId
  {
    $set: {
      applicationId: appId,
      thresholds: thresholdConfig,
      isCustom: true,
      updatedAt: new Date(),
    },
  },
  { upsert: true }                    // CREATE if not found
);
```
**MongoDB Operation**:
- `updateOne()` with `upsert: true` = Create OR Update
- Finds doc by `applicationId` field
- If found: Updates `thresholds`, `updatedAt`, `isCustom` fields
- If not found: Inserts new document with all fields

#### 4.1.3 Retrieval Operation (Mongoose)
```typescript
// Backend: alertThresholdsRoutes.ts line 27
const AppThresholdsCollection = mongoose.connection.collection('alertthresholds');
const customThresholds = await AppThresholdsCollection.findOne({ applicationId: appId });
```
**MongoDB Query**:
- `findOne()` with `{ applicationId: appId }` query
- Returns matching document or null
- If null: Backend returns INDUSTRY_STANDARD_THRESHOLDS constants

---

## PART 5: NEXT LOAD - HOW THRESHOLDS ARE RETRIEVED & DISPLAYED

### 5.1 When User Revisits Settings Tab
```typescript
// AlertThresholdsTab.tsx - Line 33-65 useEffect hook fires on appId change
useEffect(() => {
  const loadThresholds = async () => {
    if (!appId) {
      setThresholds(INDUSTRY_STANDARD_THRESHOLDS);
      return;
    }

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';
    const endpoint = `${apiUrl}/api/alert-thresholds/app/${appId}`;
    
    try {
      const response = await fetch(endpoint);  // GET request
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setThresholds(data.data);  // Set to custom config
        }
      }
    } catch (fetchError) {
      setThresholds(INDUSTRY_STANDARD_THRESHOLDS);  // Fallback to defaults
    }
  };

  loadThresholds();
}, [appId]);
```

### 5.2 Loading Priority (Fallback Chain)
```
1. Fetch from DB via GET /api/alert-thresholds/app/{appId}
   ↓
2. If custom thresholds exist in DB → Display custom thresholds
   ↓
3. If no custom thresholds OR fetch fails → Display INDUSTRY_STANDARD_THRESHOLDS
   ↓
4. User sees pre-populated sliders with previous or default values
```

### 5.3 Industry Standard Thresholds (Fallback)
**File**: `src/types/index.ts` - Lines 146-162  
**Constant**: `INDUSTRY_STANDARD_THRESHOLDS`
```typescript
export const INDUSTRY_STANDARD_THRESHOLDS: AlertThresholdConfig = {
  groundedness: { critical: 40, warning: 55 },
  relevance: { critical: 45, warning: 60 },
  contextPrecision: { critical: 35, warning: 50 },
  contextRecall: { critical: 40, warning: 55 },
  answerRelevancy: { critical: 50, warning: 65 },
  coherence: { critical: 45, warning: 60 },
  faithfulness: { critical: 40, warning: 55 },
  successRate: { critical: 80, warning: 85 },
  latency: { critical: 2500, warning: 2000 },
  tokenEfficiency: { critical: 5500, warning: 5000 },
  errorRate: { critical: 15, warning: 10 },
};
```

---

## COMPLETE FLOW TABLE SUMMARY

| Step | Layer | File | Component/Function | Input | Output | Action |
|------|-------|------|-------------------|-------|--------|--------|
| 1 | UI | `app/settings/page.tsx` | Settings Page | App ID | AlertThresholdsTab | Route to alert tab |
| 2 | UI | `src/components/settings/alert-thresholds-tab.tsx` | useEffect Hook | appId param | HTTP GET request | Trigger data load |
| 3 | API | `backend/src/api/alertThresholdsRoutes.ts` | GET /app/:appId | applicationId | JSON response | Fetch from DB or return defaults |
| 4 | DB | MongoDB | `alertthresholds` collection | { applicationId } | Document or null | Query custom thresholds |
| 5 | API | `backend/src/api/alertThresholdsRoutes.ts` | Response handler | Custom or defaults | JSON data | Return to frontend |
| 6 | UI | `src/components/settings/alert-thresholds-tab.tsx` | useState | JSON data | State update | Load thresholds into state |
| 7 | UI | HTML/CSS | `<input type="range">` | Render logic | Sliders with values | Display pre-filled sliders |
| 8 | UI | `src/components/settings/alert-thresholds-tab.tsx` | updateThreshold() | User drag | State update | Update in-memory on each drag |
| 9 | UI | `src/components/settings/alert-thresholds-tab.tsx` | handleSave() | Button click | HTTP POST request | Send all thresholds to backend |
| 10 | API | `backend/src/api/alertThresholdsRoutes.ts` | POST /app/:appId | thresholdConfig + appId | MongoDB updateOne | Execute upsert operation |
| 11 | DB | MongoDB | `alertthresholds` collection | $set operation | Upsert result | Store/update document |
| 12 | API | `backend/src/api/alertThresholdsRoutes.ts` | Response handler | Upsert result | JSON success | Confirm save to frontend |
| 13 | UI | `src/components/settings/alert-thresholds-tab.tsx` | setSaveMessage | Success response | UI message | Display "Saved successfully" |

---

## KEY PATTERNS & BEST PRACTICES

### Pattern 1: Graceful Fallbacks
- Always have `INDUSTRY_STANDARD_THRESHOLDS` as fallback
- Frontend catches both network and JSON parsing errors
- Database query returns null instead of throwing
- No single point of failure blocks the UI

### Pattern 2: Optimistic vs Pessimistic
- **Optimistic**: Sliders update UI immediately on drag (no network call)
- **Pessimistic**: Save button makes network call to persist changes
- Separation ensures smooth UX while ensuring data consistency

### Pattern 3: Metadata Tracking
- `updatedAt`: Timestamp of last modification
- `isCustom`: Boolean flag to distinguish custom vs default
- `source`: String indicating 'custom' or 'industry_standard'
- Allows UI to show which thresholds are being used

### Pattern 4: Type Safety
- All TypeScript interfaces defined in `src/types/index.ts`
- `AlertThresholdConfig` interface ensures consistency
- Frontend and backend use same type definitions
- Prevents runtime errors from type mismatches

---

## Industry Standard Thresholds vs Custom Thresholds

### When Defaults Are Used (No appId or fetch fails)
1. First load before app selection → Show INDUSTRY_STANDARD_THRESHOLDS
2. Network error during fetch → Show INDUSTRY_STANDARD_THRESHOLDS
3. MongoDB has no custom doc → Backend returns INDUSTRY_STANDARD_THRESHOLDS
4. User clicks "Reset to Defaults" → Returns to INDUSTRY_STANDARD_THRESHOLDS

### When Custom Thresholds Are Used
1. Custom doc exists in MongoDB → Backend returns doc.thresholds
2. `isCustom: true` flag set on document
3. UI displays custom values instead of defaults
4. Next load retrieves same custom values (persistence)

---

## Button Actions & Their Effects

| Button | Function | API Call | Database Operation | Result |
|--------|----------|----------|-------------------|--------|
| Save Thresholds | `handleSave()` | POST /api/alert-thresholds/app/{appId} | `updateOne(..., { upsert: true })` | Document created or updated in MongoDB |
| Reset to Defaults | `handleReset()` | DELETE /api/alert-thresholds/app/{appId} | `deleteOne(...)`  | Document deleted, next load uses defaults |
| (Slider drag) | `updateThreshold()` | None (in-memory) | None | Only local state updated, not persisted |

---

## CSS & UI Component Breakdown

```
AlertThresholdsTab Component
├─ Card (blue-50 bg) - Info box about thresholds
├─ metricGroups loop
│  └─ Quality Metrics Group
│     └─ Metric loop (7 metrics)
│        └─ Card (p-4 bg-white)
│           ├─ h5 title
│           ├─ Critical Slider
│           │  ├─ label (text-red-600)
│           │  ├─ span value (font-semibold text-red-600)
│           │  └─ input[type=range] (bg-red-100 accent-red-600)
│           └─ Warning Slider
│              ├─ label (text-yellow-600)
│              ├─ span value (font-semibold text-yellow-600)
│              └─ input[type=range] (bg-yellow-100 accent-yellow-600)
└─ Button group
   ├─ Save button (bg-blue-600)
   └─ Reset button (variant=outline)
```

---

## Execution Timeline Example

```
User selects App "ChatBot-2"
↓ [0ms] ComponentMount - appId="chatbot-2" passed as prop
↓ [1ms] useEffect triggered by appId change
↓ [5ms] fetch('GET /api/alert-thresholds/app/chatbot-2')
↓ [50ms] Backend receives request
↓ [55ms] MongoDB finds doc { applicationId: "chatbot-2", thresholds: {...} }
↓ [60ms] Backend returns JSON { success: true, data: {...} }
↓ [80ms] Frontend receives response
↓ [81ms] setThresholds(data.data) updates state
↓ [85ms] Component re-renders with loaded threshold values
↓ [100ms] Sliders display with values like "Critical: 45, Warning: 60"

User drags "Groundedness" critical slider to 50
↓ [200ms] onChange fires
↓ [201ms] updateThreshold('groundedness', 'critical', 50) called
↓ [202ms] State updated in memory: groundedness.critical = 50
↓ [205ms] Component re-renders, slider shows new position
[NO NETWORK CALL YET - just in-memory state]

User clicks "Save Thresholds" button
↓ [300ms] handleSave() called
↓ [302ms] fetch('POST /api/alert-thresholds/app/chatbot-2', 
          { body: JSON.stringify(thresholds) })
↓ [400ms] Backend receives POST with all updated thresholds
↓ [405ms] MongoDB updateOne() with upsert: true
↓ [410ms] Document updated with new thresholds
↓ [415ms] Backend responds { success: true }
↓ [450ms] Frontend receives response
↓ [451ms] setSaveMessage({ type: 'success', text: '...' })
↓ [500ms] Green success message appears
↓ [3500ms] Auto-hide success message

User closes and reopens settings for same app
↓ [4000ms] useEffect triggered again with appId="chatbot-2"
↓ [4005ms] fetch('GET /api/alert-thresholds/app/chatbot-2')
↓ [4050ms] Backend fetches doc from MongoDB
↓ [4055ms] MongoDB returns doc with groundedness.critical = 50 (persisted!)
↓ [4080ms] Frontend receives and displays the saved custom value
✓ PERSISTENCE VERIFIED - Custom thresholds retained across sessions
```

