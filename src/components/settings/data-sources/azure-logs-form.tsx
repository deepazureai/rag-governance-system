import React from 'react';
import { AzureLogsConfig } from '@/src/types/dataSource';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

interface AzureLogsFormProps {
  config?: AzureLogsConfig;
  onSave: (config: any) => void;
  onTest: () => void;
  isTesting?: boolean;
  testResult?: { success: boolean; message: string };
}

export function AzureLogsForm({ config, onSave, onTest, isTesting, testResult }: AzureLogsFormProps) {
  const [formData, setFormData] = React.useState(
    config?.config || {
      workspaceId: '',
      primaryKey: '',
      tableName: '',
      query: '',
    }
  );

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    onSave(formData);
  };

  return (
    <div className="space-y-4">
      <Card className="p-6 bg-white">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Azure Log Analytics Configuration</h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Workspace ID</label>
            <Input
              value={formData.workspaceId}
              onChange={(e) => handleChange('workspaceId', e.target.value)}
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
            />
            <p className="text-xs text-gray-500 mt-1">Your Log Analytics workspace ID</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Primary Key</label>
            <Input
              type="password"
              value={formData.primaryKey}
              onChange={(e) => handleChange('primaryKey', e.target.value)}
              placeholder="••••••••••••••••••••••••••••••••"
            />
            <p className="text-xs text-gray-500 mt-1">Primary key for authentication (encrypted)</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Table Name</label>
            <Input
              value={formData.tableName}
              onChange={(e) => handleChange('tableName', e.target.value)}
              placeholder="CustomTable or RAG_Metrics"
            />
            <p className="text-xs text-gray-500 mt-1">Name of the custom table storing metrics</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">KQL Query (Optional)</label>
            <Textarea
              value={formData.query}
              onChange={(e) => handleChange('query', e.target.value)}
              placeholder="CustomTable | where TimeGenerated > ago(1d) | summarize..."
              className="h-24 font-mono text-sm"
            />
            <p className="text-xs text-gray-500 mt-1">Kusto Query Language query to retrieve metrics</p>
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
