import { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AlertCircle, Filter, Loader2 } from 'lucide-react';
import type { KBPrompt } from '@/types/models';

interface KBPromptRegistryProps {
  applicationId: string;
}

interface FilterState {
  category?: string;
  minRelevance?: number;
}

export function KBPromptRegistry({ applicationId }: KBPromptRegistryProps): React.ReactElement {
  const [prompts, setPrompts] = useState<readonly KBPrompt[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterState>({});
  const [selectedPrompt, setSelectedPrompt] = useState<KBPrompt | null>(null);

  const fetchPrompts = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';
      const queryParams = new URLSearchParams();
      
      if (filters.category) queryParams.append('category', filters.category);
      if (filters.minRelevance) queryParams.append('minRelevance', filters.minRelevance.toString());

      const response = await fetch(
        `${apiUrl}/api/kb-prompts/app/${applicationId}?${queryParams.toString()}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch KB prompts');
      }

      const data = await response.json() as {
        success: boolean;
        data?: readonly KBPrompt[];
      };

      if (data.success && data.data) {
        setPrompts(data.data);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error fetching KB prompts';
      setError(message);
      console.error('[v0] Error fetching KB prompts:', message);
    } finally {
      setIsLoading(false);
    }
  }, [applicationId, filters]);

  useEffect(() => {
    void fetchPrompts();
  }, [fetchPrompts]);

  const getRelevanceColor = (score: number | undefined): string => {
    const scoreValue = score ?? 0;
    if (scoreValue >= 0.8) return 'bg-green-100 text-green-800';
    if (scoreValue >= 0.6) return 'bg-yellow-100 text-yellow-800';
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
          placeholder="Min relevance (0-1)"
          value={filters.minRelevance ?? ''}
          onChange={(e) =>
            setFilters((prev) => ({
              ...prev,
              minRelevance: e.target.value ? parseFloat(e.target.value) : undefined,
            }))
          }
          className="w-40"
        />
        <Button onClick={() => void fetchPrompts()} disabled={isLoading}>
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
        {prompts.length === 0 ? (
          <Card className="p-6 text-center text-gray-500">
            No KB prompts found. Query the knowledge base to create prompts.
          </Card>
        ) : (
          prompts.map((prompt) => (
            <Card
              key={prompt._id?.toString()}
              className="p-4 hover:shadow-md cursor-pointer transition-all"
              onClick={() => setSelectedPrompt(prompt)}
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="font-semibold text-gray-900">{prompt.title}</h3>
                  <p className="text-sm text-gray-500 mt-1">{prompt.category || 'Uncategorized'}</p>
                </div>
                <Badge className={getRelevanceColor(prompt.relevanceScore)}>
                  {((prompt.relevanceScore ?? 0) * 100).toFixed(0)}%
                </Badge>
              </div>

              <div className="space-y-2">
                <div>
                  <p className="text-xs font-medium text-gray-600 mb-1">User Query:</p>
                  <p className="text-sm text-gray-700 line-clamp-2">{prompt.userQuery}</p>
                </div>

                <div>
                  <p className="text-xs font-medium text-gray-600 mb-1">KB Response:</p>
                  <p className="text-sm text-gray-600 line-clamp-2">{prompt.kbResponse}</p>
                </div>
              </div>

              <div className="flex gap-2 mt-3">
                {prompt.tags && prompt.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {prompt.tags.map((tag) => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </Card>
          ))
        )}
      </div>

      {selectedPrompt && (
        <Card className="p-6 bg-purple-50 border-purple-200">
          <div className="flex items-start justify-between mb-4">
            <h4 className="font-semibold text-gray-900">KB Prompt Details</h4>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedPrompt(null)}
            >
              Close
            </Button>
          </div>

          <div className="space-y-3 text-sm">
            <div>
              <p className="font-medium text-gray-700">User Query:</p>
              <p className="text-gray-600">{selectedPrompt.userQuery}</p>
            </div>

            <div>
              <p className="font-medium text-gray-700">Retrieved Context:</p>
              <p className="text-gray-600 bg-white p-2 rounded">{selectedPrompt.retrievedContext}</p>
            </div>

            <div>
              <p className="font-medium text-gray-700">KB Response:</p>
              <p className="text-gray-600 bg-white p-2 rounded">{selectedPrompt.kbResponse}</p>
            </div>

            <div>
              <p className="font-medium text-gray-700">Refined Prompt:</p>
              <p className="text-gray-600 bg-white p-2 rounded">{selectedPrompt.refinedPrompt}</p>
            </div>

            {selectedPrompt.notes && (
              <div>
                <p className="font-medium text-gray-700">Notes:</p>
                <p className="text-gray-600">{selectedPrompt.notes}</p>
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
