import React from 'react';
import { AzureBlobConfig } from '@/src/types/dataSource';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface AzureBlobFormProps {
  config?: AzureBlobConfig;
  onSave: (config: any) => void;
  onTest: () => void;
  isTesting?: boolean;
  testResult?: { success: boolean; message: string };
}

export function AzureBlobForm({ config, onSave, onTest, isTesting, testResult }: AzureBlobFormProps) {
  const [formData, setFormData] = React.useState(
    config?.config || {
      storageAccountName: '',
      containerName: '',
      accountKey: '',
      folderPath: '',
      filePattern: '*.json',
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
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Azure Blob Storage Configuration</h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Storage Account Name</label>
            <Input
              value={formData.storageAccountName}
              onChange={(e) => handleChange('storageAccountName', e.target.value)}
              placeholder="mystorageaccount"
            />
            <p className="text-xs text-gray-500 mt-1">Name of your Azure storage account</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Container Name</label>
            <Input
              value={formData.containerName}
              onChange={(e) => handleChange('containerName', e.target.value)}
              placeholder="rag-metrics"
            />
            <p className="text-xs text-gray-500 mt-1">Name of the blob container</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Account Key</label>
            <Input
              type="password"
              value={formData.accountKey}
              onChange={(e) => handleChange('accountKey', e.target.value)}
              placeholder="••••••••••••••••••••••••••••••••"
            />
            <p className="text-xs text-gray-500 mt-1">Primary or secondary access key (encrypted)</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Folder Path (Optional)</label>
            <Input
              value={formData.folderPath}
              onChange={(e) => handleChange('folderPath', e.target.value)}
              placeholder="logs/rag/2024/"
            />
            <p className="text-xs text-gray-500 mt-1">Folder path within container</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">File Pattern (Optional)</label>
            <Input
              value={formData.filePattern}
              onChange={(e) => handleChange('filePattern', e.target.value)}
              placeholder="*.json or evaluation_*.log"
            />
            <p className="text-xs text-gray-500 mt-1">Pattern to match log files</p>
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
