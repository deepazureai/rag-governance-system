'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, CheckCircle2, Loader } from 'lucide-react';

interface KBPrompt {
  _id: string;
  prompt: string;
  context: string;
  relevanceScore?: number;
  usageCount?: number;
  createdAt?: string;
}

interface KBPromptSelectorProps {
  applicationId: string;
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
}

export function KBPromptSelector({
  applicationId,
  selectedIds,
  onSelectionChange,
}: KBPromptSelectorProps): React.ReactElement {
  const [prompts, setPrompts] = useState<KBPrompt[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchPrompts = async (): Promise<void> => {
      try {
        setIsLoading(true);
        setError(null);
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';
        
        const response = await fetch(
          `${apiUrl}/api/knowledge-base/prompts/${applicationId}`
        );
        
        if (!response.ok) {
          throw new Error('Failed to fetch KB prompts');
        }
        
        const data = (await response.json()) as unknown;
        if (typeof data === 'object' && data !== null && 'success' in data && 'data' in data) {
          const typedData = data as { success: boolean; data: KBPrompt[] };
          setPrompts(typedData.data || []);
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to fetch KB prompts';
        console.error('[v0] Error fetching KB prompts:', message);
        setError(message);
        setPrompts([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPrompts();
  }, [applicationId]);

  const handleToggle = (id: string): void => {
    if (selectedIds.includes(id)) {
      onSelectionChange(selectedIds.filter((sid) => sid !== id));
    } else {
      onSelectionChange([...selectedIds, id]);
    }
  };

  const filteredPrompts = prompts.filter(
    (prompt) =>
      prompt.prompt.toLowerCase().includes(searchTerm.toLowerCase()) ||
      prompt.context.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader className="w-6 h-6 animate-spin text-gray-400" />
        <span className="ml-2 text-gray-600">Loading KB prompts...</span>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="p-6 border-red-200 bg-red-50">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-red-900">Failed to load KB prompts</h3>
            <p className="text-sm text-red-700 mt-1">{error}</p>
          </div>
        </div>
      </Card>
    );
  }

  if (prompts.length === 0) {
    return (
      <Card className="p-6 border-gray-200 bg-gray-50">
        <p className="text-gray-600 text-center">No KB prompts available for this application</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">
          Knowledge Base Prompts ({selectedIds.length} selected)
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

      <div>
        <input
          type="text"
          placeholder="Search prompts or context..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="space-y-3 max-h-96 overflow-y-auto">
        {filteredPrompts.length === 0 ? (
          <p className="text-sm text-gray-600 text-center py-6">No prompts match your search</p>
        ) : (
          filteredPrompts.map((prompt) => (
            <Card
              key={prompt._id}
              className={`p-4 border-2 cursor-pointer transition-all ${
                selectedIds.includes(prompt._id)
                  ? 'border-green-500 bg-green-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => handleToggle(prompt._id)}
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-1">
                  {selectedIds.includes(prompt._id) ? (
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                  ) : (
                    <div className="w-5 h-5 border-2 border-gray-300 rounded-full" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 line-clamp-2 mb-2">{prompt.prompt}</p>
                  <p className="text-xs text-gray-600 line-clamp-3 mb-2 p-2 bg-gray-100 rounded">
                    {prompt.context}
                  </p>
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    {prompt.relevanceScore !== undefined && (
                      <span>Relevance: {(prompt.relevanceScore * 100).toFixed(0)}%</span>
                    )}
                    {prompt.usageCount !== undefined && <span>Used: {prompt.usageCount} times</span>}
                  </div>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      <p className="text-xs text-gray-600 text-center">
        Select KB prompts to include in template synthesis
      </p>
    </div>
  );
}
