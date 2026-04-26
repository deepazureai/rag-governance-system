# ⚠️ CRITICAL: Backend Server Not Running

## Problem

The raw data upload is failing because **the backend API server is not running**. All API calls to `http://localhost:5001/api/*` are failing silently because there's nothing listening on port 5001.

## Evidence

From the debug logs, you can see:
- ✅ Frontend dev server is running on port 3000
- ✅ Frontend is making API calls to `http://localhost:5001/api/applications`
- ❌ NO backend logs appear in the console
- ❌ Backend server on port 5001 is NOT listening

When batch process is triggered:
```
[v0] Triggering batch process for: app_1777231487619_b14sc56d2
[API] Batch process triggered: Object
```

But there are NO backend logs showing:
```
[API] POST /api/applications/:id/batch-process
[API] Starting batch processing for: ...
```

This proves the backend is not running.

## Solution

The project has TWO separate servers:

### 1. **Frontend** (Already Running ✅)
- Location: `/vercel/share/v0-project/`
- Port: 3000
- Server: Next.js
- Command: `npm run dev` or `pnpm dev`

### 2. **Backend** (NOT Running ❌)
- Location: `/vercel/share/v0-project/backend/`
- Port: 5001
- Server: Express.js with MongoDB
- Command: `npm run dev` or `pnpm dev`

## How to Start Both Servers

You need to run BOTH servers in parallel for the system to work:

### Option 1: Terminal Tabs (Recommended for Development)

**Terminal 1 - Frontend:**
```bash
cd /vercel/share/v0-project
npm run dev
# or
pnpm dev
```
Output: `✓ Ready in 1456ms` on port 3000

**Terminal 2 - Backend:**
```bash
cd /vercel/share/v0-project/backend
npm run dev
# or
pnpm dev
```
Output: `Express server running on port 5001` (or similar)

### Option 2: Run in Background (Alternative)

```bash
cd /vercel/share/v0-project/backend && npm run dev &
cd /vercel/share/v0-project && npm run dev
```

## Verification

Once both are running:

1. **Frontend accessible:** http://localhost:3000
2. **Backend accessible:** http://localhost:5001/api/applications (should return JSON)
3. **Test raw data count:**
   ```bash
   curl http://localhost:5001/api/applications/app_1777231487619_b14sc56d2/raw-data-count
   ```
   Should return JSON with rawDataCount

## What Happens After Both Servers Are Running

1. Navigate to Dashboard: http://localhost:3000/dashboard
2. Select RAG-3 application
3. Click "Trigger Batch Process" or run the upload script
4. Raw data will be inserted into MongoDB
5. Batch process will trigger
6. Metrics will be calculated and displayed

## Environment Configuration

Make sure the backend has access to:
- **MongoDB:** Connection string in `.env` or `.env.backend`
- **Port 5001:** Not blocked by firewall/system
- **CORS:** Already configured to allow requests from http://localhost:3000

## Troubleshooting

If backend doesn't start:

1. Check dependencies: `cd backend && npm install` or `pnpm install`
2. Check MongoDB connection: Ensure `.env` or `.env.backend` has valid `MONGODB_URI`
3. Check port conflicts: `lsof -i :5001` to see if port 5001 is already in use
4. Check logs: Run `npm run dev` in backend folder to see detailed errors

## Summary

**The raw data upload fails because the backend isn't running.** Start the backend server on port 5001, and all the functionality will work correctly. Both the frontend and backend need to be running simultaneously for the system to function.
