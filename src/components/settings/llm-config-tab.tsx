'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { AlertCircle, CheckCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface LLMConfigTabProps {
  applicationId: string;
}

interface LLMConfig {
  provider: 'openai' | 'azure-openai' | 'claude' | 'deepinfra' | 'grok';
  model: string;
  apiKey: string;
  apiUrl?: string;
  temperature?: number;
  maxTokens?: number;
  isDefault?: boolean;
}

const PROVIDER_MODELS: Record<string, string[]> = {
  openai: ['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo'],
  'azure-openai': ['gpt-4', 'gpt-35-turbo'],
  claude: ['claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku'],
  deepinfra: ['meta-llama/Llama-2-70b', 'mistralai/Mistral-7B'],
  grok: ['grok-1', 'grok-beta'],
};

export function LLMConfigTab({ applicationId }: LLMConfigTabProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [expandedProviders, setExpandedProviders] = useState<Set<string>>(new Set());
  const [config, setConfig] = useState<LLMConfig>({
    provider: 'openai',
    model: 'gpt-4-turbo',
    apiKey: '',
    temperature: 0.7,
    maxTokens: 2000,
  });

  useEffect(() => {
    fetchLLMConfig();
  }, [applicationId]);

  const fetchLLMConfig = async (): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';
      const response = await fetch(`${apiUrl}/api/llm-config/app/${applicationId}`);

      if (!response.ok) {
        setError('Failed to fetch configuration');
        setIsLoading(false);
        return;
      }

      const data = await response.json() as { success: boolean; data?: LLMConfig };
      if (data.success && data.data) {
        setConfig(data.data);
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error('[v0] Error fetching LLM config:', message);
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveConfig = async (): Promise<void> => {
    try {
      setIsSaving(true);
      setError(null);
      setSuccess(null);

      if (!config.apiKey.trim()) {
        setError('API Key is required');
        setIsSaving(false);
        return;
      }

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';
      const response = await fetch(`${apiUrl}/api/llm-config/app/${applicationId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });

      if (!response.ok) {
        setError('Failed to save configuration');
        setIsSaving(false);
        return;
      }

      const data = await response.json() as { success: boolean; data?: LLMConfig; message?: string };
      if (data.success && data.data && data.message) {
        setSuccess(data.message);
        setConfig(data.data);
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error('[v0] Error saving LLM config:', message);
      setError(message);
    } finally {
      setIsSaving(false);
    }
  };

  const toggleProvider = (provider: string) => {
    const newSet = new Set(expandedProviders);
    if (newSet.has(provider)) {
      newSet.delete(provider);
    } else {
      newSet.add(provider);
    }
    setExpandedProviders(newSet);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Spinner className="w-6 h-6 mr-2" />
        <span>Loading LLM configuration...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="p-6 bg-white">
        <div className="flex items-center gap-2 mb-4">
          <h3 className="text-lg font-semibold text-gray-900">LLM Provider Configuration</h3>
          {config.provider && <Badge className="bg-blue-100 text-blue-800">{config.provider}</Badge>}
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-red-900">Error</p>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        )}

        {success && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded flex items-start gap-2">
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-green-900">Success</p>
              <p className="text-sm text-green-700">{success}</p>
            </div>
          </div>
        )}

        <div className="space-y-6">
          {/* Provider Selection */}
          <div>
            <Label htmlFor="provider" className="block text-sm font-medium text-gray-700 mb-2">
              LLM Provider
            </Label>
            <Select value={config.provider} onValueChange={(provider: any) => setConfig({ ...config, provider })}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="openai">OpenAI (GPT-4, GPT-3.5)</SelectItem>
                <SelectItem value="azure-openai">Azure OpenAI</SelectItem>
                <SelectItem value="claude">Anthropic Claude</SelectItem>
                <SelectItem value="deepinfra">DeepInfra</SelectItem>
                <SelectItem value="grok">xAI Grok</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500 mt-1">Choose which LLM provider to use for recommendation generation</p>
          </div>

          {/* Model Selection */}
          <div>
            <Label htmlFor="model" className="block text-sm font-medium text-gray-700 mb-2">
              Model
            </Label>
            <Select value={config.model} onValueChange={(model) => setConfig({ ...config, model })}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PROVIDER_MODELS[config.provider]?.map((model) => (
                  <SelectItem key={model} value={model}>
                    {model}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* API Key */}
          <div>
            <Label htmlFor="apiKey" className="block text-sm font-medium text-gray-700 mb-2">
              API Key
            </Label>
            <Input
              id="apiKey"
              type="password"
              value={config.apiKey}
              onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
              placeholder="Enter your API key"
              className="font-mono text-sm"
            />
            <p className="text-xs text-gray-500 mt-1">Your API key is encrypted and secure</p>
          </div>

          {/* API URL (for Azure/Custom) */}
          {config.provider === 'azure-openai' && (
            <div>
              <Label htmlFor="apiUrl" className="block text-sm font-medium text-gray-700 mb-2">
                API Endpoint URL
              </Label>
              <Input
                id="apiUrl"
                type="url"
                value={config.apiUrl || ''}
                onChange={(e) => setConfig({ ...config, apiUrl: e.target.value })}
                placeholder="https://your-resource.openai.azure.com/"
              />
            </div>
          )}

          {/* Advanced Settings */}
          <div className="border-t pt-4">
            <button
              onClick={() => toggleProvider('advanced')}
              className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900"
            >
              {expandedProviders.has('advanced') ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
              Advanced Settings
            </button>

            {expandedProviders.has('advanced') && (
              <div className="mt-4 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="temperature" className="block text-sm font-medium text-gray-700 mb-2">
                      Temperature
                    </Label>
                    <Input
                      id="temperature"
                      type="number"
                      min="0"
                      max="2"
                      step="0.1"
                      value={config.temperature || 0.7}
                      onChange={(e) => setConfig({ ...config, temperature: parseFloat(e.target.value) })}
                    />
                    <p className="text-xs text-gray-500 mt-1">0 = deterministic, 2 = random</p>
                  </div>
                  <div>
                    <Label htmlFor="maxTokens" className="block text-sm font-medium text-gray-700 mb-2">
                      Max Tokens
                    </Label>
                    <Input
                      id="maxTokens"
                      type="number"
                      min="1"
                      value={config.maxTokens || 2000}
                      onChange={(e) => setConfig({ ...config, maxTokens: parseInt(e.target.value) })}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 flex gap-2">
          <Button
            onClick={handleSaveConfig}
            disabled={isSaving}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {isSaving ? (
              <>
                <Spinner className="w-4 h-4 mr-2" />
                Saving...
              </>
            ) : (
              'Save Configuration'
            )}
          </Button>
          <Button variant="outline" onClick={fetchLLMConfig}>
            Reset
          </Button>
        </div>
      </Card>

      <Card className="p-4 bg-blue-50 border border-blue-200">
        <p className="text-sm text-blue-900">
          <strong>Note:</strong> This configuration is used for generating LLM-based recommendations and prompt improvements across the platform.
        </p>
      </Card>
    </div>
  );
}
