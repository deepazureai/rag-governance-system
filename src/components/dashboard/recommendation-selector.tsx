'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, CheckCircle2, Loader } from 'lucide-react';

interface BARecommendation {
  _id: string;
  userPrompt: string;
  llmResponse: string;
  suggestion: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  priorityScore: number;
}

interface RecommendationSelectorProps {
  applicationId: string;
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
}

export function RecommendationSelector({
  applicationId,
  selectedIds,
  onSelectionChange,
}: RecommendationSelectorProps): React.ReactElement {
  const [recommendations, setRecommendations] = useState<BARecommendation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRecommendations = async (): Promise<void> => {
      try {
        setIsLoading(true);
        setError(null);
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';
        
        const response = await fetch(
          `${apiUrl}/api/ba-review/recommendations/${applicationId}`
        );
        
        if (!response.ok) {
          throw new Error('Failed to fetch recommendations');
        }
        
        const data = (await response.json()) as unknown;
        if (typeof data === 'object' && data !== null && 'success' in data && 'data' in data) {
          const typedData = data as { success: boolean; data: BARecommendation[] };
          setRecommendations(typedData.data || []);
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to fetch recommendations';
        console.error('[v0] Error fetching recommendations:', message);
        setError(message);
        setRecommendations([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRecommendations();
  }, [applicationId]);

  const handleToggle = (id: string): void => {
    if (selectedIds.includes(id)) {
      onSelectionChange(selectedIds.filter((sid) => sid !== id));
    } else {
      onSelectionChange([...selectedIds, id]);
    }
  };

  const getPriorityColor = (priority: string): string => {
    switch (priority) {
      case 'critical':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'high':
        return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'medium':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader className="w-6 h-6 animate-spin text-gray-400" />
        <span className="ml-2 text-gray-600">Loading recommendations...</span>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="p-6 border-red-200 bg-red-50">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-red-900">Failed to load recommendations</h3>
            <p className="text-sm text-red-700 mt-1">{error}</p>
          </div>
        </div>
      </Card>
    );
  }

  if (recommendations.length === 0) {
    return (
      <Card className="p-6 border-gray-200 bg-gray-50">
        <p className="text-gray-600 text-center">No recommendations available for this application</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">
          BA Review Recommendations ({selectedIds.length} selected)
        </h3>
        {selectedIds.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onSelectionChange([])}
            className="text-xs"
          >
            Clear Selection
          </Button>
        )}
      </div>

      <div className="space-y-3 max-h-96 overflow-y-auto">
        {recommendations.map((rec) => (
          <Card
            key={rec._id}
            className={`p-4 border-2 cursor-pointer transition-all ${
              selectedIds.includes(rec._id)
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
            onClick={() => handleToggle(rec._id)}
          >
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-1">
                {selectedIds.includes(rec._id) ? (
                  <CheckCircle2 className="w-5 h-5 text-blue-600" />
                ) : (
                  <div className="w-5 h-5 border-2 border-gray-300 rounded-full" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className={`px-2 py-1 rounded text-xs font-semibold uppercase border ${getPriorityColor(
                      rec.priority
                    )}`}
                  >
                    {rec.priority}
                  </span>
                  <span className="text-xs text-gray-500">Score: {rec.priorityScore.toFixed(2)}</span>
                </div>
                <p className="text-sm font-medium text-gray-900 line-clamp-2 mb-1">{rec.userPrompt}</p>
                <p className="text-xs text-gray-600 line-clamp-2 mb-2">{rec.llmResponse}</p>
                <p className="text-xs text-blue-700 bg-blue-50 p-2 rounded line-clamp-2">
                  <span className="font-semibold">Suggestion:</span> {rec.suggestion}
                </p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <p className="text-xs text-gray-600 text-center">
        Select recommendations to include in template synthesis
      </p>
    </div>
  );
}
