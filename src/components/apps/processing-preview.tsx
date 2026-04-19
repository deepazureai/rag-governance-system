import { Card } from '@/components/ui/card';
import { CheckCircle, AlertCircle, XCircle } from 'lucide-react';

interface ProcessingPreviewProps {
  totalRecords: number;
  processedRecords: number;
  duplicates: number;
  invalidRecords: number;
  dataQualityScore?: number;
  processingTime?: number;
  fileSize?: number;
}

export function ProcessingPreview({
  totalRecords,
  processedRecords,
  duplicates,
  invalidRecords,
  dataQualityScore,
  processingTime,
  fileSize,
}: ProcessingPreviewProps) {
  const successRate = totalRecords > 0 ? ((processedRecords / totalRecords) * 100).toFixed(1) : 0;

  return (
    <Card className="p-6 space-y-4">
      <div>
        <h3 className="font-semibold text-gray-900 mb-4">Data Processing Preview</h3>
        <p className="text-sm text-gray-600">
          Preview of the data ingestion and processing results
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="p-3 bg-blue-50 rounded border border-blue-200">
          <p className="text-xs text-blue-600 mb-1">Total Records</p>
          <p className="text-2xl font-bold text-blue-900">{totalRecords}</p>
        </div>

        <div className="p-3 bg-green-50 rounded border border-green-200">
          <div className="flex items-center gap-1 mb-1">
            <CheckCircle className="w-3 h-3 text-green-600" />
            <p className="text-xs text-green-600">Processed</p>
          </div>
          <p className="text-2xl font-bold text-green-900">{processedRecords}</p>
        </div>

        <div className="p-3 bg-yellow-50 rounded border border-yellow-200">
          <div className="flex items-center gap-1 mb-1">
            <AlertCircle className="w-3 h-3 text-yellow-600" />
            <p className="text-xs text-yellow-600">Duplicates</p>
          </div>
          <p className="text-2xl font-bold text-yellow-900">{duplicates}</p>
        </div>

        {invalidRecords > 0 && (
          <div className="p-3 bg-red-50 rounded border border-red-200">
            <div className="flex items-center gap-1 mb-1">
              <XCircle className="w-3 h-3 text-red-600" />
              <p className="text-xs text-red-600">Invalid</p>
            </div>
            <p className="text-2xl font-bold text-red-900">{invalidRecords}</p>
          </div>
        )}

        <div className="p-3 bg-purple-50 rounded border border-purple-200">
          <p className="text-xs text-purple-600 mb-1">Success Rate</p>
          <p className="text-2xl font-bold text-purple-900">{successRate}%</p>
        </div>

        {dataQualityScore !== undefined && (
          <div className="p-3 bg-indigo-50 rounded border border-indigo-200">
            <p className="text-xs text-indigo-600 mb-1">Quality Score</p>
            <p className="text-2xl font-bold text-indigo-900">{dataQualityScore.toFixed(1)}%</p>
          </div>
        )}
      </div>

      <div className="bg-gray-50 p-4 rounded space-y-2 text-sm">
        {fileSize && (
          <div className="flex justify-between">
            <span className="text-gray-600">File Size:</span>
            <span className="font-medium">
              {(fileSize / 1024 / 1024).toFixed(2)} MB
            </span>
          </div>
        )}

        {processingTime && (
          <div className="flex justify-between">
            <span className="text-gray-600">Processing Time:</span>
            <span className="font-medium">{(processingTime / 1000).toFixed(2)}s</span>
          </div>
        )}

        {processingTime && totalRecords > 0 && (
          <div className="flex justify-between">
            <span className="text-gray-600">Avg. Per Record:</span>
            <span className="font-medium">
              {(processingTime / totalRecords).toFixed(2)}ms
            </span>
          </div>
        )}
      </div>

      {successRate !== 100 && (
        <div className="bg-yellow-50 p-3 rounded border border-yellow-200">
          <p className="text-sm text-yellow-800">
            <strong>Note:</strong> Some records could not be processed. Review the data format and ensure it matches the expected structure.
          </p>
        </div>
      )}

      {successRate === 100 && (
        <div className="bg-green-50 p-3 rounded border border-green-200">
          <p className="text-sm text-green-800">
            <strong>Success!</strong> All records have been processed and will be stored in the database.
          </p>
        </div>
      )}
    </Card>
  );
}
