## Build Cache Error Resolution

### Error Encountered
```
Runtime Error
ENOENT: no such file or directory, open '.next/server/pages/_document.js'
```

### Root Cause
The Next.js build cache was corrupted and retained Pages Router configuration even though the project uses App Router exclusively. This happens when:
1. Earlier conflicting files were deleted (like src/pages/governance.tsx)
2. Build cache contains stale artifacts
3. Next.js tries to generate Pages Router files that no longer exist

### Solutions Applied

#### 1. Updated next.config.mjs
- Added `appDir: true` to explicitly enable App Router
- Added `cleanDistDir: true` to clean build directory on each build
- These ensure Next.js only uses App Router patterns

#### 2. Added Clean Build Scripts
Available commands:
```bash
npm run clean          # Remove .next, node_modules/.cache, .turbo
npm run clean:dev      # Clean and restart dev server
```

#### 3. Project Structure Verified
✓ All pages in `/app` directory (App Router)
✓ No Pages Router files (`/pages` directory)
✓ No _app.tsx or _document.tsx files
✓ Root layout.tsx properly configured

### How to Fix

**Option 1: Using npm scripts (Recommended)**
```bash
npm run clean:dev
```

**Option 2: Manual cleanup**
```bash
npm run clean
npm run dev
```

**Option 3: Complete rebuild**
```bash
rm -rf .next node_modules/.cache .turbo
npm install
npm run dev
```

### Why This Works
- Removes stale Pages Router artifacts from build cache
- Forces Next.js to rebuild App Router configuration
- Clean config explicitly tells Next.js to use App Router only
- This prevents any conflicts between routing patterns

### Verification
After running clean build, you should see:
```
✓ Compiled successfully
✓ Ready in Xs
```

No more `_document.js` errors. The app will load at localhost:3000

