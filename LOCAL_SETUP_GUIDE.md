# Local Setup & Deployment Guide

## Prerequisites

- Node.js 18+ installed
- pnpm package manager (`npm install -g pnpm`)
- MongoDB running locally or connection string ready
- Git (optional, for version control)

---

## Step 1: Download the Project

### Option A: Download from v0.app
1. Go to v0.app
2. Click "Download ZIP" in the project
3. Extract to your local machine
4. Navigate to project directory: `cd rag-evaluation-platform`

### Option B: Clone from GitHub (if connected)
```bash
git clone <your-repo-url>
cd rag-evaluation-platform
```

---

## Step 2: Install Dependencies

### Backend
```bash
cd backend
pnpm install
```

### Frontend (from project root)
```bash
pnpm install
```

---

## Step 3: Configure Environment Variables

### Backend (.env in backend/ directory)
```env
DATABASE_URL=mongodb://localhost:27017/rag-evaluation
NODE_ENV=development
PORT=5000
```

### Frontend (.env.local in root)
```env
NEXT_PUBLIC_API_URL=http://localhost:5000
```

---

## Step 4: Verify MongoDB Connection

```bash
# Option 1: Local MongoDB
mongosh

# Option 2: MongoDB Atlas
# Use your connection string in DATABASE_URL
```

---

## Step 5: Start Backend

```bash
cd backend
pnpm dev
```

Expected output:
```
[Server] HTTP server running on port 5000
[Server] MongoDB connected
[Server] Ready to accept evaluation requests
```

---

## Step 6: Start Frontend (New Terminal)

```bash
# From project root
pnpm dev
```

Expected output:
```
  ▲ Next.js (version 15.x.x)
  - Local: http://localhost:3000
```

---

## Step 7: Access Application

Open browser: **http://localhost:3000**

---

## Step 8: Test Complete Flow

### Create Application
1. Navigate to "Create Application" wizard
2. Enter application name and description
3. Select local folder and CSV file
4. Click "Create Application"
5. Verify in MongoDB:
   - `applicationmasters` has new entry
   - `applicationslas` has industry benchmarks auto-populated

### View Application
1. Go to Dashboard → see application listed
2. Go to App Catalog → see application with metrics
3. Click application → view detail page

### Configure SLA
1. In app detail page → Click "Settings" button
2. Navigate to SLA Configuration tab
3. Modify metric thresholds (e.g., Faithfulness excellent: 75%)
4. Click "Save Changes"
5. Go to Evaluation Logs tab → verify color coding uses new thresholds

### Verify Data Pipeline
1. Create application with CSV file
2. Monitor backend logs for:
   ```
   [API] Saving application to MongoDB
   [BatchProcessingService] Starting batch process
   [BatchProcessingService] Evaluated X records successfully
   ```
3. Check MongoDB collections:
   - `rawdatarecords` - has CSV data
   - `evaluationrecords` - has metrics

---

## Troubleshooting

### Backend won't start
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
pnpm install
pnpm dev
```

### MongoDB connection error
```bash
# Check connection string in .env
# Verify MongoDB is running
mongosh

# If using local MongoDB
brew services start mongodb-community  # macOS
sudo systemctl start mongod            # Linux
```

### Frontend build errors
```bash
# Clear Next.js cache
rm -rf .next
pnpm dev
```

### API connection error (frontend can't reach backend)
- Check backend running: http://localhost:5000/health
- Verify NEXT_PUBLIC_API_URL in .env.local
- Check CORS settings in backend/src/index.ts

### File validation fails
- Ensure CSV file is in valid format (semicolon-delimited)
- Check folder path is accessible from backend
- Verify file has query, response, and retrieved_documents columns

---

## Database Schema Verification

### Expected MongoDB Collections

```javascript
// applicationmasters
{
  id: "app_1234567890_xyz",
  name: "My RAG App",
  applicationSLAs: { /* linked by applicationId */ }
}

// applicationslas
{
  applicationId: "app_1234567890_xyz",
  metrics: {
    faithfulness: { excellent: 80, good: 60, poor: 0 },
    // ... other metrics
  }
}

// evaluationrecords
{
  applicationId: "app_1234567890_xyz",
  evaluation: { /* metrics scores */ }
}

// rawdatarecords
{
  applicationId: "app_1234567890_xyz",
  recordData: { /* original CSV data */ }
}
```

---

## Ports Configuration

- Frontend: http://localhost:3000
- Backend: http://localhost:5000
- MongoDB: localhost:27017 (default)

If ports are in use:
```bash
# Change frontend port
PORT=5000 pnpm dev

# Change backend port in .env
PORT=5001
```

---

## Performance Tips

- Use MongoDB indexes on `applicationId` for faster queries
- Enable compression in backend (already configured)
- Use browser DevTools to check network requests
- Monitor backend logs for slow queries

---

## Next Steps

1. Create test applications
2. Customize SLA thresholds per application
3. Configure alerts based on SLA violations
4. Export evaluation reports
5. Set up CI/CD pipeline for deployment

---

## Support

For issues:
1. Check backend logs: `[v0] error messages`
2. Check browser console: DevTools F12
3. Verify all files copied from FILES_TO_COPY.md
4. Ensure database.ts has ApplicationSLA interface
5. Restart both servers after file updates
