'use client';

import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle, CheckCircle, Clock, TrendingUp, Plus, Zap } from 'lucide-react';
import { BAReviewQueueItem } from '@/types/index';
import { BAReviewItemModal } from './ba-review-item-modal';
import { TemplateBuilderWizard } from './template-builder-wizard';
import { TemplateLibrary } from './template-library';
import { BARecommendationsTab } from './ba-recommendations-tab';
import { BulkProcessing } from './bulk-processing';
import { useBAReviewStats } from '@/hooks/useBAReviewStats';

interface BAReviewDashboardProps {
  applicationId: string;
}

export function BAReviewDashboard({ applicationId }: BAReviewDashboardProps) {
  const [activeTab, setActiveTab] = useState<'all' | 'queue' | 'kb' | 'templates'>('all');
  const [queueItems, setQueueItems] = useState<BAReviewQueueItem[]>([]);
  const [kbPrompts, setKBPrompts] = useState<any[]>([]);
  const [unifiedItems, setUnifiedItems] = useState<any[]>([]);
  const [isLoadingQueue, setIsLoadingQueue] = useState(true);
  const [isLoadingKB, setIsLoadingKB] = useState(false);
  const [isLoadingUnified, setIsLoadingUnified] = useState(false);
  const [approvingKBId, setApprovingKBId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<BAReviewQueueItem | null>(null);
  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [builderOpen, setBuilderOpen] = useState(false);
  const [bulkProcessingOpen, setBulkProcessingOpen] = useState(false);

  // Use hook to fetch real stats from backend aggregation
  const { stats, isLoading: isLoadingStats } = useBAReviewStats(applicationId);

  // Fetch queue items
  const fetchQueueItems = async (): Promise<void> => {
    try {
      setIsLoadingQueue(true);
      setError(null);
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';
      const response = await fetch(`${apiUrl}/api/ba-review/queue/${applicationId}?limit=10`);

      if (!response.ok) {
        if (response.status === 404) {
          console.log('[v0] BA Review endpoint not yet implemented');
          setQueueItems([]);
          return;
        }
        throw new Error('Failed to fetch review queue');
      }

      const data = await response.json();
      const items = Array.isArray(data.data?.items) ? data.data.items : Array.isArray(data.data) ? data.data : [];

      if (data.success) {
        setQueueItems(items);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load review queue';
      console.error('[v0] Error fetching queue:', message);
      setError(message);
      setQueueItems([]);
    } finally {
      setIsLoadingQueue(false);
    }
  };

  // Load queue items on mount
  React.useEffect(() => {
    fetchQueueItems();
    fetchKBPrompts();
    fetchUnifiedItems();
  }, [applicationId]);

  const fetchUnifiedItems = async (): Promise<void> => {
    try {
      setIsLoadingUnified(true);
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';
      const response = await fetch(`${apiUrl}/api/ba-review/approved-prompts/${applicationId}`);

      if (!response.ok) {
        if (response.status === 404) {
          console.log('[v0] Unified approved prompts endpoint not yet implemented');
          setUnifiedItems([]);
          return;
        }
        throw new Error('Failed to fetch unified items');
      }

      const data = await response.json();
      const items = Array.isArray(data.data) ? data.data : [];

      if (data.success) {
        setUnifiedItems(items);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load unified items';
      console.error('[v0] Error fetching unified items:', message);
      setUnifiedItems([]);
    } finally {
      setIsLoadingUnified(false);
    }
  };

  const fetchKBPrompts = async (): Promise<void> => {
    try {
      setIsLoadingKB(true);
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';
      const response = await fetch(`${apiUrl}/api/knowledge-base/badged-prompts/${applicationId}`);

      if (!response.ok) {
        if (response.status === 404) {
          console.log('[v0] KB badged prompts endpoint not yet implemented');
          setKBPrompts([]);
          return;
        }
        throw new Error('Failed to fetch badged prompts');
      }

      const data = await response.json();
      const prompts = Array.isArray(data.data) ? data.data : [];

      if (data.success) {
        setKBPrompts(prompts);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load KB prompts';
      console.error('[v0] Error fetching KB prompts:', message);
      setKBPrompts([]);
    } finally {
      setIsLoadingKB(false);
    }
  };

  const getPriorityColor = (priority: string): string => {
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

  const getReasonIcon = (reason: string): React.ReactNode => {
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

  // KB Prompt Approval Handlers
  const handleApproveKBPrompt = async (promptId: string): Promise<void> => {
    try {
      setApprovingKBId(promptId);
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';
      const response = await fetch(`${apiUrl}/api/ba-review/kb-prompts/${promptId}/approve`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          approvalStatus: 'approved',
          approvalReason: 'Approved by BA for template usage',
        }),
      });

      if (!response.ok) throw new Error('Failed to approve KB prompt');
      
      await fetchKBPrompts();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to approve');
    } finally {
      setApprovingKBId(null);
    }
  };

  const handleRejectKBPrompt = async (promptId: string): Promise<void> => {
    try {
      setApprovingKBId(promptId);
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';
      const response = await fetch(`${apiUrl}/api/ba-review/kb-prompts/${promptId}/approve`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          approvalStatus: 'rejected',
          approvalReason: 'Rejected by BA',
        }),
      });

      if (!response.ok) throw new Error('Failed to reject KB prompt');
      
      await fetchKBPrompts();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to reject');
    } finally {
      setApprovingKBId(null);
    }
  };

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={(tab) => setActiveTab(tab as 'all' | 'queue' | 'kb' | 'templates')} className="w-full">
        <div className="flex items-center justify-between mb-4">
          <TabsList className="grid w-full max-w-lg grid-cols-4">
            <TabsTrigger value="all">All Items</TabsTrigger>
            <TabsTrigger value="queue">Recommendations</TabsTrigger>
            <TabsTrigger value="kb">KB Prompts</TabsTrigger>
            <TabsTrigger value="templates">Templates</TabsTrigger>
          </TabsList>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => setBulkProcessingOpen(true)}
              variant="outline"
              className="gap-2"
              title="Process low-score prompts in bulk"
            >
              <Zap className="w-4 h-4" />
              Bulk Process
            </Button>
            {activeTab === 'templates' && (
              <Button onClick={() => setBuilderOpen(true)} className="flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Create Template
              </Button>
            )}
          </div>
        </div>

        <TabsContent value="all" className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">All Review Items</h2>
            <p className="text-sm text-gray-600 mb-4">Unified view of approved recommendations and KB prompts for template building</p>

            {isLoadingUnified ? (
              <Card className="p-8 text-center bg-gray-50 border-gray-200">
                <Spinner className="w-6 h-6 mx-auto mb-3" />
                <p className="text-gray-600 font-medium">Loading items...</p>
              </Card>
            ) : unifiedItems.length === 0 ? (
              <Card className="p-8 text-center bg-gray-50 border-gray-200">
                <CheckCircle className="w-12 h-12 text-blue-500 mx-auto mb-3" />
                <p className="text-gray-600 font-medium">No items yet</p>
                <p className="text-gray-500 text-sm mt-1">Create recommendations or badge KB prompts to see them here</p>
              </Card>
            ) : (
              <div className="space-y-3">
                {unifiedItems.map((item) => (
                  <Card
                    key={item._id}
                    className="p-4 border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        {/* Source Badge */}
                        <div className="flex items-center gap-2 mb-2">
                          <Badge className={
                            item.source === 'kb_prompt'
                              ? 'bg-blue-100 text-blue-800 border-blue-300'
                              : 'bg-purple-100 text-purple-800 border-purple-300'
                          }>
                            {item.source === 'kb_prompt' ? 'KB Prompt' : 'Recommendation'}
                          </Badge>
                          {item.priority && (
                            <Badge className={getPriorityColor(item.priority)}>
                              {item.priority}
                            </Badge>
                          )}
                        </div>

                        {/* Prompt Preview */}
                        <p className="text-sm font-medium text-gray-900 mb-2 line-clamp-2">
                          {item.prompt || item.userPrompt}
                        </p>

                        {/* Context/Suggestion Preview */}
                        <p className="text-xs text-gray-600 line-clamp-2 mb-2">
                          {item.source === 'recommendation'
                            ? `Suggestion: ${item.suggestion}`
                            : `Context: ${item.context?.substring(0, 100) || 'N/A'}...`
                          }
                        </p>

                        {/* Additional Info */}
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          {item.source === 'recommendation' && item.reason && (
                            <span className="flex items-center gap-1">
                              {getReasonIcon(item.reason)}
                              {item.reason}
                            </span>
                          )}
                          {item.source === 'kb_prompt' && item.relevanceScore && (
                            <span>Relevance: {(item.relevanceScore * 100).toFixed(0)}%</span>
                          )}
                          {item.createdAt && (
                            <span>
                              Created: {new Date(item.createdAt).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="queue" className="space-y-6">
          <BARecommendationsTab applicationId={applicationId} />
        </TabsContent>

        <TabsContent value="kb" className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Badged KB Prompts</h2>
            <p className="text-sm text-gray-600 mb-4">Review and manage knowledge base prompts that have been approved by testers</p>

            {isLoadingKB ? (
              <Card className="p-8 text-center bg-gray-50 border-gray-200">
                <Spinner className="w-6 h-6 mx-auto mb-3" />
                <p className="text-gray-600 font-medium">Loading KB prompts...</p>
              </Card>
            ) : kbPrompts.length === 0 ? (
              <Card className="p-8 text-center bg-gray-50 border-gray-200">
                <CheckCircle className="w-12 h-12 text-blue-500 mx-auto mb-3" />
                <p className="text-gray-600 font-medium">No badged prompts yet</p>
                <p className="text-gray-500 text-sm mt-1">Testers can badge prompts in the Knowledge Base chat</p>
              </Card>
            ) : (
              <div className="space-y-3">
                {kbPrompts.map((prompt) => (
                  <Card
                    key={prompt._id}
                    className="p-4 border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        {/* Source Badge */}
                        <div className="flex items-center gap-2 mb-2">
                          <Badge className="bg-blue-100 text-blue-800 border-blue-300">
                            KB Prompt
                          </Badge>
                          <span className="text-xs text-gray-500">
                            Relevance: {(prompt.relevanceScore * 100).toFixed(0)}%
                          </span>
                        </div>

                        {/* Prompt Preview */}
                        <p className="text-sm font-medium text-gray-900 mb-2 line-clamp-2">
                          {prompt.prompt}
                        </p>

                        {/* Context Preview */}
                        <p className="text-xs text-gray-600 line-clamp-2 mb-2">
                          Context: {prompt.context.substring(0, 100)}...
                        </p>

                        {/* Source */}
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span>Source: {prompt.source}</span>
                          {prompt.badgedAt && (
                            <span>
                              Badged:{' '}
                              <span className="font-semibold text-gray-700">
                                {new Date(prompt.badgedAt).toLocaleDateString()}
                              </span>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Use in Template Button */}
                      <div className="ml-4 flex-shrink-0 flex gap-2">
                        {prompt.badgeStatus !== 'approved' ? (
                          <>
                            <Button
                              size="sm"
                              className="bg-green-600 hover:bg-green-700 text-white"
                              disabled={approvingKBId === prompt._id}
                              onClick={() => handleApproveKBPrompt(prompt._id)}
                            >
                              {approvingKBId === prompt._id ? 'Approving...' : 'Approve'}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="border-red-200 text-red-700 hover:bg-red-50"
                              disabled={approvingKBId === prompt._id}
                              onClick={() => handleRejectKBPrompt(prompt._id)}
                            >
                              Reject
                            </Button>
                          </>
                        ) : (
                          <Badge className="bg-green-100 text-green-800 border-green-300">
                            Approved
                          </Badge>
                        )}
                      </div>
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
        similarPrompts={queueItems
          .filter((item) => item.status === 'approved')
          .map((item) => ({
            id: item._id,
            prompt: item.userPrompt,
            improvement: 'Improved version',
            score: item.averageScore || 0,
          }))}
      />

      {/* Bulk Processing Modal */}
      <BulkProcessing
        applicationId={applicationId}
        isOpen={bulkProcessingOpen}
        onClose={() => setBulkProcessingOpen(false)}
        onProcessingComplete={() => {
          fetchQueueItems();
          setBulkProcessingOpen(false);
        }}
      />
    </div>
  );
}
