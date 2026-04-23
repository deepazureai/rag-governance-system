import { MongoClient, Db, Collection } from 'mongodb';
import { logger } from './utils';
import { config } from './config';
import { 
  PollingState, 
  RawDataRecord, 
  DatabaseConnection, 
  DatabaseSchemaMapping 
} from './types';

let client: MongoClient;
let db: Db;

export async function connectMongoDB(): Promise<void> {
  try {
    logger.info('Connecting to MongoDB...', { url: config.mongoDbUrl });
    client = new MongoClient(config.mongoDbUrl);
    await client.connect();
    db = client.db();
    logger.info('Connected to MongoDB successfully');

    // Create indexes for better performance
    await createIndexes();
  } catch (error) {
    logger.error('Failed to connect to MongoDB', { error });
    throw error;
  }
}

export async function disconnectMongoDB(): Promise<void> {
  if (client) {
    try {
      await client.close();
      logger.info('Disconnected from MongoDB');
    } catch (error) {
      logger.error('Error disconnecting from MongoDB', { error });
    }
  }
}

async function createIndexes(): Promise<void> {
  try {
    const pollingStateCollection = db.collection('pollingstate');
    await pollingStateCollection.createIndex({ applicationId: 1, connectionId: 1 });
    await pollingStateCollection.createIndex({ lastPolledAt: 1 });

    const rawDataCollection = db.collection('rawdatarecords');
    await rawDataCollection.createIndex({ applicationId: 1 });
    await rawDataCollection.createIndex({ connectionId: 1 });
    await rawDataCollection.createIndex({ sourceId: 1, applicationId: 1 }, { unique: true });
    await rawDataCollection.createIndex({ fetchedAt: 1 });

    logger.info('MongoDB indexes created successfully');
  } catch (error) {
    logger.error('Error creating indexes', { error });
  }
}

// Polling State Management
export async function getPollingState(
  applicationId: string,
  connectionId: string,
  mappingId: string
): Promise<PollingState | null> {
  const collection = db.collection('pollingstate') as Collection<PollingState>;
  return collection.findOne({ applicationId, connectionId, mappingId });
}

export async function initializePollingState(
  applicationId: string,
  connectionId: string,
  mappingId: string
): Promise<PollingState> {
  const collection = db.collection('pollingstate') as Collection<PollingState>;
  const pollingState: PollingState = {
    applicationId,
    connectionId,
    mappingId,
    lastSeenId: 0,
    lastPolledAt: new Date(),
    recordsProcessed: 0,
    status: 'active',
    retryCount: 0,
    updatedAt: new Date(),
  };

  const result = await collection.updateOne(
    { applicationId, connectionId, mappingId },
    { $setOnInsert: pollingState },
    { upsert: true }
  );

  return getPollingState(applicationId, connectionId, mappingId) as Promise<PollingState>;
}

export async function updatePollingState(
  applicationId: string,
  connectionId: string,
  mappingId: string,
  lastSeenId: number,
  recordsProcessed: number,
  error?: string
): Promise<void> {
  const collection = db.collection('pollingstate') as Collection<PollingState>;
  const update: any = {
    lastSeenId,
    recordsProcessed,
    lastPolledAt: new Date(),
    status: error ? 'failed' : 'active',
    updatedAt: new Date(),
  };

  if (error) {
    update.lastError = error;
    update.retryCount = { $inc: 1 };
    update.nextRetryAt = new Date(Date.now() + 60000); // Retry in 1 minute
  } else {
    update.retryCount = 0;
    update.$unset = { lastError: '', nextRetryAt: '' };
  }

  await collection.updateOne(
    { applicationId, connectionId, mappingId },
    { $set: update },
    { upsert: true }
  );
}

// Raw Data Management
export async function upsertRawDataRecords(records: RawDataRecord[]): Promise<number> {
  if (records.length === 0) return 0;

  const collection = db.collection('rawdatarecords') as Collection<RawDataRecord>;
  let upsertedCount = 0;

  for (const record of records) {
    const result = await collection.updateOne(
      { sourceId: record.sourceId, applicationId: record.applicationId },
      { $set: record },
      { upsert: true }
    );

    if (result.upsertedId || result.modifiedCount > 0) {
      upsertedCount++;
    }
  }

  return upsertedCount;
}

// Connection Management
export async function getConnections(applicationId?: string): Promise<DatabaseConnection[]> {
  const collection = db.collection('databaseconnections') as Collection<DatabaseConnection>;
  const query = applicationId ? { applicationId } : {};
  return collection.find(query).toArray();
}

// Schema Mapping Management
export async function getSchemaMappings(applicationId?: string): Promise<DatabaseSchemaMapping[]> {
  const collection = db.collection('databaseschemamappings') as Collection<DatabaseSchemaMapping>;
  const query = applicationId ? { applicationId } : {};
  return collection.find(query).toArray();
}

export function getDb(): Db {
  if (!db) {
    throw new Error('MongoDB not connected');
  }
  return db;
}
