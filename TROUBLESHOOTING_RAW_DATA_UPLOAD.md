# Troubleshooting Raw Data Upload Issue

## Problem Summary
Application is created in `applicationmasters` collection, but raw data records are NOT being stored in `rawdatarecords` collection when using the upload endpoint.

## Diagnostic Steps

### Step 1: Run the Updated Test Script
```bash
bash scripts/upload-rag3-data.sh
```

This script now performs:
1. **Count Check (Step 0a)**: Gets initial raw data count for the application
2. **Test Insert (Step 0b)**: Inserts a single test record to verify MongoDB connection works
3. **Count Verification (Step 0c)**: Checks count again to confirm test insert worked
4. **CSV Upload (Step 1a)**: Uploads the CSV data
5. **Final Count Check (Step 1b)**: Verifies how many records were actually inserted

### Step 2: Check Server Console Logs
Look for detailed logging output that shows:
- `[API] Uploading raw data for application: app_...`
- `[API] Received CSV data length: ...`
- `[API] Total lines parsed: ...`
- `[API] Headers parsed: [...]`
- `[API] Total records to insert: ...`
- `[API] Insert successful - insertedCount: ...`

### Step 3: Manual MongoDB Query
Connect to MongoDB and run:
```javascript
// Check if rawdatarecords collection exists
db.getCollectionNames()

// Count records for your app ID
db.rawdatarecords.countDocuments({ applicationId: "app_1777226606033_dpgw1e5vg" })

// View sample records
db.rawdatarecords.find({ applicationId: "app_1777226606033_dpgw1e5vg" }).limit(1)
```

## New Diagnostic Endpoints

### 1. GET /api/applications/:id/raw-data-count
**Purpose**: Verify how many raw data records exist for an application
**Example**: `curl http://localhost:5001/api/applications/app_1777226606033_dpgw1e5vg/raw-data-count`
**Response**: 
```json
{
  "success": true,
  "applicationId": "app_1777226606033_dpgw1e5vg",
  "rawDataCount": 5
}
```

### 2. POST /api/applications/:id/test-insert
**Purpose**: Test if MongoDB insertion works at all
**Example**: `curl -X POST http://localhost:5001/api/applications/app_1777226606033_dpgw1e5vg/test-insert -H "Content-Type: application/json" -d {}`
**Response**:
```json
{
  "success": true,
  "message": "Test insert successful",
  "insertedId": "63f8a3c4b2c8d9e1f2g3h4i5"
}
```

## Possible Issues & Fixes

### Issue 1: MongoDB Not Connected
**Symptom**: Error about MongoDB connection
**Fix**: Check backend logs for connection status, ensure MongoDB is running

### Issue 2: Wrong Application ID
**Symptom**: Count endpoint returns 0 even after upload
**Fix**: Use the actual application ID from the dashboard, not a placeholder

### Issue 3: CSV Parsing Error
**Symptom**: Upload response says "No valid data rows found in CSV"
**Fix**: Check CSV format - must have headers and proper comma separation
- Make sure each field is comma-separated
- Check for special characters that need escaping
- Verify timestamps are in ISO 8601 format

### Issue 4: Collection Name Mismatch
**Symptom**: Test insert works but CSV upload doesn't
**Fix**: Both should use same collection name 'rawdatarecords'
- Check backend logs for actual collection name being used
- Ensure no typos in collection name

## Verification Checklist

- [ ] Run test script and check all steps succeed
- [ ] Verify MongoDB connection shows readyState: 1
- [ ] Confirm test-insert successfully creates a record
- [ ] Check raw-data-count increases after test insert
- [ ] Verify CSV upload returns success status
- [ ] Confirm raw-data-count increases after CSV upload by the correct number (5 for sample data)
- [ ] Check batch-process endpoint successfully triggers
- [ ] Verify rawdatarecords collection exists in MongoDB
- [ ] Confirm records have applicationId field set correctly
- [ ] Wait 10-15 seconds and check if metrics appear on dashboard

## Next Steps if Still Not Working

1. Check backend server console output for any error messages
2. Verify MongoDB credentials and connection string
3. Ensure the `rawdatarecords` collection is not read-only
4. Check if there are any database transaction/batch insert size limits
5. Try uploading fewer records (2-3) to isolate the issue
