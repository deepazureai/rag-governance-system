# Data Polling Service

A standalone, crash-safe polling service for ingesting evaluation data from PostgreSQL (or compatible databases) into MongoDB with high-water mark tracking and idempotent upserts.

## Features

- **Standalone Deployment**: Deploy as Windows service, Linux daemon, Docker container, or Azure Container App
- **Crash-Safe**: High-water mark (lastSeenId) tracking enables resume after crashes
- **Idempotent**: Records are upserted by sourceId, preventing duplicates
- **Scalable**: Connection pooling, configurable batch sizes, and polling intervals
- **Secure**: Encrypted credential storage with Azure KeyVault support
- **Monitorable**: Winston logging with file and console output
- **Production-Ready**: Graceful shutdown, exponential backoff, error recovery

## Quick Start

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Configure environment
cp .env.example .env
nano .env  # Edit with your settings

# Run locally
npm run dev

# Production deployment
npm start
```

## How It Works

```
1. Read from MongoDB:
   ├── databaseconnections (connection details)
   ├── databaseschemamappings (table & column mappings)
   └── pollingstate (high-water mark: lastSeenId)

2. Connect to PostgreSQL using stored credentials

3. Execute query:
   SELECT * FROM table WHERE id > lastSeenId ORDER BY id LIMIT batchSize

4. Transform records to MongoDB format with userId and other fields

5. Upsert into MongoDB:
   └── rawdatarecords (idempotent by sourceId)

6. Update polling state:
   └── lastSeenId = max(id from fetched records)

7. Wait POLL_INTERVAL_MINUTES, repeat
```

## Architecture

```typescript
// Flow for each polling cycle
for each schemaMapping in databaseschemamappings:
  1. Get PollingState (high-water mark from MongoDB)
  2. Connect to PostgreSQL via connection pool
  3. Fetch: SELECT ... FROM table WHERE id > lastSeenId ORDER BY id LIMIT batchSize
  4. Transform PostgreSQL rows → MongoDB RawDataRecord format
  5. Upsert records into MongoDB (idempotent by sourceId)
  6. Update PollingState.lastSeenId (only after successful upsert)
  7. On error: Schedule retry with exponential backoff
```

## Folder Structure

```
poller/
├── src/
│   ├── index.ts              # Main entry point, polling loop
│   ├── poller.ts             # Core polling orchestration
│   ├── config.ts             # Environment config loader
│   ├── types.ts              # TypeScript interfaces
│   ├── mongodb.ts            # MongoDB connection & operations
│   ├── postgresql.ts         # PostgreSQL connection & queries
│   ├── keyvault.ts           # Credential retrieval
│   └── utils.ts              # Winston logging
├── package.json              # Dependencies
├── tsconfig.json             # TypeScript config
├── .env.example              # Configuration template
├── Dockerfile                # Docker build
├── polling-service.service   # Linux systemd unit
├── polling-service.bat       # Windows service wrapper
├── DEPLOYMENT.md             # Deployment guide
└── README.md                 # This file
```

## Configuration

All configuration via environment variables (see `.env.example`):

**MongoDB:**
- `MONGODB_URL` - Connection string

**PostgreSQL (or MySQL/MSSQL):**
- `POSTGRES_HOST`, `POSTGRES_PORT`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DATABASE`

**Polling:**
- `POLL_INTERVAL_MINUTES` - How often to poll (default: 5)
- `BATCH_SIZE` - Records per poll (default: 1000)
- `MAX_RETRIES` - Retry attempts (default: 3)
- `BACKOFF_MULTIPLIER` - Exponential backoff multiplier (default: 2)
- `INITIAL_BACKOFF_MS` - Initial backoff delay in ms (default: 1000)

**Logging:**
- `LOG_LEVEL` - error, warn, info, debug (default: info)

**Advanced:**
- `FILTER_APPLICATION_ID` - Only poll specific application
- `SHUTDOWN_TIMEOUT_SECONDS` - Graceful shutdown timeout (default: 30)
- Azure KeyVault credentials for production

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions:

- **Windows Service**: `polling-service.bat install`
- **Linux Service**: `sudo systemctl start polling-service`
- **Docker**: `docker run polling-service:latest`
- **Azure Container Apps**: `az containerapp create ...`

## Data Models

### PollingState (MongoDB)
```typescript
{
  applicationId: string;
  connectionId: string;
  mappingId: string;
  lastSeenId: number;        // High-water mark
  lastPolledAt: Date;
  recordsProcessed: number;
  status: 'active' | 'failed' | 'paused';
  retryCount: number;
  nextRetryAt?: Date;        // Exponential backoff
}
```

### RawDataRecord (MongoDB - upserted)
```typescript
{
  applicationId: string;
  connectionId: string;
  mappingId: string;
  sourceId: number;          // Unique from source DB
  prompt: string;
  context?: string;
  response: string;
  userId?: string;           // User who submitted prompt
  timestamp?: Date;
  fetchedAt: Date;
  updatedAt: Date;
}
```

## Error Handling

- **Connection Errors**: Exponential backoff retry (1s, 2s, 4s, ...)
- **Network Issues**: Auto-reconnect with connection pooling
- **Partial Batch Failure**: Individual record upserts (one record failure doesn't stop batch)
- **Crash Recovery**: Resume from `lastSeenId` in MongoDB
- **Graceful Shutdown**: Completes pending work, closes connections

## Monitoring

**Check polling state:**
```javascript
db.pollingstate.find({ applicationId: "your-app" })
```

**View logs:**
```bash
# Windows: Event Viewer
# Linux: sudo journalctl -u polling-service -f
# Docker: docker logs <container> -f
```

**View fetched records:**
```javascript
db.rawdatarecords.find({ applicationId: "your-app" }).count()
```

## Performance

- **Default**: 1000 records/poll, every 5 minutes
- **Tune Batch Size**: Increase for throughput, decrease for memory
- **Tune Interval**: Decrease for real-time, increase to reduce load
- **Indexes**: Created automatically on startup (applicationId, connectionId, sourceId)

## Security

- Credentials stored encrypted in environment variables (development) or Azure KeyVault (production)
- Separate database user with read-only access recommended
- No secrets logged
- Runs as non-privileged user (Linux/Docker)
- Network restrictions recommended at database level

## Troubleshooting

**Service won't start:**
- Check MONGODB_URL and PostgreSQL credentials
- Verify network connectivity
- Check logs for specific error

**Records not fetching:**
- Verify source table has incrementing `id` column
- Check column mappings in `databaseschemamappings`
- Verify polling is enabled in schema config
- Check `pollingstate.lastSeenId` value

**High memory usage:**
- Reduce `BATCH_SIZE`
- Increase `POLL_INTERVAL_MINUTES`

See [DEPLOYMENT.md](./DEPLOYMENT.md#troubleshooting) for more.

## License

Proprietary - Part of Evaluation Platform
