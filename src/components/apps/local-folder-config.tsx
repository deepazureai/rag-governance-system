import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { FileUp, AlertCircle } from 'lucide-react';

interface LocalFolderConfigProps {
  onConfigure: (config: { folderPath: string; fileName: string }) => void;
  isLoading?: boolean;
}

export function LocalFolderConfig({ onConfigure, isLoading }: LocalFolderConfigProps) {
  const [folderPath, setFolderPath] = useState('');
  const [fileName, setFileName] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = () => {
    setError('');

    if (!folderPath.trim()) {
      setError('Folder path is required');
      return;
    }

    if (!fileName.trim()) {
      setError('File name is required');
      return;
    }

    if (!fileName.endsWith('.csv') && !fileName.endsWith('.txt')) {
      setError('File must be .csv or .txt');
      return;
    }

    onConfigure({ folderPath, fileName });
  };

  return (
    <Card className="p-6 space-y-4">
      <div>
        <h3 className="font-semibold text-gray-900 mb-4">Local Folder Configuration</h3>
        <p className="text-sm text-gray-600 mb-4">
          Specify the folder path and file name containing your metrics data in semicolon-delimited format.
        </p>
      </div>

      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Folder Path
          </label>
          <Input
            placeholder="/path/to/folder"
            value={folderPath}
            onChange={(e) => setFolderPath(e.target.value)}
            disabled={isLoading}
          />
          <p className="text-xs text-gray-500 mt-1">
            Example: /home/user/metrics or /data/ai-logs
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            File Name
          </label>
          <Input
            placeholder="metrics.csv"
            value={fileName}
            onChange={(e) => setFileName(e.target.value)}
            disabled={isLoading}
          />
          <p className="text-xs text-gray-500 mt-1">
            Format: semicolon-delimited with comma-separated key=value pairs
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
        <p className="text-blue-900 font-medium mb-1">Expected Data Format:</p>
        <code className="text-xs text-blue-800 block mt-1">
          user_prompt="text", context="data", response="result", user_id="123"; user_prompt="text2", ...
        </code>
      </div>

      <Button
        onClick={handleSubmit}
        disabled={isLoading}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-75"
      >
        {isLoading ? (
          <>
            <Spinner className="w-4 h-4 mr-2" />
            Processing your data...
          </>
        ) : (
          <>
            <FileUp className="w-4 h-4 mr-2" />
            Load and Process File
          </>
        )}
      </Button>
    </Card>
  );
}
