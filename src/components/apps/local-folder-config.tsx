import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { FileUp, AlertCircle, CheckCircle } from 'lucide-react';

interface LocalFolderConfigProps {
  onConfigure: (config: { folderPath: string; fileName: string }) => void;
  isLoading?: boolean;
}

export function LocalFolderConfig({ onConfigure, isLoading }: LocalFolderConfigProps) {
  const [folderPath, setFolderPath] = useState('');
  const [fileName, setFileName] = useState('');
  const [error, setError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async () => {
    setError('');
    setIsSuccess(false);

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

    // Start processing
    setIsProcessing(true);
    try {
      console.log('[v0] Starting file processing:', { folderPath, fileName });
      
      // Call backend to process the file
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/batch/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceType: 'local-folder',
          sourceConfig: { folderPath, fileName },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to process file: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('[v0] File processing successful:', result);
      
      setIsSuccess(true);
      // Save the config after successful processing
      onConfigure({ folderPath, fileName });
      
    } catch (err: any) {
      console.error('[v0] Error processing file:', err);
      setError(err.message || 'Failed to process file. Please try again.');
    } finally {
      setIsProcessing(false);
    }
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
            disabled={isProcessing || isLoading}
          />
          <p className="text-xs text-gray-500 mt-1">
            Example: C:/Users/user/Documents/data or /home/user/metrics
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
            disabled={isProcessing || isLoading}
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

      {isSuccess && (
        <div className="flex gap-2 p-3 bg-green-50 border border-green-200 rounded">
          <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-green-600">File processed successfully! Ready to proceed.</p>
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
        disabled={isProcessing || isLoading || isSuccess}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-75"
      >
        {isProcessing ? (
          <>
            <Spinner className="w-4 h-4 mr-2" />
            Processing your data...
          </>
        ) : isSuccess ? (
          <>
            <CheckCircle className="w-4 h-4 mr-2" />
            File Processed
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
