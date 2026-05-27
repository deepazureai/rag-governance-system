import { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AlertCircle, Filter, Loader2 } from 'lucide-react';
import type { RecommendationPrompt } from '@/types/models';

interface RecommendationRegistryProps {
  applicationId: string;
}

interface FilterState {
  status?: string;
  minScore?: number;
}

export function RecommendationRegistry({ applicationId }: RecommendationRegistryProps): React.ReactElement {
  const [recommendations, setRecommendations] = useState<readonly RecommendationPrompt[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterState>({});
  const [selectedRecommendation, setSelectedRecommendation] = useState<RecommendationPrompt | null>(null);

  const fetchRecommendations = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';
      const queryParams = new URLSearchParams();
      
      if (filters.status) queryParams.append('status', filters.status);
      if (filters.minScore) queryParams.append('minScore', filters.minScore.toString());

      const response = await fetch(
        `${apiUrl}/api/recommendations/app/${applicationId}?${queryParams.toString()}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch recommendations');
      }

      const data = await response.json() as {
        success: boolean;
        data?: readonly RecommendationPrompt[];
      };

      if (data.success && data.data) {
        setRecommendations(data.data);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error fetching recommendations';
      setError(message);
      console.error('[v0] Error fetching recommendations:', message);
    } finally {
      setIsLoading(false);
    }
  }, [applicationId, filters]);

  useEffect(() => {
    void fetchRecommendations();
  }, [fetchRecommendations]);

  const getScoreColor = (score: number): string => {
    if (score >= 0.8) return 'bg-green-100 text-green-800';
    if (score >= 0.6) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Filter className="h-5 w-5 text-gray-500" />
        <Input
          type="number"
          min="0"
          max="1"
          step="0.1"
          placeholder="Min score (0-1)"
          value={filters.minScore ?? ''}
          onChange={(e) =>
            setFilters((prev) => ({
              ...prev,
              minScore: e.target.value ? parseFloat(e.target.value) : undefined,
            }))
          }
          className="w-32"
        />
        <Button onClick={() => void fetchRecommendations()} disabled={isLoading}>
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Refresh'}
        </Button>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-md">
          <AlertCircle className="h-5 w-5" />
          <span>{error}</span>
        </div>
      )}

      <div className="space-y-3">
        {recommendations.length === 0 ? (
          <Card className="p-6 text-center text-gray-500">
            No recommendations found. Create recommendations from the Raw Data tab.
          </Card>
        ) : (
          recommendations.map((rec) => (
            <Card
              key={rec._id?.toString()}
              className="p-4 hover:shadow-md cursor-pointer transition-all"
              onClick={() => setSelectedRecommendation(rec)}
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="font-semibold text-gray-900">{rec.title}</h3>
                  <p className="text-sm text-gray-500 mt-1">{rec.category}</p>
                </div>
                <Badge className={getScoreColor(rec.qualityScore ?? 0)}>
                  {((rec.qualityScore ?? 0) * 100).toFixed(0)}%
                </Badge>
              </div>

              <div className="space-y-2">
                <div>
                  <p className="text-xs font-medium text-gray-600 mb-1">Suggested Prompt:</p>
                  <p className="text-sm text-gray-700 line-clamp-2">{rec.suggestedPrompt}</p>
                </div>

                <div>
                  <p className="text-xs font-medium text-gray-600 mb-1">From Query:</p>
                  <p className="text-sm text-gray-600 line-clamp-1">{rec.originalQuery}</p>
                </div>
              </div>

              <div className="flex gap-2 mt-3">
                {rec.isUseful && <Badge variant="secondary">Marked Useful</Badge>}
                {rec.selectedForTemplate && <Badge variant="secondary">Used in Template</Badge>}
              </div>
            </Card>
          ))
        )}
      </div>

      {selectedRecommendation && (
        <Card className="p-6 bg-blue-50 border-blue-200">
          <div className="flex items-start justify-between mb-4">
            <h4 className="font-semibold text-gray-900">Recommendation Details</h4>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedRecommendation(null)}
            >
              Close
            </Button>
          </div>

          <div className="space-y-3 text-sm">
            <div>
              <p className="font-medium text-gray-700">Original Query:</p>
              <p className="text-gray-600">{selectedRecommendation.originalQuery}</p>
            </div>

            <div>
              <p className="font-medium text-gray-700">Context:</p>
              <p className="text-gray-600 bg-white p-2 rounded">{selectedRecommendation.context}</p>
            </div>

            <div>
              <p className="font-medium text-gray-700">Suggested Prompt:</p>
              <p className="text-gray-600 bg-white p-2 rounded">{selectedRecommendation.suggestedPrompt}</p>
            </div>

            {selectedRecommendation.notes && (
              <div>
                <p className="font-medium text-gray-700">Notes:</p>
                <p className="text-gray-600">{selectedRecommendation.notes}</p>
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
