# Source Code Export Guide

Since the v0 UI download feature is disabled, use one of these methods to export your source code as a clean ZIP file:

## Method 1: Using npm Script (Recommended - Cross-Platform)

```bash
# From project root, run:
npm run export:zip
```

This creates `project-source.zip` (~3-5 MB) with all source code and no build artifacts.

**What you need:**
- Node.js installed
- archiver package (installed via `npm install`)

---

## Method 2: Linux/macOS - Bash Script

```bash
# Make script executable
chmod +x export-source.sh

# Run the script
./export-source.sh
```

This creates `project-source_TIMESTAMP.tar.gz` with all source files excluded build artifacts.

**What you need:**
- tar and gzip (included on most Linux/macOS systems)

---

## Method 3: Windows - Batch Script

```bash
# Run the batch file
export-source.bat
```

This creates `project-source_DATE_TIME.zip` using 7-Zip or WinRAR.

**What you need:**
- 7-Zip (free from https://www.7-zip.org/) OR
- WinRAR (from https://www.rarlab.com/)

---

## Method 4: Manual ZIP Creation

If none of the above work, manually create a ZIP file:

1. **Create a new folder** called `project-source`
2. **Copy these folders into it:**
   - `app/`
   - `backend/`
   - `poller/`
   - `src/`
   - `public/`
   - `scripts/`
   - `components/`
   - `hooks/`
   - `lib/`

3. **Copy these files:**
   - `package.json`
   - `tsconfig.json`
   - `next.config.mjs`
   - `tailwind.config.ts`
   - `postcss.config.mjs`
   - `.env.example`
   - `README.md`
   - All `*.md` files (documentation)

4. **Do NOT include:**
   - `node_modules/`
   - `.next/`
   - `dist/`
   - `build/`
   - `.git/`
   - `*.log`

5. **ZIP the folder** and rename to `project-source.zip`

---

## After Exporting

Once you have the ZIP file, on your local machine:

```bash
# 1. Extract
unzip project-source.zip

# 2. Navigate to folder
cd project-source

# 3. Install dependencies
pnpm install

# 4. Type check (verify 0 errors)
pnpm run type-check

# 5. Build everything
pnpm build

# 6. Run locally
npm run dev
```

---

## Files Available for Export

| File | Purpose | OS |
|------|---------|-----|
| `create-source-zip.js` | Node.js export script | All (via npm) |
| `export-source.sh` | Bash export script | Linux/macOS |
| `export-source.bat` | Windows batch script | Windows |

---

## Quick Reference

| Method | File Size | Speed | Ease |
|--------|-----------|-------|------|
| npm run export:zip | ~3-5 MB | Fast | Very Easy |
| Bash script | ~2-4 MB | Fast | Easy |
| Windows script | ~3-5 MB | Fast | Easy |
| Manual ZIP | ~3-5 MB | Slow | Moderate |

**Recommended:** Start with `npm run export:zip` - it's the most reliable and cross-platform.
