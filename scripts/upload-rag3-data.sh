#!/bin/bash
# Script to upload CSV data to RAG-3 application and trigger batch processing

# Replace with your actual RAG-3 application ID
APP_ID="app_1777226606033_dpgw1e5vg"
API_URL="http://localhost:5001/api"

# CSV data with proper headers and formatting
CSV_DATA="userId,sessionId,userPrompt,context,llmResponse,promptTimestamp,contextRetrievalStartTime,contextRetrievalEndTime,llmRequestStartTime,llmResponseEndTime,contextChunkCount,contextTotalLengthWords,promptLengthWords,responseLengthWords,status
user_001,session_001,What is machine learning?,Machine learning is a subset of AI,Machine learning enables computers to learn from data,2024-01-15T10:00:00Z,2024-01-15T10:00:01Z,2024-01-15T10:00:02Z,2024-01-15T10:00:02Z,2024-01-15T10:00:04Z,3,150,4,80,success
user_002,session_002,Explain neural networks,Neural networks are inspired by biological neurons,Neural networks are computational models inspired by biological neural networks,2024-01-15T10:15:00Z,2024-01-15T10:15:01Z,2024-01-15T10:15:03Z,2024-01-15T10:15:03Z,2024-01-15T10:15:08Z,4,220,3,120,success
user_003,session_003,What is deep learning?,Deep learning uses multiple layers of neural networks,Deep learning is a subset of machine learning using artificial neural networks,2024-01-15T10:30:00Z,2024-01-15T10:30:01Z,2024-01-15T10:30:02Z,2024-01-15T10:30:02Z,2024-01-15T10:30:05Z,3,180,3,95,success
user_004,session_004,How do transformers work?,Transformers use attention mechanisms for sequence processing,Transformers are neural network architecture models that use attention mechanisms,2024-01-15T10:45:00Z,2024-01-15T10:45:01Z,2024-01-15T10:45:03Z,2024-01-15T10:45:03Z,2024-01-15T10:45:07Z,5,250,4,110,success
user_005,session_005,What is NLP?,Natural Language Processing processes human language,NLP is a field of AI concerned with interactions between computers and human language,2024-01-15T11:00:00Z,2024-01-15T11:00:01Z,2024-01-15T11:00:02Z,2024-01-15T11:00:02Z,2024-01-15T11:00:05Z,3,160,3,100,success"

echo "Step 1: Uploading CSV data to $APP_ID..."
UPLOAD_RESPONSE=$(curl -s -X POST "$API_URL/applications/$APP_ID/upload-raw-data" \
  -H "Content-Type: application/json" \
  -d "{\"csvData\": $(echo -n "$CSV_DATA" | jq -Rs .)}")

echo "Upload Response: $UPLOAD_RESPONSE"

echo ""
echo "Step 2: Triggering batch processing for $APP_ID..."
BATCH_RESPONSE=$(curl -s -X POST "$API_URL/applications/$APP_ID/batch-process" \
  -H "Content-Type: application/json" \
  -d '{"dataSource": {"type": "local_folder", "config": {}}}')

echo "Batch Process Response: $BATCH_RESPONSE"

echo ""
echo "Data upload and batch processing initiated!"
echo "Check the dashboard in a few seconds to see metrics appear for RAG-3"
