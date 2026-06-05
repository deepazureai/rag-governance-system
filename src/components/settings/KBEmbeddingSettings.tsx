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
import { KnowledgeBaseConfig, ApiResponse } from '@/src/types/models';

type EmbeddingProvider = 'azure-openai' | 'openai';

interface ProviderField {
  name: string;
  label: string;
  type: 'text' | 'password' | 'number';
  required: boolean;
  placeholder?: string;
}

const PROVIDER_FIELDS: Record<EmbeddingProvider, ProviderField[]> = {
  'azure-openai': [
    { name: 'embedding_azure_endpoint', label: 'Azure Endpoint', type: 'text', required: true, placeholder: 'https://your-resource.openai.azure.com (just the base URL)' },
    { name: 'embedding_api_key', label: 'API Key', type: 'password', required: true },
    { name: 'embedding_deployment', label: 'Embedding Deployment Name', type: 'text', required: true, placeholder: 'e.g., text-embedding-3-large' },
    { name: 'embedding_api_version', label: 'API Version', type: 'text', required: true, placeholder: '2024-02-15-preview' },
  ],
  'openai': [
    { name: 'embedding_api_key', label: 'API Key', type: 'password', required: true },
  ],
};

const EMBEDDING_MODELS: Record<EmbeddingProvider, string[]> = {
  'azure-openai': ['text-embedding-3-large', 'text-embedding-3-small', 'text-embedding-ada-002'],
  'openai': ['text-embedding-3-large', 'text-embedding-3-small', 'text-embedding-ada-002'],
};

interface KBEmbeddingSettingsProps {
  applicationId: string;
}

export const KBEmbeddingSettings: React.FC<KBEmbeddingSettingsProps> = ({ applicationId }) => {
  const [provider, setProvider] = useState<EmbeddingProvider>('azure-openai');
  const [embeddingModel, setEmbeddingModel] = useState<string>('text-embedding-3-large');
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [savedConfig, setSavedConfig] = useState<KnowledgeBaseConfig | null>(null);
  const [skipSslVerification, setSkipSslVerification] = useState(false);

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
            setProvider((data.data.embeddingProvider || 'azure-openai') as EmbeddingProvider);
            setEmbeddingModel(data.data.embeddingModel || 'text-embedding-3-large');
            setSkipSslVerification(data.data.embedding_skipSslVerification ?? false);
            
            // Populate form with existing values
            if (data.data) {
              const form: Record<string, string> = {};
              const configData = data.data;
              const providerValue = (configData.embeddingProvider || 'azure-openai') as EmbeddingProvider;
              const providerFields = PROVIDER_FIELDS[providerValue];
              providerFields.forEach((field: ProviderField) => {
                const fieldName = field.name;
                const value = configData[fieldName as keyof KnowledgeBaseConfig];
                if (value && typeof value === 'string') {
                  form[fieldName] = value;
                }
              });
              setFormData(form);
            }
          }
        }
      } catch (error: unknown) {
        console.error('[v0] Error loading embedding config:', error);
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
    const fields = PROVIDER_FIELDS[provider];
    
    for (const field of fields) {
      if (field.required && !formData[field.name]?.trim()) {
        return false;
      }
    }
    
    // Validate Azure API version format
    if (provider === 'azure-openai') {
      const apiVersion = formData.embedding_api_version?.trim() || '';
      // Azure API versions should be in format: YYYY-MM-DD-preview or similar
      if (!apiVersion.match(/^\d{4}-\d{2}-\d{2}/)) {
        setMessage({ type: 'error', text: 'Azure API Version must be in format like 2024-02-15-preview' });
        return false;
      }
    }
    
    if (!embeddingModel?.trim()) {
      setMessage({ type: 'error', text: 'Embedding model is required' });
      return false;
    }
    
    return true;
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
        embeddingProvider: provider,
        embeddingModel,
        embedding_skipSslVerification: skipSslVerification,
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
        setMessage({ type: 'success', text: 'Embedding configuration saved successfully!' });
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

  const handleTestConnection = async (): Promise<void> => {
    if (!validateForm()) {
      setMessage({ type: 'error', text: 'Please fill in all required fields' });
      return;
    }

    setIsTesting(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';
      const response = await fetch(`${apiUrl}/api/kb-config/validate-embeddings/${applicationId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider,
          embeddingModel,
          skipSslVerification,
          ...formData,
        }),
      });

      if (response.ok) {
        const data = (await response.json()) as { valid: boolean; error?: string };
        if (data.valid) {
          setMessage({ type: 'success', text: 'Embedding connection test successful!' });
        } else {
          setMessage({ type: 'error', text: `Connection failed: ${data.error}` });
        }
      } else {
        setMessage({ type: 'error', text: 'Failed to test connection' });
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      setMessage({ type: 'error', text: `Error: ${errorMessage}` });
    } finally {
      setIsTesting(false);
    }
  };

  const currentFields = PROVIDER_FIELDS[provider];
  const availableModels = EMBEDDING_MODELS[provider];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Embedding Provider Configuration</h3>
        <p className="text-sm text-gray-600 mb-6">
          Configure the embedding model provider for converting documents and queries into vectors. This is separate from the LLM provider used for generating responses.
        </p>
      </div>

      {savedConfig && (
        <Card className="p-4 bg-green-50 border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-900">Configuration Active</p>
              <p className="text-xs text-green-700 mt-1">
                Provider: <Badge variant="outline">{savedConfig.embeddingProvider}</Badge>
                {' '}
                Model: <Badge variant="outline">{savedConfig.embeddingModel}</Badge>
              </p>
            </div>
          </div>
        </Card>
      )}

      <div>
        <label className="block text-sm font-medium mb-2">Embedding Provider</label>
        <Select value={provider} onValueChange={(value: string) => {
          setProvider(value as EmbeddingProvider);
          setFormData({});
        }}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="azure-openai">Azure OpenAI</SelectItem>
            <SelectItem value="openai">OpenAI</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Embedding Model</label>
        <Select value={embeddingModel} onValueChange={setEmbeddingModel}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {availableModels.map((model) => (
              <SelectItem key={model} value={model}>
                {model}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-gray-500 mt-1">
          {embeddingModel === 'text-embedding-3-large' && 'Large model - 3072 dimensions, excellent quality'}
          {embeddingModel === 'text-embedding-3-small' && 'Small model - 1536 dimensions, faster, good quality'}
          {embeddingModel === 'text-embedding-ada-002' && 'Legacy model - 1536 dimensions'}
        </p>
      </div>

      {/* Provider-specific fields */}
      <div className="space-y-4">
        {currentFields.map((field: ProviderField) => (
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
      </div>

      {/* SSL Verification Toggle */}
      <div className="flex items-center gap-3 p-3 bg-yellow-50 border border-yellow-200 rounded">
        <input
          type="checkbox"
          id="skipSsl"
          checked={skipSslVerification}
          onChange={(e) => setSkipSslVerification(e.target.checked)}
          className="w-4 h-4"
        />
        <label htmlFor="skipSsl" className="text-sm text-yellow-900">
          Skip SSL verification (for corporate proxies or testing)
        </label>
      </div>

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
          onClick={handleTestConnection}
          disabled={isTesting || isLoading}
          variant="outline"
        >
          {isTesting ? 'Testing...' : 'Test Connection'}
        </Button>
        <Button
          onClick={handleSave}
          disabled={isLoading || isTesting}
        >
          {isLoading ? 'Saving...' : 'Save Configuration'}
        </Button>
      </div>
    </div>
  );
};
