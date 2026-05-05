'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';

interface RawDataItem {
  metric?: string;
  value?: number;  // Make value optional since it may not always be present
  status: string;
  query: string;
  response: string;
  slaStatus?: string;
  slaCompliance?: any[];
}

interface RawDataTabProps {
  applicationId: string;
}

export function RawDataTab({ applicationId }: RawDataTabProps) {
  const [groupBy, setGroupBy] = useState<'metric' | 'status' | 'framework' | 'date'>('metric');
  const [rawData, setRawData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedMetric, setSelectedMetric] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);

  useEffect(() => {
    fetchRawData();
  }, [applicationId, groupBy]);

  const fetchRawData = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';
      const endpoint = `${apiUrl}/api/governance-metrics/raw-data/${applicationId}?groupBy=${groupBy}`;
      
      const response = await fetch(endpoint);
      if (!response.ok) {
        throw new Error(`Failed to fetch raw data: ${response.statusText}`);
      }
      
      const result = await response.json();
      if (result.success) {
        setRawData(result.data);
      } else {
        throw new Error(result.message || 'Failed to fetch raw data');
      }
    } catch (err) {
      console.error('[v0] Error fetching raw data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch raw data');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    if (status === 'critical') return 'bg-red-100 text-red-800 border-red-300';
    if (status === 'warning') return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    return 'bg-green-100 text-green-800 border-green-300';
  };

  const renderMetricView = () => {
    if (!rawData || typeof rawData !== 'object') return null;

    const metrics = Object.keys(rawData).filter(key => Array.isArray(rawData[key]));
    
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

        {selectedMetric && rawData[selectedMetric] && (
          <div className="space-y-2">
            {(rawData[selectedMetric] as RawDataItem[]).map((item: RawDataItem, idx: number) => (
              <Card key={idx} className="p-3 border-l-4 border-l-blue-400">
                <div className="flex items-center justify-between mb-2">
                  <Badge className={getStatusColor(item.status)}>{item.status}</Badge>
                  <span className="text-sm font-semibold text-gray-700">{item.value != null ? item.value.toFixed(2) : 'N/A'}</span>
                </div>
                <p className="text-sm text-gray-600 truncate"><span className="font-medium">Q:</span> {item.query}</p>
                <p className="text-sm text-gray-600 truncate"><span className="font-medium">A:</span> {item.response}</p>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderStatusView = () => {
    if (!rawData || typeof rawData !== 'object') return null;

    const statuses = Object.keys(rawData);
    
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
              <Card key={idx} className={`p-3 border-l-4 ${item.status === 'critical' ? 'border-l-red-400' : item.status === 'warning' ? 'border-l-yellow-400' : 'border-l-green-400'}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-gray-700">{item.metric}</span>
                  <span className="text-sm font-semibold text-gray-700">{item.value != null ? item.value.toFixed(2) : 'N/A'}</span>
                </div>
                <p className="text-sm text-gray-600 truncate"><span className="font-medium">Q:</span> {item.query}</p>
                <p className="text-sm text-gray-600 truncate"><span className="font-medium">A:</span> {item.response}</p>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderFrameworkView = () => {
    if (!rawData || typeof rawData !== 'object') return null;

    const frameworks = Object.keys(rawData);
    
    return (
      <div className="space-y-3">
        {frameworks.map(framework => (
          <Card key={framework} className="p-4 bg-slate-50 border-2 border-slate-200">
            <h4 className="font-semibold text-sm text-slate-700 mb-3">{framework}</h4>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {(rawData[framework] as RawDataItem[]).slice(0, 5).map((item: RawDataItem, idx: number) => (
                <Card key={idx} className="p-2 bg-white text-sm border border-slate-200">
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

  const renderDateView = () => {
    if (!rawData || typeof rawData !== 'object') return null;

    const dates = Object.keys(rawData).sort().reverse();
    
    return (
      <div className="space-y-3">
        {dates.map(date => (
          <Card key={date} className="p-4 bg-slate-50 border-2 border-slate-200">
            <h4 className="font-semibold text-sm text-slate-700 mb-3">{date}</h4>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {(rawData[date] as RawDataItem[]).slice(0, 5).map((item: RawDataItem, idx: number) => (
                <Card key={idx} className="p-2 bg-white text-sm border border-slate-200">
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
  );
}
