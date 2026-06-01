'use client';

import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { ChevronLeft, ChevronRight, AlertCircle, CheckCircle } from 'lucide-react';

interface Prompt {
  _id: string;
  applicationId: string;
  userPrompt: string;
  revisedPrompt: string | null;
  improvementReason: string | null;
  estimatedScoreIncrease: number;
  hasRevision: boolean;
  updatedAt: string;
}

interface BARecommendationsTabProps {
  applicationId: string;
}

export function BARecommendationsTab({ applicationId }: BARecommendationsTabProps) {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const limit = 10;

  useEffect(() => {
    fetchPrompts();
  }, [applicationId, page]);

  const fetchPrompts = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';
      const response = await fetch(
        `${apiUrl}/api/ba-review/prompts-with-revisions/${applicationId}?page=${page}&limit=${limit}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch prompts');
      }

      const data = await response.json();
      if (data.success) {
        setPrompts(data.data.prompts);
        setTotalPages(data.data.pagination.pages);
        setTotalCount(data.data.pagination.total);
      } else {
        setError(data.message || 'Failed to fetch prompts');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch prompts';
      console.error('[v0] Error fetching prompts:', message);
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <Card className="p-8 text-center bg-gray-50 border-gray-200">
        <Spinner className="w-6 h-6 mx-auto mb-3" />
        <p className="text-gray-600 font-medium">Loading prompts...</p>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-4 bg-red-50 border-red-200">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-red-800 font-medium">Error loading prompts</p>
            <p className="text-red-700 text-sm mt-1">{error}</p>
          </div>
        </div>
      </Card>
    );
  }

  if (prompts.length === 0) {
    return (
      <Card className="p-8 text-center bg-gray-50 border-gray-200">
        <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
        <p className="text-gray-600 font-medium">No prompts found</p>
        <p className="text-gray-500 text-sm mt-1">This application doesn&apos;t have any prompts yet.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with pagination info */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Prompt Recommendations</h2>
          <p className="text-sm text-gray-600 mt-1">
            Showing {(page - 1) * limit + 1} to {Math.min(page * limit, totalCount)} of {totalCount} prompts
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm text-gray-600 px-2">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            disabled={page === totalPages}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Prompts table - responsive layout */}
      <div className="space-y-3">
        {prompts.map((prompt) => (
          <Card
            key={prompt._id}
            className="p-4 border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all"
          >
            <div className="space-y-3">
              {/* Revision status badge */}
              <div className="flex items-center gap-2">
                {prompt.hasRevision ? (
                  <Badge className="bg-green-100 text-green-800 border-green-300 border">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Revised
                  </Badge>
                ) : (
                  <Badge className="bg-gray-100 text-gray-800 border-gray-300 border">
                    Original
                  </Badge>
                )}
                {prompt.estimatedScoreIncrease > 0 && (
                  <Badge className="bg-blue-100 text-blue-800 border-blue-300 border">
                    +{(prompt.estimatedScoreIncrease * 100).toFixed(0)}%
                  </Badge>
                )}
              </div>

              {/* Original prompt */}
              <div>
                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">
                  Original Prompt
                </p>
                <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded border border-gray-200">
                  {prompt.userPrompt}
                </p>
              </div>

              {/* Revised prompt (if available) */}
              {prompt.revisedPrompt && (
                <div>
                  <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">
                    Revised Prompt
                  </p>
                  <p className="text-sm text-gray-700 bg-green-50 p-3 rounded border border-green-200">
                    {prompt.revisedPrompt}
                  </p>

                  {/* Improvement reason */}
                  {prompt.improvementReason && (
                    <div className="mt-2">
                      <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">
                        Why This Improves It
                      </p>
                      <p className="text-sm text-gray-600 italic">
                        {prompt.improvementReason}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Metadata footer */}
              <div className="flex items-center justify-between pt-2 border-t border-gray-200 text-xs text-gray-500">
                <span>Updated: {new Date(prompt.updatedAt).toLocaleDateString()}</span>
                <span>ID: {prompt._id.substring(0, 8)}...</span>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
