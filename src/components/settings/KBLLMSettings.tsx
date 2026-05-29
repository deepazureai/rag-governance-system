'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { KnowledgeBaseConfig, ApiResponse } from '@/src/types/models';

type EmbeddingProvider = 'azure-openai' | 'openai' | 'aws-bedrock';
type KBLLMProvider = 'azure-openai' | 'claude' | 'aws-bedrock' | 'openai';
type VectorStoreType = 'chroma' | 'pinecone' | 'weaviate';

interface ProviderField {
  name: string;
  label: string;
  type: 'text' | 'password' | 'number';
  required: boolean;
  placeholder?: string;
}

const EMBEDDING_FIELDS: Record<EmbeddingProvider, ProviderField[]> = {
  'azure-openai': [
    { name: 'embeddingAzureEndpoint', label: 'Azure Endpoint', type: 'text', required: true, placeholder: 'https://your-resource.openai.azure.com' },
    { name: 'embeddingAzureApiKey', label: 'API Key', type: 'password', required: true },
    { name: 'embeddingAzureDeploymentName', label: 'Deployment Name', type: 'text', required: true, placeholder: 'text-embedding-3-small' },
  ],
  'openai': [
    { name: 'embeddingOpenaiApiKey', label: 'API Key', type: 'password', required: true },
  ],
  'aws-bedrock': [
    { name: 'embeddingAwsRegion', label: 'AWS Region', type: 'text', required: true, placeholder: 'us-east-1' },
    { name: 'embeddingAwsAccessKeyId', label: 'AWS Access Key ID', type: 'password', required: true },
    { name: 'embeddingAwsSecretAccessKey', label: 'AWS Secret Access Key', type: 'password', required: true },
    { name: 'embeddingBedrockModelId', label: 'Model ID', type: 'text', required: true },
  ],
};

const KB_LLM_FIELDS: Record<KBLLMProvider, ProviderField[]> = {
  'azure-openai': [
    { name: 'kbLlmAzureEndpoint', label: 'Azure Endpoint', type: 'text', required: true, placeholder: 'https://your-resource.openai.azure.com' },
    { name: 'kbLlmAzureApiKey', label: 'API Key', type: 'password', required: true },
    { name: 'kbLlmAzureDeploymentName', label: 'Deployment Name', type: 'text', required: true },
  ],
  'openai': [
    { name: 'kbLlmOpenaiApiKey', label: 'API Key', type: 'password', required: true },
    { name: 'kbLlmOpenaiModel', label: 'Model', type: 'text', required: true, placeholder: 'gpt-4-turbo' },
  ],
  'claude': [
    { name: 'kbLlmClaudeApiKey', label: 'API Key', type: 'password', required: true },
    { name: 'kbLlmClaudeModel', label: 'Model', type: 'text', required: true, placeholder: 'claude-3-opus-20240229' },
  ],
  'aws-bedrock': [
    { name: 'kbLlmAwsRegion', label: 'AWS Region', type: 'text', required: true, placeholder: 'us-east-1' },
    { name: 'kbLlmAwsAccessKeyId', label: 'AWS Access Key ID', type: 'password', required: true },
    { name: 'kbLlmAwsSecretAccessKey', label: 'AWS Secret Access Key', type: 'password', required: true },
    { name: 'kbLlmBedrockModelId', label: 'Model ID', type: 'text', required: true },
  ],
};

interface KBLLMSettingsProps {
  applicationId: string;
}

export const KBLLMSettings: React.FC<KBLLMSettingsProps> = ({ applicationId }) => {
  const [embeddingProvider, setEmbeddingProvider] = useState<EmbeddingProvider>('azure-openai');
  const [kbLlmProvider, setKbLlmProvider] = useState<KBLLMProvider>('azure-openai');
  const [vectorStoreType, setVectorStoreType] = useState<VectorStoreType>('chroma');
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [savedConfig, setSavedConfig] = useState<KnowledgeBaseConfig | null>(null);
  const [chunkSize, setChunkSize] = useState(1024);
  const [overlapSize, setOverlapSize] = useState(100);
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(2048);

  // Load existing config on mount
  useEffect(() => {
    const loadConfig = async (): Promise<void> => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';
        const response = await fetch(`${apiUrl}/api/kb-config/app/${applicationId}`);
        
        if (response.ok) {
          const data = (await response.json()) as ApiResponse<KnowledgeBaseConfig>;
          if (data.data) {
            setSavedConfig(data.data);
            setEmbeddingProvider(data.data.embeddingProvider);
            setKbLlmProvider(data.data.kbLlmProvider);
            setVectorStoreType(data.data.vectorStoreType);
            setChunkSize(data.data.chunkSize ?? 1024);
            setOverlapSize(data.data.overlapSize ?? 100);
            setTemperature(data.data.temperature ?? 0.7);
            setMaxTokens(data.data.maxTokens ?? 2048);
            
            // Populate form with existing values
            if (data.data) {
              const form: Record<string, string> = {};
              const embeddingProvider = data.data.embeddingProvider || 'openai';
              const kbLlmProvider = data.data.kbLlmProvider || 'azure';
              const allFields = [...Object.values(EMBEDDING_FIELDS[embeddingProvider] ?? {}), ...Object.values(KB_LLM_FIELDS[kbLlmProvider] ?? {})];
              const configData = data.data;
              allFields.forEach((field: ProviderField) => {
                const value = configData[field.name as keyof KnowledgeBaseConfig];
                if (value && typeof value === 'string') {
                  form[field.name] = value;
                }
              });
              setFormData(form);
            }
          }
        }
      } catch (error: unknown) {
        console.error('[v0] Error loading KB config:', error);
      }
    };

    loadConfig();
  }, [applicationId]);

  const handleInputChange = (fieldName: string, value: string): void => {
    setFormData(prev => ({
      ...prev,
      [fieldName]: value,
    }));
    setMessage(null);
  };

  const validateForm = (): boolean => {
    const embeddingFields = EMBEDDING_FIELDS[embeddingProvider];
    const kbLlmFields = KB_LLM_FIELDS[kbLlmProvider];
    const allFields = [...embeddingFields, ...kbLlmFields];
    
    return allFields.every(field => {
      if (field.required) {
        const value = formData[field.name];
        return typeof value === 'string' && value.trim().length > 0;
      }
      return true;
    });
  };

  const handleSave = async (): Promise<void> => {
    if (!validateForm()) {
      setMessage({ type: 'error', text: 'Please fill in all required fields' });
      return;
    }

    setIsLoading(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';
      const payload = {
        applicationId,
        embeddingProvider,
        kbLlmProvider,
        vectorStoreType,
        chunkSize,
        overlapSize,
        temperature,
        maxTokens,
        ...formData,
      };

      const response = await fetch(`${apiUrl}/api/kb-config/app/${applicationId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const data = (await response.json()) as ApiResponse<KnowledgeBaseConfig>;
        setSavedConfig(data.data ?? null);
        setMessage({ type: 'success', text: 'KB configuration saved successfully!' });
      } else {
        const error = await response.text();
        setMessage({ type: 'error', text: `Failed to save: ${error}` });
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      setMessage({ type: 'error', text: `Error: ${errorMessage}` });
    } finally {
      setIsLoading(false);
    }
  };

  const embeddingFields = EMBEDDING_FIELDS[embeddingProvider];
  const kbLlmFields = KB_LLM_FIELDS[kbLlmProvider];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Knowledge Base & Embedding Configuration</h3>
        <p className="text-sm text-gray-600 mb-6">
          Configure embedding provider for document vectorization and LLM for generating KB responses from retrieved context.
        </p>
      </div>

      {savedConfig && (
        <Card className="p-4 bg-green-50 border-green-200">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <p className="text-sm font-medium text-green-900">Configuration Active</p>
              <div className="flex gap-2">
                <Badge variant="outline">Embedding: {savedConfig.embeddingProvider}</Badge>
                <Badge variant="outline">KB LLM: {savedConfig.kbLlmProvider}</Badge>
              </div>
            </div>
          </div>
        </Card>
      )}

      <Tabs defaultValue="embedding" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="embedding">Embedding Provider</TabsTrigger>
          <TabsTrigger value="kb-llm">KB NLP LLM</TabsTrigger>
          <TabsTrigger value="vector-store">Vector Store</TabsTrigger>
        </TabsList>

        {/* Embedding Provider Tab */}
        <TabsContent value="embedding" className="space-y-4 mt-4">
          <div>
            <label className="block text-sm font-medium mb-2">Embedding Provider</label>
            <Select value={embeddingProvider} onValueChange={(value: string) => {
              setEmbeddingProvider(value as EmbeddingProvider);
              setFormData({});
            }}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="azure-openai">Azure OpenAI</SelectItem>
                <SelectItem value="openai">OpenAI</SelectItem>
                <SelectItem value="aws-bedrock">AWS Bedrock</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {embeddingFields.map((field: ProviderField) => (
            <div key={field.name}>
              <label className="block text-sm font-medium mb-1">
                {field.label}
                {field.required && <span className="text-red-500 ml-1">*</span>}
              </label>
              <Input
                type={field.type}
                placeholder={field.placeholder}
                value={formData[field.name] ?? ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange(field.name, e.target.value)}
                className="w-full"
              />
            </div>
          ))}
        </TabsContent>

        {/* KB NLP LLM Tab */}
        <TabsContent value="kb-llm" className="space-y-4 mt-4">
          <div>
            <label className="block text-sm font-medium mb-2">KB NLP LLM Provider</label>
            <Select value={kbLlmProvider} onValueChange={(value: string) => {
              setKbLlmProvider(value as KBLLMProvider);
            }}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="azure-openai">Azure OpenAI</SelectItem>
                <SelectItem value="openai">OpenAI</SelectItem>
                <SelectItem value="claude">Claude (Anthropic)</SelectItem>
                <SelectItem value="aws-bedrock">AWS Bedrock</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {kbLlmFields.map((field: ProviderField) => (
            <div key={field.name}>
              <label className="block text-sm font-medium mb-1">
                {field.label}
                {field.required && <span className="text-red-500 ml-1">*</span>}
              </label>
              <Input
                type={field.type}
                placeholder={field.placeholder}
                value={formData[field.name] ?? ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange(field.name, e.target.value)}
                className="w-full"
              />
            </div>
          ))}

          <div className="grid grid-cols-2 gap-4 pt-4">
            <div>
              <label className="block text-sm font-medium mb-1">Temperature (0-2)</label>
              <Input
                type="number"
                min="0"
                max="2"
                step="0.1"
                value={temperature}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTemperature(parseFloat(e.target.value))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Max Tokens</label>
              <Input
                type="number"
                min="100"
                max="4000"
                value={maxTokens}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMaxTokens(parseInt(e.target.value, 10))}
              />
            </div>
          </div>
        </TabsContent>

        {/* Vector Store Tab */}
        <TabsContent value="vector-store" className="space-y-4 mt-4">
          <div>
            <label className="block text-sm font-medium mb-2">Vector Store Type</label>
            <Select value={vectorStoreType} onValueChange={(value: string) => {
              setVectorStoreType(value as VectorStoreType);
            }}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="chroma">Chroma</SelectItem>
                <SelectItem value="pinecone">Pinecone</SelectItem>
                <SelectItem value="weaviate">Weaviate</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Chunk Size</label>
              <Input
                type="number"
                min="256"
                max="4096"
                value={chunkSize}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setChunkSize(parseInt(e.target.value, 10))}
              />
              <p className="text-xs text-gray-500 mt-1">Document chunk size for embeddings</p>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Overlap Size</label>
              <Input
                type="number"
                min="0"
                max="512"
                value={overlapSize}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setOverlapSize(parseInt(e.target.value, 10))}
              />
              <p className="text-xs text-gray-500 mt-1">Chunk overlap for context continuity</p>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Messages */}
      {message && (
        <div
          className={`p-3 rounded-md text-sm ${
            message.type === 'success'
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 pt-4">
        <Button
          onClick={handleSave}
          disabled={isLoading}
          className="flex-1"
        >
          {isLoading ? 'Saving...' : 'Save Configuration'}
        </Button>
      </div>
    </div>
  );
};
