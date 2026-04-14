import React from 'react';
import { DatadogConfig } from '@/src/types/dataSource';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DATADOG_SITES } from '@/src/constants/dataSources';

interface DatadogFormProps {
  config?: DatadogConfig;
  onSave: (config: any) => void;
  onTest: () => void;
  isTesting?: boolean;
  testResult?: { success: boolean; message: string };
}

export function DatadogForm({ config, onSave, onTest, isTesting, testResult }: DatadogFormProps) {
  const [formData, setFormData] = React.useState(
    config?.config || {
      apiKey: '',
      appKey: '',
      datadogSite: 'US1' as const,
      query: '',
    }
  );

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    onSave(formData);
  };

  return (
    <div className="space-y-4">
      <Card className="p-6 bg-white">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Datadog Configuration</h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">API Key</label>
            <Input
              type="password"
              value={formData.apiKey}
              onChange={(e) => handleChange('apiKey', e.target.value)}
              placeholder="••••••••••••••••••••••••••••••••"
            />
            <p className="text-xs text-gray-500 mt-1">Your Datadog API key (encrypted)</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">App Key</label>
            <Input
              type="password"
              value={formData.appKey}
              onChange={(e) => handleChange('appKey', e.target.value)}
              placeholder="••••••••••••••••••••••••••••••••"
            />
            <p className="text-xs text-gray-500 mt-1">Your Datadog application key (encrypted)</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Datadog Site</label>
            <Select value={formData.datadogSite} onValueChange={(value) => handleChange('datadogSite', value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(DATADOG_SITES).map(([key, site]) => (
                  <SelectItem key={key} value={key}>
                    {site.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500 mt-1">Select your Datadog region</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Logs Query (Optional)</label>
            <Textarea
              value={formData.query}
              onChange={(e) => handleChange('query', e.target.value)}
              placeholder="service:rag-app @eval_metrics.score:>0.5"
              className="h-20 font-mono text-sm"
            />
            <p className="text-xs text-gray-500 mt-1">Datadog query syntax for filtering logs</p>
          </div>
        </div>

        <div className="flex gap-2 mt-6">
          <Button
            onClick={handleSave}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            Save Configuration
          </Button>
          <Button
            onClick={onTest}
            disabled={isTesting}
            variant="outline"
            className="border-gray-300"
          >
            {isTesting ? 'Testing...' : 'Test Connection'}
          </Button>
        </div>

        {testResult && (
          <div
            className={`mt-4 p-3 rounded-lg ${
              testResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
            }`}
          >
            <p
              className={`text-sm font-medium ${
                testResult.success ? 'text-green-800' : 'text-red-800'
              }`}
            >
              {testResult.message}
            </p>
          </div>
        )}
      </Card>
    </div>
  );
}
