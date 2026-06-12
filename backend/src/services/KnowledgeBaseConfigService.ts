import mongoose, { Types } from 'mongoose';
import { KnowledgeBaseConfig, KnowledgeBaseConfigInput } from '../types/models.js';
import { KnowledgeBaseConfigSchema } from '../schemas/index.js';
import { cryptoUtil } from '../utils/CryptoUtil.js';

/**
 * Knowledge Base Config Service
 * Handles CRUD operations for Knowledge Base configurations
 */
export class KnowledgeBaseConfigService {
  private readonly collection = 'knowledgebaseconfigs';

  /**
   * Create or update KB configuration for an application
   * Encrypts sensitive credentials before storing
   */
  async upsertConfig(input: KnowledgeBaseConfigInput): Promise<KnowledgeBaseConfig> {
    try {
      console.log('[v0-upsertConfig] 1. Input received for appId:', input.applicationId);
      console.log('[v0-upsertConfig] 2. Provider:', (input as any).kbLlmProvider, '| Api key length:', (input as any).kbllm_api_key?.length);

      // Encrypt sensitive fields
      console.log('[v0-upsertConfig] 3. Encrypting sensitive fields...');
      const encrypted = this.encryptSensitiveFields(input);
      
      // Verify encryption happened
      console.log('[v0-upsertConfig] 4. Encrypted kbllm_api_key type:', typeof (encrypted as any).kbllm_api_key);
      console.log('[v0-upsertConfig] 5. Encrypted kbllm_api_key length:', (encrypted as any).kbllm_api_key?.length);
      console.log('[v0-upsertConfig] 6. Encrypted kbllm_api_key contains colon (encrypted format):', (encrypted as any).kbllm_api_key?.includes(':'));

      // Save to MongoDB
      console.log('[v0-upsertConfig] 7. Saving to MongoDB with encrypted config...');
      console.log('[v0-upsertConfig] 7a. Encrypted object keys:', Object.keys(encrypted).join(', '));
      console.log('[v0-upsertConfig] 7b. Encrypted object has applicationId:', !!(encrypted as any).applicationId);
      
      const db = mongoose.connection;
      console.log('[v0-upsertConfig] 7c. MongoDB connection state:', db.readyState, '(0=disconnected, 1=connected, 2=connecting, 3=disconnecting)');
      
      const collection = db.collection(this.collection);
      console.log('[v0-upsertConfig] 7d. Collection name:', this.collection);

      const updateOp = {
        $set: { 
          ...encrypted, 
          updatedAt: new Date() 
        }
      };
      console.log('[v0-upsertConfig] 7e. Update operation has', Object.keys(updateOp.$set).length, 'fields');

      let result;
      try {
        result = await collection.findOneAndUpdate(
          { applicationId: input.applicationId },
          updateOp,
          { upsert: true, returnDocument: 'after' }
        );
        console.log('[v0-upsertConfig] 8. findOneAndUpdate returned:', !!result);
        console.log('[v0-upsertConfig] 8a. result.value exists:', !!result?.value);
        console.log('[v0-upsertConfig] 8b. result.ok:', result?.ok);
      } catch (mongoError: unknown) {
        const errorMsg = mongoError instanceof Error ? mongoError.message : String(mongoError);
        console.error('[v0-upsertConfig] 8-MONGO-ERROR:', errorMsg);
        console.error('[v0-upsertConfig] 8-MONGO-ERROR-STACK:', mongoError instanceof Error ? mongoError.stack : 'N/A');
        throw mongoError;
      }

      if (!result?.value) {
        console.error('[v0-upsertConfig] 9. ERROR: result.value is null or undefined');
        console.error('[v0-upsertConfig] 9a. Full result object:', JSON.stringify(result, null, 2));
        throw new Error('Failed to upsert configuration - result.value is null');
      }

      console.log('[v0-upsertConfig] 10. MongoDB upsert successful for appId:', input.applicationId);
      console.log('[v0-upsertConfig] 11. Saved config has kbllm_api_key with colon:', (result.value as any).kbllm_api_key?.includes(':'));
      console.log('[v0-upsertConfig] 12. Returning config');
      
      return result.value as KnowledgeBaseConfig;
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : 'N/A';
      console.error('[v0-upsertConfig] CATCH-BLOCK-ERROR:', errorMsg);
      console.error('[v0-upsertConfig] CATCH-BLOCK-STACK:', errorStack);
      throw this.handleError('upsertConfig', error);
    }
  }

  /**
   * Get KB configuration for an application
   */
  async getConfig(applicationId: string): Promise<KnowledgeBaseConfig | null> {
    try {
      console.log('[v0-getConfig] 1. Fetching config for appId:', applicationId);
      
      const db = mongoose.connection;
      console.log('[v0-getConfig] 1a. DB connection state:', db.readyState);
      
      const collection = db.collection(this.collection);
      console.log('[v0-getConfig] 1b. Querying collection:', this.collection);

      let config;
      try {
        config = (await collection.findOne({ applicationId })) as KnowledgeBaseConfig | null;
      } catch (mongoError: unknown) {
        const errorMsg = mongoError instanceof Error ? mongoError.message : String(mongoError);
        console.error('[v0-getConfig] 1c-MONGO-ERROR:', errorMsg);
        throw mongoError;
      }

      console.log('[v0-getConfig] 2. Found config:', !!config);
      
      if (!config) {
        console.log('[v0-getConfig] 2a. No config found for appId:', applicationId);
        return null;
      }

      console.log('[v0-getConfig] 2b. Config keys:', Object.keys(config).join(', '));
      console.log('[v0-getConfig] 2c. Config has encrypted kbllm_api_key:', !!((config as any).kbllm_api_key));

      // Decrypt sensitive fields (kbllm_* fields from stored data)
      console.log('[v0-getConfig] 3. Starting decryption of sensitive fields...');
      const decrypted = { ...config };
      
      let decryptedCount = 0;
      if ((decrypted as any).kbllm_api_key && typeof (decrypted as any).kbllm_api_key === 'string') {
        try {
          console.log('[v0-getConfig] 3a. Decrypting kbllm_api_key (encrypted length:', (decrypted as any).kbllm_api_key.length + ')');
          (decrypted as any).kbllm_api_key = cryptoUtil.decrypt((decrypted as any).kbllm_api_key);
          decryptedCount++;
          console.log('[v0-getConfig] 3a-OK. Decrypted kbllm_api_key (decrypted length:', (decrypted as any).kbllm_api_key.length + ')');
        } catch (decryptError: unknown) {
          const errorMsg = decryptError instanceof Error ? decryptError.message : String(decryptError);
          console.error('[v0-getConfig] 3a-DECRYPT-ERROR:', errorMsg);
          throw decryptError;
        }
      }
      if ((decrypted as any).kbllm_azure_endpoint && typeof (decrypted as any).kbllm_azure_endpoint === 'string') {
        try {
          console.log('[v0-getConfig] 3b. Decrypting kbllm_azure_endpoint');
          (decrypted as any).kbllm_azure_endpoint = cryptoUtil.decrypt((decrypted as any).kbllm_azure_endpoint);
          decryptedCount++;
        } catch (e) {
          console.error('[v0-getConfig] 3b-ERROR:', e instanceof Error ? e.message : String(e));
          throw e;
        }
      }
      if ((decrypted as any).kbllm_api_version && typeof (decrypted as any).kbllm_api_version === 'string') {
        try {
          console.log('[v0-getConfig] 3c. Decrypting kbllm_api_version');
          (decrypted as any).kbllm_api_version = cryptoUtil.decrypt((decrypted as any).kbllm_api_version);
          decryptedCount++;
        } catch (e) {
          console.error('[v0-getConfig] 3c-ERROR:', e instanceof Error ? e.message : String(e));
          throw e;
        }
      }
      if ((decrypted as any).kbllm_deployment && typeof (decrypted as any).kbllm_deployment === 'string') {
        try {
          console.log('[v0-getConfig] 3d. Decrypting kbllm_deployment');
          (decrypted as any).kbllm_deployment = cryptoUtil.decrypt((decrypted as any).kbllm_deployment);
          decryptedCount++;
        } catch (e) {
          console.error('[v0-getConfig] 3d-ERROR:', e instanceof Error ? e.message : String(e));
          throw e;
        }
      }
      
      // Decrypt embedding fields if present
      if ((decrypted as any).embedding_api_key && typeof (decrypted as any).embedding_api_key === 'string') {
        try {
          console.log('[v0-getConfig] 3e. Decrypting embedding_api_key');
          (decrypted as any).embedding_api_key = cryptoUtil.decrypt((decrypted as any).embedding_api_key);
          decryptedCount++;
        } catch (e) {
          console.error('[v0-getConfig] 3e-ERROR:', e instanceof Error ? e.message : String(e));
          throw e;
        }
      }
      if ((decrypted as any).embedding_azure_endpoint && typeof (decrypted as any).embedding_azure_endpoint === 'string') {
        try {
          console.log('[v0-getConfig] 3f. Decrypting embedding_azure_endpoint');
          (decrypted as any).embedding_azure_endpoint = cryptoUtil.decrypt((decrypted as any).embedding_azure_endpoint);
          decryptedCount++;
        } catch (e) {
          console.error('[v0-getConfig] 3f-ERROR:', e instanceof Error ? e.message : String(e));
          throw e;
        }
      }
      if ((decrypted as any).embedding_api_version && typeof (decrypted as any).embedding_api_version === 'string') {
        try {
          console.log('[v0-getConfig] 3g. Decrypting embedding_api_version');
          (decrypted as any).embedding_api_version = cryptoUtil.decrypt((decrypted as any).embedding_api_version);
          decryptedCount++;
        } catch (e) {
          console.error('[v0-getConfig] 3g-ERROR:', e instanceof Error ? e.message : String(e));
          throw e;
        }
      }
      if ((decrypted as any).embedding_deployment && typeof (decrypted as any).embedding_deployment === 'string') {
        try {
          console.log('[v0-getConfig] 3h. Decrypting embedding_deployment');
          (decrypted as any).embedding_deployment = cryptoUtil.decrypt((decrypted as any).embedding_deployment);
          decryptedCount++;
        } catch (e) {
          console.error('[v0-getConfig] 3h-ERROR:', e instanceof Error ? e.message : String(e));
          throw e;
        }
      }

      console.log('[v0-getConfig] 4. Decryption complete. Decrypted', decryptedCount, 'fields');
      console.log('[v0-getConfig] 5. Returning decrypted config for appId:', applicationId);
      return decrypted;
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : 'N/A';
      console.error('[v0-getConfig] CATCH-ERROR:', errorMsg);
      console.error('[v0-getConfig] CATCH-STACK:', errorStack);
      throw this.handleError('getConfig', error);
    }
  }

  /**
   * Update KB configuration
   */
  async updateConfig(applicationId: string, updates: Partial<KnowledgeBaseConfig>): Promise<KnowledgeBaseConfig> {
    try {
      if (!applicationId?.trim()) {
        throw new Error('Application ID is required');
      }

      const db = mongoose.connection;
      const collection = db.collection(this.collection);

      const result = await collection.findOneAndUpdate(
        { applicationId },
        { $set: { ...updates, updatedAt: new Date() } },
        { returnDocument: 'after' }
      );

      if (!result || !result.value) {
        throw new Error('Configuration not found');
      }

      return result.value as KnowledgeBaseConfig;
    } catch (error: unknown) {
      throw this.handleError('updateConfig', error);
    }
  }

  /**
   * Delete KB configuration
   */
  async deleteConfig(applicationId: string): Promise<void> {
    try {
      if (!applicationId?.trim()) {
        throw new Error('Application ID is required');
      }

      const db = mongoose.connection;
      const collection = db.collection(this.collection);

      const result = await collection.deleteOne({ applicationId });

      if (result.deletedCount === 0) {
        throw new Error('Configuration not found');
      }
    } catch (error: unknown) {
      throw this.handleError('deleteConfig', error);
    }
  }

  /**
   * Validate KB configuration (check required fields)
   */
  validateConfig(config: Partial<KnowledgeBaseConfig>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate embedding provider fields
    if (!config.embeddingProvider) {
      errors.push('Embedding provider is required');
    } else {
      switch (config.embeddingProvider) {
        case 'azure-openai': {
          // Accept exact param names (new) or legacy names
          const hasEndpoint = config.embedding_azure_endpoint || config.embeddingAzureEndpoint;
          const hasApiKey = config.embedding_api_key || config.embeddingAzureApiKey;
          const hasModel = config.embeddingModel || config.embeddingAzureDeploymentName;
          
          if (!hasEndpoint) errors.push('Embedding Azure Endpoint is required');
          if (!hasApiKey) errors.push('Embedding Azure API Key is required');
          if (!hasModel) errors.push('Embedding Model/Deployment is required');
          break;
        }

        case 'openai':
          if (!config.embeddingOpenaiApiKey) errors.push('Embedding OpenAI API Key is required');
          break;

        case 'aws-bedrock':
          if (!config.embeddingAwsRegion) errors.push('Embedding AWS Region is required');
          if (!config.embeddingBedrockModelId) errors.push('Embedding Bedrock Model ID is required');
          break;
      }
    }

    // Validate KB LLM provider fields
    if (!config.kbLlmProvider) {
      errors.push('KB LLM provider is required');
    } else {
      switch (config.kbLlmProvider) {
        case 'azure-openai': {
          // Accept exact param names (new) or legacy names
          const hasEndpoint = config.kbllm_azure_endpoint || config.kbLlmAzureEndpoint;
          const hasApiKey = config.kbllm_api_key || config.kbLlmAzureApiKey;
          const hasDeployment = config.kbllm_deployment || config.kbLlmAzureDeploymentName;
          
          if (!hasEndpoint) errors.push('KB LLM Azure Endpoint is required');
          if (!hasApiKey) errors.push('KB LLM Azure API Key is required');
          if (!hasDeployment) errors.push('KB LLM Azure Deployment is required');
          break;
        }

        case 'claude':
          if (!config.kbLlmClaudeApiKey) errors.push('KB LLM Claude API Key is required');
          break;

        case 'aws-bedrock':
          if (!config.kbLlmAwsRegion) errors.push('KB LLM AWS Region is required');
          if (!config.kbLlmBedrockModelId) errors.push('KB LLM Bedrock Model ID is required');
          break;

        case 'openai':
          if (!config.kbLlmOpenaiApiKey) errors.push('KB LLM OpenAI API Key is required');
          break;
      }
    }

    // Validate vector store
    if (!config.vectorStoreType) {
      errors.push('Vector store type is required');
    }

    // Validate chunking
    if ((config.chunkSize ?? 0) <= 0) {
      errors.push('Chunk size must be positive');
    }
    if ((config.overlapSize ?? 0) < 0) {
      errors.push('Overlap size cannot be negative');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Handle errors with proper logging
   */
  private handleError(method: string, error: unknown): Error {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[KnowledgeBaseConfigService.${method}] Error: ${message}`);
    return new Error(`KB Config Service Error in ${method}: ${message}`);
  }

  /**
   * Encrypt sensitive credential fields
   * @param config - Configuration object to encrypt
   * @returns Configuration with encrypted sensitive fields
   */
  private encryptSensitiveFields(config: KnowledgeBaseConfigInput): KnowledgeBaseConfigInput {
    console.log('[v0-encrypt] 1. Starting encryption of sensitive fields');
    const encrypted: KnowledgeBaseConfigInput = { ...config };

    // Encrypt LLM mandatory fields (kbllm_* fields from frontend)
    if ((encrypted as any).kbllm_api_key) {
      console.log('[v0-encrypt] 2a. Before encrypt - kbllm_api_key type:', typeof (encrypted as any).kbllm_api_key, 'length:', (encrypted as any).kbllm_api_key.length);
      const original = (encrypted as any).kbllm_api_key;
      (encrypted as any).kbllm_api_key = cryptoUtil.encrypt((encrypted as any).kbllm_api_key);
      console.log('[v0-encrypt] 2a-after. After encrypt - kbllm_api_key type:', typeof (encrypted as any).kbllm_api_key, 'length:', (encrypted as any).kbllm_api_key.length, 'contains colon:', (encrypted as any).kbllm_api_key.includes(':'));
    } else {
      console.log('[v0-encrypt] 2a-skip. No kbllm_api_key to encrypt');
    }

    if ((encrypted as any).kbllm_azure_endpoint) {
      console.log('[v0-encrypt] 2b. Encrypting kbllm_azure_endpoint');
      (encrypted as any).kbllm_azure_endpoint = cryptoUtil.encrypt((encrypted as any).kbllm_azure_endpoint);
    }
    if ((encrypted as any).kbllm_api_version) {
      console.log('[v0-encrypt] 2c. Encrypting kbllm_api_version');
      (encrypted as any).kbllm_api_version = cryptoUtil.encrypt((encrypted as any).kbllm_api_version);
    }
    if ((encrypted as any).kbllm_deployment) {
      console.log('[v0-encrypt] 2d. Encrypting kbllm_deployment');
      (encrypted as any).kbllm_deployment = cryptoUtil.encrypt((encrypted as any).kbllm_deployment);
    }

    // Encrypt embedding optional fields
    if ((encrypted as any).embedding_api_key) {
      console.log('[v0-encrypt] 3a. Encrypting embedding_api_key');
      (encrypted as any).embedding_api_key = cryptoUtil.encrypt((encrypted as any).embedding_api_key);
    }
    if ((encrypted as any).embedding_azure_endpoint) {
      console.log('[v0-encrypt] 3b. Encrypting embedding_azure_endpoint');
      (encrypted as any).embedding_azure_endpoint = cryptoUtil.encrypt((encrypted as any).embedding_azure_endpoint);
    }
    if ((encrypted as any).embedding_api_version) {
      console.log('[v0-encrypt] 3c. Encrypting embedding_api_version');
      (encrypted as any).embedding_api_version = cryptoUtil.encrypt((encrypted as any).embedding_api_version);
    }
    if ((encrypted as any).embedding_deployment) {
      console.log('[v0-encrypt] 3d. Encrypting embedding_deployment');
      (encrypted as any).embedding_deployment = cryptoUtil.encrypt((encrypted as any).embedding_deployment);
    }

    console.log('[v0-encrypt] 4. Encryption complete. Encrypted object has kbllm_api_key with colon:', (encrypted as any).kbllm_api_key?.includes(':'));
    return encrypted;
  }
}

export const kbConfigService = new KnowledgeBaseConfigService();
