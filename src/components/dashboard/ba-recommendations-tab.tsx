'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

interface Prompt {
  _id: string;
  userPrompt: string;
  revisedPrompt: string | null;
  improvementReason: string | null;
  estimatedScoreIncrease: number;
  approvalStatus: 'pending' | 'approved' | 'rejected';
  approvedRevisedPrompt: string | null;
  approvalReason: string | null;
  approvedAt: string | null;
}

interface PaginationData {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export function BARecommendationsTab({ applicationId }: { applicationId: string }) {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [pagination, setPagination] = useState<PaginationData>({ page: 1, limit: 10, total: 0, pages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingRevision, setEditingRevision] = useState<string>('');
  const [approvingId, setApprovingId] = useState<string | null>(null);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';

  useEffect(() => {
    fetchPrompts();
  }, [applicationId, pagination.page]);

  const fetchPrompts = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `${apiUrl}/api/ba-review/prompts-with-revisions/${applicationId}?page=${pagination.page}&limit=${pagination.limit}`
      );
      
      if (!response.ok) throw new Error('Failed to fetch prompts');
      
      const data = await response.json() as any;
      setPrompts(data.data.prompts);
      setPagination(data.data.pagination);
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (promptId: string, editedRevision: string) => {
    try {
      setApprovingId(promptId);
      const response = await fetch(`${apiUrl}/api/ba-review/approve-prompt/${promptId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          approvalStatus: 'approved',
          approvedRevisedPrompt: editedRevision,
          approvalReason: 'Approved by BA reviewer',
        }),
      });

      if (!response.ok) throw new Error('Failed to approve prompt');
      
      setEditingId(null);
      await fetchPrompts();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to approve');
    } finally {
      setApprovingId(null);
    }
  };

  const handleReject = async (promptId: string) => {
    try {
      setApprovingId(promptId);
      const response = await fetch(`${apiUrl}/api/ba-review/approve-prompt/${promptId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          approvalStatus: 'rejected',
          approvedRevisedPrompt: '',
          approvalReason: 'Rejected by BA reviewer',
        }),
      });

      if (!response.ok) throw new Error('Failed to reject prompt');
      
      await fetchPrompts();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to reject');
    } finally {
      setApprovingId(null);
    }
  };

  const getApprovalBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return (
          <Badge className="bg-green-900 text-green-200 border-green-700">
            <CheckCircle className="w-3 h-3 mr-1" /> Approved
          </Badge>
        );
      case 'rejected':
        return (
          <Badge className="bg-red-900 text-red-200 border-red-700">
            <XCircle className="w-3 h-3 mr-1" /> Rejected
          </Badge>
        );
      default:
        return (
          <Badge className="bg-gray-700 text-gray-200 border-gray-600">
            <AlertCircle className="w-3 h-3 mr-1" /> Pending Review
          </Badge>
        );
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading prompts...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Prompt Recommendations</h2>
        <p className="text-sm text-gray-600 mb-4">
          Showing {prompts.length > 0 ? (pagination.page - 1) * pagination.limit + 1 : 0} to{' '}
          {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} prompts
        </p>

        {error && (
          <Card className="p-4 bg-red-50 border-red-200 mb-4">
            <p className="text-red-800 text-sm">{error}</p>
          </Card>
        )}

        {prompts.length === 0 ? (
          <Card className="p-8 text-center bg-gray-50 border-gray-200">
            <p className="text-gray-600 font-medium">No prompts found for this application</p>
          </Card>
        ) : (
          <div className="space-y-4">
            {prompts.map((prompt) => (
              <Card key={prompt._id} className="p-6 border-gray-200 bg-white">
                {/* Header with Selection and Approval Status */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(prompt._id)}
                      onChange={(e) => {
                        const newSelected = new Set(selectedIds);
                        if (e.target.checked) {
                          newSelected.add(prompt._id);
                        } else {
                          newSelected.delete(prompt._id);
                        }
                        setSelectedIds(newSelected);
                      }}
                      className="w-4 h-4 rounded border-gray-300"
                    />
                    <div className="flex items-center gap-2">
                      {getApprovalBadge(prompt.approvalStatus)}
                      {prompt.estimatedScoreIncrease > 0 && (
                        <Badge className="bg-blue-900 text-blue-200">+{(prompt.estimatedScoreIncrease * 100).toFixed(0)}%</Badge>
                      )}
                    </div>
                  </div>
                  <span className="text-xs text-gray-500">ID: {prompt._id.substring(0, 12)}...</span>
                </div>

                {/* Original vs Revised Prompts */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                  {/* Original */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Original Prompt</label>
                    <div className="bg-gray-50 p-3 rounded border border-gray-200 text-sm text-gray-700 min-h-24 line-clamp-4 whitespace-pre-wrap break-words">
                      {prompt.userPrompt && prompt.userPrompt.trim() ? prompt.userPrompt : <span className="text-gray-400 italic">No original prompt available</span>}
                    </div>
                  </div>

                  {/* Revised */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                      Revised Prompt {prompt.approvalStatus === 'approved' && '(Approved)'}
                    </label>
                    {editingId === prompt._id ? (
                      <textarea
                        value={editingRevision}
                        onChange={(e) => setEditingRevision(e.target.value)}
                        className="w-full p-3 rounded border border-blue-300 bg-blue-50 text-sm font-mono text-gray-900 min-h-24 focus:outline-none focus:ring-2 focus:ring-blue-400"
                      />
                    ) : (
                      <div className="bg-blue-50 p-3 rounded border border-blue-200 text-sm text-gray-700 min-h-24 line-clamp-4 font-mono">
                        {prompt.approvalStatus === 'approved' 
                          ? prompt.approvedRevisedPrompt || prompt.revisedPrompt 
                          : prompt.revisedPrompt || 'No revision available'}
                      </div>
                    )}
                  </div>
                </div>

                {/* Improvement Reason */}
                {prompt.improvementReason && (
                  <div className="mb-4">
                    <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Why This Improves It</label>
                    <p className="text-sm text-gray-600 italic mt-1">{prompt.improvementReason}</p>
                  </div>
                )}

                {/* Action Buttons - Only show if pending */}
                {prompt.approvalStatus === 'pending' && (
                  <div className="flex gap-2 mt-4">
                    {editingId === prompt._id ? (
                      <>
                        <Button
                          onClick={() => handleApprove(prompt._id, editingRevision)}
                          disabled={approvingId === prompt._id}
                          className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                        >
                          {approvingId === prompt._id ? 'Saving...' : 'Approve'}
                        </Button>
                        <Button
                          onClick={() => setEditingId(null)}
                          variant="outline"
                          className="flex-1"
                        >
                          Cancel
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          onClick={() => {
                            setEditingId(prompt._id);
                            setEditingRevision(prompt.revisedPrompt || '');
                          }}
                          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                        >
                          Edit & Approve
                        </Button>
                        <Button
                          onClick={() => handleReject(prompt._id)}
                          disabled={approvingId === prompt._id}
                          variant="outline"
                          className="flex-1 text-red-600 border-red-300 hover:bg-red-50"
                        >
                          {approvingId === prompt._id ? 'Rejecting...' : 'Reject'}
                        </Button>
                      </>
                    )}
                  </div>
                )}

                {/* Show approval info if already decided */}
                {prompt.approvalStatus !== 'pending' && (
                  <div className="text-xs text-gray-500 mt-4 pt-4 border-t border-gray-200">
                    {prompt.approvalStatus === 'approved' && (
                      <>Approved on {new Date(prompt.approvedAt || '').toLocaleDateString()}</>
                    )}
                    {prompt.approvalStatus === 'rejected' && (
                      <>Rejected</>
                    )}
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="flex items-center justify-between mt-6">
            <Button
              onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
              disabled={pagination.page === 1}
              variant="outline"
            >
              <ChevronLeft className="w-4 h-4 mr-1" /> Previous
            </Button>
            <span className="text-sm text-gray-600">
              Page {pagination.page} of {pagination.pages}
            </span>
            <Button
              onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
              disabled={pagination.page === pagination.pages}
              variant="outline"
            >
              Next <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
