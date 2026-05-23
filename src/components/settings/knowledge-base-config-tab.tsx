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

interface KnowledgeBaseConfigTabProps {
  applicationId: string;
}

interface KBConfig {
  embeddingProvider: 'openai' | 'azure-openai' | 'claude' | 'deepinfra' | 'grok';
  embeddingModel: string;
  embeddingApiKey?: string;
  llmProvider: 'openai' | 'azure-openai' | 'claude' | 'deepinfra' | 'grok';
  llmModel: string;
  llmApiKey?: string;
  chunkSize: number;
  overlapSize: number;
  vectorStoreType: 'chroma' | 'pinecone' | 'weaviate';
  vectorStoreUrl?: string;
  temperature?: number;
  maxTokens?: number;
}

export function KnowledgeBaseConfigTab({ applicationId }: KnowledgeBaseConfigTabProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['general']));
  const [config, setConfig] = useState<KBConfig>({
    embeddingProvider: 'openai',
    embeddingModel: 'text-embedding-3-large',
    llmProvider: 'openai',
    llmModel: 'gpt-4-turbo',
    chunkSize: 512,
    overlapSize: 64,
    vectorStoreType: 'chroma',
    temperature: 0.3,
    maxTokens: 1000,
  });

  useEffect(() => {
    fetchKBConfig();
  }, [applicationId]);

  const fetchKBConfig = async (): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';
      const response = await fetch(`${apiUrl}/api/llm-config/knowledge-base/${applicationId}`);

      if (!response.ok) {
        setError('Failed to fetch configuration');
        setIsLoading(false);
        return;
      }

      const data = await response.json() as { success: boolean; data?: KBConfig };
      if (data.success && data.data) {
        setConfig(data.data);
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error('[v0] Error fetching KB config:', message);
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

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';
      const response = await fetch(`${apiUrl}/api/llm-config/knowledge-base/${applicationId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });

      if (!response.ok) {
        setError('Failed to save configuration');
        setIsSaving(false);
        return;
      }

      const data = await response.json() as { success: boolean; data?: KBConfig; message?: string };
      if (data.success && data.data && data.message) {
        setSuccess(data.message);
        setConfig(data.data);
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error('[v0] Error saving KB config:', message);
      setError(message);
    } finally {
      setIsSaving(false);
    }
  };

  const toggleSection = (section: string) => {
    const newSet = new Set(expandedSections);
    if (newSet.has(section)) {
      newSet.delete(section);
    } else {
      newSet.add(section);
    }
    setExpandedSections(newSet);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Spinner className="w-6 h-6 mr-2" />
        <span>Loading Knowledge Base configuration...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="p-6 bg-white">
        <div className="flex items-center gap-2 mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Knowledge Base Configuration</h3>
          {config.vectorStoreType && <Badge className="bg-purple-100 text-purple-800">{config.vectorStoreType}</Badge>}
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

        {/* Embedding Configuration Section */}
        <div className="space-y-4 border-b pb-6 mb-6">
          <button
            onClick={() => toggleSection('embedding')}
            className="flex items-center gap-2 text-base font-semibold text-gray-900 w-full"
          >
            {expandedSections.has('embedding') ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
            Embedding Configuration
          </button>

          {expandedSections.has('embedding') && (
            <div className="space-y-4 mt-4">
              <div>
                <Label htmlFor="embeddingProvider" className="block text-sm font-medium text-gray-700 mb-2">
                  Embedding Provider
                </Label>
                <Select
                  value={config.embeddingProvider}
                  onValueChange={(provider: any) => setConfig({ ...config, embeddingProvider: provider })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="openai">OpenAI</SelectItem>
                    <SelectItem value="azure-openai">Azure OpenAI</SelectItem>
                    <SelectItem value="claude">Anthropic Claude</SelectItem>
                    <SelectItem value="deepinfra">DeepInfra</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="embeddingModel" className="block text-sm font-medium text-gray-700 mb-2">
                  Embedding Model
                </Label>
                <Input
                  id="embeddingModel"
                  value={config.embeddingModel}
                  onChange={(e) => setConfig({ ...config, embeddingModel: e.target.value })}
                  placeholder="e.g., text-embedding-3-large"
                />
              </div>

              <div>
                <Label htmlFor="embeddingApiKey" className="block text-sm font-medium text-gray-700 mb-2">
                  Embedding API Key (Optional)
                </Label>
                <Input
                  id="embeddingApiKey"
                  type="password"
                  value={config.embeddingApiKey || ''}
                  onChange={(e) => setConfig({ ...config, embeddingApiKey: e.target.value })}
                  placeholder="Leave empty to use LLM provider's API key"
                  className="font-mono text-sm"
                />
              </div>
            </div>
          )}
        </div>

        {/* LLM Configuration Section */}
        <div className="space-y-4 border-b pb-6 mb-6">
          <button
            onClick={() => toggleSection('llm')}
            className="flex items-center gap-2 text-base font-semibold text-gray-900 w-full"
          >
            {expandedSections.has('llm') ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
            LLM Configuration
          </button>

          {expandedSections.has('llm') && (
            <div className="space-y-4 mt-4">
              <div>
                <Label htmlFor="llmProvider" className="block text-sm font-medium text-gray-700 mb-2">
                  LLM Provider for NLP Responses
                </Label>
                <Select
                  value={config.llmProvider}
                  onValueChange={(provider: any) => setConfig({ ...config, llmProvider: provider })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="openai">OpenAI</SelectItem>
                    <SelectItem value="azure-openai">Azure OpenAI</SelectItem>
                    <SelectItem value="claude">Anthropic Claude</SelectItem>
                    <SelectItem value="deepinfra">DeepInfra</SelectItem>
                    <SelectItem value="grok">xAI Grok</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="llmModel" className="block text-sm font-medium text-gray-700 mb-2">
                  LLM Model
                </Label>
                <Input
                  id="llmModel"
                  value={config.llmModel}
                  onChange={(e) => setConfig({ ...config, llmModel: e.target.value })}
                  placeholder="e.g., gpt-4-turbo"
                />
              </div>

              <div>
                <Label htmlFor="llmApiKey" className="block text-sm font-medium text-gray-700 mb-2">
                  LLM API Key (Optional)
                </Label>
                <Input
                  id="llmApiKey"
                  type="password"
                  value={config.llmApiKey || ''}
                  onChange={(e) => setConfig({ ...config, llmApiKey: e.target.value })}
                  placeholder="Leave empty to use default LLM provider's key"
                  className="font-mono text-sm"
                />
              </div>
            </div>
          )}
        </div>

        {/* Vector Store Configuration */}
        <div className="space-y-4 border-b pb-6 mb-6">
          <button
            onClick={() => toggleSection('vectorstore')}
            className="flex items-center gap-2 text-base font-semibold text-gray-900 w-full"
          >
            {expandedSections.has('vectorstore') ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
            Vector Store Configuration
          </button>

          {expandedSections.has('vectorstore') && (
            <div className="space-y-4 mt-4">
              <div>
                <Label htmlFor="vectorStoreType" className="block text-sm font-medium text-gray-700 mb-2">
                  Vector Store Type
                </Label>
                <Select
                  value={config.vectorStoreType}
                  onValueChange={(type: any) => setConfig({ ...config, vectorStoreType: type })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="chroma">Chroma (Local/Docker)</SelectItem>
                    <SelectItem value="pinecone">Pinecone (Cloud)</SelectItem>
                    <SelectItem value="weaviate">Weaviate</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {config.vectorStoreType !== 'chroma' && (
                <div>
                  <Label htmlFor="vectorStoreUrl" className="block text-sm font-medium text-gray-700 mb-2">
                    Vector Store URL
                  </Label>
                  <Input
                    id="vectorStoreUrl"
                    type="url"
                    value={config.vectorStoreUrl || ''}
                    onChange={(e) => setConfig({ ...config, vectorStoreUrl: e.target.value })}
                    placeholder="https://your-vector-store-endpoint"
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Chunking Configuration */}
        <div className="space-y-4">
          <button
            onClick={() => toggleSection('chunking')}
            className="flex items-center gap-2 text-base font-semibold text-gray-900 w-full"
          >
            {expandedSections.has('chunking') ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
            Chunking & Advanced Settings
          </button>

          {expandedSections.has('chunking') && (
            <div className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="chunkSize" className="block text-sm font-medium text-gray-700 mb-2">
                    Chunk Size (chars)
                  </Label>
                  <Input
                    id="chunkSize"
                    type="number"
                    min="100"
                    max="4000"
                    value={config.chunkSize}
                    onChange={(e) => setConfig({ ...config, chunkSize: parseInt(e.target.value) })}
                  />
                  <p className="text-xs text-gray-500 mt-1">Document split size (100-4000)</p>
                </div>
                <div>
                  <Label htmlFor="overlapSize" className="block text-sm font-medium text-gray-700 mb-2">
                    Overlap (chars)
                  </Label>
                  <Input
                    id="overlapSize"
                    type="number"
                    min="0"
                    max="500"
                    value={config.overlapSize}
                    onChange={(e) => setConfig({ ...config, overlapSize: parseInt(e.target.value) })}
                  />
                  <p className="text-xs text-gray-500 mt-1">Chunk overlap (0-500)</p>
                </div>
              </div>

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
                    value={config.temperature || 0.3}
                    onChange={(e) => setConfig({ ...config, temperature: parseFloat(e.target.value) })}
                  />
                  <p className="text-xs text-gray-500 mt-1">Lower = more focused</p>
                </div>
                <div>
                  <Label htmlFor="maxTokens" className="block text-sm font-medium text-gray-700 mb-2">
                    Max Tokens
                  </Label>
                  <Input
                    id="maxTokens"
                    type="number"
                    min="1"
                    value={config.maxTokens || 1000}
                    onChange={(e) => setConfig({ ...config, maxTokens: parseInt(e.target.value) })}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 flex gap-2">
          <Button
            onClick={handleSaveConfig}
            disabled={isSaving}
            className="bg-purple-600 hover:bg-purple-700 text-white"
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
          <Button variant="outline" onClick={fetchKBConfig}>
            Reset
          </Button>
        </div>
      </Card>

      <Card className="p-4 bg-purple-50 border border-purple-200">
        <p className="text-sm text-purple-900">
          <strong>Note:</strong> These settings control how documents are indexed and retrieved from your knowledge base, and how NLP responses are generated.
        </p>
      </Card>
    </div>
  );
}
