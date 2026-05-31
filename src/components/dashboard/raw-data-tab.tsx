'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { RawDataDetailModal } from './raw-data-detail-modal';
import { RawDataRecordDetail } from '@/types/index';
import { getStatusColor } from '@/src/utils/format';

interface RawDataItem {
  metric?: string;
  value?: number;
  status: string;
  query: string;
  response: string;
  context?: string;  // Add context field
  slaStatus?: string;
  slaCompliance?: unknown[];  // Use unknown instead of any
}

interface RawDataTabProps {
  applicationId: string;
}

export function RawDataTab({ applicationId }: RawDataTabProps) {
  const [groupBy, setGroupBy] = useState<'metric' | 'status' | 'framework' | 'date'>('metric');
  const [rawData, setRawData] = useState<Record<string, RawDataItem[]> | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedMetric, setSelectedMetric] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<RawDataRecordDetail | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  useEffect(() => {
    fetchRawData();
  }, [applicationId, groupBy]);

  const fetchRawData = async (): Promise<void> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';
      const endpoint = `${apiUrl}/api/governance-metrics/raw-data/${applicationId}?groupBy=${groupBy}`;
      
      const response = await fetch(endpoint);
      if (!response.ok) {
        throw new Error(`Failed to fetch raw data: ${response.statusText}`);
      }
      
      const result = await response.json() as { success: boolean; data?: Record<string, RawDataItem[]>; message?: string };
      if (result.success && result.data) {
        setRawData(result.data);
      } else {
        throw new Error(result.message ?? 'Failed to fetch raw data');
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to fetch raw data';
      console.error('[v0] Error fetching raw data:', message);
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRecordClick = async (item: RawDataItem, metricName?: string): Promise<void> => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';
      
      // Determine the metric name with proper fallback chain
      let metric = metricName;
      
      if (!metric) {
        // Try to get from item
        metric = item.metric;
      }
      
      if (!metric) {
        // Try to get from selected state
        metric = selectedMetric || undefined;
      }
      
      if (!metric) {
        console.error('[v0] No metric name available', { metricName, itemMetric: item.metric, selectedMetric });
        throw new Error('Metric name is required but not available');
      }
      
      console.log('[v0] handleRecordClick - metric:', metric, 'value:', item.value);
      
      // Fetch actual record from backend using applicationId, metric, and value
      const queryParams = new URLSearchParams();
      queryParams.append('applicationId', applicationId);
      queryParams.append('metric', metric);
      queryParams.append('value', String(item.value || 0));
      
      const url = `${apiUrl}/api/ba-review/raw-data-by-metric?${queryParams.toString()}`;
      console.log('[v0] Fetching from URL:', url);
      
      const response = await fetch(
        `${apiUrl}/api/ba-review/raw-data-by-metric?${queryParams.toString()}`
      );
      
      if (!response.ok) {
        console.error('[v0] Failed to fetch record detail:', response.statusText);
        throw new Error(`Failed to fetch record: ${response.statusText}`);
      }
      
      const result = await response.json() as { success?: boolean; data?: RawDataRecordDetail };
      if (result.success && result.data) {
        setSelectedRecord(result.data);
        setDetailModalOpen(true);
      } else {
        console.error('[v0] Invalid response format:', result);
        throw new Error('Invalid response from server');
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to fetch record';
      console.error('[v0] Error fetching record detail:', message);
      
      // Provide context-aware error messages
      let userMessage = message;
      if (message.includes('Not Found')) {
        userMessage = 'No evaluation data found for this metric. Please check that:\n' +
          '1. Raw data has been uploaded to the system\n' +
          '2. DeepEval metrics have been calculated\n' +
          '3. LLM settings are configured in Settings → LLM tab';
      } else if (message.includes('fetch record')) {
        userMessage = 'Failed to load recommendation data. Please try again or check the console for details.';
      }
      
      alert(`Failed to view recommendations:\n\n${userMessage}`);
    }
  };

  const renderMetricView = (): React.ReactNode => {
    if (!rawData || typeof rawData !== 'object') {
      return <div className="text-center py-8 text-gray-500">Loading metrics...</div>;
    }

    const metrics = Object.keys(rawData).filter((key: string) => {
      const value = rawData[key];
      return Array.isArray(value) && value.length > 0;
    });
    
    if (metrics.length === 0) {
      return <div className="text-center py-8 text-gray-500">No metrics available</div>;
    }
    
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {metrics.map(metric => (
            <Button
              key={metric}
              variant={selectedMetric === metric ? 'default' : 'outline'}
              onClick={() => setSelectedMetric(selectedMetric === metric ? null : metric)}
              className="text-sm"
            >
              {metric}
            </Button>
          ))}
        </div>

        {selectedMetric && rawData[selectedMetric] && Array.isArray(rawData[selectedMetric]) && (
          <div className="space-y-3">
            {(rawData[selectedMetric] as ReadonlyArray<RawDataItem>).map((item: RawDataItem, idx: number) => (
              <Card 
                key={idx} 
                className="p-4 border-l-4 border-l-blue-400 hover:shadow-md cursor-pointer transition-all"
                onClick={() => handleRecordClick(item, selectedMetric)}
              >
                <div className="flex items-center justify-between mb-3">
                  <Badge className={getStatusColor(item.status)}>{item.status}</Badge>
                  <span className="text-sm font-semibold text-gray-700">{item.value != null ? item.value.toFixed(2) : 'N/A'}</span>
                </div>
                
                <div className="space-y-2">
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-1">Prompt:</p>
                    <p className="text-sm text-gray-700 break-words whitespace-normal">{item.query}</p>
                  </div>
                  
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-1">Response:</p>
                    <p className="text-sm text-gray-700 break-words whitespace-normal">{item.response}</p>
                  </div>
                  
                  {item.context && (
                    <div>
                      <p className="text-xs font-medium text-gray-500 mb-1">Context:</p>
                      <p className="text-sm text-gray-600 break-words whitespace-normal bg-gray-50 p-2 rounded">{item.context}</p>
                    </div>
                  )}
                </div>
                
                <p className="text-xs text-blue-500 mt-3">Click to view recommendations</p>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderStatusView = () => {
    if (!rawData || typeof rawData !== 'object') {
      return <div className="text-center py-8 text-gray-500">Loading status data...</div>;
    }

    const statuses = Object.keys(rawData);
    
    if (statuses.length === 0) {
      return <div className="text-center py-8 text-gray-500">No status data available</div>;
    }
    
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {statuses.map(status => (
            <Button
              key={status}
              variant={selectedStatus === status ? 'default' : 'outline'}
              onClick={() => setSelectedStatus(selectedStatus === status ? null : status)}
              className="text-sm"
            >
              {status.charAt(0).toUpperCase() + status.slice(1)} ({(rawData[status] as RawDataItem[]).length})
            </Button>
          ))}
        </div>

        {selectedStatus && rawData[selectedStatus] && (
          <div className="space-y-2">
            {(rawData[selectedStatus] as RawDataItem[]).map((item: RawDataItem, idx: number) => (
              <Card 
                key={idx} 
                className={`p-3 border-l-4 hover:shadow-md cursor-pointer transition-all ${item.status === 'critical' ? 'border-l-red-400' : item.status === 'warning' ? 'border-l-yellow-400' : 'border-l-green-400'}`}
                onClick={() => handleRecordClick(item, item.metric)}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-gray-700">{item.metric}</span>
                  <span className="text-sm font-semibold text-gray-700">{item.value != null ? item.value.toFixed(2) : 'N/A'}</span>
                </div>
                <p className="text-sm text-gray-600 line-clamp-2"><span className="font-medium">Q:</span> {item.query}</p>
                <p className="text-sm text-gray-600 line-clamp-2"><span className="font-medium">A:</span> {item.response}</p>
                <p className="text-xs text-blue-500 mt-2">Click to view full details</p>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderFrameworkView = () => {
    if (!rawData || typeof rawData !== 'object') {
      return <div className="text-center py-8 text-gray-500">Loading framework data...</div>;
    }

    const frameworks = Object.keys(rawData);
    
    if (frameworks.length === 0) {
      return <div className="text-center py-8 text-gray-500">No framework data available</div>;
    }
    
    return (
      <div className="space-y-3">
        {frameworks.map(framework => (
          <Card key={framework} className="p-4 bg-slate-50 border-2 border-slate-200">
            <h4 className="font-semibold text-sm text-slate-700 mb-3">{framework}</h4>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {(rawData[framework] as RawDataItem[]).slice(0, 5).map((item: RawDataItem, idx: number) => (
                <Card 
                  key={idx} 
                  className="p-3 bg-white text-sm border border-slate-200 hover:shadow-md hover:bg-slate-50 cursor-pointer transition-all"
                  onClick={() => handleRecordClick(item, item.metric)}
                >
                  <p className="text-gray-600 line-clamp-2"><span className="font-medium">Q:</span> {item.query}</p>
                  <p className="text-gray-600 line-clamp-2"><span className="font-medium">A:</span> {item.response}</p>
                  <p className="text-xs text-blue-500 mt-2">Click for full details</p>
                </Card>
              ))}
            </div>
          </Card>
        ))}
      </div>
    );
  };

  const renderDateView = () => {
    if (!rawData || typeof rawData !== 'object') {
      return <div className="text-center py-8 text-gray-500">Loading date data...</div>;
    }

    const dates = Object.keys(rawData).sort().reverse();
    
    if (dates.length === 0) {
      return <div className="text-center py-8 text-gray-500">No date data available</div>;
    }
    
    return (
      <div className="space-y-3">
        {dates.map(date => (
          <Card key={date} className="p-4 bg-slate-50 border-2 border-slate-200">
            <h4 className="font-semibold text-sm text-slate-700 mb-3">{date}</h4>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {(rawData[date] as RawDataItem[]).slice(0, 5).map((item: RawDataItem, idx: number) => (
                <Card 
                  key={idx} 
                  className="p-3 bg-white text-sm border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors"
                  onClick={() => handleRecordClick(item, item.metric)}
                >
                  <p className="text-gray-600 truncate"><span className="font-medium">Q:</span> {item.query}</p>
                  <p className="text-gray-600 truncate"><span className="font-medium">A:</span> {item.response}</p>
                </Card>
              ))}
            </div>
          </Card>
        ))}
      </div>
    );
  };

  if (isLoading) {
    return (
      <Card className="p-8 bg-white">
        <div className="flex items-center justify-center gap-2">
          <Spinner />
          <span className="text-gray-600">Loading raw data...</span>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-6 bg-red-50 border border-red-200">
        <p className="text-red-900 font-medium">Error: {error}</p>
        <Button onClick={fetchRawData} variant="outline" className="mt-3">Retry</Button>
      </Card>
    );
  }

  if (!rawData || Object.keys(rawData).length === 0) {
    return (
      <Card className="p-8 bg-amber-50 border border-amber-200">
        <div className="text-center">
          <p className="text-amber-900 font-medium mb-1">No raw data available yet</p>
          <p className="text-sm text-amber-700">Upload raw data and run the batch process to generate evaluation records. Raw data will appear here after processing completes.</p>
        </div>
      </Card>
    );
  }

  return (
    <>
      <Tabs defaultValue="metric" className="w-full">
        <TabsList className="grid w-full grid-cols-4 bg-gray-100">
          <TabsTrigger value="metric" onClick={() => setGroupBy('metric')}>By Metric</TabsTrigger>
          <TabsTrigger value="status" onClick={() => setGroupBy('status')}>By Status</TabsTrigger>
          <TabsTrigger value="framework" onClick={() => setGroupBy('framework')}>By Framework</TabsTrigger>
          <TabsTrigger value="date" onClick={() => setGroupBy('date')}>By Date</TabsTrigger>
        </TabsList>

        <div className="mt-6">
          <TabsContent value="metric" className="space-y-4">
            {renderMetricView()}
          </TabsContent>

          <TabsContent value="status" className="space-y-4">
            {renderStatusView()}
          </TabsContent>

          <TabsContent value="framework" className="space-y-4">
            {renderFrameworkView()}
          </TabsContent>

          <TabsContent value="date" className="space-y-4">
            {renderDateView()}
          </TabsContent>
        </div>
      </Tabs>

      {selectedRecord && (
        <RawDataDetailModal
          record={selectedRecord}
          isOpen={detailModalOpen}
          onClose={() => {
            setDetailModalOpen(false);
            setSelectedRecord(null);
          }}
        />
      )}
    </>
  );
}
