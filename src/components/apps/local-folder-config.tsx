'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { FileUp, AlertCircle, CheckCircle, Folder, File } from 'lucide-react';

interface LocalFolderConfigProps {
  onConfigure: (config: { folderPath: string; fileName: string; fileContent?: string }) => void;
  isLoading?: boolean;
  onValidationChange?: (isValid: boolean) => void;
}

export function LocalFolderConfig({ onConfigure, isLoading, onValidationChange }: LocalFolderConfigProps) {
  const [folderPath, setFolderPath] = useState('');
  const [fileName, setFileName] = useState('');
  const [selectedFilePath, setSelectedFilePath] = useState('');
  const [error, setError] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [isValidated, setIsValidated] = useState(false);
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [isFileLoaded, setIsFileLoaded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Detect OS
  const isWindows = typeof navigator !== 'undefined' && navigator.userAgent.includes('Windows');
  const isMac = typeof navigator !== 'undefined' && navigator.userAgent.includes('Mac');

  // Handle file browser click
  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };

  // Handle file selection from browser
  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const filePath = file.name;
    const fileName = filePath.split(/[\\/]/).pop() || '';
    const fullPath = file.webkitRelativePath || file.name;
    const folderPath = fullPath.substring(0, fullPath.lastIndexOf('/') || fullPath.lastIndexOf('\\')) || '/selected/folder';

    setSelectedFilePath(fullPath);
    setFileName(fileName);
    setFolderPath(folderPath);
    setIsValidated(false);
    setError('');
    setFileContent(null);
    setIsFileLoaded(false);
    
    console.log('[v0] File selected, starting to read:', { fileName, fileSize: file.size });
    
    // Read file content immediately
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result;
      
      // Ensure content is a string
      if (typeof content !== 'string') {
        console.error('[v0] FileReader result is not a string:', { type: typeof content });
        setError('Failed to read file as text. Please ensure the file is a valid text-based file.');
        setIsFileLoaded(false);
        return;
      }
      
      console.log('[v0] File content loaded successfully:', { fileName, contentLength: content.length, lines: content.split('\n').length });
      setFileContent(content);
      setIsFileLoaded(true);
    };
    reader.onerror = (error) => {
      console.error('[v0] FileReader error:', error);
      setError('Failed to read file. Error: ' + error);
      setIsFileLoaded(false);
    };
    reader.readAsText(file);
    
    console.log('[v0] File selection handler completed, waiting for FileReader...');
  };

  // Validate file
  const handleValidateFile = async () => {
    setError('');
    setIsValidated(false);

    if (!fileName.trim()) {
      setError('Please select a file first using the Browse button');
      onValidationChange?.(false);
      return;
    }

    if (!fileName.endsWith('.csv') && !fileName.endsWith('.txt')) {
      setError('File must be .csv or .txt format');
      onValidationChange?.(false);
      return;
    }

    if (!isFileLoaded) {
      setError('File is still loading. Please wait a moment and try again.');
      onValidationChange?.(false);
      return;
    }

    if (!fileContent) {
      setError('File content could not be read');
      onValidationChange?.(false);
      return;
    }

    setIsValidating(true);
    try {
      console.log('[v0] Validating file:', { folderPath, fileName, contentType: typeof fileContent, contentLength: fileContent?.length });
      
      // Ensure fileContent is a string
      if (typeof fileContent !== 'string') {
        throw new Error('Invalid file content type. Expected text file.');
      }
      
      if (!fileContent || fileContent.trim().length === 0) {
        throw new Error('File is empty');
      }
      
      // Basic validation: check if file has content and valid format
      const lines = fileContent.split('\n').filter(l => l.trim());
      console.log('[v0] File lines parsed:', { count: lines.length, firstLine: lines[0]?.substring(0, 100) });
      
      if (lines.length < 2) {
        throw new Error('File must have at least headers and one data row. Found ' + lines.length + ' line(s)');
      }

      // Check if it looks like CSV (should have comma-separated values)
      // More flexible check - don't require commas if it's semicolon delimited
      const firstLine = lines[0];
      const hasCommas = firstLine.includes(',');
      const hasSemicolons = firstLine.includes(';');
      const hasEqualsAndQuotes = firstLine.includes('=') && (firstLine.includes('"') || firstLine.includes("'"));
      
      if (!hasCommas && !hasSemicolons && !hasEqualsAndQuotes) {
        throw new Error('File does not appear to be valid CSV format. Expected comma-separated, semicolon-delimited, or key=value pairs.');
      }

      console.log('[v0] File validation successful:', { lines: lines.length, hasCommas, hasSemicolons });
      
      setIsValidated(true);
      onValidationChange?.(true);
      onConfigure({ folderPath, fileName, fileContent });
      
    } catch (err: any) {
      console.error('[v0] Error validating file:', err);
      console.error('[v0] Error details:', { fileContent: typeof fileContent, length: fileContent?.length });
      setError(err.message || 'File validation failed. Please check the file format.');
      onValidationChange?.(false);
    } finally {
      setIsValidating(false);
    }
  };

  return (
    <Card className="p-6 space-y-4">
      <div>
        <h3 className="font-semibold text-gray-900 mb-2">Local Folder Configuration</h3>
        <p className="text-sm text-gray-600 mb-4">
          Select your evaluation data file. The file will be validated before proceeding.
        </p>
      </div>

      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Data File
          </label>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.txt"
            onChange={handleFileSelected}
            className="hidden"
          />
          <Button
            onClick={handleBrowseClick}
            variant="outline"
            className="w-full justify-start text-left font-normal"
            disabled={isValidating || isLoading}
          >
            <Folder className="w-4 h-4 mr-2 flex-shrink-0" />
            {fileName ? `${fileName}` : `Browse Files (${isWindows ? 'Windows' : isMac ? 'macOS' : 'Linux'})`}
          </Button>
          {selectedFilePath && (
            <p className="text-xs text-gray-500 mt-2">
              Selected: <code className="bg-gray-100 px-1 rounded">{selectedFilePath}</code>
            </p>
          )}
        </div>

        {fileName && (
          <div className="bg-blue-50 border border-blue-200 p-3 rounded text-sm">
            <div className="flex items-start gap-2">
              <File className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-blue-900">File: {fileName}</p>
                <p className="text-xs text-blue-800 mt-1">Format: .csv or .txt (semicolon-delimited)</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="flex gap-2 p-3 bg-red-50 border border-red-200 rounded">
          <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {isValidated && (
        <div className="flex gap-2 p-3 bg-green-50 border border-green-200 rounded">
          <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-green-600">File validated successfully! You can now proceed to create the application.</p>
        </div>
      )}

      <div className="bg-amber-50 border border-amber-200 p-3 rounded text-sm">
        <p className="text-amber-900 font-medium mb-2">Expected Data Format:</p>
        <code className="text-xs text-amber-800 block whitespace-normal break-words">
          user_prompt="text", context="data", response="result", user_id="123"; user_prompt="text2", ...
        </code>
        <p className="text-xs text-amber-700 mt-2">Each row is a semicolon-separated record with comma-separated key=value pairs</p>
      </div>

      <Button
        onClick={handleValidateFile}
        disabled={isValidating || isLoading || !fileName || isValidated || !isFileLoaded}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-75"
      >
        {isValidating ? (
          <>
            <Spinner className="w-4 h-4 mr-2" />
            Validating File...
          </>
        ) : !isFileLoaded ? (
          <>
            <Spinner className="w-4 h-4 mr-2" />
            Loading File...
          </>
        ) : isValidated ? (
          <>
            <CheckCircle className="w-4 h-4 mr-2" />
            File Validated
          </>
        ) : (
          <>
            <FileUp className="w-4 h-4 mr-2" />
            Validate File
          </>
        )}
      </Button>
    </Card>
  );
}
