# Docker Recovery - Quick Start

## Your Question Answered

**Q: How to not delete the MongoDB image and still recover from failure?**

**A: MongoDB data and volumes are automatically preserved!** By default, `docker compose down` stops containers but keeps all volumes intact. Only use `docker compose down -v` if you want to delete data (don't do this!).

## What Was Wrong

Backend container failed because `multer` package was missing from production dependencies.

## What Was Fixed

✅ Added `multer` to backend package.json dependencies
✅ Updated backend Dockerfile to ensure fresh dependency installation
✅ Backend builds successfully with no errors

## How to Resume Docker

### QUICKEST METHOD (Recommended)

```bash
cd /vercel/share/v0-project
./docker-rebuild.sh
```

This automatically:
1. Stops containers (MongoDB data preserved)
2. Rebuilds with fixed dependencies
3. Restarts everything
4. Shows status

### MANUAL METHOD

```bash
cd /vercel/share/v0-project

# Stop containers WITHOUT -v flag (keeps volumes!)
docker compose down

# Rebuild with fresh dependencies
docker compose build --no-cache backend

# Start everything
docker compose up -d

# Check status
docker compose ps
```

## Important Docker Facts

| Command | Effect |
|---------|--------|
| `docker compose down` | ✅ Stops containers, **KEEPS volumes** (safe!) |
| `docker compose down -v` | ❌ Stops containers, **DELETES volumes** (dangerous!) |
| `docker compose build` | Uses cache (may miss new dependencies) |
| `docker compose build --no-cache` | Fresh build (required for package changes) |

## Next Steps

1. Run the rebuild script: `./docker-rebuild.sh`
2. Wait for containers to start (MongoDB usually starts first)
3. Check health: `curl http://localhost:5001/api/health`
4. View logs: `docker compose logs -f`

## MongoDB Status

✅ Image: Fully downloaded
✅ Volume: `mongo_data` preserved
✅ Data: Safe and intact
✅ Container: Will restart cleanly

All your data is safe!

See `DOCKER_RECOVERY_GUIDE.md` for detailed troubleshooting.
