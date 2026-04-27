# Dashboard Buttons Guide

## Overview
The dashboard has two distinct action buttons that serve different purposes. Understanding when and why to use each is important for proper system operation.

---

## Button 1: Refresh Metrics ⟳

### Purpose
**Fetches the latest calculated metrics** for the selected applications without triggering new data processing.

### What It Does
- Queries the backend for pre-calculated metrics
- Displays existing evaluation results
- Updates the dashboard UI with latest data
- Does NOT process any raw data
- Does NOT re-evaluate responses

### When to Use
- ✅ When you want to see the current state of metrics
- ✅ After metrics have been processed and you want to view the results
- ✅ Periodically to see updated metrics as new data is processed
- ✅ After other users have processed data
- ✅ To refresh the display without heavy processing

### Button State
- **Always visible** when applications are selected
- **Disabled** while any operation is in progress
- Uses a blue color (🔵 Blue = View/Fetch operation)

### Backend Endpoint Called
```
GET /api/applications/{appId}/metrics
GET /api/alerts/application/{appId}
```

### Response Time
⚡ **Fast** (< 1 second) - Just retrieves pre-calculated data from database

---

## Button 2: Process Raw Data 🟢

### Purpose
**Manually triggers batch processing** to evaluate raw data records and generate new metrics.

### What It Does
- Reads raw data records from the `rawdatarecords` collection
- Evaluates each record using multi-framework approach (RAGAS, BLEU, ROUGE, etc.)
- Generates evaluation results in `evaluationrecords` collection
- Calculates governance metrics (latency, token usage, cost, errors)
- Generates alerts based on thresholds
- Updates application status to `completed`

### When to Use
- ✅ When application has `initialDataProcessingStatus: 'waiting_for_file'`
- ✅ When you've uploaded new data and want to process it immediately
- ✅ When you want to re-evaluate existing raw data with updated frameworks
- ✅ After uploading additional data to an existing application
- ❌ Do NOT click repeatedly - wait for processing to complete

### Button State
- **Only visible** when selected apps have `initialDataProcessingStatus: 'waiting_for_file'`
- **Disabled** while processing is in progress
- Uses a green color (🟢 Green = Process/Execute operation)
- After processing, button disappears (data is no longer waiting)

### Backend Endpoint Called
```
POST /api/applications/{appId}/batch-process
```

### Processing Flow
```
1. Fetch raw data records from MongoDB
2. Evaluate with MultiFrameworkEvaluator
3. Save evaluation results
4. Calculate AI Activity Governance metrics
5. Generate alerts
6. Update application status
```

### Response Time
⏱️ **Slow** (30 seconds to several minutes) - Depends on:
- Number of records to process
- Complexity of raw data
- Framework evaluation time

---

## Quick Reference Table

| Aspect | Refresh Metrics | Process Raw Data |
|--------|-----------------|------------------|
| **Purpose** | View metrics | Generate metrics |
| **Operation Type** | Read-only | Write/Compute |
| **Speed** | Fast (< 1 sec) | Slow (30s - mins) |
| **Data Changed** | No | Yes (creates evaluations) |
| **Processing Done** | No | Yes |
| **When Visible** | Always (apps selected) | Only when waiting_for_file |
| **Color** | Blue (🔵) | Green (🟢) |
| **Can Repeat** | Yes, unlimited | Wait for each to finish |
| **Use Case** | Check current state | Process new/pending data |

---

## Workflow Examples

### Scenario 1: Creating New Application with File Upload
```
1. Create new application in wizard
   └─ Application created in DB
2. Upload CSV file
   └─ Raw data saved to rawdatarecords collection
   └─ Application status: waiting_for_file
   └─ "Process Raw Data" button appears (green) 🟢
3. Click "Process Raw Data"
   └─ Batch processing starts
   └─ Evaluations generated
   └─ Metrics calculated
   └─ Status changes to: completed
   └─ "Process Raw Data" button disappears
4. Click "Refresh Metrics" 
   └─ Latest metrics displayed in dashboard
   └─ Charts updated
```

### Scenario 2: Viewing Existing Application
```
1. Select application from table
   └─ Application already has processed data
   └─ Only "Refresh Metrics" button visible (blue) 🔵
2. Click "Refresh Metrics"
   └─ Fetches latest metrics
   └─ Shows current state
3. No "Process Raw Data" button
   └─ Data already processed
   └─ No waiting records
```

### Scenario 3: Re-processing Data
```
1. New raw data uploaded to existing application
   └─ Application status: waiting_for_file
   └─ "Process Raw Data" button appears (green) 🟢
2. Click "Process Raw Data"
   └─ New batch processing started
   └─ Previous evaluations may be supplemented
3. After completion:
   └─ Status: completed
   └─ "Process Raw Data" disappears
   └─ Click "Refresh Metrics" to see new results
```

---

## Do I Need Both Buttons?

### YES ✅ 

They serve completely different functions:

1. **"Refresh Metrics"** = **Report Reading** 📊
   - Passive operation
   - Displays existing data
   - Always available
   - Never takes long

2. **"Process Raw Data"** = **Report Generation** 📝
   - Active operation
   - Creates new data
   - Appears conditionally
   - Takes significant time

### Analogy
- **Refresh Metrics** = "Open the report file and read it"
- **Process Raw Data** = "Run the analysis and generate the report"

You need both because:
- Reading a report ≠ Generating a report
- Data must be processed BEFORE it can be viewed
- Users need a way to view results AND a way to generate new results

---

## Recommended User Instructions

### For Dashboard Users
1. **First time**: "Process Raw Data" button will appear green when there's pending data
   - Click it to evaluate the data
   - Wait for completion (you'll see a success message)
   
2. **After processing**: "Refresh Metrics" button will fetch the results
   - Click it anytime to see current metrics
   - Use this to periodically check for updates

3. **Adding more data**: Upload more files
   - "Process Raw Data" button reappears
   - Click to process the new data
   - Then "Refresh Metrics" to view

---

## Performance Implications

### Refresh Metrics (🔵 Blue)
- ✅ Safe to click repeatedly
- ✅ No server load impact
- ✅ Fast feedback
- ✅ Use as often as needed

### Process Raw Data (🟢 Green)
- ⚠️ Heavy computation
- ⚠️ Can take minutes for large datasets
- ⚠️ Consumes CPU/GPU resources
- ⚠️ Click only when intentional
- ⚠️ Wait for one to finish before starting another

---

## Troubleshooting

### "Process Raw Data" button doesn't appear
- ✅ Normal if data is already processed
- ✅ Check application status in database
- ✅ Status should be `completed` not `waiting_for_file`

### "Process Raw Data" button is disabled
- Check if another operation is in progress
- Wait for "Refreshing..." text to disappear
- Try clicking again

### No metrics showing after clicking "Refresh Metrics"
- Check if "Process Raw Data" has completed
- Verify raw data was uploaded successfully
- Check browser console for errors (F12)
- Check backend logs for processing errors

---

## Architecture Notes

```
Application Lifecycle:
┌─────────────────────────────────────────────────────────────┐
│ 1. Application Created                                       │
│    └─ initialDataProcessingStatus: 'pending'               │
├─────────────────────────────────────────────────────────────┤
│ 2. Raw Data Uploaded                                         │
│    └─ Records in rawdatarecords collection                  │
│    └─ initialDataProcessingStatus: 'waiting_for_file'       │
│    └─ 🟢 "Process Raw Data" button visible                 │
├─────────────────────────────────────────────────────────────┤
│ 3. Batch Processing Executed                                 │
│    └─ Evaluations in evaluationrecords collection           │
│    └─ Metrics calculated and stored                         │
│    └─ initialDataProcessingStatus: 'completed'              │
│    └─ 🟢 Button disappears                                  │
├─────────────────────────────────────────────────────────────┤
│ 4. Refresh Metrics Called                                    │
│    └─ Fetches from databases                               │
│    └─ Displays in dashboard                                │
│    └─ 🔵 "Refresh Metrics" always available                │
└─────────────────────────────────────────────────────────────┘
```

---

## Summary

| Aspect | Answer |
|--------|--------|
| **Do you need both?** | YES - Different purposes |
| **Can they be combined?** | NO - Different operations |
| **Which is more common?** | Refresh Metrics (daily use) |
| **Which takes longer?** | Process Raw Data (minutes) |
| **When do you use each?** | Process → View → Process → View... |
