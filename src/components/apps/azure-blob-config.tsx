import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { AlertCircle } from 'lucide-react';

interface AzureBlobConfigProps {
  onConfigure: (config: AzureBlobConfig) => void;
  isLoading?: boolean;
}

export interface AzureBlobConfig {
  storageAccount: string;
  containerName: string;
  blobName: string;
  connectionString: string;
}

export function AzureBlobConfig({ onConfigure, isLoading }: AzureBlobConfigProps) {
  const [storageAccount, setStorageAccount] = useState('');
  const [containerName, setContainerName] = useState('');
  const [blobName, setBlobName] = useState('');
  const [connectionString, setConnectionString] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = () => {
    setError('');

    if (!storageAccount.trim()) {
      setError('Storage account name is required');
      return;
    }

    if (!containerName.trim()) {
      setError('Container name is required');
      return;
    }

    if (!blobName.trim()) {
      setError('Blob file name is required');
      return;
    }

    if (!connectionString.trim()) {
      setError('Connection string is required');
      return;
    }

    onConfigure({
      storageAccount,
      containerName,
      blobName,
      connectionString,
    });
  };

  return (
    <Card className="p-6 space-y-4">
      <div>
        <h3 className="font-semibold text-gray-900 mb-4">Azure Blob Storage Configuration</h3>
        <p className="text-sm text-gray-600 mb-4">
          Connect to your Azure Blob Storage container and specify the blob file containing metrics data.
        </p>
      </div>

      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Storage Account Name
          </label>
          <Input
            placeholder="mystorageaccount"
            value={storageAccount}
            onChange={(e) => setStorageAccount(e.target.value)}
            disabled={isLoading}
          />
          <p className="text-xs text-gray-500 mt-1">
            The name of your Azure Storage Account
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Container Name
          </label>
          <Input
            placeholder="metrics-data"
            value={containerName}
            onChange={(e) => setContainerName(e.target.value)}
            disabled={isLoading}
          />
          <p className="text-xs text-gray-500 mt-1">
            The container that holds your metrics blob
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Blob File Name
          </label>
          <Input
            placeholder="raw_metrics.csv"
            value={blobName}
            onChange={(e) => setBlobName(e.target.value)}
            disabled={isLoading}
          />
          <p className="text-xs text-gray-500 mt-1">
            The blob file containing semicolon-delimited metrics data
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Connection String
          </label>
          <textarea
            placeholder="DefaultEndpointsProtocol=https;AccountName=...;AccountKey=...;EndpointSuffix=core.windows.net"
            value={connectionString}
            onChange={(e) => setConnectionString(e.target.value)}
            disabled={isLoading}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm font-mono text-xs"
          />
          <p className="text-xs text-gray-500 mt-1">
            Your Azure Storage connection string (will be encrypted)
          </p>
        </div>
      </div>

      {error && (
        <div className="flex gap-2 p-3 bg-red-50 border border-red-200 rounded">
          <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      <div className="bg-blue-50 border border-blue-200 p-3 rounded text-sm">
        <p className="text-blue-900 font-medium mb-1">Data Format Expected:</p>
        <code className="text-xs text-blue-800 block mt-1">
          user_prompt="text", context="data"; user_prompt="text2", ...
        </code>
      </div>

      <Button
        onClick={handleSubmit}
        disabled={isLoading}
        className="w-full bg-blue-600 hover:bg-blue-700"
      >
        {isLoading ? 'Connecting...' : 'Connect & Process Data'}
      </Button>
    </Card>
  );
}
