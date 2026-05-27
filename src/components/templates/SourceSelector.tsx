import { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AlertCircle, Loader2, Plus, Trash2 } from 'lucide-react';
import type { RecommendationPrompt, KBPrompt } from '@/types/models';

export interface SourceItem {
  id: string;
  type: 'recommendation' | 'kb-prompt';
  title: string;
  snippet: string;
  fullContent: string;
}

interface SourceSelectorProps {
  applicationId: string;
  onSourcesSelected: (sources: readonly SourceItem[]) => void;
}

export function SourceSelector({ applicationId, onSourcesSelected }: SourceSelectorProps): React.ReactElement {
  const [recommendations, setRecommendations] = useState<readonly RecommendationPrompt[]>([]);
  const [kbPrompts, setKBPrompts] = useState<readonly KBPrompt[]>([]);
  const [selectedSources, setSelectedSources] = useState<readonly SourceItem[]>([]);
  const [isLoadingRecs, setIsLoadingRecs] = useState(false);
  const [isLoadingKB, setIsLoadingKB] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRecommendations = useCallback(async (): Promise<void> => {
    setIsLoadingRecs(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';
      const response = await fetch(`${apiUrl}/api/recommendations/app/${applicationId}?limit=100`);
      
      if (!response.ok) throw new Error('Failed to fetch recommendations');
      
      const data = await response.json() as { success: boolean; data?: readonly RecommendationPrompt[] };
      if (data.success && data.data) {
        setRecommendations(data.data);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error fetching recommendations';
      setError(message);
    } finally {
      setIsLoadingRecs(false);
    }
  }, [applicationId]);

  const fetchKBPrompts = useCallback(async (): Promise<void> => {
    setIsLoadingKB(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';
      const response = await fetch(`${apiUrl}/api/kb-prompts/app/${applicationId}?limit=100`);
      
      if (!response.ok) throw new Error('Failed to fetch KB prompts');
      
      const data = await response.json() as { success: boolean; data?: readonly KBPrompt[] };
      if (data.success && data.data) {
        setKBPrompts(data.data);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error fetching KB prompts';
      setError(message);
    } finally {
      setIsLoadingKB(false);
    }
  }, [applicationId]);

  useEffect(() => {
    void fetchRecommendations();
    void fetchKBPrompts();
  }, [fetchRecommendations, fetchKBPrompts]);

  const toggleSource = (source: SourceItem): void => {
    setSelectedSources((prev) => {
      const exists = prev.some((s) => s.id === source.id);
      if (exists) {
        return prev.filter((s) => s.id !== source.id);
      }
      return [...prev, source];
    });
  };

  const handleSourcesChange = (): void => {
    onSourcesSelected(selectedSources);
  };

  const isSourceSelected = (id: string): boolean => selectedSources.some((s) => s.id === id);

  return (
    <div className="space-y-4">
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-md">
          <AlertCircle className="h-5 w-5" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        {/* Recommendations Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Recommendations</h3>
            {isLoadingRecs && <Loader2 className="h-4 w-4 animate-spin text-gray-500" />}
          </div>

          <div className="space-y-2">
            {recommendations.length === 0 ? (
              <p className="text-sm text-gray-500">No recommendations available</p>
            ) : (
              recommendations.map((rec) => (
                <Card
                  key={rec._id?.toString()}
                  className={`p-3 cursor-pointer transition-all ${
                    isSourceSelected(rec._id?.toString() ?? '')
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() =>
                    toggleSource({
                      id: rec._id?.toString() ?? '',
                      type: 'recommendation',
                      title: rec.originalPrompt.substring(0, 50),
                      snippet: rec.originalResponse.substring(0, 100),
                      fullContent: rec.originalResponse,
                    })
                  }
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{rec.originalPrompt}</p>
                      <p className="text-xs text-gray-600 mt-1 line-clamp-2">{rec.originalResponse}</p>
                    </div>
                    <div
                      className={`ml-2 h-5 w-5 rounded border flex-shrink-0 flex items-center justify-center ${
                        isSourceSelected(rec._id?.toString() ?? '')
                          ? 'bg-blue-500 border-blue-500'
                          : 'border-gray-300'
                      }`}
                    >
                      {isSourceSelected(rec._id?.toString() ?? '') && (
                        <span className="text-white text-xs">✓</span>
                      )}
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>

        {/* KB Prompts Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">KB Prompts</h3>
            {isLoadingKB && <Loader2 className="h-4 w-4 animate-spin text-gray-500" />}
          </div>

          <div className="space-y-2">
            {kbPrompts.length === 0 ? (
              <p className="text-sm text-gray-500">No KB prompts available</p>
            ) : (
              kbPrompts.map((prompt) => (
                <Card
                  key={prompt._id?.toString()}
                  className={`p-3 cursor-pointer transition-all ${
                    isSourceSelected(prompt._id?.toString() ?? '')
                      ? 'border-purple-500 bg-purple-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() =>
                    toggleSource({
                      id: prompt._id?.toString() ?? '',
                      type: 'kb-prompt',
                      title: prompt.userQuery.substring(0, 50),
                      snippet: prompt.llmGeneratedResponse.substring(0, 100),
                      fullContent: prompt.llmGeneratedResponse,
                    })
                  }
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{prompt.userQuery}</p>
                      <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                        {prompt.llmGeneratedResponse}
                      </p>
                    </div>
                    <div
                      className={`ml-2 h-5 w-5 rounded border flex-shrink-0 flex items-center justify-center ${
                        isSourceSelected(prompt._id?.toString() ?? '')
                          ? 'bg-purple-500 border-purple-500'
                          : 'border-gray-300'
                      }`}
                    >
                      {isSourceSelected(prompt._id?.toString() ?? '') && (
                        <span className="text-white text-xs">✓</span>
                      )}
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="p-4 bg-gray-50 rounded-md">
        <div className="flex items-center justify-between mb-3">
          <span className="font-medium text-gray-900">
            {selectedSources.length} source{selectedSources.length !== 1 ? 's' : ''} selected
          </span>
          <Button
            onClick={handleSourcesChange}
            disabled={selectedSources.length === 0}
            size="sm"
          >
            <Plus className="h-4 w-4 mr-1" />
            Add to Template
          </Button>
        </div>

        {selectedSources.length > 0 && (
          <div className="space-y-2">
            {selectedSources.map((source) => (
              <div
                key={source.id}
                className="flex items-start justify-between p-2 bg-white rounded border border-gray-200"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{source.title}</p>
                  <p className="text-xs text-gray-600">{source.type === 'recommendation' ? 'Recommendation' : 'KB Prompt'}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleSource(source)}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
