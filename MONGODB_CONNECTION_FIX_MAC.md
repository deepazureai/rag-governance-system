# MongoDB Connection Fix for Mac Docker Setup

**Problem:** GET/POST recommendations endpoints returning 404 because MongoDB connection isn't working properly.

**Root Cause:** MongoDB healthcheck isn't authenticating, preventing proper container initialization.

---

## Quick Fix (5 minutes)

### Step 1: Stop All Containers
```bash
cd /path/to/rag-governance-system
docker-compose down
```

### Step 2: Rebuild with Fixed Docker Compose
The docker-compose.yml has been updated with proper MongoDB authentication in the healthcheck.

### Step 3: Start Containers Fresh
```bash
docker-compose up --build
```

Wait for all services to show "healthy" status.

### Step 4: Verify MongoDB Connection

Open a new terminal and test the MongoDB connection:

```bash
# Test MongoDB is accepting connections
docker exec v0-mongodb mongosh \
  -u admin \
  -p password \
  --authenticationDatabase admin \
  --eval "db.adminCommand('ping')"
```

You should see:
```
{ ok: 1 }
```

### Step 5: Test the Backend API

```bash
# Test if backend can query MongoDB
curl http://localhost:5001/api/health
```

Should return:
```json
{"status":"ok"}
```

---

## What Was Fixed

### Problem 1: MongoDB Healthcheck Not Authenticating
**Before:**
```yaml
test: echo 'db.runCommand("ping").ok' | mongosh localhost:27017/test --quiet
```

**After:**
```yaml
test: echo 'db.runCommand("ping").ok' | mongosh localhost:27017/test -u admin -p password --authenticationDatabase admin --quiet
```

This ensures the healthcheck properly authenticates to MongoDB, so the container is marked as "healthy" only when it's truly ready.

---

## Detailed Troubleshooting

### If containers still won't start:

#### Check MongoDB logs:
```bash
docker-compose logs mongodb | tail -30
```

Look for:
- ✅ "Connection not authenticating" is OK - means MongoDB received the connection
- ❌ "failed to authenticate" - means credentials are wrong
- ❌ "Cannot read config" - means volume permission issue

#### Check Backend logs:
```bash
docker-compose logs backend | tail -30
```

Look for:
- ✅ "Connected successfully" - MongoDB connected
- ⚠️ "Connection warning" - Will retry, OK to proceed
- ❌ "ECONNREFUSED" - MongoDB not running

#### Check Frontend:
```bash
docker-compose logs frontend | tail -20
```

Should show:
```
> v0@0.1.0 start
> next start
```

---

## Manual MongoDB Test

If you want to manually test the connection from your Mac:

```bash
# Install MongoDB community tools (if not already installed)
# On Mac with Homebrew:
brew tap mongodb/brew
brew install mongodb-community-tools

# Connect to MongoDB
mongosh "mongodb://admin:password@localhost:27018/v0_db?authSource=admin"

# Inside mongosh shell:
db.rawdatarecords.find().limit(1)
db.prompttemplates.find().limit(1)
exit
```

---

## Expected Container States After Fix

Run: `docker-compose ps`

You should see:
```
NAME              STATUS              PORTS
v0-backend        Up X minutes (healthy)     0.0.0.0:5001->5001/tcp
v0-frontend       Up X minutes (healthy)     0.0.0.0:3000->3000/tcp
v0-mongodb        Up X minutes (healthy)     0.0.0.0:27018->27017/tcp
v0-deepeval       Up X hours (healthy)       0.0.0.0:8000->8000/tcp
```

Other services (poller, knowledge-base, template-creator, prompt-debugger) may be "Restarting" - that's OK if backend and frontend are healthy.

---

## Testing the Recommendations Save/Retrieve

Once all containers are healthy:

### Test 1: Create a recommendation record

```bash
curl -X POST http://localhost:5001/api/ba-review/save-recommendations \
  -H "Content-Type: application/json" \
  -d '{
    "applicationId": "test_app_1",
    "rawDataId": "507f1f77bcf86cd799439011",
    "recommendations": [{"suggestion": "Test improvement"}],
    "improvement": "Improved test prompt",
    "improvementReason": "Better clarity"
  }'
```

Should return:
```json
{"success":true,"message":"Recommendations saved successfully"}
```

### Test 2: Retrieve the recommendation

```bash
curl http://localhost:5001/api/ba-review/recommendations/test_app_1/507f1f77bcf86cd799439011
```

Should return the data with `IsImprovementSaved: 1`

---

## Environment Variables

Make sure your `.env` file has:

```env
MONGODB_URI=mongodb://admin:password@mongodb:27017/v0_db?authSource=admin
MONGODB_ADMIN_USER=admin
MONGODB_ADMIN_PASSWORD=password
MONGODB_DATABASE=v0_db
```

If you have a `.env.backend` file, make sure it has these as well.

---

## Still Having Issues?

### Issue: "Connection refused" errors

**Solution:**
1. Verify MongoDB container is running: `docker ps | grep mongodb`
2. Check MongoDB logs: `docker-compose logs mongodb | tail -50`
3. Restart everything: `docker-compose down && docker-compose up --build`

### Issue: "Authentication failed"

**Solution:**
1. Verify credentials in docker-compose.yml match your .env
2. Reset MongoDB: `docker-compose down && docker volume rm rag-governance-system_mongo_data`
3. Start fresh: `docker-compose up --build`

### Issue: Backend shows "Restarting" repeatedly

**Solution:**
1. Check backend logs: `docker-compose logs backend | tail -50`
2. If MongoDB is the issue, fix MongoDB first
3. Rebuild backend: `docker-compose up --build backend`

---

## Success Indicators

When everything is working:

✅ All containers show "healthy" status  
✅ Frontend loads at http://localhost:3000  
✅ Backend API responds at http://localhost:5001/api/health  
✅ MongoDB accepts connections  
✅ POST /api/ba-review/save-recommendations returns 200  
✅ GET /api/ba-review/recommendations returns 200 with data  
✅ Modal opens and saves recommendations  
✅ IsImprovementSaved flag persists after close/reopen  

---

## Next Steps

After the fix:

1. Open http://localhost:3000 in your browser
2. Upload raw data
3. Generate recommendations
4. Save improvements
5. Close and reopen modal
6. Verify data and disabled buttons persist

If all above works, you're ready to record the demo video!

