'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { X, ThumbsUp, ThumbsDown, Copy, ChevronDown, ChevronUp } from 'lucide-react';
import { RawDataRecordDetail, BAPromptImprovement } from '@/types/index';

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
  const [deepEvalSuggestions, setDeepEvalSuggestions] = useState<string>('');
  const [deepEvalReasoning, setDeepEvalReasoning] = useState<string>('');

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
      
      // Prepare evaluation scores from record
      const evaluationScores = record.evaluationScores || [];
      
      if (evaluationScores.length === 0) {
        alert('No evaluation metrics available. Please ensure evaluation data is loaded.');
        setIsGeneratingRecommendations(false);
        return;
      }

      console.log('[v0] === GET LLM RECOMMENDATIONS ===');
      console.log('[v0] User Prompt:', record.userPrompt?.substring(0, 100));
      console.log('[v0] Context chunks:', record.contextRetrieved?.length || 0);
      console.log('[v0] Evaluation metrics:', evaluationScores.length);
      
      // Call new backend endpoint for recommendations
      const response = await fetch(`${apiUrl}/api/ba-review/get-recommendations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recordId: record._id,
          applicationId: record.applicationId,
          userPrompt: record.userPrompt,
          llmResponse: record.llmResponse,
          contextRetrieved: record.contextRetrieved?.map((ctx) => 
            typeof ctx === 'string' ? ctx : (ctx as any)?.content || JSON.stringify(ctx)
          ) || [],
          evaluationScores: evaluationScores,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json() as Record<string, unknown>;
        throw new Error((errorData?.error as string) || 'Failed to generate recommendations');
      }

      const data = await response.json() as unknown;
      
      // Type guard for API response
      if (!data || typeof data !== 'object') {
        throw new Error('Invalid response format from recommendations endpoint');
      }

      const apiResponse = data as Record<string, unknown>;
      const responseData = apiResponse.data as Record<string, unknown> | undefined;
      
      if (!responseData) {
        throw new Error('No recommendation data in response');
      }

      // Extract DeepEval analysis and LLM recommendations
      const deepevalAnalysis = responseData.deepevalAnalysis as Record<string, unknown> | undefined;
      const llmRecommendationsText = typeof responseData.llmRecommendations === 'string' 
        ? responseData.llmRecommendations 
        : '';

      console.log('[v0] Recommendations received:', {
        deepevalHealth: deepevalAnalysis?.overallHealth,
        hasLLMRecommendations: !!llmRecommendationsText,
      });

      // Set DeepEval findings and LLM recommendations
      setDeepEvalReasoning(deepevalAnalysis?.deepevalFindings as string || '');
      setDeepEvalSuggestions(llmRecommendationsText);
      
      // Format recommendations for display
      const recommendations = {
        reasoning: deepevalAnalysis?.deepevalFindings as string || 'Analysis completed',
        suggestions: [
          {
            issue: `System Health: ${(deepevalAnalysis?.overallHealth as string) || 'Unknown'}`,
            suggestion: llmRecommendationsText,
            expectedImprovement: 'Follow LLM recommendations to improve system metrics',
          },
        ],
      };

      setLlmRecommendations(recommendations);

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

  const handleSubmitImprovement = async (): Promise<void> => {
    if (!improvedPrompt.trim() || !improvementReason.trim()) {
      alert('Please fill in both improved prompt and reason');
      return;
    }

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';
      console.log('[v0] Saving improvement with sources - DeepEval:', !!deepEvalSuggestions, 'LLM:', !!llmRecommendations);

      const response = await fetch(`${apiUrl}/api/ba-review/add-improvement`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rawDataRecordId: record._id,
          improvedPrompt: improvedPrompt.trim(),
          reason: improvementReason.trim(),
          baEmail: 'ba@company.com',
          baName: 'Current User',
          estimatedScoreImpact: 0.05,
        }),
      });

      if (!response.ok) throw new Error('Failed to save');
      
      setImprovedPrompt('');
      setImprovementReason('');
      setDeepEvalSuggestions('');
      setDeepEvalReasoning('');
      setImprovementMode(false);
      alert('Improvement saved!');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to save improvement';
      console.error('[v0] Error:', message);
      alert(message);
    }
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

          {/* Evaluation Scores Section */}
          {record.evaluationScores && record.evaluationScores.length > 0 && (
            <div className="border border-gray-800 rounded overflow-hidden">
              <div className="bg-gray-900 px-4 py-3 font-mono text-sm">
                <span className="text-orange-400">EVALUATION_SCORES</span>
              </div>
              <div className="bg-gray-950 px-4 py-3 border-t border-gray-800 space-y-3">
                {/* Handle both new format (array of { metricName, value }) and old format (array of { framework, scores }) */}
                {record.evaluationScores.map((eval_score: any, idx: number) => {
                  // New format: { metricName, value, timestamp }
                  if (eval_score.metricName && typeof eval_score.value === 'number') {
                    return (
                      <div key={idx} className="bg-black p-3 rounded border border-gray-800">
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-xs text-orange-400">{eval_score.metricName}</span>
                          <span className="text-orange-300 font-mono font-bold">{eval_score.value.toFixed(2)}</span>
                        </div>
                      </div>
                    );
                  }
                  
                  // Old format: { framework, generatedAt, scores: {} }
                  if (eval_score.scores && typeof eval_score.scores === 'object') {
                    return (
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
                    );
                  }
                  
                  return null;
                })}
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

          {/* LLM Recommendations Section */}
          <div className="border border-gray-800 rounded overflow-hidden">
            <button
              onClick={() => toggleSection('recommendations')}
              className="w-full bg-gray-900 hover:bg-gray-800 px-4 py-3 flex items-center justify-between font-mono text-sm"
            >
              <span className="text-purple-400">LLM_&amp;_DEEPEVAL_RECOMMENDATIONS</span>
              {expandedSections['recommendations'] ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>
            {expandedSections['recommendations'] && (
              <div className="bg-gray-950 px-4 py-3 border-t border-gray-800 space-y-4">
                {llmRecommendations ? (
                  <>
                    {/* DeepEval Findings Section */}
                    {deepEvalReasoning && (
                      <div className="bg-black p-4 rounded border-l-4 border-l-cyan-500">
                        <div className="flex items-center mb-2">
                          <span className="text-xs font-mono text-cyan-400 uppercase font-bold">DeepEval Analysis</span>
                        </div>
                        <div className="text-xs text-gray-300 whitespace-pre-wrap break-words leading-relaxed">
                          {deepEvalReasoning}
                        </div>
                      </div>
                    )}

                    {/* LLM Recommendations Section */}
                    {deepEvalSuggestions && (
                      <div className="bg-black p-4 rounded border-l-4 border-l-purple-500">
                        <div className="flex items-center mb-2">
                          <span className="text-xs font-mono text-purple-400 uppercase font-bold">LLM Recommendations</span>
                        </div>
                        <div className="text-xs text-gray-300 whitespace-pre-wrap break-words leading-relaxed">
                          {deepEvalSuggestions}
                        </div>
                      </div>
                    )}

                    {/* Original Recommendations Format */}
                    {llmRecommendations.suggestions.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs font-mono text-purple-400 uppercase font-bold">Implementation Steps:</p>
                        {llmRecommendations.suggestions.map((sug, idx) => (
                          <div key={idx} className="bg-gray-900 p-3 rounded border border-gray-700">
                            <p className="text-xs text-amber-400 mb-1 font-mono">{sug.issue}</p>
                            <p className="text-xs text-gray-300 mb-2">{sug.suggestion}</p>
                            <p className="text-xs text-green-400">→ {sug.expectedImprovement}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-xs text-gray-400 mb-4">
                      Click to generate AI-powered analysis using DeepEval and LLM. This will provide insights on why metrics are low and recommendations for improvement.
                    </p>
                    <Button
                      onClick={handleGetRecommendations}
                      disabled={isGeneratingRecommendations}
                      className="bg-purple-900 hover:bg-purple-800 text-purple-100"
                    >
                      {isGeneratingRecommendations ? (
                        <>
                          <Spinner className="w-4 h-4 mr-2" />
                          Generating Recommendations...
                        </>
                      ) : (
                        'Generate Recommendations'
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

                {/* Unified Recommendations View - DeepEval + LLM Combined */}
                {(deepEvalSuggestions || llmRecommendations) && (
                  <div className="bg-gray-950 p-4 rounded border border-blue-800 mb-4">
                    <h3 className="text-sm font-mono text-blue-300 mb-3">COMBINED RECOMMENDATIONS</h3>
                    
                    {/* DeepEval Suggestions */}
                    {deepEvalSuggestions && (
                      <div className="mb-4">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs font-mono text-blue-400">DeepEval Suggestions:</span>
                          <span className="inline-block bg-blue-900 text-blue-200 text-xs px-2 py-1 rounded">DeepEval</span>
                        </div>
                        <div className="bg-black p-2 rounded border border-gray-700 text-xs text-gray-300 font-mono whitespace-pre-wrap">
                          {deepEvalSuggestions}
                        </div>
                      </div>
                    )}

                    {/* LLM Recommendations */}
                    {llmRecommendations?.suggestions && llmRecommendations.suggestions.length > 0 && (
                      <div className="mb-4">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs font-mono text-purple-400">LLM Recommendations:</span>
                          <span className="inline-block bg-purple-900 text-purple-200 text-xs px-2 py-1 rounded">LLM</span>
                        </div>
                        <div className="space-y-2">
                          {llmRecommendations.suggestions.map((sug, idx) => (
                            <div key={idx} className="bg-black p-2 rounded border border-gray-700">
                              <p className="text-xs text-gray-400 mb-1">• {sug.suggestion}</p>
                              {sug.expectedImprovement && (
                                <p className="text-xs text-cyan-400">Expected: {sug.expectedImprovement}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Combined Reasoning */}
                    {(deepEvalReasoning || llmRecommendations?.reasoning) && (
                      <div className="mt-3 pt-3 border-t border-gray-700">
                        <p className="text-xs text-gray-400 mb-2">Analysis Reasoning:</p>
                        {deepEvalReasoning && (
                          <p className="text-xs text-gray-300 mb-2">
                            <span className="text-blue-400">DeepEval:</span> {deepEvalReasoning}
                          </p>
                        )}
                        {llmRecommendations?.reasoning && (
                          <p className="text-xs text-gray-300">
                            <span className="text-purple-400">LLM:</span> {llmRecommendations.reasoning}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* No recommendations message */}
                {!deepEvalSuggestions && !llmRecommendations && (
                  <div className="text-xs text-gray-500 mb-4 p-3 rounded bg-gray-950 border border-gray-800">
                    Click "Evaluate Now" or "Get LLM Recommendations" to generate suggestions for improvement
                  </div>
                )}

                {/* Add Improvement Button */}
                {!improvementMode && (
                  <Button
                    onClick={() => {
                      let combined = '';
                      if (deepEvalSuggestions) {
                        combined += 'DeepEval: ' + deepEvalSuggestions + '\n\n';
                      }
                      if (llmRecommendations?.suggestions.length) {
                        combined += 'LLM: ' + llmRecommendations.suggestions.map(s => s.suggestion).join(' | ');
                      }
                      setImprovedPrompt(combined || 'Enter improved prompt...');
                      const reason = (deepEvalReasoning && llmRecommendations?.reasoning) 
                        ? `DeepEval: ${deepEvalReasoning}\nLLM: ${llmRecommendations.reasoning}`
                        : deepEvalReasoning || llmRecommendations?.reasoning || '';
                      setImprovementReason(reason || 'Enter reason...');
                      setImprovementMode(true);
                    }}
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
                        rows={8}
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
                        rows={5}
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
