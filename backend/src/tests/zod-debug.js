/**
 * Minimal test to debug Zod schema validation issue
 */

import { z } from 'zod';

const TestSchema = z.object({
  applicationId: z.string().min(1),
  kbLlmProvider: z.enum(['azure-openai', 'claude', 'aws-bedrock', 'openai']).optional(),
  provider: z.enum(['azure-openai', 'claude', 'aws-bedrock', 'openai']).optional(),
  kbllm_api_key: z.string().optional(),
  kbllm_azure_endpoint: z.string().optional(),
  kbllm_deployment: z.string().optional(),
  embeddingProvider: z.enum(['azure-openai', 'openai', 'aws-bedrock']).optional(),
  embedding_api_key: z.string().optional(),
  embedding_azure_endpoint: z.string().optional(),
  temperature: z.number().optional(),
});

// Test data - exactly what frontend is sending
const testData = {
  applicationId: 'app_1780570496171_caowhfosn',
  kbLlmProvider: 'azure-openai',
  kbllm_skipSslVerification: true,
  kbllm_azure_endpoint: 'https://deeptestazureai.openai.azure.com',
  kbllm_api_version: '2025-01-01-preview',
  kbllm_api_key: 'test-key',
  kbllm_deployment: 'gpt-4.1-mini',
  embeddingProvider: 'azure-openai',
  embeddingModel: ' text-embedding-3-small',
  embedding_skipSslVerification: true,
  embedding_azure_endpoint: 'https://deeptestazureai.openai.azure.com',
  embedding_api_version: '2023-05-15',
  embedding_api_key: 'test-key-2',
  temperature: 0.7,
  maxTokens: 2048,
  isDefault: true,
};

console.log('Testing Zod validation...');
const result = TestSchema.safeParse(testData);

if (!result.success) {
  console.error('Validation FAILED:');
  console.error(JSON.stringify(result.error.errors, null, 2));
} else {
  console.log('Validation PASSED:');
  console.log(JSON.stringify(result.data, null, 2));
}
