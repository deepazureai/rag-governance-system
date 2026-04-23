# Data Polling Service - Deployment Guide

## Overview

The Data Polling Service is a standalone Node.js/TypeScript application that:
- Reads database connection details from MongoDB
- Retrieves encrypted credentials from KeyVault
- Polls PostgreSQL (or other databases) for new records using high-water marks
- Upserts fetched records into MongoDB
- Implements crash-safe, idempotent data ingestion

## Architecture

```
┌──────────────────────┐
│  Polling Service     │
│  (This app)          │
└──────────┬───────────┘
           │
      ┌────┴────┐
      │          │
      ▼          ▼
  MongoDB    PostgreSQL
  (Read       (Poll for
   config)    new data)
   │
   └─► MongoDB (Upsert records)
```

## Deployment Options

### 1. Windows Service

#### Prerequisites
- Node.js 18+ installed
- Administrator access

#### Installation
```bash
cd poller
npm install
npm run build

# Install as service
.\polling-service.bat install

# Start the service
.\polling-service.bat start

# Check status
sc query DataPollingService

# Stop the service
.\polling-service.bat stop

# Uninstall service
.\polling-service.bat uninstall
```

#### Configuration
Create `C:\ProgramData\PollingService\.env` with your environment variables:
```
MONGODB_URL=mongodb://user:pass@host:27017/eval_platform
POSTGRES_HOST=your-host
POSTGRES_PORT=5432
POSTGRES_USER=your_user
POSTGRES_PASSWORD=your_password
...
```

### 2. Linux Service (systemd)

#### Prerequisites
- Node.js 18+ installed
- systemd available
- Root access for installation

#### Installation
```bash
# Build application
cd poller
npm install
npm run build

# Create service user
sudo useradd -r -s /bin/bash poller

# Create installation directory
sudo mkdir -p /opt/polling-service
sudo cp -r dist src package*.json /opt/polling-service/
sudo chown -R poller:poller /opt/polling-service

# Create .env directory
sudo mkdir -p /etc/polling-service
sudo touch /etc/polling-service/.env
sudo chown poller:poller /etc/polling-service/.env
sudo chmod 600 /etc/polling-service/.env

# Add environment variables to /etc/polling-service/.env
sudo nano /etc/polling-service/.env

# Copy systemd service file
sudo cp polling-service.service /etc/systemd/system/

# Enable and start service
sudo systemctl daemon-reload
sudo systemctl enable polling-service
sudo systemctl start polling-service

# Check status
sudo systemctl status polling-service

# View logs
sudo journalctl -u polling-service -f
```

### 3. Docker / Azure Container Apps

#### Build and Push
```bash
# Build Docker image
docker build -t polling-service:latest .

# Tag for registry
docker tag polling-service:latest your-registry/polling-service:latest

# Push to registry
docker push your-registry/polling-service:latest
```

#### Azure Container Apps
```bash
# Create container app
az containerapp create \
  --name polling-service \
  --resource-group your-rg \
  --image your-registry/polling-service:latest \
  --env-vars \
    MONGODB_URL="mongodb://..." \
    POSTGRES_HOST="..." \
  --registry-server your-registry \
  --registry-username your-username \
  --registry-password your-password
```

## Environment Variables

See `.env.example` for all configuration options:

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `MONGODB_URL` | Yes | - | MongoDB connection string |
| `POSTGRES_HOST` | No | localhost | PostgreSQL server hostname |
| `POSTGRES_PORT` | No | 5432 | PostgreSQL port |
| `POSTGRES_USER` | No | postgres | PostgreSQL username |
| `POSTGRES_PASSWORD` | No | - | PostgreSQL password |
| `POSTGRES_DATABASE` | No | postgres | PostgreSQL database |
| `POLL_INTERVAL_MINUTES` | No | 5 | Polling frequency |
| `BATCH_SIZE` | No | 1000 | Records per poll |
| `MAX_RETRIES` | No | 3 | Retry attempts on failure |
| `LOG_LEVEL` | No | info | Winston log level |

## Monitoring

### Logs Location

**Windows Service:**
- Event Viewer: Applications and Services Logs
- Files: `poller-*.log` in working directory

**Linux Service:**
- journalctl: `sudo journalctl -u polling-service -f`
- Files: `poller-*.log` in `/opt/polling-service`

**Docker:**
- Docker logs: `docker logs <container-id> -f`

### Log Levels

Set `LOG_LEVEL` to one of:
- `error` - Only errors
- `warn` - Warnings and errors
- `info` - Info, warnings, and errors (default)
- `debug` - Detailed debugging

## Troubleshooting

### Service won't start
1. Check logs for error messages
2. Verify MongoDB connection: `mongodb://user:pass@host:port/database`
3. Verify PostgreSQL credentials and network connectivity
4. Check file permissions and disk space

### High memory usage
- Reduce `BATCH_SIZE` to fetch fewer records per cycle
- Increase `POLL_INTERVAL_MINUTES` to poll less frequently

### Records not being fetched
1. Check if polling is enabled in schema mappings
2. Verify column mappings are correct
3. Ensure source table has `id` column that's incrementing
4. Check MongoDB `pollingstate` collection for high-water mark

### Connection errors
1. Verify MongoDB is accessible
2. Verify PostgreSQL credentials and network access
3. Check firewall rules
4. Verify DNS resolution

## Maintenance

### Viewing Polling State
```javascript
// Connect to MongoDB
db.pollingstate.find({ applicationId: "your-app-id" })

// Expected output:
// {
//   applicationId: "app-123",
//   connectionId: "conn-456",
//   lastSeenId: 5000,
//   lastPolledAt: "2024-01-15T10:30:00Z",
//   recordsProcessed: 5000,
//   status: "active"
// }
```

### Resetting High-Water Mark (if needed)
```javascript
// CAUTION: This will cause re-processing of old records
db.pollingstate.updateOne(
  { applicationId: "your-app-id" },
  { $set: { lastSeenId: 0 } }
)
```

### Checking Raw Data
```javascript
db.rawdatarecords.find({ applicationId: "your-app-id" }).count()
```

## Performance Tuning

1. **Batch Size**: Increase for better throughput, decrease for lower memory
2. **Poll Interval**: Decrease for more frequent polling (more database load)
3. **Connection Pooling**: Automatically managed, max 10 connections per pool
4. **Indexes**: MongoDB indexes are created automatically on startup

## Security Best Practices

1. **Credentials**: Use KeyVault in production, never hardcode passwords
2. **Database Users**: Create a read-only user specifically for the poller
3. **Network**: Restrict access to databases by IP/network
4. **Logs**: Avoid logging sensitive data (implemented by default)
5. **Service Account**: Run as dedicated, non-privileged user (Linux/Docker)

## Support

For issues or questions, refer to:
- MongoDB Connection String Format: https://docs.mongodb.com/manual/reference/connection-string/
- PostgreSQL Connection: https://www.postgresql.org/docs/current/libpq-envars.html
- Azure KeyVault: https://learn.microsoft.com/en-us/azure/key-vault/
