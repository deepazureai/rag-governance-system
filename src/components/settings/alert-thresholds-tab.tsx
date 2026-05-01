'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertThresholdConfig, INDUSTRY_STANDARD_THRESHOLDS, MetricThreshold } from '@/src/types/index';
import { AlertTriangle, CheckCircle, RotateCcw } from 'lucide-react';

interface AlertThresholdsTabProps {
  appId?: string;
}

export function AlertThresholdsTab({ appId }: AlertThresholdsTabProps) {
  const [thresholds, setThresholds] = useState<AlertThresholdConfig>(INDUSTRY_STANDARD_THRESHOLDS);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [previewAlerts, setPreviewAlerts] = useState<Array<{ metric: string; severity: string; value: number }>>([]);

  const metricGroups = [
    {
      name: 'Quality Metrics (0-100 scale)',
      metrics: [
        { key: 'groundedness', label: 'Groundedness', description: 'How well the answer is grounded in the context' },
        { key: 'relevance', label: 'Relevance', description: 'How relevant the answer is to the query' },
        { key: 'contextPrecision', label: 'Context Precision', description: 'Precision of retrieved context' },
        { key: 'contextRecall', label: 'Context Recall', description: 'Recall of retrieved context' },
        { key: 'answerRelevancy', label: 'Answer Relevancy', description: 'Relevance of generated answer' },
        { key: 'coherence', label: 'Coherence', description: 'Logical consistency of the answer' },
        { key: 'faithfulness', label: 'Faithfulness', description: 'Faithfulness to the source material' },
      ],
    },
    {
      name: 'Performance Metrics',
      metrics: [
        { key: 'successRate', label: 'Success Rate (%)', description: 'Percentage of successful queries', unit: '%' },
        { key: 'latency', label: 'Latency (ms)', description: 'Response time in milliseconds', unit: 'ms' },
        { key: 'tokenEfficiency', label: 'Token Efficiency', description: 'Average tokens per query', unit: 'tokens' },
        { key: 'errorRate', label: 'Error Rate (%)', description: 'Percentage of failed queries', unit: '%' },
      ],
    },
  ];

  // Load thresholds on mount
  useEffect(() => {
    const loadThresholds = async () => {
      try {
        setIsLoading(true);
        
        if (!appId) {
          // No app selected, use industry defaults
          setThresholds(INDUSTRY_STANDARD_THRESHOLDS);
          setIsLoading(false);
          return;
        }

        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';
        const endpoint = `${apiUrl}/api/alert-thresholds/app/${appId}`;
        
        try {
          const response = await fetch(endpoint);
          if (response.ok) {
            const data = await response.json();
            if (data.success) {
              setThresholds(data.data);
            } else {
              setThresholds(INDUSTRY_STANDARD_THRESHOLDS);
            }
          } else {
            // Endpoint doesn't exist (404) or other error, use defaults
            console.log('[v0] Alert thresholds endpoint not available, using defaults');
            setThresholds(INDUSTRY_STANDARD_THRESHOLDS);
          }
        } catch (fetchError) {
          // Network error or JSON parsing error, use defaults
          console.log('[v0] Error fetching thresholds, using defaults');
          setThresholds(INDUSTRY_STANDARD_THRESHOLDS);
        }
      } catch (err) {
        console.error('[v0] Error loading thresholds:', err);
        setThresholds(INDUSTRY_STANDARD_THRESHOLDS);
      } finally {
        setIsLoading(false);
      }
    };

    loadThresholds();
  }, [appId]);

  // Update a single metric threshold
  const updateThreshold = (metricKey: string, field: 'critical' | 'warning', value: number) => {
    setThresholds((prev) => ({
      ...prev,
      [metricKey]: {
        ...(prev[metricKey as keyof AlertThresholdConfig] as MetricThreshold),
        [field]: value,
      },
      updatedAt: new Date().toISOString(),
      isCustom: true,
    }));
    generatePreviewAlerts();
  };

  // Generate preview of triggered alerts
  const generatePreviewAlerts = () => {
    // Mock preview - in real app, would call backend with test metrics
    const alerts = [];
    // Could add mock data here for demonstration
    setPreviewAlerts(alerts);
  };

  // Save thresholds
  const handleSave = async () => {
    try {
      setIsSaving(true);
      if (!appId) {
        setSaveMessage({ type: 'error', text: 'No application selected' });
        return;
      }

      const endpoint = `/api/alert-thresholds/app/${appId}`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(thresholds),
      });

      const data = await response.json();

      if (data.success) {
        setSaveMessage({ type: 'success', text: 'Alert thresholds saved successfully' });
        setTimeout(() => setSaveMessage(null), 3000);
      } else {
        setSaveMessage({ type: 'error', text: data.error || 'Failed to save thresholds' });
      }
    } catch (err) {
      console.error('[v0] Error saving thresholds:', err);
      setSaveMessage({ type: 'error', text: 'Error saving thresholds' });
    } finally {
      setIsSaving(false);
    }
  };

  // Reset to industry defaults
  const handleReset = async () => {
    if (!confirm('Are you sure you want to reset to industry standard thresholds?')) return;

    try {
      if (appId) {
        await fetch(`/api/alert-thresholds/app/${appId}`, { method: 'DELETE' });
      }
      setThresholds(INDUSTRY_STANDARD_THRESHOLDS);
      setSaveMessage({ type: 'success', text: 'Thresholds reset to industry standards' });
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (err) {
      console.error('[v0] Error resetting thresholds:', err);
      setSaveMessage({ type: 'error', text: 'Error resetting thresholds' });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-32 bg-gray-100 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Alert Thresholds</h3>
        <p className="text-sm text-gray-600">
          Configure the metrics thresholds that trigger alerts. Thresholds are based on 2026 industry standards and can be customized per application.
        </p>
      </div>

      {/* Save Message */}
      {saveMessage && (
        <Card className={`p-4 flex items-center gap-2 ${saveMessage.type === 'success' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
          {saveMessage.type === 'success' ? (
            <CheckCircle className="w-5 h-5 text-green-600" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-red-600" />
          )}
          <p className={`text-sm ${saveMessage.type === 'success' ? 'text-green-800' : 'text-red-800'}`}>
            {saveMessage.text}
          </p>
        </Card>
      )}

      {/* Metric Groups */}
      {metricGroups.map((group) => (
        <div key={group.name} className="space-y-4">
          <h4 className="font-semibold text-gray-900 text-sm">{group.name}</h4>
          <div className="grid gap-4">
            {group.metrics.map((metric) => {
              const threshold = thresholds[metric.key as keyof AlertThresholdConfig] as MetricThreshold;
              return (
                <Card key={metric.key} className="p-4 bg-white border border-gray-200">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h5 className="font-medium text-gray-900">{metric.label}</h5>
                      <p className="text-xs text-gray-600 mt-1">{metric.description}</p>
                    </div>
                  </div>

                  {/* Threshold Sliders */}
                  <div className="space-y-4">
                    {/* Critical Threshold */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-xs font-medium text-red-600">Critical Threshold</label>
                        <span className="text-sm font-semibold text-red-600">{threshold.critical}</span>
                      </div>
                      <input
                        type="range"
                        min={metric.key.includes('Rate') ? 0 : 0}
                        max={metric.key.includes('Rate') ? 100 : metric.key === 'latency' ? 10000 : metric.key === 'tokenEfficiency' ? 5001 : 100}
                        value={threshold.critical}
                        onChange={(e) => updateThreshold(metric.key, 'critical', Number(e.target.value))}
                        className="w-full h-2 bg-red-100 rounded-lg appearance-none cursor-pointer accent-red-600"
                      />
                      <div className="flex justify-between text-xs text-gray-500 mt-1">
                        <span>Alert when below this</span>
                      </div>
                    </div>

                    {/* Warning Threshold */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-xs font-medium text-yellow-600">Warning Threshold</label>
                        <span className="text-sm font-semibold text-yellow-600">{threshold.warning}</span>
                      </div>
                      <input
                        type="range"
                        min={metric.key.includes('Rate') ? 0 : 0}
                        max={metric.key.includes('Rate') ? 100 : metric.key === 'latency' ? 10000 : metric.key === 'tokenEfficiency' ? 5001 : 100}
                        value={threshold.warning}
                        onChange={(e) => updateThreshold(metric.key, 'warning', Number(e.target.value))}
                        className="w-full h-2 bg-yellow-100 rounded-lg appearance-none cursor-pointer accent-yellow-600"
                      />
                      <div className="flex justify-between text-xs text-gray-500 mt-1">
                        <span>Alert when below this</span>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      ))}

      {/* Action Buttons */}
      <div className="flex gap-3 pt-6">
        <Button
          onClick={handleSave}
          disabled={isSaving}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          {isSaving ? 'Saving...' : 'Save Thresholds'}
        </Button>
        <Button
          onClick={handleReset}
          variant="outline"
          className="border-gray-300 text-gray-700 hover:bg-gray-50 gap-2"
        >
          <RotateCcw className="w-4 h-4" />
          Reset to Defaults
        </Button>
      </div>

      {/* Info Box */}
      <Card className="p-4 bg-blue-50 border-blue-200">
        <h5 className="font-medium text-blue-900 mb-2">About Thresholds</h5>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Critical: Triggers immediately when metric falls below this value</li>
          <li>• Warning: Triggers when metric falls below this value but above critical</li>
          <li>• Healthy: No alert when metric is at or above warning threshold</li>
          <li>• For performance metrics (latency, error), lower values are better</li>
          <li>• For quality metrics, higher values are better</li>
        </ul>
      </Card>
    </div>
  );
}
