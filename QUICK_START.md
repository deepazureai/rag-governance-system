# Quick Start - 5 Minutes

## Download & Install

```bash
# 1. Download from v0.app and extract

# 2. Install dependencies
cd rag-evaluation-platform
pnpm install
cd backend
pnpm install
cd ..
```

## Configure

```bash
# 3. Create backend/.env
DATABASE_URL=mongodb://localhost:27017/rag-evaluation
PORT=5001

# 4. Create .env.local in root
NEXT_PUBLIC_API_URL=http://localhost:5001
```

## Run

```bash
# Terminal 1: Backend
cd backend
pnpm dev

# Terminal 2: Frontend (from root)
pnpm dev

# Open http://localhost:3000
```

## Verify

```bash
# Test 1: Create Application
- Fill in name, select CSV file
- Click "Create Application"
- Check MongoDB: `db.applicationmasters.find()`

# Test 2: View App
- Go to Dashboard
- Click application
- Click Settings → Configure SLA
- Change a threshold → Save

# Test 3: Check Color Coding
- Go to app → Evaluation Logs
- Verify records colored by new SLA thresholds

# Test 4: Verify Auto-Creation
- Check MongoDB:
  db.applicationslas.findOne({ applicationId: "your-app-id" })
- Should show industry benchmarks
```

## Troubleshoot

| Issue | Solution |
|-------|----------|
| Backend won't start | `pnpm install` in backend folder |
| MongoDB connection fails | Check DATABASE_URL in backend/.env |
| Frontend can't find API | Verify NEXT_PUBLIC_API_URL in .env.local |
| Collections empty | Run full create application flow |
| Color coding wrong | Check app-specific SLA in Settings |

## Files Checklist

### Backend (7 files)
- [ ] backend/src/utils/sla-benchmarks.ts
- [ ] backend/src/api/slaConfigRoutes.ts
- [ ] backend/src/models/database.ts (updated)
- [ ] backend/src/api/applicationsRoutes.ts (updated)
- [ ] backend/src/index.ts (updated)

### Frontend (8 files)
- [ ] src/utils/sla-comparison.ts
- [ ] src/hooks/useApplicationSLA.ts
- [ ] src/hooks/useApplicationMetrics.ts
- [ ] src/types/application.ts
- [ ] src/components/dashboard/sla-settings-tab.tsx
- [ ] src/components/dashboard/evaluation-logs-viewer.tsx (updated)
- [ ] app/apps/[id]/settings/page.tsx
- [ ] app/apps/[id]/page.tsx (updated)

## Key URLs After Running

- Application: http://localhost:3000
- API: http://localhost:5001
- Create App: http://localhost:3000
- Dashboard: http://localhost:3000/dashboard
- App Catalog: http://localhost:3000/apps
- App Detail: http://localhost:3000/apps/[appId]
- App Settings: http://localhost:3000/apps/[appId]/settings

## Commands Reference

```bash
# Check if backend running
curl http://localhost:5001/health

# Check if MongoDB has data
mongosh
> use rag-evaluation
> db.applicationmasters.find()
> db.applicationslas.find()
> db.evaluationrecords.countDocuments()

# View backend logs
# Terminal showing backend should display all operations

# View frontend logs
# Open browser DevTools (F12) → Console tab
```

That's it! You're ready to go.
