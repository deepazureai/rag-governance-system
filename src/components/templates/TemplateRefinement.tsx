import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, Loader2, Copy, Check } from 'lucide-react';
import type { SourceItem } from './SourceSelector';

interface TemplateRefinementProps {
  applicationId: string;
  sources: readonly SourceItem[];
  onComplete: (template: string) => void;
}

interface RefinementResult {
  refinedTemplate: string;
  rationale: string;
  suggestions: readonly string[];
}

export function TemplateRefinement({
  applicationId,
  sources,
  onComplete,
}: TemplateRefinementProps): React.ReactElement {
  const [result, setResult] = useState<RefinementResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const refineTemplate = async (): Promise<void> => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';

        const response = await fetch(`${apiUrl}/api/prompt-templates/refine/${applicationId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sources: sources.map((s) => ({
              id: s.id,
              type: s.type,
              content: s.fullContent,
            })),
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to refine template');
        }

        const data = await response.json() as { success: boolean; data?: RefinementResult };
        if (data.success && data.data) {
          setResult(data.data);
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Error refining template';
        setError(message);
        console.error('[v0] Template refinement error:', message);
      } finally {
        setIsLoading(false);
      }
    };

    void refineTemplate();
  }, [applicationId, sources]);

  const handleCopy = (): void => {
    if (result?.refinedTemplate) {
      navigator.clipboard.writeText(result.refinedTemplate).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
  };

  const handleUse = (): void => {
    if (result?.refinedTemplate) {
      onComplete(result.refinedTemplate);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <p className="text-gray-600">Refining template with LLM...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 p-4 bg-red-50 text-red-700 rounded-md">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
        <Button onClick={() => window.location.reload()}>Retry</Button>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="p-4 text-center text-gray-500">
        No refinement result. Please try again.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="p-4 bg-blue-50 border-blue-200 space-y-3">
        <div>
          <h3 className="font-semibold text-gray-900 mb-2">Refined Template</h3>
          <div className="relative">
            <pre className="bg-white p-4 rounded border border-gray-200 text-sm whitespace-pre-wrap break-words max-h-64 overflow-y-auto font-mono">
              {result.refinedTemplate}
            </pre>
            <Button
              onClick={handleCopy}
              variant="outline"
              size="sm"
              className="absolute top-2 right-2"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4 mr-1 text-green-600" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-1" />
                  Copy
                </>
              )}
            </Button>
          </div>
        </div>
      </Card>

      <Card className="p-4 space-y-3">
        <div>
          <h3 className="font-semibold text-gray-900 mb-2">Refinement Rationale</h3>
          <p className="text-sm text-gray-700 leading-relaxed">{result.rationale}</p>
        </div>
      </Card>

      {result.suggestions.length > 0 && (
        <Card className="p-4 space-y-3">
          <h3 className="font-semibold text-gray-900">Suggestions</h3>
          <ul className="space-y-2">
            {result.suggestions.map((suggestion, index) => (
              <li key={index} className="flex gap-3 text-sm">
                <span className="text-blue-600 font-semibold">{index + 1}.</span>
                <span className="text-gray-700">{suggestion}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <div className="flex gap-2">
        <Button
          onClick={handleUse}
          className="bg-blue-600 hover:bg-blue-700"
        >
          Use This Template
        </Button>
      </div>
    </div>
  );
}
