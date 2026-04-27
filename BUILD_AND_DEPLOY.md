# Complete Build and Deployment Guide

## Pre-Build Verification

### 1. Type Safety Check
```bash
# Frontend - Verify strict TypeScript compilation
cd /vercel/share/v0-project
npx tsc --strict --noEmit

# Backend - Verify strict TypeScript compilation
cd backend
npx tsc --strict --noEmit
```

✅ **Expected**: No TypeScript errors

### 2. Dependency Check
```bash
# Frontend dependencies
npm list

# Backend dependencies  
cd backend
npm list
```

✅ **Expected**: All dependencies resolved without conflicts

## Build Process

### Frontend Build
```bash
cd /vercel/share/v0-project

# Install dependencies (if needed)
pnpm install

# Build with Next.js
pnpm build

# Expected output:
# ✓ Compiled successfully
# ✓ Linting and checking validity of types
# ✓ Collecting page data
# ✓ Generating static pages
```

### Backend Build
```bash
cd /vercel/share/v0-project/backend

# Install dependencies (if needed)
pnpm install

# Compile TypeScript
pnpm build

# Expected output:
# ✓ Successfully compiled to dist/
```

## Post-Build Validation

### 1. Generated Artifacts
```bash
# Frontend
✅ .next/ directory created
✅ .next/static/ with optimized JS bundles
✅ public/ assets accessible

# Backend
✅ dist/ directory created with compiled JS
✅ dist/src/ contains all services and routes
✅ Source maps present for debugging
```

### 2. Type Definitions
```bash
# Backend declarations generated
ls -la backend/dist/
# Should show: *.d.ts files alongside *.js files
```

### 3. Bundle Size Check
```bash
# Frontend bundle analysis
pnpm build
# Review output sizes - should be optimized

# Backend bundle
du -sh backend/dist/
# Should be < 50MB total
```

## Data Pipeline Validation

### 1. Test CSV Upload
```
1. Navigate to http://localhost:3000/apps
2. Create new application
3. Upload sample_data_app1.csv
4. Verify: File appears in applications collection
5. Verify: Raw data appears in rawdatarecords collection
```

### 2. Test Batch Processing
```
1. Click "Process Raw Data" button
2. Monitor backend logs for:
   - "Batch evaluation data:" logs
   - "[RAGAS] Evaluation complete:" with metric values
   - "[BLEU_ROUGE] Evaluation complete:" with BLEU/ROUGE scores
   - "[LLAMAINDEX] Evaluation complete:" with LLamaIndex scores
3. Verify: evaluationrecords collection populated with metrics
```

### 3. Test Metrics Display
```
1. Click "Refresh Metrics" button
2. Verify dashboard shows:
   - RAGAS metrics: groundedness, coherence, relevance, etc.
   - BLEU/ROUGE tab with bleuScore, rougeL values
   - LLamaIndex tab with llamaCorrectness, llamaRelevancy values
3. Verify: All metrics have numeric values (not 0.0)
```

### 4. Test Alert Generation
```
1. Check "Active Alerts" section
2. Verify: Alerts generated based on metric thresholds
3. Verify: Alert messages reference correct metrics and values
```

## Production Deployment Checklist

### Environment Setup
- [ ] Database connection string verified
- [ ] MongoDB collections exist (applications, rawdata, evaluationrecords, alerts)
- [ ] API endpoints responding correctly
- [ ] WebSocket connection working
- [ ] Environment variables loaded

### Security
- [ ] CORS properly configured
- [ ] API rate limiting enabled
- [ ] Error messages don't expose sensitive data
- [ ] Database credentials not in source code
- [ ] SSL/TLS enabled for production

### Monitoring
- [ ] Logging configured and working
- [ ] Backend console logs accessible
- [ ] Error tracking enabled
- [ ] Performance metrics being collected
- [ ] Database query performance acceptable

### Data Validation
- [ ] CSV parsing handles edge cases
- [ ] Large files processed without timeout
- [ ] Special characters in queries handled correctly
- [ ] Concurrent batch processing works
- [ ] Metric aggregation accurate

## Rollback Procedure

If issues occur after deployment:

```bash
# 1. Stop the application
# 2. Revert to previous build
git checkout previous-commit
# 3. Rebuild
pnpm build
# 4. Restart services
# 5. Verify with validation tests above
```

## Success Criteria

✅ **Build succeeds** without TypeScript errors
✅ **Strict mode compliance** verified with npx tsc --strict
✅ **All 13 metrics** display correctly on dashboard
✅ **Framework tabs** are interactive and show correct metrics
✅ **Data pipeline** complete from CSV to metrics display
✅ **Type safety** enforced throughout application
✅ **No console errors** in browser or backend logs
✅ **Performance acceptable** for batch processing

## Metrics Verification

After deployment, verify all 13 metrics appear:

### RAGAS Metrics (7)
- [ ] groundedness: 20-40 expected
- [ ] coherence: 20-40 expected
- [ ] relevance: 30-50 expected
- [ ] faithfulness: 20-40 expected
- [ ] answerRelevancy: 0-100 varies
- [ ] contextPrecision: 30-80 expected
- [ ] contextRecall: 25-50 expected

### BLEU/ROUGE Metrics (2)
- [ ] bleuScore: 5-30 expected
- [ ] rougeL: 15-50 expected

### LLamaIndex Metrics (3)
- [ ] llamaCorrectness: 10-30 expected
- [ ] llamaRelevancy: 0-100 varies
- [ ] llamaFaithfulness: 10-30 expected

### Overall Score (1)
- [ ] overallScore: 20-50 expected (average of RAGAS metrics)

If any metric shows 0.0 consistently, refer to backend logs to diagnose calculation issues.
