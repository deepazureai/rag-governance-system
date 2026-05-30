'use client';

import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, Loader, Copy, RefreshCw } from 'lucide-react';

interface SynthesisConfigProps {
  selectedRecommendationIds: string[];
  selectedKBPromptIds: string[];
  selectedFrameworks: string[];
  templateName: string;
  onSynthesisComplete: (template: { crewaiTemplate: string; metadata: Record<string, unknown> }) => void;
  isLoading?: boolean;
}

export function SynthesisConfig({
  selectedRecommendationIds,
  selectedKBPromptIds,
  selectedFrameworks,
  templateName,
  onSynthesisComplete,
  isLoading: externalLoading = false,
}: SynthesisConfigProps): React.ReactElement {
  const [synthesizedTemplate, setSynthesizedTemplate] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleSynthesize = async (): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);
      setSynthesizedTemplate(null);

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';

      const response = await fetch(`${apiUrl}/api/prompt-templates/synthesize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateName,
          recommendationIds: selectedRecommendationIds,
          kbPromptIds: selectedKBPromptIds,
          frameworks: selectedFrameworks,
        }),
      });

      if (!response.ok) {
        throw new Error(`Synthesis failed: ${response.statusText}`);
      }

      const data = (await response.json()) as unknown;
      if (typeof data === 'object' && data !== null && 'success' in data && 'data' in data) {
        const typedData = data as {
          success: boolean;
          data: { crewaiTemplate: string; metadata: Record<string, unknown> };
        };
        setSynthesizedTemplate(typedData.data.crewaiTemplate);
        onSynthesisComplete(typedData.data);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Synthesis failed';
      console.error('[v0] Synthesis error:', message);
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = (): void => {
    if (synthesizedTemplate) {
      navigator.clipboard.writeText(synthesizedTemplate).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
  };

  const totalSelected = selectedRecommendationIds.length + selectedKBPromptIds.length;
  const canSynthesize = totalSelected > 0 && selectedFrameworks.length > 0;

  return (
    <div className="space-y-6">
      {/* Summary */}
      <Card className="p-4 bg-blue-50 border-blue-200">
        <h3 className="font-semibold text-gray-900 mb-3">Synthesis Summary</h3>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-gray-600">Recommendations Selected</p>
            <p className="text-lg font-bold text-blue-600">{selectedRecommendationIds.length}</p>
          </div>
          <div>
            <p className="text-gray-600">KB Prompts Selected</p>
            <p className="text-lg font-bold text-green-600">{selectedKBPromptIds.length}</p>
          </div>
          <div>
            <p className="text-gray-600">Evaluation Frameworks</p>
            <p className="text-lg font-bold text-purple-600">{selectedFrameworks.length}</p>
          </div>
        </div>
      </Card>

      {/* Synthesis Configuration */}
      <div className="space-y-3">
        <h3 className="font-semibold text-gray-900">LLM Synthesis Settings</h3>
        <Card className="p-4 border-gray-200 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Synthesis Strategy
            </label>
            <select className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option>Combine all sources with equal weight</option>
              <option>Prioritize recommendations over KB prompts</option>
              <option>Prioritize KB prompts over recommendations</option>
              <option>Merge with framework-specific focus</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Template Format
            </label>
            <select className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option>CrewAI Task Definition</option>
              <option>Prompt Engineering Template</option>
              <option>RAG Pipeline Configuration</option>
              <option>LangChain Template</option>
            </select>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" className="w-4 h-4 rounded" defaultChecked />
            <span className="text-gray-700">Include quality guidelines in output</span>
          </label>

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" className="w-4 h-4 rounded" defaultChecked />
            <span className="text-gray-700">Include evaluation criteria from selected frameworks</span>
          </label>
        </Card>
      </div>

      {/* Error Message */}
      {error && (
        <Card className="p-4 border-red-200 bg-red-50">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-red-900">Synthesis Error</h4>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        </Card>
      )}

      {/* Synthesize Button */}
      <Button
        onClick={handleSynthesize}
        disabled={!canSynthesize || isLoading || externalLoading}
        className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-3 flex items-center justify-center gap-2"
      >
        {isLoading || externalLoading ? (
          <>
            <Loader className="w-4 h-4 animate-spin" />
            Generating CrewAI Template...
          </>
        ) : (
          <>
            <RefreshCw className="w-4 h-4" />
            Generate CrewAI Template
          </>
        )}
      </Button>

      {!canSynthesize && (
        <p className="text-xs text-gray-600 text-center">
          Select at least one recommendation or KB prompt and choose evaluation frameworks to synthesize
        </p>
      )}

      {/* Template Preview */}
      {synthesizedTemplate && (
        <Card className="p-4 bg-gray-50 border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900">Generated CrewAI Template</h3>
            <Button
              onClick={handleCopy}
              size="sm"
              variant="outline"
              className="flex items-center gap-2"
            >
              <Copy className="w-4 h-4" />
              {copied ? 'Copied!' : 'Copy'}
            </Button>
          </div>
          <pre className="bg-gray-900 text-gray-100 p-4 rounded overflow-x-auto text-xs max-h-64 overflow-y-auto font-mono">
            {synthesizedTemplate}
          </pre>
        </Card>
      )}

      {synthesizedTemplate && (
        <p className="text-xs text-gray-600 text-center">
          Review the generated template above. Click Previous to modify selections or click Next to finalize and set distribution.
        </p>
      )}
    </div>
  );
}
