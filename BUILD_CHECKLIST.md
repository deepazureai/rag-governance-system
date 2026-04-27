# Build and Deployment Checklist

## Pre-Build Verification ✅

### Database State
- [ ] MongoDB is running and accessible on localhost:27017
- [ ] Existing test applications from previous runs have been deleted (optional but recommended for clean testing)
- [ ] No connection string issues in environment variables

### TypeScript Compilation

**Frontend:**
```bash
cd /vercel/share/v0-project
npx tsc --noEmit
```
Expected: No errors
- [ ] All imports resolve correctly
- [ ] All types are properly defined
- [ ] Component props match interfaces

**Backend:**
```bash
cd /vercel/share/v0-project/backend
npx tsc --noEmit
```
Expected: No errors
- [ ] Service interfaces match implementations
- [ ] All MongoDB operations are typed
- [ ] No implicit any types

### Critical Files Status

**Backend Files:**
- [x] MultiFrameworkEvaluator.ts - All 13 metrics calculated
- [x] BatchProcessingService.ts - Metrics stored at top-level AND nested
- [x] ApplicationMetricsService.ts - Retrieves from both locations
- [x] metricsRoutes.ts - Duplicate endpoint removed
- [x] No syntax errors or missing closing braces

**Frontend Files:**
- [x] useMetricsFetch.ts - MetricsData includes all 13 metrics
- [x] metrics-display.tsx - Framework tabs are interactive
- [x] All metric interfaces aligned with backend

## Build Process

### Step 1: Clean Install (Recommended)
```bash
# Frontend
cd /vercel/share/v0-project
rm -rf node_modules pnpm-lock.yaml
pnpm install

# Backend
cd backend
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

### Step 2: Build Frontend
```bash
cd /vercel/share/v0-project
pnpm build
```
Expected Output:
- ✅ No TypeScript errors
- ✅ All pages compiled
- ✅ Build completes in <60s

### Step 3: Build Backend
```bash
cd /vercel/share/v0-project/backend
pnpm build
```
Expected Output:
- ✅ No TypeScript errors
- ✅ dist/ folder created
- ✅ All services compiled

### Step 4: Start Services

**Terminal 1 - Backend:**
```bash
cd /vercel/share/v0-project/backend
pnpm dev
```
Expected Logs:
```
[App] INFO: Backend server listening on port 5001
[Database] In-memory database initialized
```

**Terminal 2 - Frontend:**
```bash
cd /vercel/share/v0-project
pnpm dev
```
Expected Logs:
```
- ready on 0.0.0.0:3000
- event compiled client and server successfully
```

## Post-Build Testing

### Test 1: Application Creation
1. Open http://localhost:3000/dashboard
2. Click "Create New Application"
3. Fill in details and upload sample_data_app1.csv
4. Click "Validate File" → should pass
5. Click "Create Application"
6. Check backend logs for: `[API] Application created successfully`

### Test 2: Raw Data Verification
1. Application should appear in dashboard
2. Click "Raw Data" tab
3. Should see 30 records from CSV file
4. Check each record has: userId, sessionId, userPrompt, context, llmResponse

### Test 3: Batch Processing
1. Click "Process Raw Data" button
2. Wait 30-60 seconds for processing
3. Check backend logs for:
   ```
   [BatchProcessingService] Phase 1: Reading raw data
   [BatchProcessingService] Phase 2: Evaluating records
   [calculateFaithfulness] Calculation complete
   [calculateBLEU] Calculation complete
   [RAGAS] Evaluation complete
   [BLEU_ROUGE] Evaluation complete
   [LLAMAINDEX] Evaluation complete
   ```

### Test 4: Metrics Display
1. Click "Refresh Metrics" button
2. Should see all 7 RAGAS metrics (NOT zeros):
   - Groundedness: 20-35
   - Coherence: 20-30
   - Relevance: 30-45
   - Faithfulness: 20-35
   - Answer Relevancy: 0-75
   - Context Precision: 30-75
   - Context Recall: 25-35

### Test 5: Framework Tabs
1. Click "BLEU/ROUGE" tab
   - Should show: BLEU Score, ROUGE-L with values
2. Click "Llamaindex" tab
   - Should show: Correctness, Relevancy, Faithfulness with values
3. Click back to "Ragas" tab
   - Should show original 7 metrics

### Test 6: Multi-Application Aggregation
1. Create second application with sample_data_app2.csv
2. Process raw data for second app
3. Refresh metrics for both apps
4. Metrics should show aggregated averages
5. "X critical alerts active" should appear (based on thresholds)

### Test 7: Database Verification
Check MongoDB directly:
```bash
# Check evaluationrecords have metrics at top-level
db.evaluationrecords.findOne().groundedness  # Should return number

# Check they also exist nested
db.evaluationrecords.findOne().evaluation.groundedness  # Should return same number

# Check framework metrics exist
db.evaluationrecords.findOne().bleuScore  # Should return number
db.evaluationrecords.findOne().llamaCorrectness  # Should return number
```

## Success Criteria ✅

All of these must be true:
1. ✅ Frontend builds without TypeScript errors
2. ✅ Backend builds without TypeScript errors
3. ✅ Both services start and stay running
4. ✅ Sample CSV files upload without validation errors
5. ✅ Batch processing completes all 4 phases
6. ✅ Dashboard shows all 13 metrics (NOT zeros)
7. ✅ Framework tabs display correct metrics
8. ✅ Database has metrics at both top-level and nested locations
9. ✅ Alerts are generated based on metric thresholds
10. ✅ Multi-app aggregation works correctly

## Troubleshooting

### Issue: "Cannot find module" errors
**Solution:** Run `pnpm install` in the failing service directory

### Issue: Port 5001 already in use
**Solution:** Kill existing process: `lsof -i :5001 && kill -9 <PID>`

### Issue: Metrics still showing 0.0
**Solution:** Check backend logs for calculation errors, ensure evaluationrecords are stored with metrics

### Issue: TypeScript compilation errors
**Solution:** Check the error message, likely missing interface or type definition

### Issue: "No evaluations found"
**Solution:** Verify batch processing completed successfully in logs

## Environment Variables

### Frontend (.env.local if needed)
```
NEXT_PUBLIC_API_URL=http://localhost:5001
```

### Backend (.env if needed)
```
PORT=5001
MONGODB_URI=mongodb://localhost:27017/ragdb
NODE_ENV=development
```

## Final Notes

- Keep both services running during testing
- Check console logs for "[v0]" prefix for debug information
- First batch process may take 30-60 seconds due to evaluation complexity
- Dashboard refreshes data on demand (not real-time polling)
- All metric calculations are deterministic (same input = same output)

**Status:** Ready for build and deployment ✅
