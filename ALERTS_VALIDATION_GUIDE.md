# ALERTS SYSTEM - VALIDATION AND TESTING GUIDE

## Quick Validation Checklist

Run this after implementation to verify everything is working:

### 1. Backend Setup Check
- [ ] MongoDB is running and accessible
- [ ] Database URL is correct in environment variables
- [ ] Backend can connect to MongoDB

```bash
# Check logs for this message:
[MongoDB] Connected successfully
[MongoDB] Alert thresholds collection and indexes created
[MongoDB] Generated alerts collection and indexes created
```

### 2. Create a Test Application

**Via API:**
```bash
curl -X POST http://localhost:5001/api/applications/create \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test RAG App",
    "description": "For testing alerts",
    "owner": "test-user",
    "framework": "ragas",
    "dataSource": {
      "type": "local_folder",
      "config": {}
    }
  }'
```

Expected response:
```json
{
  "success": true,
  "applicationId": "app_1234567890_abc123",
  "message": "Application created successfully"
}
```

### 3. Verify Application Thresholds Were Created

**Check MongoDB:**
```javascript
use rag-evaluation;
db.alertthresholds.findOne({ applicationId: "app_1234567890_abc123" });
```

Expected output:
```javascript
{
  _id: ObjectId("..."),
  applicationId: "app_1234567890_abc123",
  thresholds: {
    groundedness: 60,
    coherence: 60,
    relevance: 60,
    // ... other thresholds
  },
  isCustom: false,
  createdAt: ISODate("2026-05-01T..."),
  updatedAt: ISODate("2026-05-01T...")
}
```

### 4. Get Current Thresholds via API

```bash
curl http://localhost:5001/api/alert-thresholds/app/app_1234567890_abc123
```

Expected response:
```json
{
  "success": true,
  "applicationId": "app_1234567890_abc123",
  "thresholds": {
    "groundedness": 60,
    "coherence": 60,
    // ... all thresholds
  },
  "isCustom": false,
  "source": "industry_standard"
}
```

### 5. Update Thresholds

```bash
curl -X POST http://localhost:5001/api/alert-thresholds/app/app_1234567890_abc123 \
  -H "Content-Type: application/json" \
  -d '{
    "groundedness": 75,
    "coherence": 75,
    "relevance": 75,
    "faithfulness": 75,
    "answerRelevancy": 75,
    "contextPrecision": 80,
    "contextRecall": 80,
    "overallScore": 75,
    "latencyP50Ms": 400,
    "latencyP95Ms": 800,
    "latencyP99Ms": 1500,
    "errorRatePercent": 3,
    "timeoutRatePercent": 1
  }'
```

Expected response:
```json
{
  "success": true,
  "message": "Threshold configuration saved successfully",
  "applicationId": "app_1234567890_abc123",
  "thresholds": { ... },
  "updatedAt": "2026-05-01T..."
}
```

### 6. Verify Update in MongoDB

```javascript
db.alertthresholds.findOne({ applicationId: "app_1234567890_abc123" }).thresholds.groundedness
// Should return: 75
```

### 7. Trigger Data Ingestion to Generate Alerts

Upload a CSV file with evaluation data:

```bash
curl -X POST http://localhost:5001/api/data/ingest \
  -H "Content-Type: multipart/form-data" \
  -F "file=@data.csv" \
  -F "applicationId=app_1234567890_abc123"
```

Expected: Alerts should be generated in `generatedalerts` collection

### 8. Verify Alerts Were Created

**Check MongoDB:**
```javascript
db.generatedalerts.find({ applicationId: "app_1234567890_abc123" }).limit(5);
```

Expected output:
```javascript
{
  _id: ObjectId("..."),
  applicationId: "app_1234567890_abc123",
  recordId: "record_xxx",
  metric: "groundedness",
  currentValue: 45,
  threshold: 75,
  severity: "critical",
  alertType: "evaluation_metrics",
  status: "open",
  dataSourceType: "ingestion",
  createdAt: ISODate("2026-05-01T..."),
  updatedAt: ISODate("2026-05-01T...")
}
```

### 9. Get Alerts via API

```bash
curl "http://localhost:5001/api/alerts/applications/app_1234567890_abc123?page=1&limit=10"
```

Expected response:
```json
{
  "success": true,
  "alerts": [
    {
      "_id": "...",
      "applicationId": "app_1234567890_abc123",
      "metric": "groundedness",
      "currentValue": 45,
      "threshold": 75,
      "severity": "critical",
      // ... other fields
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 47,
    "pages": 5
  }
}
```

### 10. Get Alerts Summary

```bash
curl "http://localhost:5001/api/alerts/summary/app_1234567890_abc123"
```

Expected response:
```json
{
  "summary": {
    "open": 15,
    "acknowledged": 8,
    "dismissed": 24,
    "total": 47
  },
  "success": true
}
```

### 11. Acknowledge Alerts

```bash
curl -X POST http://localhost:5001/api/alerts/bulk-action \
  -H "Content-Type: application/json" \
  -d '{
    "action": "acknowledge",
    "alertIds": ["alert_id_1", "alert_id_2"],
    "comment": "Investigating...",
    "userId": "test-user"
  }'
```

Expected response:
```json
{
  "success": true,
  "message": "2 alerts acknowledged",
  "modifiedCount": 2
}
```

### 12. Verify in MongoDB

```javascript
db.generatedalerts.findOne({ 
  _id: ObjectId("alert_id_1")
}).status
// Should return: "acknowledged"
```

---

## End-to-End Test Scenario

### Scenario: Test Threshold Enforcement

1. **Create app** → app_test_123
2. **Set custom thresholds** → groundedness: 80
3. **Create evaluation data** with groundedness: 50
4. **Ingest data** → alerts should be generated
5. **Verify alert**:
   - Severity: critical (50 is 37.5% below 80)
   - Metric: groundedness
   - Status: open
6. **Acknowledge alert** → status: acknowledged
7. **Get summary** → acknowledged count increases

### Expected Outcomes

✅ Threshold customization works
✅ Alerts compare against custom thresholds (not industry defaults)
✅ Correct severity calculated
✅ Alert lifecycle (open → acknowledged → dismissed) works
✅ Summary counts accurate

---

## Frontend Testing

### Test in Settings → Alerts Tab

1. **Select application** → Loads thresholds
2. **Verify source** → Shows "custom" or "industry_standard"
3. **Modify a threshold** → Change groundedness from 60 to 85
4. **Click Save** → Success message appears
5. **Reload page** → New value persists
6. **Click Reset** → Confirms, returns to 60

### Test Alerts Dashboard

1. **Navigate to Alerts** → Page loads
2. **Select applications** → Filters alerts
3. **View summary** → Counts displayed
4. **Filter by severity** → Shows only selected
5. **Acknowledge alert** → Status updates
6. **Paginate** → Next/previous works

---

## Common Issues & Troubleshooting

### Issue: "AlertThresholds collection not found"
**Solution**: Check that MongoDB initialization ran
```bash
# Check logs for:
[MongoDB] Alert thresholds collection and indexes created
```
If missing, restart backend

### Issue: "Cannot read property 'thresholds' of null"
**Solution**: Thresholds not initialized for app
```bash
# Manually create:
db.alertthresholds.insertOne({
  applicationId: "app_xxx",
  thresholds: { /* industry standards */ },
  isCustom: false,
  createdAt: new Date(),
  updatedAt: new Date()
})
```

### Issue: Alerts not generated after ingestion
**Solution**: Check batch processing logs
```bash
# Verify collection:
db.generatedalerts.countDocuments({ applicationId: "app_xxx" })
# Should be > 0
```

### Issue: Frontend says "No application selected"
**Solution**: appId not passed correctly
```bash
# Check URL includes appId:
/settings?appId=app_xxx&tab=alerts
```

### Issue: API returns 404
**Solution**: Route not registered
```bash
# Check index.ts includes:
app.use('/api/alerts', alertsRouter);
app.use('/api/alert-thresholds', alertThresholdsRouter);
```

---

## Performance Validation

### Check Indexes

```javascript
db.alertthresholds.getIndexes();
// Should show: { applicationId: 1 } with unique: true

db.generatedalerts.getIndexes();
// Should show:
// - { applicationId: 1, createdAt: -1 }
// - { severity: 1 }
// - { status: 1 }
// - { alertType: 1 }
```

### Load Test

Generate 1000 alerts and verify query performance:

```bash
# Time this query (should be < 100ms):
curl "http://localhost:5001/api/alerts/applications/app_xxx?page=1&limit=100"

# Time this query (should be < 50ms):
curl "http://localhost:5001/api/alerts/summary/app_xxx"
```

---

## Sign-Off Checklist

After running all tests, verify:

- [ ] All 12 validation steps completed successfully
- [ ] End-to-end scenario passed
- [ ] Frontend UI working correctly
- [ ] No console errors
- [ ] MongoDB indexes created
- [ ] Query performance acceptable
- [ ] No breaking changes to existing features

**If all items checked**: Implementation is production-ready! ✅

---

## Additional Debug Commands

### View All Alert Thresholds
```javascript
db.alertthresholds.find().pretty()
```

### Count Alerts by Severity
```javascript
db.generatedalerts.aggregate([
  { $match: { applicationId: "app_xxx" } },
  { $group: { _id: "$severity", count: { $sum: 1 } } }
])
```

### Find Most Recent Alerts
```javascript
db.generatedalerts
  .find({ applicationId: "app_xxx" })
  .sort({ createdAt: -1 })
  .limit(10)
  .pretty()
```

### Reset Application Thresholds to Defaults
```javascript
db.alertthresholds.deleteOne({ applicationId: "app_xxx" })
// Then re-create app or manually initialize
```

### Clear All Alerts (CAUTION)
```javascript
db.generatedalerts.deleteMany({ applicationId: "app_xxx" })
```

---

**Last Updated**: May 1, 2026
**Implementation Status**: COMPLETE
**Validation Date**: [To be filled during testing]
**Validated By**: [To be filled]
