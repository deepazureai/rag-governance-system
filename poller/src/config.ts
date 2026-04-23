import dotenv from 'dotenv';
import { PollingConfig } from './types';

dotenv.config();

export const config: PollingConfig = {
  mongoDbUrl: process.env.MONGODB_URL || 'mongodb://localhost:27017/eval_platform',
  postgresHost: process.env.POSTGRES_HOST || 'localhost',
  postgresPort: parseInt(process.env.POSTGRES_PORT || '5432', 10),
  postgresUser: process.env.POSTGRES_USER || 'postgres',
  postgresPassword: process.env.POSTGRES_PASSWORD || '',
  postgresDatabase: process.env.POSTGRES_DATABASE || 'postgres',
  pollIntervalMinutes: parseInt(process.env.POLL_INTERVAL_MINUTES || '5', 10),
  batchSize: parseInt(process.env.BATCH_SIZE || '1000', 10),
  maxRetries: parseInt(process.env.MAX_RETRIES || '3', 10),
  backoffMultiplier: parseFloat(process.env.BACKOFF_MULTIPLIER || '2'),
  initialBackoffMs: parseInt(process.env.INITIAL_BACKOFF_MS || '1000', 10),
  logLevel: process.env.LOG_LEVEL || 'info',
  filterApplicationId: process.env.FILTER_APPLICATION_ID,
  shutdownTimeoutSeconds: parseInt(process.env.SHUTDOWN_TIMEOUT_SECONDS || '30', 10),
  azureKeyVaultUrl: process.env.AZURE_KEYVAULT_URL,
  azureTenantId: process.env.AZURE_TENANT_ID,
  azureClientId: process.env.AZURE_CLIENT_ID,
  azureClientSecret: process.env.AZURE_CLIENT_SECRET,
};

export default config;
