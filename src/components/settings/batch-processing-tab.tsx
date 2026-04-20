import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { Play, RotateCcw, Eye } from 'lucide-react';
import { useAppSelector } from '@/src/hooks/useRedux';
import { mockApps } from '@/src/data/mockData';
import { batchClient } from '@/src/api/batchClient';
import { FrontendLogger } from '@/src/utils/logger';
import { BatchProgressModal } from './batch-progress-modal';

interface BatchHistory {
  id: string;
  batchId: string;
  status: 'pending' | 'reading' | 'archiving' | 'deleting' | 'inserting' | 'completed' | 'failed';
  progress: {
    totalRecords: number;
    processedRecords: number;
    failedRecords: number;
    currentStep: string;
  };
  createdAt: string;
  completedAt?: string;
  errorDetails?: {
    message: string;
    phase: string;
  };
}

export function BatchProcessingTab() {
  const { connections } = useAppSelector((state) => state.connections);
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  const [batchHistory, setBatchHistory] = useState<BatchHistory[]>([]);
  const [loading, setLoading] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<BatchHistory | null>(null);

  useEffect(() => {
    if (selectedAppId) {
      fetchBatchHistory();
    }
  }, [selectedAppId]);

  const fetchBatchHistory = async () => {
    if (!selectedAppId) return;

    try {
      setLoading(true);
      const result = await batchClient.getBatchHistory(selectedAppId, 10);
      setBatchHistory(result.batches || []);
      FrontendLogger.info(`[BatchProcessing] Fetched ${result.count} batch records`);
    } catch (error: any) {
      FrontendLogger.error('[BatchProcessing] Failed to fetch history:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExecuteBatch = async () => {
    if (!selectedAppId) return;

    try {
      setExecuting(true);
      FrontendLogger.info(`[BatchProcessing] Executing batch for app ${selectedAppId}`);

      // TODO: Get connection details and source config
      const result = await batchClient.executeBatch(
        selectedAppId,
        '', // connectionId
        'local-folder', // sourceType
        {} // sourceConfig
      );

      FrontendLogger.info('[BatchProcessing] Batch executed:', result);
      await fetchBatchHistory();
      alert('Batch processing started successfully');
    } catch (error: any) {
      FrontendLogger.error('[BatchProcessing] Execution failed:', error);
      alert(`Failed to execute batch: ${error.message}`);
    } finally {
      setExecuting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'pending':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-blue-100 text-blue-800';
    }
  };

  const getProgressPercentage = (batch: BatchHistory) => {
    if (batch.progress.totalRecords === 0) return 0;
    return Math.round(
      ((batch.progress.processedRecords + batch.progress.failedRecords) /
        batch.progress.totalRecords) *
        100
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Batch Processing</h2>
        <p className="text-gray-600">View and manage batch data processing jobs</p>
      </div>

      {/* Application Selector */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Select Application</h3>
        <div className="flex gap-3 overflow-x-auto pb-2">
          {mockApps.map((app) => (
            <button
              key={app.id}
              onClick={() => setSelectedAppId(app.id)}
              className={`flex-shrink-0 px-4 py-2 rounded-lg font-medium transition-colors ${
                selectedAppId === app.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {app.name}
            </button>
          ))}
        </div>
      </div>

      {!selectedAppId ? (
        <Card className="p-8 bg-gray-50 text-center">
          <p className="text-gray-500">Select an application to view batch processing history</p>
        </Card>
      ) : (
        <>
          {/* Execute Batch Button */}
          <Card className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-900">Execute Batch Processing</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Manually trigger batch processing to read data, archive, and insert fresh records
                </p>
              </div>
              <Button
                onClick={handleExecuteBatch}
                disabled={executing}
                className="gap-2 bg-blue-600 hover:bg-blue-700"
              >
                {executing ? (
                  <>
                    <Spinner className="w-4 h-4" />
                    Executing...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    Execute Now
                  </>
                )}
              </Button>
            </div>
          </Card>

          {/* Batch History */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Recent Batches</h3>
              <Button
                onClick={fetchBatchHistory}
                disabled={loading}
                variant="outline"
                size="sm"
                className="gap-2"
              >
                <RotateCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>

            {loading ? (
              <Card className="p-8 flex items-center justify-center">
                <Spinner className="w-6 h-6" />
              </Card>
            ) : batchHistory.length === 0 ? (
              <Card className="p-8 text-center text-gray-500">
                <p>No batch processing history found</p>
              </Card>
            ) : (
              <div className="space-y-3">
                {batchHistory.map((batch) => (
                  <Card
                    key={batch.id}
                    className="p-4 hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => setSelectedBatch(batch)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className="font-semibold text-gray-900 font-mono text-sm">
                            {batch.batchId.substring(0, 12)}...
                          </h4>
                          <Badge className={getStatusColor(batch.status)}>
                            {batch.status.charAt(0).toUpperCase() + batch.status.slice(1)}
                          </Badge>
                        </div>

                        <div className="space-y-2 mt-3">
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full transition-all"
                              style={{ width: `${getProgressPercentage(batch)}%` }}
                            />
                          </div>

                          <p className="text-sm text-gray-600">
                            {batch.progress.currentStep} • {batch.progress.processedRecords}/
                            {batch.progress.totalRecords} records processed
                          </p>

                          {batch.errorDetails && (
                            <p className="text-sm text-red-600">
                              Error: {batch.errorDetails.message}
                            </p>
                          )}

                          <p className="text-xs text-gray-500">
                            Started:{' '}
                            {new Date(batch.createdAt).toLocaleString()}
                            {batch.completedAt &&
                              ` • Completed: ${new Date(batch.completedAt).toLocaleString()}`}
                          </p>
                        </div>
                      </div>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedBatch(batch);
                        }}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Batch Progress Modal */}
          {selectedBatch && (
            <BatchProgressModal batch={selectedBatch} onClose={() => setSelectedBatch(null)} />
          )}
        </>
      )}
    </div>
  );
}
