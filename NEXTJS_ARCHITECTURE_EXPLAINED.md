# Next.js Architecture & Proxy Explained

## Table of Contents
1. [Overall Architecture](#overall-architecture)
2. [What is a Proxy](#what-is-a-proxy)
3. [Next.js App Router](#nextjs-app-router)
4. [API Calls Flow](#api-calls-flow)
5. [How Components, Hooks, and APIs Work Together](#how-components-hooks-and-apis-work-together)
6. [Complete Flow: UI → Backend → Database](#complete-flow)
7. [Your Project Architecture](#your-project-architecture)

---

## Overall Architecture

Your application has a **multi-layered architecture**:

```
┌─────────────────────────────────────────────────────────────┐
│                    BROWSER (Client-Side)                     │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  React Components (UI)                               │   │
│  │  - alert-thresholds-tab.tsx                          │   │
│  │  - Displays sliders, buttons, forms                  │   │
│  └──────────────────────────────────────────────────────┘   │
│           ↓ (useState, useEffect, onClick)                   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Custom Hooks (State Management)                     │   │
│  │  - useAlerts() - manages threshold state             │   │
│  │  - useCallback() - memoized functions                │   │
│  └──────────────────────────────────────────────────────┘   │
│           ↓ (fetch() API calls)                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Next.js (Runtime Environment)                       │   │
│  │  - Serves React components                           │   │
│  │  - Handles client-side routing                       │   │
│  └──────────────────────────────────────────────────────┘   │
│           ↓ (HTTP requests to /api/...)                      │
└─────────────────────────────────────────────────────────────┘
                         ↓ (Network)
┌─────────────────────────────────────────────────────────────┐
│              NEXT.JS SERVER (Edge/Middleman)                 │
│  - Proxy layer that intercepts requests to /api/*           │
│  - Forwards to backend Express server                       │
│  - Returns responses back to browser                        │
│  - Handles CORS, authentication, etc.                       │
└─────────────────────────────────────────────────────────────┘
                         ↓ (HTTP)
┌─────────────────────────────────────────────────────────────┐
│              BACKEND SERVER (Express.js)                      │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  API Routes (Express Routers)                        │   │
│  │  - GET /api/alert-thresholds/app/:appId             │   │
│  │  - POST /api/alert-thresholds/app/:appId            │   │
│  │  - DELETE /api/alert-thresholds/app/:appId          │   │
│  └──────────────────────────────────────────────────────┘   │
│           ↓ (Route handler logic)                            │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Services & Business Logic                           │   │
│  │  - Data validation                                   │   │
│  │  - Business rules enforcement                        │   │
│  │  - Error handling                                    │   │
│  └──────────────────────────────────────────────────────┘   │
│           ↓ (Mongoose queries)                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Database Driver (Mongoose/MongoDB)                  │   │
│  │  - Query building                                    │   │
│  │  - Connection pooling                                │   │
│  └──────────────────────────────────────────────────────┘   │
│           ↓ (MongoDB protocol)                               │
└─────────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│               MONGODB DATABASE                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Collections                                         │   │
│  │  - alertthresholds (stores custom configurations)    │   │
│  │  - alerts (stores alert events)                      │   │
│  │  - applications (stores app metadata)                │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## What is a Proxy?

### Definition
A **proxy** is an intermediary server that sits between the client (browser) and the backend server. It intercepts requests and forwards them.

### Why Use a Proxy?

1. **CORS Prevention**: Browsers block direct cross-origin requests for security. The proxy is same-origin, so no CORS issues.
2. **Environment Consistency**: Client code doesn't need to know the backend server address; all calls go to `/api/...`
3. **Security**: Backend server details are hidden from the browser
4. **Authentication**: The proxy can inject auth tokens, validate sessions, etc.
5. **Caching**: The proxy can cache responses
6. **Rate Limiting**: The proxy can enforce rate limits

### How It Works in Your Project

```javascript
// In Browser - alert-thresholds-tab.tsx
fetch('/api/alert-thresholds/app/app-123')
  ↓
// Next.js Server intercepts this
// It sees "start with /api" → proxy rule
// Forwards to → http://backend:5001/api/alert-thresholds/app/app-123
  ↓
// Express backend receives it
// Returns response
  ↓
// Next.js forwards response back to browser
```

### Without Proxy (Direct Call)

```javascript
// ❌ This would FAIL in production
fetch('http://backend-server.com:5001/api/alert-thresholds/app/app-123')
// Error: CORS policy: No 'Access-Control-Allow-Origin' header
// Error: Backend URL exposed to browser
// Error: Backend could be attacked directly
```

---

## Next.js App Router

### What is the App Router?

Next.js 15 uses the **App Router** (file-based routing in `app/` directory).

```
app/
├── layout.tsx           # Root layout (always rendered)
├── page.tsx             # Home page at /
├── settings/
│   ├── layout.tsx       # Settings layout
│   └── page.tsx         # Settings page at /settings
├── alerts/
│   ├── page.tsx         # Alerts page at /alerts
│   └── [id]/
│       └── page.tsx     # Dynamic alerts page at /alerts/:id
└── api/
    └── alert-thresholds/
        └── route.ts     # API route handler at /api/alert-thresholds
```

### File-Based Routing Rules

| File Path | URL Route | Type |
|-----------|-----------|------|
| `app/page.tsx` | `/` | Page |
| `app/settings/page.tsx` | `/settings` | Page |
| `app/alerts/[id]/page.tsx` | `/alerts/:id` | Dynamic Page |
| `app/api/alert-thresholds/route.ts` | `/api/alert-thresholds` | API Route |

### Your Project Structure

```
app/
├── alerts/page.tsx               # /alerts → Alerts list page
├── benchmarks/page.tsx            # /benchmarks → Benchmarks page
├── apps/
│   ├── page.tsx                  # /apps → Apps list
│   ├── new/page.tsx              # /apps/new → Create app
│   └── [id]/page.tsx             # /apps/:id → App detail
├── settings/page.tsx             # /settings → Settings page
│   └── (contains AlertThresholdsTab component)
├── dashboard/page.tsx            # /dashboard → Dashboard
└── explore/page.tsx              # /explore → Explore page
```

**NOTE**: Your project doesn't have `app/api/` routes because **the backend is separate**. The Next.js server proxies requests to the separate Express backend at `http://localhost:5001` (or production URL).

---

## API Calls Flow

### Step 1: Component Initiates Request

```typescript
// alert-thresholds-tab.tsx
const handleSave = async () => {
  const response = await fetch('/api/alert-thresholds/app/app-123', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(thresholds)
  });
  const data = await response.json();
}
```

### Step 2: Browser Makes HTTP Request

```
POST /api/alert-thresholds/app/app-123
Host: localhost:3000          (Next.js dev server)
Content-Type: application/json
Body: { /* thresholds */ }
```

### Step 3: Next.js Server Intercepts

Next.js sees the request starts with `/api/`.

**In production**, there's typically a reverse proxy (Nginx, Vercel, etc.) that:
1. Sees `/api/*` requests
2. Proxies them to the backend server
3. Returns the response to the browser

**In development**, the `next dev` server handles this routing automatically.

### Step 4: Backend Processes Request

Express router matches the route:

```typescript
// backend/src/api/alertThresholdsRoutes.ts
alertThresholdsRouter.post('/app/:appId', async (req: Request, res: Response) => {
  const { appId } = req.params;
  // Process and store in MongoDB
  res.json({ success: true, data: /* ... */ });
});
```

### Step 5: Response Returns to Browser

```json
HTTP/1.1 200 OK
Content-Type: application/json
Body: {
  "success": true,
  "data": { /* saved thresholds */ }
}
```

### Step 6: Component Updates UI

```typescript
const data = await response.json();
if (data.success) {
  setThresholds(data.data);  // Update state
  // UI re-renders with new values
}
```

---

## How Components, Hooks, and APIs Work Together

### 1. Components (UI Layer)

```typescript
// Components/settings/alert-thresholds-tab.tsx
export function AlertThresholdsTab({ applicationId, applicationName }) {
  const [thresholds, setThresholds] = useState(/* */);
  const [isLoading, setIsLoading] = useState(false);
  
  // This component:
  // - Renders UI (sliders, buttons)
  // - Manages local state
  // - Calls API methods
  // - Displays results
}
```

**Purpose**: 
- Display UI elements
- Capture user interactions (clicks, input changes)
- Show loading/error states
- Render data from state

### 2. Hooks (State Management & Logic)

```typescript
// hooks/useAlerts.ts
export function useAlerts() {
  const [thresholdCache, setThresholdCache] = useState({});
  
  const loadThresholds = useCallback(async (appId: string) => {
    // Fetch from backend
    const response = await fetch(`/api/alert-thresholds/app/${appId}`);
    const data = await response.json();
    return data.data;
  }, []);
  
  return { loadThresholds, /* ... */ };
}
```

**Purpose**:
- Manage reusable state logic
- Encapsulate API calls
- Provide memoized functions (useCallback)
- Share logic across components

### 3. API Calls (Network Layer)

```typescript
// In component or hook
const response = await fetch('/api/alert-thresholds/app/app-123', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(thresholds)
});
```

**Purpose**:
- Communicate with backend
- Send data to be saved
- Fetch data to display
- Handle network errors

---

## Complete Flow: UI → Backend → Database

### Example: Save Alert Thresholds

#### 1. User Action (UI)

```
User slides threshold slider from 80 to 75
↓
```

#### 2. Component State Update (React)

```typescript
// In handleThresholdChange
setThresholds(prev => ({
  ...prev,
  [metric]: { ...prev[metric], warning: 75 }
}));
```

This is **in-memory only** (no network yet).

#### 3. User Clicks Save Button

```typescript
const handleSave = async () => {
  // Send updated thresholds to backend
  const response = await fetch('/api/alert-thresholds/app/app-123', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(thresholds)
  });
}
```

#### 4. HTTP Request Sent

```
POST /api/alert-thresholds/app/app-123 HTTP/1.1
Host: localhost:3000
Content-Type: application/json
Body: {
  "accuracy": { "critical": 60, "warning": 80 },
  "precision": { "critical": 55, "warning": 75 },
  // ... all 11 metrics
}
```

#### 5. Next.js Server (Proxy)

```
Next.js Server receives request
↓
Identifies /api/* pattern
↓
Forwards to backend:
POST http://localhost:5001/api/alert-thresholds/app/app-123
```

#### 6. Express Backend Receives

```typescript
// alertThresholdsRoutes.ts
router.post('/app/:appId', async (req, res) => {
  const { appId } = req.params;  // "app-123"
  const thresholdConfig = req.body;  // The threshold object
  
  // Validate
  if (!thresholdConfig) {
    return res.status(400).json({ success: false, error: 'Invalid config' });
  }
```

#### 7. Database Query Execution

```typescript
  const db = mongoose.connection;
  const collection = db.collection('alertthresholds');
  
  // MongoDB upsert: update if exists, insert if not
  const result = await collection.updateOne(
    { applicationId: String(appId) },  // FILTER: find by appId
    {
      $set: {
        applicationId: String(appId),
        thresholds: thresholdConfig,    // SET: the new values
        isCustom: true,
        updatedAt: new Date()
      }
    },
    { upsert: true }  // UPSERT: insert if document doesn't exist
  );
```

**MongoDB Document Structure**:
```javascript
{
  _id: ObjectId("..."),
  applicationId: "app-123",
  thresholds: {
    accuracy: { critical: 60, warning: 80 },
    precision: { critical: 55, warning: 75 },
    // ...
  },
  isCustom: true,
  updatedAt: ISODate("2024-05-13T...")
}
```

#### 8. Response Returns to Browser

```json
HTTP/1.1 200 OK
Content-Type: application/json
Body: {
  "success": true,
  "data": { /* saved thresholds */ },
  "message": "Threshold configuration saved successfully",
  "upserted": false
}
```

#### 9. Component Updates UI

```typescript
const data = await response.json();
if (data.success) {
  setThresholds(data.data);  // Update local state
  setSaveMessage({ 
    type: 'success', 
    text: 'Thresholds saved!' 
  });
  setTimeout(() => setSaveMessage(null), 3000);  // Clear after 3s
}
```

#### 10. UI Re-renders

React detects state change → Component re-renders → User sees:
- Success message
- Sliders reflect saved values
- "Last saved: 3 seconds ago"

---

## Your Project Architecture

### Directory Structure

```
your-project/
├── app/                          # Next.js App Router (UI pages)
│   ├── layout.tsx               # Root layout
│   ├── settings/page.tsx        # Settings page → Renders AlertThresholdsTab
│   ├── alerts/page.tsx
│   ├── dashboard/page.tsx
│   └── ...
│
├── src/
│   ├── components/
│   │   └── settings/
│   │       └── alert-thresholds-tab.tsx    # UI component
│   │
│   ├── hooks/
│   │   └── useAlerts.ts                    # Custom hook
│   │
│   ├── types/index.ts                      # TypeScript interfaces
│   │   └── AlertThresholdConfig
│   │   └── MetricThreshold
│   │
│   └── utils/
│       └── sla-benchmarks.ts               # INDUSTRY_STANDARD_THRESHOLDS
│
├── backend/                      # Separate Express.js server (port 5001)
│   ├── src/
│   │   ├── api/
│   │   │   └── alertThresholdsRoutes.ts    # Route handlers
│   │   │
│   │   ├── services/
│   │   │   └── database.ts                 # DB connection
│   │   │
│   │   └── index.ts                        # Express server setup
│   │
│   └── package.json
│
├── next.config.mjs               # Next.js configuration
├── package.json                  # Frontend dependencies
└── vercel.json                   # Vercel deployment config
```

### How They Connect

```
1. USER INTERACTION
   ↓
2. REACT COMPONENT (alert-thresholds-tab.tsx)
   Renders sliders, handles clicks
   ↓
3. CUSTOM HOOK (useAlerts.ts)
   Makes fetch() calls to /api/alert-thresholds
   ↓
4. NEXT.JS SERVER (localhost:3000)
   Intercepts /api/* requests
   Routes to backend
   ↓
5. EXPRESS BACKEND (localhost:5001)
   Validates data
   Routes to alertThresholdsRoutes.ts handler
   ↓
6. MONGODB DATABASE
   Executes upsert/insert/query operations
   ↓
7. RESPONSE CHAIN
   Express → Next.js → Browser → React Component
   ↓
8. STATE UPDATE & RE-RENDER
   Component shows success/updated values
```

---

## Key Concepts Simplified

### fetch() - Making HTTP Requests

```typescript
// Syntax:
fetch(url, { method, headers, body })
  .then(response => response.json())
  .then(data => console.log(data))
  .catch(error => console.error(error));

// Your usage:
const response = await fetch('/api/alert-thresholds/app/app-123', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(thresholds)
});

const data = await response.json();
if (data.success) {
  // Handle success
} else {
  // Handle error
}
```

### useState - React State

```typescript
// Stores data that can change and trigger re-renders
const [thresholds, setThresholds] = useState(initialValue);

// Update state
setThresholds(newValue);  // This triggers re-render

// State update inside loop/condition
setThresholds(prev => ({
  ...prev,
  [key]: newValue
}));
```

### useCallback - Memoized Functions

```typescript
// Prevents function recreation on every render
const loadThresholds = useCallback(async (appId) => {
  const response = await fetch(`/api/alert-thresholds/app/${appId}`);
  return response.json();
}, []);  // Dependencies array - recreate if these change

// Use: pass to other components without recreating
<Child onLoad={loadThresholds} />
```

### useEffect - Side Effects

```typescript
// Run code when component mounts or dependencies change
useEffect(() => {
  // This runs when appId changes
  if (appId) {
    loadThresholds(appId);
  }
}, [appId]);  // Re-run when appId changes
```

---

## Upsert vs Insert vs Update

### MongoDB Operations in Your Code

```typescript
// UPSERT (Create if not exists, Update if exists)
await collection.updateOne(
  { applicationId: "app-123" },      // FIND criteria
  { $set: { thresholds: {...} } },   // UPDATE data
  { upsert: true }                    // CREATE if not found
);

// Result:
// - If document with applicationId "app-123" exists → Update it
// - If document doesn't exist → Insert new document
```

### Regular Update (without upsert)

```typescript
await collection.updateOne(
  { applicationId: "app-123" },
  { $set: { thresholds: {...} } }
  // No upsert
);

// Result:
// - If document exists → Update it
// - If not exists → NOTHING (document not created)
```

### Insert

```typescript
await collection.insertOne({
  applicationId: "app-123",
  thresholds: {...}
});

// Result:
// - Always inserts new document
// - Error if document with same _id already exists
```

---

## Summary

Your application architecture works like this:

1. **UI Layer** (React Components) - What users see and interact with
2. **State Management** (Custom Hooks) - Manages data and logic
3. **Network Layer** (fetch API) - Sends/receives data
4. **Proxy Layer** (Next.js Server) - Routes API calls securely
5. **Backend** (Express Routes) - Processes requests, validates data
6. **Database** (MongoDB) - Persists data

The **proxy** is the key that makes everything work smoothly without CORS issues or exposing your backend address.

When you make a call to `/api/alert-thresholds/app/app-123`, Next.js intercepts it and forwards it to your Express backend at `http://localhost:5001/api/alert-thresholds/app/app-123`, making it seamless from the frontend perspective.
