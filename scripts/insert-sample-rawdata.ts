import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config({ path: '../backend/.env' });

const MONGODB_URL = process.env.DATABASE_URL || 'mongodb://localhost:27017/rag-evaluation';

async function insertSampleData() {
  try {
    console.log('[Script] Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URL);
    console.log('[Script] Connected to MongoDB');

    // First, fetch the first application from applicationmasters to link raw data to it
    const appsCollection = mongoose.connection.collection('applicationmasters');
    const firstApp = await appsCollection.findOne({});

    if (!firstApp) {
      console.error('[Script] ERROR: No applications found in applicationmasters collection');
      console.error('[Script] Please create an application first before inserting raw data');
      process.exit(1);
    }

    const applicationId = firstApp.id;
    console.log(`[Script] Found application: ${firstApp.name} (ID: ${applicationId})`);
    console.log(`[Script] Will link all raw data records to this application`);

    // Sample raw data records with applicationId linking
    const sampleRawData = [
      {
        applicationId,
        userId: 'user_001',
        sessionId: 'session_001',
        userPrompt: 'What is machine learning?',
        context: 'Machine learning is a subset of artificial intelligence that enables systems to learn from data',
        llmResponse: 'Machine learning is a branch of AI that allows computer systems to improve their performance through experience and data analysis',
        promptTimestamp: new Date('2026-01-15T10:30:00Z'),
        contextRetrievalStartTime: new Date('2026-01-15T10:30:01Z'),
        contextRetrievalEndTime: new Date('2026-01-15T10:30:02Z'),
        llmRequestStartTime: new Date('2026-01-15T10:30:02Z'),
        llmResponseEndTime: new Date('2026-01-15T10:30:05Z'),
        contextChunkCount: 3,
        contextTotalLengthWords: 450,
        promptLengthWords: 4,
        responseLengthWords: 120,
        status: 'success',
        createdAt: new Date(),
      },
      {
        applicationId,
        userId: 'user_002',
        sessionId: 'session_002',
        userPrompt: 'Explain neural networks',
        context: 'Neural networks are computing systems inspired by biological neurons found in animal brains',
        llmResponse: 'Neural networks are interconnected layers of artificial neurons that process information similar to biological brains',
        promptTimestamp: new Date('2026-01-15T10:35:00Z'),
        contextRetrievalStartTime: new Date('2026-01-15T10:35:01Z'),
        contextRetrievalEndTime: new Date('2026-01-15T10:35:02Z'),
        llmRequestStartTime: new Date('2026-01-15T10:35:02Z'),
        llmResponseEndTime: new Date('2026-01-15T10:35:06Z'),
        contextChunkCount: 4,
        contextTotalLengthWords: 520,
        promptLengthWords: 3,
        responseLengthWords: 135,
        status: 'success',
        createdAt: new Date(),
      },
      {
        applicationId,
        userId: 'user_003',
        sessionId: 'session_003',
        userPrompt: 'What is deep learning?',
        context: 'Deep learning uses multiple layers of neural networks to process complex data patterns',
        llmResponse: 'Deep learning is a subset of machine learning using neural networks with multiple layers to automatically learn hierarchical representations',
        promptTimestamp: new Date('2026-01-15T10:40:00Z'),
        contextRetrievalStartTime: new Date('2026-01-15T10:40:01Z'),
        contextRetrievalEndTime: new Date('2026-01-15T10:40:02Z'),
        llmRequestStartTime: new Date('2026-01-15T10:40:02Z'),
        llmResponseEndTime: new Date('2026-01-15T10:40:08Z'),
        contextChunkCount: 3,
        contextTotalLengthWords: 420,
        promptLengthWords: 4,
        responseLengthWords: 110,
        status: 'success',
        createdAt: new Date(),
      },
      {
        applicationId,
        userId: 'user_001',
        sessionId: 'session_004',
        userPrompt: 'Define supervised learning',
        context: 'Supervised learning requires labeled training data to guide the learning process',
        llmResponse: 'Supervised learning uses labeled training data where inputs are paired with correct outputs to train models',
        promptTimestamp: new Date('2026-01-15T10:45:00Z'),
        contextRetrievalStartTime: new Date('2026-01-15T10:45:01Z'),
        contextRetrievalEndTime: new Date('2026-01-15T10:45:03Z'),
        llmRequestStartTime: new Date('2026-01-15T10:45:03Z'),
        llmResponseEndTime: new Date('2026-01-15T10:45:10Z'),
        contextChunkCount: 2,
        contextTotalLengthWords: 350,
        promptLengthWords: 3,
        responseLengthWords: 95,
        status: 'success',
        createdAt: new Date(),
      },
      {
        applicationId,
        userId: 'user_004',
        sessionId: 'session_005',
        userPrompt: 'Explain unsupervised learning',
        context: 'Unsupervised learning finds patterns in unlabeled data without predetermined outcomes',
        llmResponse: 'Unsupervised learning discovers patterns and structures in data without labeled examples or predefined targets',
        promptTimestamp: new Date('2026-01-15T10:50:00Z'),
        contextRetrievalStartTime: new Date('2026-01-15T10:50:01Z'),
        contextRetrievalEndTime: new Date('2026-01-15T10:50:02Z'),
        llmRequestStartTime: new Date('2026-01-15T10:50:02Z'),
        llmResponseEndTime: new Date('2026-01-15T10:50:07Z'),
        contextChunkCount: 3,
        contextTotalLengthWords: 480,
        promptLengthWords: 3,
        responseLengthWords: 125,
        status: 'success',
        createdAt: new Date(),
      },
    ];

    const collection = mongoose.connection.collection('rawdatarecords');

    // Clear existing data
    await collection.deleteMany({});
    console.log('[Script] Cleared existing rawdatarecords');

    // Insert sample data
    const result = await collection.insertMany(sampleRawData);
    console.log(`[Script] Inserted ${result.insertedCount} sample raw data records`);
    console.log(`[Script] All records linked to application: ${firstApp.name}`);

    console.log('[Script] Sample data insertion complete!');
    process.exit(0);
  } catch (error: any) {
    console.error('[Script] Error inserting sample data:', error.message);
    process.exit(1);
  }
}

insertSampleData();
