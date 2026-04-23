# Polling Service - Quick Reference

## 🚀 One-Minute Overview

**What it does:**
1. Reads database connections & schema mappings from MongoDB
2. Connects to PostgreSQL using stored credentials
3. Fetches new records (WHERE id > lastSeenId)
4. Upserts to MongoDB with userId for user-level tracking
5. Updates lastSeenId (crash-safe high-water mark)
6. Retries on failure with exponential backoff

**Deploys as:**
- Windows Service ✓
- Linux Daemon (systemd) ✓
- Docker Container ✓
- Azure Container App Job ✓

## 📁 Folder Structure

```
poller/
├── src/
│   ├── index.ts         ← Main polling loop
│   ├── poller.ts        ← Core logic (fetch → transform → upsert)
│   ├── config.ts        ← Load .env
│   ├── types.ts         ← TypeScript interfaces
│   ├── mongodb.ts       ← DB operations & high-water mark
│   ├── postgresql.ts    ← Query & transform
│   ├── keyvault.ts      ← Get credentials
│   └── utils.ts         ← Logging
├── .env.example         ← Copy to .env
├── Dockerfile           ← Container build
├── polling-service.bat  ← Windows install
├── polling-service.service ← Linux systemd
├── README.md            ← Features & quick start
├── DEPLOYMENT.md        ← Detailed setup guide
└── package.json         ← npm dependencies
```

## 🔄 Data Flow Per Cycle

```
1. Get lastSeenId from MongoDB pollingstate
   └─ If none, start at 0

2. Query PostgreSQL:
   SELECT * FROM table WHERE id > lastSeenId ORDER BY id LIMIT 1000

3. For each row, map columns:
   prompt (required) ✓
   response (required) ✓
   userId (required for user tracking) ✓
   context (optional)
   timestamp (optional)

4. Upsert all rows to MongoDB rawdatarecords
   (Idempotent by sourceId - no duplicates)

5. Update lastSeenId to max(id) from fetched rows
   (Only if upsert succeeded)

6. If error:
   → Retry with exponential backoff
   → After 3 retries, mark failed
   → Continue to next mapping
```

## ⚙️ Configuration

```bash
# Required
MONGODB_URL=mongodb://host:27017/db

# PostgreSQL (or override per-connection)
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_USER=user
POSTGRES_PASSWORD=pass

# Polling
POLL_INTERVAL_MINUTES=5        # How often to check
BATCH_SIZE=1000                # Records per cycle

# Resilience
MAX_RETRIES=3
BACKOFF_MULTIPLIER=2           # 1s, 2s, 4s, 8s...
INITIAL_BACKOFF_MS=1000

# Other
LOG_LEVEL=info                 # error, warn, info, debug
SHUTDOWN_TIMEOUT_SECONDS=30    # Graceful shutdown wait
```

## 🗄️ MongoDB Collections

| Collection | Purpose | Key Fields |
|---|---|---|
| `databaseconnections` | DB credentials | connectionId, applicationId, server, port, database |
| `databaseschemamappings` | Column mappings | mappingId, connectionId, tableName, columnMappings |
| `pollingstate` | **High-water mark** | applicationId, connectionId, **lastSeenId** |
| `rawdatarecords` | Fetched data | applicationId, **sourceId** (unique key), prompt, response, userId |

## 🚀 Deploy in 5 Minutes

### Windows
```bash
cd poller
npm install && npm run build
.\polling-service.bat install
.\polling-service.bat start
```

### Linux
```bash
cd poller
npm install && npm run build
sudo cp polling-service.service /etc/systemd/system/
sudo systemctl enable polling-service
sudo systemctl start polling-service
sudo journalctl -u polling-service -f
```

### Docker
```bash
cd poller
docker build -t polling-service:latest .
docker run -e MONGODB_URL=... -e POSTGRES_HOST=... polling-service:latest
```

## 🔍 Monitoring

**Check if records are being fetched:**
```javascript
// MongoDB
db.rawdatarecords.find({ applicationId: "your-app" }).count()
```

**Check polling status:**
```javascript
db.pollingstate.find({ applicationId: "your-app" })
// Expected: lastSeenId increasing, status: "active"
```

**View logs:**
```bash
# Windows: Event Viewer → Application
# Linux: journalctl -u polling-service -f
# Docker: docker logs <container> -f
```

## 🛡️ Crash Safety

If service crashes:
1. Restart service
2. Service reads lastSeenId from MongoDB
3. Continues from exact point of failure
4. No data loss, no duplicates

Example: If crashed after fetching records 1-500 but before updating lastSeenId, next cycle will:
- Start with lastSeenId = 0 (or previous value)
- Fetch again (upsert is idempotent, so duplicates are OK)
- Update lastSeenId when successful

## 🚨 Troubleshooting

| Issue | Solution |
|---|---|
| **No records fetching** | Check source table has incrementing `id` column, verify column mappings |
| **Service won't start** | Check MongoDB/PostgreSQL connectivity, verify credentials, check logs |
| **High memory** | Reduce BATCH_SIZE, increase POLL_INTERVAL_MINUTES |
| **Connection errors** | Verify firewall rules, check DNS, verify credentials |
| **Duplicate records** | MongoDB upsert by sourceId prevents this - run `db.rawdatarecords.distinct("sourceId")` to verify |

## 📊 Performance Tuning

| Setting | Effect |
|---|---|
| ↑ BATCH_SIZE | More data per cycle, higher memory, fewer queries |
| ↓ POLL_INTERVAL_MINUTES | More frequent polling, higher CPU/DB load |
| ↑ MAX_RETRIES | More resilient to transient failures |
| ↑ BACKOFF_MULTIPLIER | Slower retry escalation, less aggressive |

Default: 1000 records every 5 minutes ≈ 12,000 records/hour

## 🔐 Security

**Development:**
- Credentials in .env (git-ignored)

**Production:**
- Use Azure KeyVault
- Set AZURE_KEYVAULT_URL and credentials in environment
- Run as non-privileged service user

## 📚 Full Documentation

- **README.md** - Features and architecture
- **DEPLOYMENT.md** - Step-by-step setup
- **Logs** - poller.log, poller-error.log

---

**TL;DR**: Copy `poller/` folder, run `npm install && npm run build`, set `.env`, deploy via `polling-service.bat` (Windows), systemd (Linux), or Docker. Monitor via MongoDB `pollingstate` collection and logs.
