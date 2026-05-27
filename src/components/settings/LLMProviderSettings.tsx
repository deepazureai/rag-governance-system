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
import { LLMConfig, ApiResponse } from '@/src/types/models';

type LLMProvider = 'azure-openai' | 'claude' | 'aws-bedrock' | 'openai';

interface ProviderField {
  name: string;
  label: string;
  type: 'text' | 'password' | 'number';
  required: boolean;
  placeholder?: string;
}

const PROVIDER_FIELDS: Record<LLMProvider, ProviderField[]> = {
  'azure-openai': [
    { name: 'azureEndpoint', label: 'Azure Endpoint', type: 'text', required: true, placeholder: 'https://your-resource.openai.azure.com' },
    { name: 'azureApiKey', label: 'API Key', type: 'password', required: true },
    { name: 'azureDeploymentName', label: 'Deployment Name', type: 'text', required: true },
    { name: 'azureApiVersion', label: 'API Version', type: 'text', required: true, placeholder: '2023-05-15' },
  ],
  'openai': [
    { name: 'openaiApiKey', label: 'API Key', type: 'password', required: true },
    { name: 'openaiModel', label: 'Model', type: 'text', required: true, placeholder: 'gpt-4-turbo' },
  ],
  'claude': [
    { name: 'claudeApiKey', label: 'API Key', type: 'password', required: true },
    { name: 'claudeModel', label: 'Model', type: 'text', required: true, placeholder: 'claude-3-opus-20240229' },
  ],
  'aws-bedrock': [
    { name: 'awsRegion', label: 'AWS Region', type: 'text', required: true, placeholder: 'us-east-1' },
    { name: 'awsAccessKeyId', label: 'AWS Access Key ID', type: 'password', required: true },
    { name: 'awsSecretAccessKey', label: 'AWS Secret Access Key', type: 'password', required: true },
    { name: 'bedrockModelId', label: 'Bedrock Model ID', type: 'text', required: true },
  ],
};

interface LLMProviderSettingsProps {
  applicationId: string;
}

export const LLMProviderSettings: React.FC<LLMProviderSettingsProps> = ({ applicationId }) => {
  const [provider, setProvider] = useState<LLMProvider>('azure-openai');
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [savedConfig, setSavedConfig] = useState<LLMConfig | null>(null);
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(2048);

  // Load existing config on mount
  useEffect(() => {
    const loadConfig = async (): Promise<void> => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';
        const response = await fetch(`${apiUrl}/api/llm-config/app/${applicationId}`);
        
        if (response.ok) {
          const data = (await response.json()) as ApiResponse<LLMConfig>;
          if (data.data) {
            setSavedConfig(data.data);
            setProvider(data.data.provider);
            setTemperature(data.data.temperature ?? 0.7);
            setMaxTokens(data.data.maxTokens ?? 2048);
            
            // Populate form with existing values
            if (data.data) {
              const form: Record<string, string> = {};
              const configData = data.data;
              const providerValue = (configData.provider || 'azure-openai') as LLMProvider;
              const providerFields = PROVIDER_FIELDS[providerValue];
              providerFields.forEach((field: ProviderField) => {
                const fieldName = field.name;
                const value = configData[fieldName as keyof LLMConfig];
                if (value && typeof value === 'string') {
                  form[fieldName] = value;
                }
              });
              setFormData(form);
            }
          }
        }
      } catch (error: unknown) {
        console.error('[v0] Error loading LLM config:', error);
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
    return fields.every(field => {
      if (field.required) {
        return formData[field.name]?.trim().length > 0;
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
        provider,
        ...formData,
        temperature,
        maxTokens,
        isDefault: true,
      };

      const response = await fetch(`${apiUrl}/api/llm-config/app/${applicationId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const data = (await response.json()) as ApiResponse<LLMConfig>;
        setSavedConfig(data.data ?? null);
        setMessage({ type: 'success', text: 'LLM configuration saved successfully!' });
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
      const response = await fetch(`${apiUrl}/api/llm-config/validate/${applicationId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider,
          ...formData,
        }),
      });

      if (response.ok) {
        const data = (await response.json()) as { valid: boolean; error?: string };
        if (data.valid) {
          setMessage({ type: 'success', text: 'Connection test successful!' });
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

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">LLM Provider Configuration</h3>
        <p className="text-sm text-gray-600 mb-6">
          Configure which LLM provider to use for generating recommendations. This setting applies to the Raw Data recommendations detail screen.
        </p>
      </div>

      {savedConfig && (
        <Card className="p-4 bg-green-50 border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-900">Configuration Active</p>
              <p className="text-xs text-green-700 mt-1">
                Provider: <Badge variant="outline">{savedConfig.provider}</Badge>
              </p>
            </div>
          </div>
        </Card>
      )}

      <div>
        <label className="block text-sm font-medium mb-2">LLM Provider</label>
        <Select value={provider} onValueChange={(value: string) => {
          setProvider(value as LLMProvider);
          setFormData({});
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

      {/* Common settings */}
      <div className="grid grid-cols-2 gap-4">
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
