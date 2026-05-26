'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { X, ThumbsUp, ThumbsDown, Copy, ChevronDown, ChevronUp } from 'lucide-react';
import { RawDataRecordDetail, BAPromptImprovement } from '@/types/index';
import { EvaluationPanel } from './evaluation-panel';

interface RawDataDetailModalProps {
  record: RawDataRecordDetail;
  isOpen: boolean;
  onClose: () => void;
  onAddImprovement?: (improvement: BAPromptImprovement) => void;
}

export function RawDataDetailModal({
  record,
  isOpen,
  onClose,
  onAddImprovement,
}: RawDataDetailModalProps) {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    userPrompt: true,
    context: true,
    response: true,
    metrics: true,
    userFeedback: true,
    baReview: true,
    recommendations: true,  // Changed: Show recommendations section by default
  });
  const [improvementMode, setImprovementMode] = useState(false);
  const [improvedPrompt, setImprovedPrompt] = useState('');
  const [improvementReason, setImprovementReason] = useState('');
  const [isGeneratingRecommendations, setIsGeneratingRecommendations] = useState(false);
  const [llmRecommendations, setLlmRecommendations] = useState<{
    reasoning: string;
    suggestions: Array<{
      issue: string;
      suggestion: string;
      expectedImprovement: string;
    }>;
  } | null>(null);

  if (!isOpen) return null;

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const handleGetRecommendations = async (): Promise<void> => {
    setIsGeneratingRecommendations(true);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';
      const contextContent = record.contextRetrieved?.map((ctx) => ctx.content) ?? [];
      
      const response = await fetch(`${apiUrl}/api/evaluation/end-to-end`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceDocuments: contextContent,
          userPrompt: record.userPrompt,
          llmResponse: record.llmResponse,
          recordId: record._id,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get recommendations');
      }

      const data = await response.json() as {
        result?: {
          analysis?: { reasoning?: string };
          improvedPrompt?: { suggestions?: Array<{ issue?: string; suggestion?: string; expectedImprovement?: string }> };
        };
      };

      setLlmRecommendations({
        reasoning: data.result?.analysis?.reasoning ?? 'Analysis completed',
        suggestions: (data.result?.improvedPrompt?.suggestions ?? []).map((suggestion: { issue?: string; suggestion?: string; expectedImprovement?: string }) => ({
          issue: suggestion.issue ?? 'N/A',
          suggestion: suggestion.suggestion ?? 'N/A',
          expectedImprovement: suggestion.expectedImprovement ?? 'N/A',
        })),
      });

      setExpandedSections((prev: Record<string, boolean>) => ({
        ...prev,
        recommendations: true,
      }));
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to generate recommendations';
      console.error('[v0] Recommendation error:', message);
      alert(message);
    } finally {
      setIsGeneratingRecommendations(false);
    }
  };

  const handleSubmitImprovement = (): void => {
    if (!improvedPrompt.trim() || !improvementReason.trim()) {
      alert('Please fill in both improved prompt and reason');
      return;
    }

    const improvement: BAPromptImprovement = {
      originalPrompt: record.userPrompt,
      improvedPrompt: improvedPrompt.trim(),
      reason: improvementReason.trim(),
      baName: 'Current User', // Would be replaced with actual BA name
      baEmail: 'ba@company.com', // Would be replaced with actual BA email
      estimatedScoreImpact: 0.05,
      createdAt: new Date().toISOString(),
    };

    onAddImprovement?.(improvement);
    setImprovedPrompt('');
    setImprovementReason('');
    setImprovementMode(false);
  };

  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Invalid date';
      return date.toLocaleString();
    } catch {
      return 'Invalid date';
    }
  };

  const formatTime = (ms: number | undefined): string => {
    if (ms === undefined || ms === null) return 'N/A';
    const numMs = Number(ms);
    if (numMs < 1000) return `${numMs.toFixed(0)}ms`;
    return `${(numMs / 1000).toFixed(2)}s`;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-gray-950 border border-gray-800 rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gray-950 border-b border-gray-800 px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-mono text-green-400">RAW DATA RECORD</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-800 rounded transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Record Meta */}
          <div className="bg-gray-900 border border-gray-800 p-4 rounded font-mono text-sm">
            <div className="text-gray-500">
              <span className="text-green-400">record_id</span>
              <span className="text-gray-600">: </span>
              <span className="text-blue-300">{record._id}</span>
            </div>
            <div className="text-gray-500 mt-2">
              <span className="text-green-400">timestamp</span>
              <span className="text-gray-600">: </span>
              <span className="text-blue-300">{formatDate(record.createdAt)}</span>
            </div>
          </div>

          {/* User Prompt Section */}
          <div className="border border-gray-800 rounded overflow-hidden">
            <button
              onClick={() => toggleSection('userPrompt')}
              className="w-full bg-gray-900 hover:bg-gray-800 px-4 py-3 flex items-center justify-between font-mono text-sm"
            >
              <span className="text-green-400">USER_PROMPT</span>
              {expandedSections['userPrompt'] ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>
            {expandedSections['userPrompt'] && (
              <div className="bg-gray-950 px-4 py-3 border-t border-gray-800 space-y-3">
                <div className="bg-black p-4 rounded font-mono text-sm text-green-400 whitespace-pre-wrap break-words max-h-96 overflow-y-auto">
                  {record.userPrompt}
                </div>
                <div className="text-xs text-gray-500 flex items-center gap-4">
                  <span>
                    Entered: <span className="text-blue-300">{formatDate(record.userPromptEnteredAt)}</span>
                  </span>
                  <span>
                    Length: <span className="text-blue-300">{record.userPrompt?.length || 0} characters</span>
                  </span>
                  <button className="text-gray-400 hover:text-green-400 flex items-center gap-1">
                    <Copy className="w-3 h-3" /> Copy
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Context Retrieved Section */}
          {record.contextRetrieved && record.contextRetrieved.length > 0 && (
            <div className="border border-gray-800 rounded overflow-hidden">
              <button
                onClick={() => toggleSection('context')}
                className="w-full bg-gray-900 hover:bg-gray-800 px-4 py-3 flex items-center justify-between font-mono text-sm"
              >
                <span className="text-purple-400">CONTEXT_RETRIEVED</span>
                <span className="text-gray-500 text-xs mr-2">[{record.contextRetrieved.length} items]</span>
                {expandedSections['context'] ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </button>
              {expandedSections['context'] && (
                <div className="bg-gray-950 px-4 py-3 border-t border-gray-800 space-y-3">
                  {record.contextRetrieved && record.contextRetrieved.length > 0 ? (
                    record.contextRetrieved.map((ctx, idx) => (
                      <div key={idx} className="bg-black p-4 rounded border border-gray-800">
                        <div className="flex items-center justify-between mb-3">
                          <span className="font-mono text-xs text-blue-400">{ctx.source}</span>
                          <Badge
                            className={`text-xs ${
                              ctx.relevanceScore > 0.8
                                ? 'bg-green-900 text-green-200'
                                : ctx.relevanceScore > 0.6
                                  ? 'bg-yellow-900 text-yellow-200'
                                  : 'bg-red-900 text-red-200'
                            }`}
                          >
                            {(ctx.relevanceScore * 100).toFixed(0)}% relevance
                          </Badge>
                        </div>
                        <p className="font-mono text-xs text-gray-300 whitespace-pre-wrap break-words max-h-64 overflow-y-auto">
                          {ctx.content}
                        </p>
                        <div className="mt-2 text-xs text-gray-500">
                          Length: {ctx.content.length} characters
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500 text-sm">No context retrieved</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* LLM Response Section */}
          <div className="border border-gray-800 rounded overflow-hidden">
            <button
              onClick={() => toggleSection('response')}
              className="w-full bg-gray-900 hover:bg-gray-800 px-4 py-3 flex items-center justify-between font-mono text-sm"
            >
              <span className="text-yellow-400">LLM_RESPONSE</span>
              {expandedSections['response'] ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>
            {expandedSections['response'] && (
              <div className="bg-gray-950 px-4 py-3 border-t border-gray-800 space-y-3">
                <div className="bg-black p-4 rounded font-mono text-sm text-yellow-300 whitespace-pre-wrap break-words max-h-96 overflow-y-auto">
                  {record.llmResponse}
                </div>
                <div className="text-xs text-gray-500 flex items-center gap-4">
                  <span>
                    Generated: <span className="text-blue-300">{formatDate(record.llmResponseGeneratedAt)}</span>
                  </span>
                  <span>
                    Length: <span className="text-blue-300">{record.llmResponse?.length || 0} characters</span>
                  </span>
                  <button className="text-gray-400 hover:text-yellow-400 flex items-center gap-1">
                    <Copy className="w-3 h-3" /> Copy
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Latency & Performance Metrics */}
          <div className="border border-gray-800 rounded overflow-hidden">
            <button
              onClick={() => toggleSection('metrics')}
              className="w-full bg-gray-900 hover:bg-gray-800 px-4 py-3 flex items-center justify-between font-mono text-sm"
            >
              <span className="text-cyan-400">PERFORMANCE_METRICS</span>
              {expandedSections['metrics'] ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>
            {expandedSections['metrics'] && (
              <div className="bg-gray-950 px-4 py-3 border-t border-gray-800">
                <div className="grid grid-cols-2 gap-4 font-mono text-sm">
                  <div className="bg-black p-3 rounded border border-gray-800">
                    <div className="text-gray-500 text-xs">Context Retrieval Time</div>
                    <div className="text-cyan-300 font-bold mt-1">
                      {formatTime(record.contextRetrievalTime)}
                    </div>
                  </div>
                  <div className="bg-black p-3 rounded border border-gray-800">
                    <div className="text-gray-500 text-xs">LLM Generation Time</div>
                    <div className="text-cyan-300 font-bold mt-1">
                      {formatTime(record.llmGenerationTime)}
                    </div>
                  </div>
                  <div className="bg-black p-3 rounded border border-gray-800">
                    <div className="text-gray-500 text-xs">Total Latency</div>
                    <div className="text-cyan-300 font-bold mt-1">
                      {formatTime(record.totalLatency)}
                    </div>
                  </div>
                  <div className="bg-black p-3 rounded border border-gray-800">
                    <div className="text-gray-500 text-xs">Tokens Used</div>
                    <div className="text-cyan-300 font-bold mt-1">
                      {record.tokensUsed || 'N/A'}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Framework Evaluation Scores */}
          {record.evaluationScores && record.evaluationScores.length > 0 && (
            <div className="border border-gray-800 rounded overflow-hidden">
              <div className="bg-gray-900 px-4 py-3 font-mono text-sm">
                <span className="text-orange-400">EVALUATION_SCORES</span>
              </div>
              <div className="bg-gray-950 px-4 py-3 border-t border-gray-800 space-y-3">
                {record.evaluationScores.map((eval_score, idx) => (
                  <div key={idx} className="bg-black p-3 rounded border border-gray-800">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-mono text-xs text-orange-400">{eval_score.framework}</span>
                      <span className="text-gray-500 text-xs">{formatDate(eval_score.generatedAt)}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {Object.entries(eval_score.scores).map(([key, value]: [string, unknown]) => (
                        <div key={key} className="text-xs">
                          <span className="text-gray-400">{key}: </span>
                          <span className="text-orange-300 font-mono">
                            {typeof value === 'number' ? value.toFixed(3) : String(value)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* User Feedback */}
          {record.userFeedback && (
            <div className="border border-gray-800 rounded overflow-hidden">
              <button
                onClick={() => toggleSection('userFeedback')}
                className="w-full bg-gray-900 hover:bg-gray-800 px-4 py-3 flex items-center justify-between font-mono text-sm"
              >
                <span className="text-pink-400">USER_FEEDBACK</span>
                {expandedSections['userFeedback'] ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </button>
              {expandedSections['userFeedback'] && (
                <div className="bg-gray-950 px-4 py-3 border-t border-gray-800">
                  <div className="bg-black p-3 rounded border border-gray-800">
                    <div className="flex items-center gap-3 mb-2">
                      {record.userFeedback.sentiment === 'positive' ? (
                        <ThumbsUp className="w-4 h-4 text-green-400" />
                      ) : (
                        <ThumbsDown className="w-4 h-4 text-red-400" />
                      )}
                      <span className="font-mono text-xs text-pink-300">
                        {record.userFeedback.sentiment.toUpperCase()}
                      </span>
                      <span className="text-gray-500 text-xs">
                        {formatDate(record.userFeedback.feedbackAt || '')}
                      </span>
                    </div>
                    {record.userFeedback.comment && (
                      <p className="font-mono text-xs text-gray-300 mt-2">
                        "{record.userFeedback.comment}"
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Evaluation Panel */}
          <EvaluationPanel 
            record={record}
            onEvaluationComplete={(scores) => {
              console.log('[v0] Evaluation completed with scores:', scores);
              // Scores are automatically saved to the record
            }}
          />

          {/* LLM Recommendations Section */}
          <div className="border border-gray-800 rounded overflow-hidden">
            <button
              onClick={() => toggleSection('recommendations')}
              className="w-full bg-gray-900 hover:bg-gray-800 px-4 py-3 flex items-center justify-between font-mono text-sm"
            >
              <span className="text-purple-400">LLM_RECOMMENDATIONS</span>
              {expandedSections['recommendations'] ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>
            {expandedSections['recommendations'] && (
              <div className="bg-gray-950 px-4 py-3 border-t border-gray-800 space-y-3">
                {llmRecommendations ? (
                  <>
                    <div className="bg-black p-4 rounded border border-purple-800">
                      <p className="text-xs font-mono text-purple-400 mb-2">Analysis Reasoning:</p>
                      <p className="text-xs text-gray-300 whitespace-pre-wrap break-words">
                        {llmRecommendations.reasoning}
                      </p>
                    </div>

                    {llmRecommendations.suggestions.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs font-mono text-purple-400">Suggestions:</p>
                        {llmRecommendations.suggestions.map((sug, idx) => (
                          <div key={idx} className="bg-black p-3 rounded border border-gray-800">
                            <p className="text-xs text-gray-400 mb-1">Issue: {sug.issue}</p>
                            <p className="text-xs text-gray-300 mb-2">Suggestion: {sug.suggestion}</p>
                            <p className="text-xs text-green-400">
                              Expected Improvement: {sug.expectedImprovement}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-6">
                    <Button
                      onClick={handleGetRecommendations}
                      disabled={isGeneratingRecommendations}
                      className="bg-purple-900 hover:bg-purple-800 text-purple-100"
                    >
                      {isGeneratingRecommendations ? (
                        <>
                          <Spinner className="w-4 h-4 mr-2" />
                          Analyzing...
                        </>
                      ) : (
                        'Get LLM Recommendations'
                      )}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="border border-gray-800 rounded overflow-hidden">
            <button
              onClick={() => toggleSection('baReview')}
              className="w-full bg-gray-900 hover:bg-gray-800 px-4 py-3 flex items-center justify-between font-mono text-sm"
            >
              <span className="text-green-400">BA_REVIEW</span>
              {expandedSections['baReview'] ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>
            {expandedSections['baReview'] && (
              <div className="bg-gray-950 px-4 py-3 border-t border-gray-800 space-y-3">
                {record.baReview?.promptImprovements && record.baReview.promptImprovements.length > 0 ? (
                  <>
                    <div className="text-xs text-green-400 font-mono mb-3">
                      {record.baReview.promptImprovements.length} improvement(s) found
                    </div>
                    {record.baReview.promptImprovements.map((imp, idx) => (
                      <div key={idx} className="bg-black p-3 rounded border border-gray-800">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs text-gray-400">v{idx + 1}</span>
                          <span className="text-xs text-gray-500">{formatDate(imp.createdAt)}</span>
                        </div>
                        <div className="mb-2">
                          <span className="text-xs text-gray-500">By: </span>
                          <span className="text-xs text-blue-300">{imp.baName}</span>
                        </div>
                        <div className="mb-2">
                          <span className="text-xs text-gray-400">Reason: </span>
                          <span className="text-xs text-gray-300">{imp.reason}</span>
                        </div>
                        <div className="bg-gray-900 p-2 rounded text-xs text-green-300 font-mono">
                          {imp.improvedPrompt}
                        </div>
                        {imp.estimatedScoreImpact && (
                          <div className="mt-2 text-xs text-cyan-400">
                            Est. Score Impact: +{imp.estimatedScoreImpact.toFixed(3)}
                          </div>
                        )}
                      </div>
                    ))}
                  </>
                ) : (
                  <div className="text-xs text-gray-500">No improvements yet</div>
                )}

                {/* Add Improvement Button */}
                {!improvementMode && (
                  <Button
                    onClick={() => setImprovementMode(true)}
                    className="w-full mt-4 bg-green-900 hover:bg-green-800 text-green-100"
                  >
                    + Add Improvement
                  </Button>
                )}

                {/* Improvement Form */}
                {improvementMode && (
                  <div className="bg-black p-3 rounded border border-green-800 space-y-3 mt-4">
                    <div>
                      <label className="text-xs text-green-400 font-mono block mb-1">
                        Improved Prompt
                      </label>
                      <textarea
                        value={improvedPrompt}
                        onChange={(e) => setImprovedPrompt(e.target.value)}
                        className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-xs text-gray-200 font-mono"
                        rows={3}
                        placeholder="Enter improved version of the prompt..."
                      />
                    </div>
                    <div>
                      <label className="text-xs text-green-400 font-mono block mb-1">
                        Reason for Improvement
                      </label>
                      <textarea
                        value={improvementReason}
                        onChange={(e) => setImprovementReason(e.target.value)}
                        className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-xs text-gray-200 font-mono"
                        rows={2}
                        placeholder="Why is this improvement better?"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={handleSubmitImprovement}
                        className="flex-1 bg-green-900 hover:bg-green-800 text-green-100 text-xs"
                      >
                        Save Improvement
                      </Button>
                      <Button
                        onClick={() => setImprovementMode(false)}
                        variant="outline"
                        className="flex-1 text-xs"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
