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
                  <h3 className="font-semibold text-gray-900">{rec.originalPrompt.substring(0, 60)}</h3>
                  <p className="text-sm text-gray-500 mt-1">{rec.rating ? `Rating: ${rec.rating}/5` : 'Not rated'}</p>
                </div>
                {rec.rating && (
                  <Badge className="bg-blue-100 text-blue-800">
                    {rec.rating}/5
                  </Badge>
                )}
              </div>

              <div className="space-y-2">
                <div>
                  <p className="text-xs font-medium text-gray-600 mb-1">Original Prompt:</p>
                  <p className="text-sm text-gray-700 line-clamp-2">{rec.originalPrompt}</p>
                </div>

                <div>
                  <p className="text-xs font-medium text-gray-600 mb-1">Suggestions:</p>
                  <p className="text-sm text-gray-600 line-clamp-2">
                    {rec.suggestions && rec.suggestions.length > 0
                      ? rec.suggestions[0].suggestion
                      : 'No suggestions'}
                  </p>
                </div>
              </div>

              <div className="flex gap-2 mt-3">
                {rec.userNotes && <Badge variant="secondary">Has Notes</Badge>}
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
              <p className="font-medium text-gray-700">Original Prompt:</p>
              <p className="text-gray-600">{selectedRecommendation.originalPrompt}</p>
            </div>

            <div>
              <p className="font-medium text-gray-700">Original Response:</p>
              <p className="text-gray-600 bg-white p-2 rounded">{selectedRecommendation.originalResponse}</p>
            </div>

            {selectedRecommendation.context && (
              <div>
                <p className="font-medium text-gray-700">Context:</p>
                <p className="text-gray-600 bg-white p-2 rounded">{selectedRecommendation.context}</p>
              </div>
            )}

            {selectedRecommendation.suggestions && selectedRecommendation.suggestions.length > 0 && (
              <div>
                <p className="font-medium text-gray-700">Suggestions:</p>
                <div className="space-y-2">
                  {selectedRecommendation.suggestions.map((sugg, idx) => (
                    <div key={idx} className="bg-white p-2 rounded text-sm">
                      <p className="font-medium text-gray-700">{sugg.issue}</p>
                      <p className="text-gray-600">{sugg.suggestion}</p>
                      <p className="text-gray-500 text-xs">Expected: {sugg.expectedImprovement}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedRecommendation.userNotes && (
              <div>
                <p className="font-medium text-gray-700">Notes:</p>
                <p className="text-gray-600">{selectedRecommendation.userNotes}</p>
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
