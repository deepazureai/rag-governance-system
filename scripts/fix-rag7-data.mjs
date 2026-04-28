import fetch from 'node-fetch';

const APP_ID = 'app_1777231487619_b14sc56d2'; // RAGApp7
const API_URL = 'http://localhost:5001/api';

// Your CSV data
const CSV_DATA = `userId,sessionId,userPrompt,context,llmResponse,promptTimestamp,contextRetrievalStartTime,contextRetrievalEndTime,llmRequestStartTime,llmResponseEndTime,contextChunkCount,contextTotalLengthWords,promptLengthWords,responseLengthWords,status
user_001,session_001,What is machine learning?,Machine learning is a subset of AI,Machine learning enables computers to learn from data,2024-01-15T10:00:00Z,2024-01-15T10:00:01Z,2024-01-15T10:00:02Z,2024-01-15T10:00:02Z,2024-01-15T10:00:04Z,3,150,4,80,success
user_002,session_002,Explain neural networks,Neural networks are inspired by biological neurons,Neural networks are computational models inspired by biological neural networks,2024-01-15T10:15:00Z,2024-01-15T10:15:01Z,2024-01-15T10:15:03Z,2024-01-15T10:15:03Z,2024-01-15T10:15:08Z,4,220,3,120,success
user_003,session_003,What is deep learning?,Deep learning uses multiple layers of neural networks,Deep learning is a subset of machine learning using artificial neural networks,2024-01-15T10:30:00Z,2024-01-15T10:30:01Z,2024-01-15T10:30:02Z,2024-01-15T10:30:02Z,2024-01-15T10:30:05Z,3,180,3,95,success
user_004,session_004,How do transformers work?,Transformers use attention mechanisms for sequence processing,Transformers are neural network architecture models that use attention mechanisms,2024-01-15T10:45:00Z,2024-01-15T10:45:01Z,2024-01-15T10:45:03Z,2024-01-15T10:45:03Z,2024-01-15T10:45:07Z,5,250,4,110,success
user_005,session_005,What is NLP?,Natural Language Processing processes human language,NLP is a field of AI concerned with interactions between computers and human language,2024-01-15T11:00:00Z,2024-01-15T11:00:01Z,2024-01-15T11:00:02Z,2024-01-15T11:00:02Z,2024-01-15T11:00:05Z,3,160,3,100,success`;

async function uploadAndProcess() {
  try {
    console.log('\n=== Step 1: Uploading CSV Data ===');
    console.log(`Uploading to app: ${APP_ID}\n`);

    const uploadResponse = await fetch(
      `${API_URL}/applications/${APP_ID}/upload-raw-data`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csvData: CSV_DATA }),
      }
    );

    const uploadResult = await uploadResponse.json();
    console.log('Upload Response:', uploadResult);

    if (!uploadResult.success) {
      console.error('Upload failed:', uploadResult);
      return;
    }

    console.log(`✓ Successfully uploaded ${uploadResult.recordsUploaded} records\n`);

    console.log('=== Step 2: Triggering Batch Processing ===\n');

    const batchResponse = await fetch(
      `${API_URL}/applications/${APP_ID}/batch-process`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dataSource: {
            type: 'local_folder',
            config: {},
          },
        }),
      }
    );

    const batchResult = await batchResponse.json();
    console.log('Batch Process Response:', batchResult);

    if (batchResult.success) {
      console.log('✓ Batch processing initiated!\n');
      console.log('⏳ Waiting 3 seconds for processing to complete...\n');

      // Wait for batch processing to complete
      await new Promise((resolve) => setTimeout(resolve, 3000));

      console.log('=== Step 3: Checking Metrics ===\n');

      const metricsResponse = await fetch(
        `${API_URL}/metrics/refresh`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ applicationIds: [APP_ID] }),
        }
      );

      const metricsResult = await metricsResponse.json();
      console.log('Metrics Response:', metricsResult);

      if (metricsResult.success) {
        console.log('\n✓ SUCCESS! Metrics are now available for RAGApp7');
        console.log('Go to your dashboard and refresh to see the data!\n');
      }
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

uploadAndProcess();
