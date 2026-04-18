import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';

interface BatchData {
  id: string;
  batchId: string;
  status: string;
  progress: {
    totalRecords: number;
    processedRecords: number;
    failedRecords: number;
    currentStep: string;
  };
  metadata: {
    fileName: string;
    fileSize?: number;
    recordCount: number;
    duplicateRecordsRemoved: number;
    validationErrors: string[];
  };
  createdAt: string;
  completedAt?: string;
  errorDetails?: {
    phase: string;
    message: string;
    code: string;
  };
}

interface BatchProgressModalProps {
  batch: BatchData;
  onClose: () => void;
}

export function BatchProgressModal({ batch, onClose }: BatchProgressModalProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-blue-100 text-blue-800';
    }
  };

  const progressPercent = Math.round(
    ((batch.progress.processedRecords + batch.progress.failedRecords) /
      (batch.progress.totalRecords || 1)) *
      100
  );

  const duration = batch.completedAt
    ? Math.round(
        (new Date(batch.completedAt).getTime() - new Date(batch.createdAt).getTime()) / 1000
      )
    : 0;

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <span className="font-mono text-sm text-gray-500">{batch.batchId.substring(0, 12)}...</span>
            <Badge className={getStatusColor(batch.status)}>
              {batch.status.charAt(0).toUpperCase() + batch.status.slice(1)}
            </Badge>
          </DialogTitle>
          <DialogClose asChild>
            <button className="absolute right-4 top-4 text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
            </button>
          </DialogClose>
        </DialogHeader>

        <div className="space-y-6">
          {/* Progress */}
          <div>
            <div className="flex justify-between mb-2">
              <span className="font-semibold text-gray-900">Progress</span>
              <span className="text-sm font-mono text-gray-600">{progressPercent}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-blue-600 h-3 rounded-full transition-all"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Current Step */}
          <div>
            <p className="text-sm text-gray-600">Current Step: {batch.progress.currentStep}</p>
          </div>

          {/* Statistics */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-xs text-gray-600">Total Records</p>
              <p className="text-2xl font-bold text-blue-900">{batch.progress.totalRecords}</p>
            </div>
            <div className="p-3 bg-green-50 rounded-lg border border-green-200">
              <p className="text-xs text-gray-600">Processed</p>
              <p className="text-2xl font-bold text-green-900">{batch.progress.processedRecords}</p>
            </div>
            <div className="p-3 bg-red-50 rounded-lg border border-red-200">
              <p className="text-xs text-gray-600">Failed</p>
              <p className="text-2xl font-bold text-red-900">{batch.progress.failedRecords}</p>
            </div>
            <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
              <p className="text-xs text-gray-600">Duplicates Removed</p>
              <p className="text-2xl font-bold text-amber-900">
                {batch.metadata.duplicateRecordsRemoved}
              </p>
            </div>
          </div>

          {/* Metadata */}
          <div className="space-y-3 bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold text-gray-900">Metadata</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">File Name:</span>
                <p className="font-mono text-gray-900">{batch.metadata.fileName}</p>
              </div>
              <div>
                <span className="text-gray-600">File Size:</span>
                <p className="font-mono text-gray-900">
                  {batch.metadata.fileSize ? `${(batch.metadata.fileSize / 1024 / 1024).toFixed(2)} MB` : 'Unknown'}
                </p>
              </div>
              <div>
                <span className="text-gray-600">Started:</span>
                <p className="text-gray-900">{new Date(batch.createdAt).toLocaleString()}</p>
              </div>
              {batch.completedAt && (
                <div>
                  <span className="text-gray-600">Completed:</span>
                  <p className="text-gray-900">
                    {new Date(batch.completedAt).toLocaleString()}
                  </p>
                </div>
              )}
              {duration > 0 && (
                <div>
                  <span className="text-gray-600">Duration:</span>
                  <p className="text-gray-900">{duration} seconds</p>
                </div>
              )}
            </div>
          </div>

          {/* Validation Errors */}
          {batch.metadata.validationErrors && batch.metadata.validationErrors.length > 0 && (
            <div className="space-y-2 bg-amber-50 p-4 rounded-lg border border-amber-200">
              <h3 className="font-semibold text-amber-900">Validation Errors</h3>
              <ul className="text-sm space-y-1">
                {batch.metadata.validationErrors.slice(0, 5).map((error, idx) => (
                  <li key={idx} className="text-amber-800">
                    • {error}
                  </li>
                ))}
              </ul>
              {batch.metadata.validationErrors.length > 5 && (
                <p className="text-xs text-amber-700 italic">
                  ... and {batch.metadata.validationErrors.length - 5} more errors
                </p>
              )}
            </div>
          )}

          {/* Error Details */}
          {batch.errorDetails && (
            <div className="space-y-2 bg-red-50 p-4 rounded-lg border border-red-200">
              <h3 className="font-semibold text-red-900">Error Details</h3>
              <div className="text-sm space-y-1">
                <p className="text-red-800">
                  <span className="font-semibold">Phase:</span> {batch.errorDetails.phase}
                </p>
                <p className="text-red-800">
                  <span className="font-semibold">Code:</span> {batch.errorDetails.code}
                </p>
                <p className="text-red-800">
                  <span className="font-semibold">Message:</span> {batch.errorDetails.message}
                </p>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
