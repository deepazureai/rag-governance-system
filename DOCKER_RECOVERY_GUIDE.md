# Docker Build Recovery Guide

## Problem Summary

The backend container failed with: `Error [ERR_MODULE_NOT_FOUND]: Cannot find package 'multer'`

**Root Cause**: The `multer` package was missing from the backend's production dependencies in `package.json`. It was only present as `@types/multer` in devDependencies.

## Good News

✅ **MongoDB Image & Data are SAFE**
- The MongoDB image was fully downloaded
- MongoDB container is healthy and running
- All database volumes are preserved
- No data loss occurred

## What Was Fixed

### 1. Added Missing `multer` Dependency
- **File**: `backend/package.json`
- **Change**: Added `"multer": "^1.4.5-lts.1"` to dependencies (not devDependencies)
- **Why**: The knowledgeBaseRoutes.ts requires multer for file uploads at runtime

### 2. Updated Backend Dockerfile
- **File**: `backend/Dockerfile`
- **Changes**:
  - Switched from `npm install` to `npm ci` for reproducibility
  - Added fallback to npm install if npm ci fails
  - Added explicit production dependency installation in runtime stage
  - This ensures fresh dependencies are installed without cached issues

## How to Recover Without Losing MongoDB Data

### Option 1: Use the Safe Rebuild Script (Recommended)

```bash
cd /vercel/share/v0-project
./docker-rebuild.sh
```

This script will:
1. Stop containers (volumes preserved automatically)
2. Rebuild backend image with multer
3. Rebuild all dependent services
4. Start everything fresh
5. Show container status

### Option 2: Manual Commands

```bash
# Navigate to project root
cd /vercel/share/v0-project

# Stop containers WITHOUT deleting volumes (critical!)
docker compose down

# Rebuild images with fresh dependencies
docker compose build --no-cache backend
docker compose build --no-cache poller prompt-debugger knowledge-base template-creator

# Start the application
docker compose up -d

# Check status
docker compose ps
```

### Option 3: Preserve MongoDB Only (if other containers are problematic)

```bash
# Stop containers without removing volumes
docker compose down

# Inspect MongoDB volume (should be preserved)
docker volume ls | grep mongo_data

# Rebuild just the backend
docker compose build --no-cache backend

# Start everything
docker compose up -d
```

## Verification Steps

After recovery, verify everything is working:

```bash
# Check container health
docker compose ps

# Check MongoDB
curl -s http://localhost:27018 2>&1 | head -1

# Check backend API
curl http://localhost:5001/api/health

# View logs if needed
docker compose logs -f backend

# Monitor startup
docker compose logs backend
```

## Key Docker Concepts

### Volumes vs Images
- **Volumes** (`mongo_data`): Persistent data storage - persists even after container stops
- **Images**: Docker image files - can be rebuilt/deleted without data loss
- **Containers**: Running instances - can be stopped/removed without data loss

### Docker Compose Down Behavior
- `docker compose down` ← Stops containers, KEEPS volumes (safe!)
- `docker compose down -v` ← Stops containers AND DELETES volumes (dangerous!)

**Never use `-v` unless you want to delete data!**

### Docker Cache Issues
- `docker compose build` ← Uses cache (may not pick up new dependencies)
- `docker compose build --no-cache` ← Forces fresh build (recommended for dependency changes)

## Files Modified

1. **backend/package.json**
   - Added multer to dependencies

2. **backend/Dockerfile**
   - Updated to use npm ci with fallback
   - Added explicit production dependency installation

## Troubleshooting

### If MongoDB container won't start
```bash
# Check volume
docker volume ls | grep mongo_data

# If volume is corrupted, manually remove just MongoDB (keeps data volume)
docker rm v0-mongodb
docker compose up -d mongodb
```

### If backend still fails after rebuild
```bash
# Check which packages are actually installed
docker compose exec backend npm list multer

# Install missing package manually (debugging)
docker compose exec backend npm install multer

# View detailed logs
docker compose logs --tail=50 backend
```

### To completely reset (WARNING: loses MongoDB data)
```bash
docker compose down -v  # WARNING: Deletes mongo_data volume!
docker compose build --no-cache
docker compose up -d
```

## Summary

✅ **MongoDB data is preserved and safe**
✅ **Fixed: Added multer to dependencies**
✅ **Fixed: Updated Dockerfile for better dependency handling**
✅ **Ready to rebuild**: Use `./docker-rebuild.sh` or manual steps above

The application should now start successfully with all containers healthy!
