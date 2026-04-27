# RAG LLM Governance Platform

A comprehensive system for managing, evaluating, and monitoring RAG (Retrieval-Augmented Generation) applications with LLM governance metrics.

## Quick Start

### Prerequisites
- Node.js 18+
- MongoDB
- Both frontend and backend servers running

### Installation & Running

**1. Frontend (Terminal 1)**
```bash
cd /path/to/project
pnpm install
pnpm dev
```
Frontend runs on `http://localhost:3000`

**2. Backend (Terminal 2)**
```bash
cd /path/to/project/backend
pnpm install
pnpm dev
```
Backend API runs on `http://localhost:5001`

## Creating Applications with Sample Data

Two sample CSV files are included in the root folder:
- `sample_data_app1.csv` - 30 AI/ML Q&A records
- `sample_data_app2.csv` - 30 NLP/RAG records

**To upload:**
1. Go to "Create New Application" in the UI
2. Fill in application details (name, description, owner)
3. Select "Local Folder" as data source
4. Click "Browse Files" and select one of the sample CSV files
5. Click "Validate File" (validates CSV format)
6. Click "Create Application"
7. File automatically uploads and batch processing begins
8. Go to Dashboard and click "Refresh Metrics" after 2-3 seconds

## Dashboard Features

**Two Main Buttons:**
- **"Refresh Metrics"** - Fetches evaluation results (always visible when app selected)
- **"Process Raw Data"** - Triggers batch processing (appears when app needs processing)

**Data Flow:**
CSV Upload → Application Created → File Stored in MongoDB → Batch Processing → Metrics Generated → Dashboard Display

## Project Structure

- `/app` - Next.js frontend pages and components
- `/src/components` - React UI components
- `/backend/src` - Express backend API and services
- `sample_data_*.csv` - Test data files for evaluation

## MongoDB Collections

- `applicationmasters` - Application definitions
- `rawdatarecords` - Raw LLM interaction records (linked via applicationId)
- `evaluationrecords` - Evaluation results (linked via applicationId)
- `governancemetrics` - Governance metrics (linked via applicationId)
- `alerts` - Generated alerts (linked via applicationId)

## Troubleshooting

**CSV Validation Errors:**
- Ensure CSV has proper delimiters (comma, semicolon, tab, or pipe)
- File must be readable text format (.csv or .txt)

**No Metrics Appearing:**
- Wait 2-3 seconds after upload for batch processing to complete
- Click "Refresh Metrics" button to fetch latest data
- Check browser console (F12) for debug logs starting with `[v0]`

**Backend Not Running:**
- Verify backend server is running on port 5001
- Check Terminal 2 for startup messages and errors
- Ensure MongoDB is accessible
