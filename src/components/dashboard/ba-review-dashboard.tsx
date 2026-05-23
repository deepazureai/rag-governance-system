'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle, CheckCircle, Clock, TrendingUp, Plus } from 'lucide-react';
import { BAReviewQueueItem } from '@/types/index';
import { BAReviewItemModal } from './ba-review-item-modal';
import { TemplateBuilderWizard } from './template-builder-wizard';
import { TemplateLibrary } from './template-library';

interface BAReviewDashboardProps {
  applicationId: string;
}

export function BAReviewDashboard({ applicationId }: BAReviewDashboardProps) {
  const [activeTab, setActiveTab] = useState<'queue' | 'templates'>('queue');
  const [queueItems, setQueueItems] = useState<BAReviewQueueItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<BAReviewQueueItem | null>(null);
  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [builderOpen, setBuilderOpen] = useState(false);
  const [stats, setStats] = useState({
    totalPending: 0,
    criticalCount: 0,
    averagePriority: 0,
  });

  useEffect(() => {
    fetchQueueItems();
  }, [applicationId]);

  const fetchQueueItems = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';
      const response = await fetch(`${apiUrl}/api/ba-review/queue/${applicationId}?limit=10`);
      
      if (!response.ok) {
        // Return empty queue if endpoint not found (404)
        if (response.status === 404) {
          console.log('[v0] BA Review endpoint not yet implemented');
          setQueueItems([]);
          return;
        }
        throw new Error('Failed to fetch review queue');
      }
      
      const data = await response.json();
      // Defensive: ensure data.data is an array
      const items = Array.isArray(data.data) ? data.data : [];
      
      if (data.success && items.length >= 0) {
        setQueueItems(items);
        
        // Calculate stats from array items
        const criticalCount = items.filter((item: BAReviewQueueItem) => item.priority === 'critical').length;
        const totalPending = items.filter((item: BAReviewQueueItem) => item.status === 'pending').length;
        const avgPriority = items.length > 0 
          ? items.reduce((sum: number, item: BAReviewQueueItem) => sum + (item.priorityScore || 0), 0) / items.length 
          : 0;
        
        setStats({
          totalPending,
          criticalCount,
          averagePriority: Math.round(avgPriority),
        });
      }
    } catch (err: any) {
      console.error('[v0] Error fetching queue:', err);
      setError(err.message || 'Failed to load review queue');
      setQueueItems([]); // Ensure queueItems is always an array
    } finally {
      setIsLoading(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'low':
        return 'bg-gray-100 text-gray-800 border-gray-300';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getReasonIcon = (reason: string) => {
    switch (reason) {
      case 'low_score':
        return <TrendingUp className="w-4 h-4" />;
      case 'negative_feedback':
        return <AlertCircle className="w-4 h-4" />;
      case 'high_latency':
        return <Clock className="w-4 h-4" />;
      default:
        return <CheckCircle className="w-4 h-4" />;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Spinner className="w-6 h-6" />
        <span className="ml-2">Loading review queue...</span>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        <Tabs value={activeTab} onValueChange={(val: any) => setActiveTab(val)} className="w-full">
          <div className="flex items-center justify-between mb-4">
            <TabsList className="grid w-full max-w-xs grid-cols-2">
              <TabsTrigger value="queue">Review Queue</TabsTrigger>
              <TabsTrigger value="templates">Templates</TabsTrigger>
            </TabsList>
            {activeTab === 'templates' && (
              <Button onClick={() => setBuilderOpen(true)} className="flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Create Template
              </Button>
            )}
          </div>

          <TabsContent value="queue" className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="p-4 bg-gradient-to-br from-red-50 to-red-100 border-red-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-red-600 font-semibold uppercase tracking-wide">Critical Items</p>
                    <p className="text-3xl font-bold text-red-900 mt-1">{stats.criticalCount}</p>
                  </div>
                  <AlertCircle className="w-12 h-12 text-red-300 opacity-50" />
                </div>
              </Card>

              <Card className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-blue-600 font-semibold uppercase tracking-wide">Pending Review</p>
                    <p className="text-3xl font-bold text-blue-900 mt-1">{stats.totalPending}</p>
                  </div>
                  <Clock className="w-12 h-12 text-blue-300 opacity-50" />
                </div>
              </Card>

              <Card className="p-4 bg-gradient-to-br from-green-50 to-green-100 border-green-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-green-600 font-semibold uppercase tracking-wide">Avg Priority Score</p>
                    <p className="text-3xl font-bold text-green-900 mt-1">{stats.averagePriority}</p>
                  </div>
                  <TrendingUp className="w-12 h-12 text-green-300 opacity-50" />
                </div>
              </Card>
            </div>

            {/* Queue List */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Your Review Queue</h2>
              
              {error && (
                <Card className="p-4 bg-red-50 border-red-200 mb-4">
                  <p className="text-red-800 text-sm">{error}</p>
                </Card>
              )}

              {queueItems.length === 0 ? (
                <Card className="p-8 text-center bg-gray-50 border-gray-200">
                  <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
                  <p className="text-gray-600 font-medium">All caught up!</p>
                  <p className="text-gray-500 text-sm mt-1">No items in your review queue right now.</p>
                </Card>
              ) : (
                <div className="space-y-3">
                  {queueItems.map((item) => (
                    <Card
                      key={item._id}
                      className="p-4 border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all cursor-pointer"
                      onClick={() => {
                        setSelectedItem(item);
                        setItemModalOpen(true);
                      }}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          {/* Priority Badge */}
                          <div className="flex items-center gap-2 mb-2">
                            <Badge className={`${getPriorityColor(item.priority)} border`}>
                              {item.priority.toUpperCase()}
                            </Badge>
                            <span className="text-xs text-gray-500 flex items-center gap-1">
                              {getReasonIcon(item.priorityReason)}
                              {item.priorityReason.replace(/_/g, ' ')}
                            </span>
                          </div>

                          {/* Prompt Preview */}
                          <p className="text-sm font-medium text-gray-900 truncate mb-1">
                            {item.userPrompt}
                          </p>
                          <p className="text-xs text-gray-600 truncate">
                            Response: {item.llmResponse}
                          </p>

                          {/* Metrics */}
                          <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                            {item.averageScore !== undefined && (
                              <span>Score: <span className="font-semibold text-gray-700">{item.averageScore.toFixed(2)}</span></span>
                            )}
                            {item.latency !== undefined && (
                              <span>Latency: <span className="font-semibold text-gray-700">{item.latency}ms</span></span>
                            )}
                            {item.userFeedback && (
                              <span>Feedback: <span className="font-semibold text-gray-700">{item.userFeedback}</span></span>
                            )}
                          </div>
                        </div>

                        {/* Action Button */}
                        <Button
                          variant="outline"
                          size="sm"
                          className="ml-4 flex-shrink-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedItem(item);
                            setItemModalOpen(true);
                          }}
                        >
                          Review
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="templates">
            <TemplateLibrary applicationId={applicationId} />
          </TabsContent>
        </Tabs>
      </div>

      {/* Review Item Modal */}
      {selectedItem && (
        <BAReviewItemModal
          item={selectedItem}
          isOpen={itemModalOpen}
          onClose={() => {
            setItemModalOpen(false);
            setSelectedItem(null);
          }}
          onImproveSubmitted={() => {
            fetchQueueItems();
            setItemModalOpen(false);
          }}
        />
      )}

      {/* Template Builder Wizard */}
      <TemplateBuilderWizard
        applicationId={applicationId}
        isOpen={builderOpen}
        onClose={() => setBuilderOpen(false)}
        baEmail="user@company.com"
        similarPrompts={queueItems.map(item => ({
          id: item._id,
          prompt: item.userPrompt,
          improvement: 'Improved version',
          score: item.averageScore || 0,
        }))}
      />
    </>
  );
}
