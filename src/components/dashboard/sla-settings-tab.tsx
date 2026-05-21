'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { AlertCircle, CheckCircle, RotateCcw } from 'lucide-react';
import { useApplicationSLA } from '@/hooks/useApplicationSLA';

interface SLASettingsTabProps {
  applicationId: string;
  applicationName: string;
}

interface LLMConfig {
  provider: 'azure-openai' | 'openai' | 'anthropic';
  apiKey: string;
  endpoint: string;
  deploymentId: string;
}

export function SLASettingsTab({ applicationId, applicationName }: SLASettingsTabProps): JSX.Element {
  const { slaConfig, industryDefaults, isLoading, updateSLA, resetToDefaults } = useApplicationSLA(applicationId);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [llmProvider, setLlmProvider] = useState<'azure-openai' | 'openai' | 'anthropic'>('azure-openai');
  const [llmApiKey, setLlmApiKey] = useState<string>('');
  const [llmEndpoint, setLlmEndpoint] = useState<string>('');
  const [llmDeploymentId, setLlmDeploymentId] = useState<string>('');
  const [isTestingLlm, setIsTestingLlm] = useState<boolean>(false);

  const [thresholds, setThresholds] = useState(slaConfig?.metrics || industryDefaults?.metrics);
  const [overallThresholds, setOverallThresholds] = useState(
    slaConfig?.overallScoreThresholds || industryDefaults?.overallScoreThresholds
  );

  const handleMetricThresholdChange = (metricName: string, level: 'excellent' | 'good', value: number): void => {
    setThresholds((prev: Record<string, Record<string, number>> | undefined) => ({
      ...prev,
      [metricName]: {
        ...prev?.[metricName],
        [level]: value,
      },
    }));
  };

  const handleOverallThresholdChange = (level: 'excellent' | 'good', value: number): void => {
    setOverallThresholds((prev: Record<string, number> | undefined) => ({
      ...prev,
      [level]: value,
    }));
  };

  const handleTestLlmConnection = async (): Promise<void> => {
    if (!llmApiKey || !llmEndpoint) {
      alert('Please enter API Key and Endpoint');
      return;
    }

    setIsTestingLlm(true);

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001'}/api/evaluation/test-llm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: llmProvider,
          apiKey: llmApiKey,
          endpoint: llmEndpoint,
          deploymentId: llmDeploymentId,
        }),
      });

      if (!response.ok) throw new Error('LLM connection test failed');

      setSaveMessage({ type: 'success', text: 'LLM connection successful!' });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'LLM connection test failed';
      setSaveMessage({ type: 'error', text: errorMessage });
    } finally {
      setIsTestingLlm(false);
    }
  };

  const handleSave = async (): Promise<void> => {
    setIsSaving(true);
    setSaveMessage(null);

    try {
      const result = await updateSLA(thresholds, overallThresholds);

      if (result.success) {
        setSaveMessage({ type: 'success', text: 'SLA settings saved successfully!' });
      } else {
        setSaveMessage({ type: 'error', text: result.error ?? 'Failed to save SLA settings' });
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred while saving';
      setSaveMessage({ type: 'error', text: errorMessage });
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = async (): Promise<void> => {
    if (!confirm('Reset all SLA settings to industry defaults?')) return;

    setIsSaving(true);
    setSaveMessage(null);

    try {
      const result = await resetToDefaults();

      if (result.success) {
        setThresholds(result.data?.metrics);
        setOverallThresholds(result.data?.overallScoreThresholds);
        setSaveMessage({ type: 'success', text: 'SLA settings reset to industry defaults' });
      } else {
        setSaveMessage({ type: 'error', text: result.error ?? 'Failed to reset SLA settings' });
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred while resetting';
      setSaveMessage({ type: 'error', text: errorMessage });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner className="w-6 h-6" />
        <span className="ml-2">Loading SLA settings...</span>
      </div>
    );
  }

  const metricsNames = ['faithfulness', 'answer_relevancy', 'context_relevancy', 'context_precision', 'context_recall', 'correctness'];

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 mb-2">Application Settings</h3>
        <p className="text-sm text-blue-800">
          Configure LLM for recommendations and customize SLA thresholds for <strong>{applicationName}</strong>.
        </p>
      </div>

      {/* LLM Configuration Section */}
      <Card className="p-6 border-2 border-purple-200 bg-purple-50">
        <h3 className="font-semibold text-lg mb-4 text-purple-900">LLM Configuration for Recommendations</h3>
        <p className="text-sm text-purple-800 mb-4">
          Configure the LLM used for generating prompt recommendations and analysis. Azure OpenAI is recommended.
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">LLM Provider</label>
            <select
              value={llmProvider}
              onChange={(e) => setLlmProvider(e.target.value as 'azure-openai' | 'openai' | 'anthropic')}
              className="w-full p-2 border border-gray-300 rounded-lg"
            >
              <option value="azure-openai">Azure OpenAI (Recommended)</option>
              <option value="openai">OpenAI</option>
              <option value="anthropic">Anthropic Claude</option>
            </select>
          </div>

          {llmProvider === 'azure-openai' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Azure OpenAI Endpoint</label>
                <Input
                  type="text"
                  placeholder="https://your-resource.openai.azure.com/"
                  value={llmEndpoint}
                  onChange={(e) => setLlmEndpoint(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Deployment ID</label>
                <Input
                  type="text"
                  placeholder="gpt-4"
                  value={llmDeploymentId}
                  onChange={(e) => setLlmDeploymentId(e.target.value)}
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">API Key</label>
            <Input
              type="password"
              placeholder="Enter your API key"
              value={llmApiKey}
              onChange={(e) => setLlmApiKey(e.target.value)}
            />
          </div>

          <Button
            onClick={handleTestLlmConnection}
            disabled={isTestingLlm || !llmApiKey}
            className="w-full bg-purple-600 hover:bg-purple-700"
          >
            {isTestingLlm ? (
              <>
                <Spinner className="w-4 h-4 mr-2" />
                Testing Connection...
              </>
            ) : (
              'Test LLM Connection'
            )}
          </Button>
        </div>
      </Card>

      {/* SLA Configuration Section */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 mb-2">Per-Application SLA Configuration</h3>
        <p className="text-sm text-blue-800">
          Customize SLA thresholds for <strong>{applicationName}</strong>. These thresholds determine the health status (Excellent/Good/Needs Improvement) of each metric for this application. Leave empty to use industry defaults.
        </p>
      </div>
        <div
          className={`flex gap-2 p-4 rounded-lg border ${
            saveMessage.type === 'success'
              ? 'bg-green-50 border-green-200'
              : 'bg-red-50 border-red-200'
          }`}
        >
          {saveMessage.type === 'success' ? (
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
          )}
          <p
            className={`text-sm ${
              saveMessage.type === 'success' ? 'text-green-800' : 'text-red-800'
            }`}
          >
            {saveMessage.text}
          </p>
        </div>
      )}

      <Card className="p-6">
        <h3 className="font-semibold text-lg mb-6">Metric Thresholds (%)</h3>

        <div className="space-y-8">
          {metricsNames.map((metricName) => (
            <div key={metricName} className="border-b pb-6 last:border-b-0">
              <h4 className="font-medium mb-4 text-gray-900 capitalize">
                {metricName.replace(/_/g, ' ')}
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Excellent (≥)
                  </label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={thresholds?.[metricName]?.excellent || 0}
                    onChange={(e) =>
                      handleMetricThresholdChange(metricName, 'excellent', parseInt(e.target.value))
                    }
                    disabled={isSaving}
                    placeholder={industryDefaults?.metrics?.[metricName]?.excellent.toString()}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Industry default: {industryDefaults?.metrics?.[metricName]?.excellent}%
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Good (≥)
                  </label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={thresholds?.[metricName]?.good || 0}
                    onChange={(e) => handleMetricThresholdChange(metricName, 'good', parseInt(e.target.value))}
                    disabled={isSaving}
                    placeholder={industryDefaults?.metrics?.[metricName]?.good.toString()}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Industry default: {industryDefaults?.metrics?.[metricName]?.good}%
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="font-semibold text-lg mb-4">Overall Score Thresholds (%)</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Excellent (≥)
            </label>
            <Input
              type="number"
              min="0"
              max="100"
              value={overallThresholds?.excellent || 0}
              onChange={(e) => handleOverallThresholdChange('excellent', parseInt(e.target.value))}
              disabled={isSaving}
              placeholder={industryDefaults?.overallScoreThresholds?.excellent.toString()}
            />
            <p className="text-xs text-gray-500 mt-1">
              Industry default: {industryDefaults?.overallScoreThresholds?.excellent}%
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Good (≥)
            </label>
            <Input
              type="number"
              min="0"
              max="100"
              value={overallThresholds?.good || 0}
              onChange={(e) => handleOverallThresholdChange('good', parseInt(e.target.value))}
              disabled={isSaving}
              placeholder={industryDefaults?.overallScoreThresholds?.good.toString()}
            />
            <p className="text-xs text-gray-500 mt-1">
              Industry default: {industryDefaults?.overallScoreThresholds?.good}%
            </p>
          </div>
        </div>
      </Card>

      <div className="flex gap-3 justify-end">
        <Button
          variant="outline"
          onClick={handleReset}
          disabled={isSaving}
          className="flex items-center gap-2"
        >
          <RotateCcw className="w-4 h-4" />
          Reset to Defaults
        </Button>

        <Button onClick={handleSave} disabled={isSaving} className="bg-blue-600 hover:bg-blue-700">
          {isSaving ? (
            <>
              <Spinner className="w-4 h-4 mr-2" />
              Saving...
            </>
          ) : (
            'Save SLA Settings'
          )}
        </Button>
      </div>
    </div>
  );
}
