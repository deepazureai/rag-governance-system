import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Play, RotateCcw, Eye } from 'lucide-react';
import { useAppSelector } from '@/src/hooks/useRedux';
import { batchClient } from '@/src/api/batchClient';
import { BatchProgressModal } from './batch-progress-modal';

interface Application {
  id: string;
  name: string;
  status: string;
  dataSourceType?: 'file' | 'database' | 'azure_blob';  // NEW: Track source type
  dataSourceId?: string;  // NEW: Reference to database connection
}

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
  const [applications, setApplications] = useState<Application[]>([]);
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  const [batchHistory, setBatchHistory] = useState<BatchHistory[]>([]);
  const [loading, setLoading] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [appsLoading, setAppsLoading] = useState(true);
  const [selectedBatch, setSelectedBatch] = useState<BatchHistory | null>(null);

  // Fetch applications on mount
  useEffect(() => {
    const fetchApplications = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';
        const response = await fetch(`${apiUrl}/api/applications`);
        const data = await response.json();
        if (data.success && data.data) {
          // Filter to only show database-source applications
          const dbApps = data.data.filter((app: Application) => app.dataSourceType === 'database');
          setApplications(dbApps);
          if (dbApps.length > 0) {
            setSelectedAppId(dbApps[0].id);
          }
        }
      } catch (error: any) {
        // Silently fail - applications list may not be available
        setApplications([]);
      } finally {
        setAppsLoading(false);
      }
    };

    fetchApplications();
  }, []);

  useEffect(() => {
    if (selectedAppId) {
      fetchBatchHistory();
    }
  }, [selectedAppId]);

  const fetchBatchHistory = async () => {
    if (!selectedAppId) return;

    setLoading(true);
    const result = await batchClient.getBatchHistory(selectedAppId, 10);
    setBatchHistory(result.batches || []);
    setLoading(false);
  };

  const handleExecuteBatch = async () => {
    if (!selectedAppId) return;

    try {
      setExecuting(true);

      // Get the selected application details including dataSourceId
      const selectedApp = applications.find((app) => app.id === selectedAppId);
      if (!selectedApp) {
        throw new Error('Selected application not found');
      }

      if (!selectedApp.dataSourceId) {
        throw new Error('No database connection configured for this application');
      }

      console.log('[v0] Executing database batch for app:', selectedAppId, 'with dataSourceId:', selectedApp.dataSourceId);

      // Call new database-specific batch endpoint
      const result = await batchClient.executeDatabaseBatch(
        selectedAppId,
        selectedApp.dataSourceId
      );

      if (!result.success) {
        throw new Error(result.message || 'Batch processing failed');
      }

      await fetchBatchHistory();
      alert(`Batch processing completed!\nTotal: ${result.stats?.totalRecords}, Inserted: ${result.stats?.insertedRecords}, Success Rate: ${result.stats?.successRate}`);
    } catch (error: any) {
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
      <Card className="p-6 bg-white">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Select Database Application</h3>
        
        <Select value={selectedAppId || ''} onValueChange={setSelectedAppId}>
          <SelectTrigger>
            <SelectValue placeholder="Select a database-connected application..." />
          </SelectTrigger>
          <SelectContent>
            {applications.length === 0 ? (
              <SelectItem value="_none" disabled>
                No database-connected applications found
              </SelectItem>
            ) : (
              applications.map((app) => (
                <SelectItem key={app.id} value={app.id}>
                  {app.name}
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
        <p className="text-xs text-gray-500 mt-2">
          Only applications connected to external databases are shown. Select one to execute batch processing from the connected PostgreSQL table.
        </p>
      </Card>
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Batch Processing</h2>
        <p className="text-gray-600">View and manage batch data processing jobs</p>
      </div>

      {!selectedAppId ? (
        <Card className="p-8 bg-gray-50 text-center">
          <p className="text-gray-500">
            {applications.length === 0
              ? 'No database-connected applications available. Create an application with database data source in the App Catalog to get started.'
              : 'Select a database-connected application to view batch processing history'}
          </p>
        </Card>
      ) : (
        <>
          {/* Execute Batch Button */}
          <Card className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-900">Execute Batch Processing</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Fetch raw evaluation data from the connected PostgreSQL database table, then process through the evaluation pipeline
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
                    Processing...
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
