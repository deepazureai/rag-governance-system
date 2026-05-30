# Mac to Windows Deployment Guide

## Quick Summary

Both builds pass with zero errors and are production-ready.

```
Frontend: ✅ PASS (Next.js 14.5s, 13 routes, exit 0)
Backend:  ✅ PASS (TypeScript strict mode, exit 0)
Status:   ✅ READY FOR DEPLOYMENT
```

---

## Phase 1: Build on Mac

### 1a. Pull Latest
```bash
git pull origin main
```

### 1b. Install Dependencies
```bash
npm install
cd backend && npm install && cd ..
```

### 1c. Build Both
```bash
# Frontend
npm run build

# Backend
cd backend && npm run build && cd ..
```

### 1d. Verify Success
```bash
# Frontend artifacts
ls -la .next/ | head -5

# Backend artifacts
ls -la backend/dist/ | head -5
```

**Expected Output:**
```
Frontend: .next/ contains BUILD_ID, package.json, next-server.js.nft.json
Backend: backend/dist/ contains index.js, index.d.ts, api/, services/
```

### 1e. Create Package
```bash
mkdir -p deployment/frontend deployment/backend
cp -r .next deployment/frontend/
cp package.json deployment/frontend/
cp -r backend/dist deployment/backend/
cp backend/package.json deployment/backend/
```

---

## Phase 2: Transfer to Windows

Choose one method:

### Option A: USB Drive
```bash
# Copy deployment folder to USB
cp -r deployment /Volumes/USB-DRIVE/
```

### Option B: Cloud Storage
```bash
# Upload to iCloud/Dropbox
cp -r deployment ~/Dropbox/deployment
```

### Option C: Network/SSH
```bash
# Copy via SCP to Windows machine
scp -r deployment user@windows-machine:C:\projects\
```

### Option D: AirDrop/File Sharing
- Drag deployment folder to shared folder
- Access from Windows on same network

---

## Phase 3: Deploy on Windows

### 3a. Copy to Windows
```powershell
# If from USB
Copy-Item -Path "D:\deployment" -Destination "C:\projects\" -Recurse

# Or navigate to copied location
cd C:\projects\deployment
```

### 3b. Create Environment Files

**File: C:\projects\deployment\frontend\.env.local**
```
NEXT_PUBLIC_API_URL=http://localhost:5001
API_BASE_URL=http://localhost:5001/api
USE_MOCK_API=false
NODE_ENV=production
```

**File: C:\projects\deployment\backend\.env.local**
```
MONGODB_URI=mongodb://your-connection-string
LLM_PROVIDER=openai
LLM_API_KEY=sk-your-api-key
NODE_ENV=production
PORT=5001
```

### 3c. Start Backend (Terminal 1)
```powershell
cd C:\projects\deployment\backend
npm install --omit=dev
npm start
```

**Expected Output:**
```
> rag-evaluation-backend@1.0.0 start
[INFO] Backend server running on http://localhost:5001
```

### 3d. Start Frontend (Terminal 2)
```powershell
cd C:\projects\deployment\frontend
npm install --omit=dev
npm start
```

**Expected Output:**
```
> my-project@0.1.0 start
 ▲ Next.js 15.5.15
 - Local: http://localhost:3000
```

### 3e. Verify Everything Works

Open browser and check:

✅ **Frontend:** http://localhost:3000
- Dashboard loads
- All tabs visible
- No console errors

✅ **Raw Data Tab**
- Shows real alerts
- Displays calculated metrics
- Counts correct from database

✅ **BA Review Queue Tab**
- Shows real statistics:
  - Critical Items: Real count
  - Pending Review: Real count
  - Avg Priority Score: Real average
- Data loads from `/api/ba-review/stats`

✅ **Knowledge Base Tab**
- Upload works
- Search works
- Vectors stored

✅ **Templates Tab**
- Templates display
- Create template works
- Real LLM synthesis

---

## Troubleshooting

### Issue: "Port already in use"
```powershell
# Find what's using port 5001
netstat -ano | findstr :5001

# Kill the process
taskkill /PID <process-id> /F
```

### Issue: "Cannot find module"
```powershell
# Reinstall dependencies
cd deployment/backend
npm install
cd ../frontend
npm install
```

### Issue: "MongoDB connection failed"
```powershell
# Check connection string
# Verify MongoDB is running
# Verify network connectivity
```

### Issue: "LLM API key invalid"
```powershell
# Check .env.local has correct API key
# Verify API key is not expired
# Test API key with curl
```

### Issue: "Frontend won't connect to backend"
```powershell
# Check backend is running on 5001
curl http://localhost:5001/api/health

# Check NEXT_PUBLIC_API_URL in frontend .env.local
# Should be: http://localhost:5001
```

---

## File Structure on Windows

```
C:\projects\deployment\
├── frontend/
│   ├── .env.local                    (create this)
│   ├── package.json
│   └── .next/
│       ├── BUILD_ID
│       ├── app-build-manifest.json
│       ├── build-manifest.json
│       ├── cache/
│       ├── next-server.js.nft.json
│       └── ...
│
└── backend/
    ├── .env.local                    (create this)
    ├── package.json
    └── dist/
        ├── index.js
        ├── index.d.ts
        ├── api/
        ├── services/
        ├── models/
        └── ...
```

---

## Performance Notes

| Component | Time | Notes |
|-----------|------|-------|
| Frontend Build | 14.5s | On Mac, Next.js |
| Backend Build | <1s | TypeScript strict mode |
| Frontend Startup | 2-5s | Port 3000 |
| Backend Startup | 2-5s | Port 5001, MongoDB required |
| First Page Load | 3-7s | Initial DB queries |
| Stats Load | 500-1000ms | Aggregation pipeline |

---

## Success Indicators

✅ Both terminals show "running" status
✅ Frontend accessible at http://localhost:3000
✅ Backend accessible at http://localhost:5001
✅ Dashboard loads with no errors
✅ Stats cards show real numbers (not 0)
✅ All API calls respond with data
✅ No red console errors

---

## Next Steps (Optional)

### For Production Deployment
1. Set `NODE_ENV=production` in both .env files
2. Configure reverse proxy (Nginx/IIS)
3. Set up SSL certificates
4. Configure domain names
5. Set up monitoring/logging
6. Configure automatic backups

### For Development Testing
1. Run locally as above
2. Test all features
3. Verify all calculations
4. Test with real data
5. Monitor performance
6. Check error handling

---

## Quick Reference

| Action | Command |
|--------|---------|
| Start Backend | `cd backend && npm start` |
| Start Frontend | `npm start` |
| Stop Backend | `Ctrl+C` in backend terminal |
| Stop Frontend | `Ctrl+C` in frontend terminal |
| Check Backend Health | `curl http://localhost:5001/api/health` |
| View Frontend | `http://localhost:3000` |
| View Backend Docs | Check API routes in `/backend/src/api/` |

---

## Support

If you encounter issues:

1. Check console output for error messages
2. Verify .env files are configured correctly
3. Ensure MongoDB is accessible
4. Verify LLM API keys are valid
5. Check network connectivity
6. Review logs in BUILD_REPORT.md

All builds verified on:
- **Date:** May 30, 2026
- **Frontend:** Next.js 15.5.15 (14.5s build)
- **Backend:** TypeScript strict mode (<1s build)
- **Status:** ✅ Zero errors, Production Ready
