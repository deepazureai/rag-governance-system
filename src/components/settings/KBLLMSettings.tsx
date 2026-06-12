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
import { Checkbox } from '@/components/ui/checkbox';
import { KnowledgeBaseConfig, ApiResponse } from '@/src/types/models';

type KBProvider = 'azure-openai' | 'claude' | 'aws-bedrock' | 'openai';
type EmbeddingProvider = 'azure-openai' | 'openai';

interface ProviderField {
  name: string;
  label: string;
  type: 'text' | 'password' | 'number';
  required: boolean;
  placeholder?: string;
}

// KB LLM Chat Configuration Fields
const KB_PROVIDER_FIELDS: Record<KBProvider, ProviderField[]> = {
  'azure-openai': [
    { name: 'kbllm_azure_endpoint', label: 'Azure Endpoint', type: 'text', required: true, placeholder: 'https://your-resource.openai.azure.com' },
    { name: 'kbllm_api_key', label: 'API Key', type: 'password', required: true },
    { name: 'kbllm_deployment', label: 'Deployment Name', type: 'text', required: true, placeholder: 'e.g., gpt-4-turbo' },
    { name: 'kbllm_api_version', label: 'API Version', type: 'text', required: true, placeholder: '2025-01-01-preview' },
  ],
  'openai': [
    { name: 'kbllm_openai_api_key', label: 'API Key', type: 'password', required: true },
    { name: 'kbllm_openai_model', label: 'Model', type: 'text', required: true, placeholder: 'gpt-4-turbo' },
  ],
  'claude': [
    { name: 'kbllm_claude_api_key', label: 'API Key', type: 'password', required: true },
    { name: 'kbllm_claude_model', label: 'Model', type: 'text', required: true, placeholder: 'claude-3-opus-20240229' },
  ],
  'aws-bedrock': [
    { name: 'kbllm_aws_region', label: 'AWS Region', type: 'text', required: true, placeholder: 'us-east-1' },
    { name: 'kbllm_aws_access_key_id', label: 'AWS Access Key ID', type: 'password', required: true },
    { name: 'kbllm_aws_secret_access_key', label: 'AWS Secret Access Key', type: 'password', required: true },
    { name: 'kbllm_bedrock_model_id', label: 'Bedrock Model ID', type: 'text', required: true },
  ],
};

// Embedding Configuration Fields
// Note: Parameter names match Azure OpenAI SDK requirements
const EMBEDDING_PROVIDER_FIELDS: Record<EmbeddingProvider, ProviderField[]> = {
  'azure-openai': [
    { name: 'embedding_azure_endpoint', label: 'Azure Endpoint', type: 'text', required: true, placeholder: 'https://your-resource.openai.azure.com' },
    { name: 'embedding_api_key', label: 'API Key', type: 'password', required: true },
    { name: 'embedding_deployment', label: 'Deployment Name', type: 'text', required: true, placeholder: 'e.g., text-embedding-3-small' },
    { name: 'embedding_api_version', label: 'API Version', type: 'text', required: true, placeholder: '2023-05-15' },
  ],
  'openai': [
    { name: 'embedding_api_key', label: 'API Key', type: 'password', required: true },
  ],
};

interface KBLLMSettingsProps {
  applicationId?: string;
}

interface Application {
  _id: string;
  name: string;
}

export const KBLLMSettings: React.FC<KBLLMSettingsProps> = ({ applicationId: initialAppId }) => {
  // Application Selection State
  const [applications, setApplications] = useState<Application[]>([]);
  const [selectedApplicationId, setSelectedApplicationId] = useState<string>(initialAppId || '');
  const [applicationsLoading, setApplicationsLoading] = useState(true);

  // KB LLM Chat State
  const [kbProvider, setKbProvider] = useState<KBProvider>('azure-openai');
  const [kbFormData, setKbFormData] = useState<Record<string, string>>({});
  const [kbSkipSslVerification, setKbSkipSslVerification] = useState(false);

  // Embedding State
  const [embeddingProvider, setEmbeddingProvider] = useState<EmbeddingProvider>('azure-openai');
  const [embeddingFormData, setEmbeddingFormData] = useState<Record<string, string>>({});
  const [embeddingSkipSslVerification, setEmbeddingSkipSslVerification] = useState(false);

  // Common State
  const [isLoading, setIsLoading] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [savedConfig, setSavedConfig] = useState<KnowledgeBaseConfig | null>(null);
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(2048);

  // Load applications on mount
  useEffect(() => {
    const loadApplications = async (): Promise<void> => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';
        const response = await fetch(`${apiUrl}/api/applications`);
        if (response.ok) {
          const data = (await response.json()) as { data: Application[] };
          setApplications(data.data || []);
          if (!selectedApplicationId && data.data?.length > 0) {
            setSelectedApplicationId(data.data[0]._id);
          }
        }
      } catch (error) {
        console.error('Failed to load applications:', error);
      } finally {
        setApplicationsLoading(false);
      }
    };
    loadApplications();
  }, []);

  // Load existing config when application changes
  useEffect(() => {
    if (!selectedApplicationId) return;

    const loadConfig = async (): Promise<void> => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';
        const response = await fetch(`${apiUrl}/api/llm-config/kb/app/${selectedApplicationId}`);
        
        if (response.ok) {
          const data = (await response.json()) as ApiResponse<KnowledgeBaseConfig>;
          if (data.data) {
            setSavedConfig(data.data);
            
            // Load KB LLM settings
            setKbProvider((data.data.kbLlmProvider || 'azure-openai') as KBProvider);
            setKbSkipSslVerification(data.data.kbllm_skipSslVerification ?? false);
            setTemperature(data.data.temperature ?? 0.7);
            setMaxTokens(data.data.maxTokens ?? 2048);
            
            // Load Embedding settings
            setEmbeddingProvider((data.data.embeddingProvider || 'azure-openai') as EmbeddingProvider);
            setEmbeddingSkipSslVerification(data.data.embedding_skipSslVerification ?? false);
            
            // Populate KB LLM form
            if (data.data) {
              const kbForm: Record<string, string> = {};
              const embeddingForm: Record<string, string> = {};
              
              const kbProviderValue = (data.data.kbLlmProvider || 'azure-openai') as KBProvider;
              const kbFields = KB_PROVIDER_FIELDS[kbProviderValue];
              kbFields.forEach((field: ProviderField) => {
                const value = data.data?.[field.name as keyof KnowledgeBaseConfig];
                if (value && typeof value === 'string') {
                  kbForm[field.name] = value;
                }
              });
              setKbFormData(kbForm);
              
              const embeddingProviderValue = (data.data.embeddingProvider || 'azure-openai') as EmbeddingProvider;
              const embeddingFields = EMBEDDING_PROVIDER_FIELDS[embeddingProviderValue];
              embeddingFields.forEach((field: ProviderField) => {
                const value = data.data?.[field.name as keyof KnowledgeBaseConfig];
                if (value && typeof value === 'string') {
                  embeddingForm[field.name] = value;
                }
              });
              setEmbeddingFormData(embeddingForm);
            }
          }
        }
      } catch (error: unknown) {
        console.error('[v0] Error loading KB config:', error);
      }
    };

    loadConfig();
  }, [selectedApplicationId]);

  const handleKbInputChange = (fieldName: string, value: string): void => {
    setKbFormData(prev => ({
      ...prev,
      [fieldName]: value,
    }));
    setMessage(null);
  };

  const handleEmbeddingInputChange = (fieldName: string, value: string): void => {
    setEmbeddingFormData(prev => ({
      ...prev,
      [fieldName]: value,
    }));
    setMessage(null);
  };

  const validateKbForm = (): boolean => {
    // Just check if provider is selected - no strict field validation
    return !!kbProvider;
  };

  const validateEmbeddingForm = (): boolean => {
    // Just check if provider is selected - no strict field validation
    return !!embeddingProvider;
  };

  const handleSave = async (): Promise<void> => {
    if (!selectedApplicationId) {
      setMessage({ type: 'error', text: 'Please select an application' });
      return;
    }
    
    if (!validateKbForm() || !validateEmbeddingForm()) {
      setMessage({ type: 'error', text: 'Please select both KB and Embedding providers' });
      return;
    }

    setIsLoading(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';
      const payload = {
        applicationId: selectedApplicationId,
        kbLlmProvider: kbProvider,
        kbllm_skipSslVerification: kbSkipSslVerification,
        ...kbFormData,
        embeddingProvider,
        embedding_skipSslVerification: embeddingSkipSslVerification,
        ...embeddingFormData,
        temperature,
        maxTokens,
        isDefault: true,
      };

      console.log('[v0] Payload being sent to backend:', {
        applicationId,
        kbProvider,
        kbFormDataKeys: Object.keys(kbFormData),
        kbFormData,
        embeddingProvider,
        embeddingModel,
        embeddingFormDataKeys: Object.keys(embeddingFormData),
        embeddingFormData,
      });

      const response = await fetch(`${apiUrl}/api/llm-config/kb/app/${applicationId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const data = (await response.json()) as ApiResponse<KnowledgeBaseConfig>;
        setSavedConfig(data.data ?? null);
        setMessage({ type: 'success', text: 'KB configuration (embeddings + chat) saved successfully!' });
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
    if (!selectedApplicationId) {
      setMessage({ type: 'error', text: 'Please select an application' });
      return;
    }

    if (!validateKbForm() || !validateEmbeddingForm()) {
      setMessage({ type: 'error', text: 'Please select both KB and Embedding providers' });
      return;
    }

    setIsTesting(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';
      const testPayload = {
        kbProvider,
        ...kbFormData,
        embeddingProvider,
        ...embeddingFormData,
      };

      const response = await fetch(`${apiUrl}/api/llm-config/validate/${selectedApplicationId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testPayload),
      });

      const responseText = await response.text();
      
      if (!responseText) {
        setMessage({ type: 'error', text: 'Connection failed: Empty response from server' });
        return;
      }

      const data = JSON.parse(responseText) as { valid: boolean; error?: string };
      
      if (response.ok && data.valid) {
        setMessage({ type: 'success', text: 'Connection test successful!' });
      } else {
        const errorMsg = data.error || 'Connection validation failed';
        setMessage({ type: 'error', text: `Connection failed: ${errorMsg}` });
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      setMessage({ type: 'error', text: `Error: ${errorMessage}` });
    } finally {
      setIsTesting(false);
    }
  };

  const kbCurrentFields = KB_PROVIDER_FIELDS[kbProvider];
  const embeddingCurrentFields = EMBEDDING_PROVIDER_FIELDS[embeddingProvider];

  return (
    <div className="space-y-8">
      {/* Application Selector */}
      <Card className="p-6 bg-blue-50 border-blue-200">
        <div className="mb-4">
          <h3 className="text-lg font-semibold mb-2">Select Application</h3>
          <p className="text-sm text-gray-600">Choose which application&apos;s KB settings you want to configure</p>
        </div>
        
        {applicationsLoading ? (
          <p className="text-sm text-gray-500">Loading applications...</p>
        ) : applications.length === 0 ? (
          <p className="text-sm text-red-600">No applications available. Please create an application first.</p>
        ) : (
          <Select value={selectedApplicationId} onValueChange={(value: string) => {
            setSelectedApplicationId(value);
            setMessage(null);
          }}>
            <SelectTrigger>
              <SelectValue placeholder="Select an application..." />
            </SelectTrigger>
            <SelectContent>
              {applications.map((app: Application) => (
                <SelectItem key={app._id} value={app._id}>
                  {app.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </Card>

      {!selectedApplicationId && (
        <Card className="p-4 bg-yellow-50 border-yellow-200">
          <p className="text-sm text-yellow-800">Please select an application to configure its KB settings.</p>
        </Card>
      )}

      {selectedApplicationId && (
      <>
      {/* Status Card */}
      {savedConfig && (
        <Card className="p-4 bg-green-50 border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-900">Configuration Active</p>
              <p className="text-xs text-green-700 mt-1">
                KB LLM: <Badge variant="outline" className="ml-1">{savedConfig.kbLlmProvider}</Badge>
                {' '} | Embeddings: <Badge variant="outline" className="ml-1">{savedConfig.embeddingProvider}</Badge>
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Embedding Configuration Section */}
      <div className="border-b pb-8">
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-2">Embedding Configuration</h3>
          <p className="text-sm text-gray-600">Configure the embedding model for document vectorization</p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Embedding Provider</label>
          <Select value={embeddingProvider} onValueChange={(value: string) => {
            setEmbeddingProvider(value as EmbeddingProvider);
            setEmbeddingFormData({});
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

        <div className="space-y-4 mt-6">
          {embeddingCurrentFields.map((field: ProviderField) => (
            <div key={field.name}>
              <label className="block text-sm font-medium mb-1">
                {field.label}
                {field.required && <span className="text-red-500 ml-1">*</span>}
              </label>
              <Input
                type={field.type}
                placeholder={field.placeholder}
                value={embeddingFormData[field.name] ?? ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleEmbeddingInputChange(field.name, e.target.value)}
                className="w-full"
              />
            </div>
          ))}
        </div>

        {embeddingProvider === 'azure-openai' && (
          <div className="mt-4 flex items-center gap-2">
            <Checkbox
              id="embedding-skip-ssl"
              checked={embeddingSkipSslVerification}
              onCheckedChange={(checked: boolean) => setEmbeddingSkipSslVerification(checked)}
            />
            <label htmlFor="embedding-skip-ssl" className="text-sm cursor-pointer">Skip SSL verification (for corporate proxies)</label>
          </div>
        )}
      </div>

      {/* KB LLM Configuration Section */}
      <div className="pb-8">
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-2">KB Chat LLM Configuration</h3>
          <p className="text-sm text-gray-600">Configure which LLM provider to use for KB responses</p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">KB LLM Provider</label>
          <Select value={kbProvider} onValueChange={(value: string) => {
            setKbProvider(value as KBProvider);
            setKbFormData({});
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

        <div className="space-y-4 mt-6">
          {kbCurrentFields.map((field: ProviderField) => (
            <div key={field.name}>
              <label className="block text-sm font-medium mb-1">
                {field.label}
                {field.required && <span className="text-red-500 ml-1">*</span>}
              </label>
              <Input
                type={field.type}
                placeholder={field.placeholder}
                value={kbFormData[field.name] ?? ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleKbInputChange(field.name, e.target.value)}
                className="w-full"
              />
            </div>
          ))}
        </div>

        {kbProvider === 'azure-openai' && (
          <div className="mt-4 flex items-center gap-2">
            <Checkbox
              id="kb-skip-ssl"
              checked={kbSkipSslVerification}
              onCheckedChange={(checked: boolean) => setKbSkipSslVerification(checked)}
            />
            <label htmlFor="kb-skip-ssl" className="text-sm cursor-pointer">Skip SSL verification (for corporate proxies)</label>
          </div>
        )}

        {/* Common settings */}
        <div className="grid grid-cols-2 gap-4 mt-6">
          <div>
            <label className="block text-sm font-medium mb-1">Temperature (0-2)</label>
            <Input
              type="number"
              min="0"
              max="2"
              step="0.1"
              value={temperature}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTemperature(parseFloat(e.target.value))}
              className="w-full"
            />
            <p className="text-xs text-gray-500 mt-1">Higher = more creative, Lower = more focused</p>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Max Tokens</label>
            <Input
              type="number"
              min="100"
              max="4000"
              value={maxTokens}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMaxTokens(parseInt(e.target.value, 10))}
              className="w-full"
            />
          </div>
        </div>
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
      </>
      )}
    </div>
  );
};

