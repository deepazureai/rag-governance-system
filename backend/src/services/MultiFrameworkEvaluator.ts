/**
 * Multi-Framework Evaluator Service
 * Integrates RAGAS, BLEU/ROUGE, and LlamaIndex metrics
 * Maps framework-specific metrics to standardized dashboard metrics
 */

import { logger } from '../utils/logger.js';

export interface EvaluationMetrics {
  // Primary metrics from frameworks
  faithfulness: number;
  answerRelevancy: number;
  contextRelevancy: number;
  contextPrecision: number;
  contextRecall: number;
  correctness: number;
  
  // BLEU/ROUGE metrics
  bleuScore: number;
  rougeL: number;
  
  // LlamaIndex metrics
  llamaCorrectness: number;
  llamaRelevancy: number;
  llamaFaithfulness: number;
  
  // Computed/mapped metrics
  groundedness: number;        // Maps from faithfulness/correctness
  coherence: number;           // Maps from correctness/llamaCorrectness
  relevance: number;           // Maps from contextRelevancy/answerRelevancy
  
  // Composite score
  overallScore: number;
}

export interface FrameworkResult {
  framework: 'ragas' | 'bleu_rouge' | 'llamaindex';
  metrics: Partial<EvaluationMetrics>;
  timestamp: number;
  executionTime: number;
  error?: string;
}

export class MultiFrameworkEvaluator {
  /**
   * Evaluate a query-response pair using all frameworks
   */
  static async evaluateMultiFramework(
    query: string,
    response: string,
    retrievedDocuments: Array<{ content: string; source: string; relevance?: number }>
  ): Promise<{ frameworkResults: FrameworkResult[]; mappedMetrics: EvaluationMetrics }> {
    const frameworkResults: FrameworkResult[] = [];
    
    logger.info('[MultiFrameworkEvaluator] Starting multi-framework evaluation');
    
    try {
      // Run all frameworks in parallel
      const [ragasResult, bleuRougeResult, llamaResult] = await Promise.allSettled([
        this.evaluateRAGAS(query, response, retrievedDocuments),
        this.evaluateBLEUROUGE(query, response, retrievedDocuments),
        this.evaluateLlamaIndex(query, response, retrievedDocuments),
      ]);
      
      if (ragasResult.status === 'fulfilled') {
        frameworkResults.push(ragasResult.value);
      } else {
        logger.warn('[MultiFrameworkEvaluator] RAGAS evaluation failed:', ragasResult.reason);
      }
      
      if (bleuRougeResult.status === 'fulfilled') {
        frameworkResults.push(bleuRougeResult.value);
      } else {
        logger.warn('[MultiFrameworkEvaluator] BLEU/ROUGE evaluation failed:', bleuRougeResult.reason);
      }
      
      if (llamaResult.status === 'fulfilled') {
        frameworkResults.push(llamaResult.value);
      } else {
        logger.warn('[MultiFrameworkEvaluator] LlamaIndex evaluation failed:', llamaResult.reason);
      }
      
      // Merge and map metrics from all frameworks
      const mappedMetrics = this.mergeAndMapMetrics(frameworkResults);
      
      logger.info('[MultiFrameworkEvaluator] Evaluation complete. Frameworks used:', 
        frameworkResults.map(r => r.framework));
      
      return { frameworkResults, mappedMetrics };
    } catch (error) {
      logger.error('[MultiFrameworkEvaluator] Multi-framework evaluation failed:', error);
      throw error;
    }
  }
  
  /**
   * RAGAS Framework Evaluation
   */
  private static async evaluateRAGAS(
    query: string,
    response: string,
    retrievedDocuments: Array<{ content: string; source: string; relevance?: number }>
  ): Promise<FrameworkResult> {
    const startTime = Date.now();
    
    try {
      logger.info('[RAGAS] Starting evaluation');
      
      // Simulate RAGAS evaluation (in production, call actual RAGAS API)
      // For now, use deterministic calculation based on content
      const metrics = {
        faithfulness: this.calculateFaithfulness(response, retrievedDocuments),
        answerRelevancy: this.calculateAnswerRelevancy(query, response),
        contextRelevancy: this.calculateContextRelevancy(query, retrievedDocuments),
        contextPrecision: this.calculateContextPrecision(response, retrievedDocuments),
        contextRecall: this.calculateContextRecall(retrievedDocuments),
        correctness: this.calculateCorrectness(response, retrievedDocuments),
      };
      
      const executionTime = Date.now() - startTime;
      
      logger.info('[RAGAS] Evaluation complete:', { 
        executionTime,
        faithfulness: metrics.faithfulness?.toFixed(2),
        answerRelevancy: metrics.answerRelevancy?.toFixed(2),
      });
      
      return {
        framework: 'ragas',
        metrics,
        timestamp: Date.now(),
        executionTime,
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      logger.error('[RAGAS] Evaluation failed:', error);
      return {
        framework: 'ragas',
        metrics: {},
        timestamp: Date.now(),
        executionTime,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
  
  /**
   * BLEU/ROUGE Framework Evaluation
   */
  private static async evaluateBLEUROUGE(
    query: string,
    response: string,
    retrievedDocuments: Array<{ content: string; source: string; relevance?: number }>
  ): Promise<FrameworkResult> {
    const startTime = Date.now();
    
    try {
      logger.info('[BLEU_ROUGE] Starting evaluation');
      
      // Simulate BLEU/ROUGE calculation
      const referenceText = retrievedDocuments.map(d => d.content).join(' ');
      const metrics = {
        bleuScore: this.calculateBLEU(response, referenceText),
        rougeL: this.calculateROUGE(response, referenceText),
      };
      
      const executionTime = Date.now() - startTime;
      
      logger.info('[BLEU_ROUGE] Evaluation complete:', {
        executionTime,
        bleuScore: metrics.bleuScore?.toFixed(2),
        rougeL: metrics.rougeL?.toFixed(2),
      });
      
      return {
        framework: 'bleu_rouge',
        metrics,
        timestamp: Date.now(),
        executionTime,
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      logger.error('[BLEU_ROUGE] Evaluation failed:', error);
      return {
        framework: 'bleu_rouge',
        metrics: {},
        timestamp: Date.now(),
        executionTime,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
  
  /**
   * LlamaIndex Framework Evaluation
   */
  private static async evaluateLlamaIndex(
    query: string,
    response: string,
    retrievedDocuments: Array<{ content: string; source: string; relevance?: number }>
  ): Promise<FrameworkResult> {
    const startTime = Date.now();
    
    try {
      logger.info('[LLAMAINDEX] Starting evaluation');
      
      // Simulate LlamaIndex evaluation
      const metrics = {
        llamaCorrectness: this.calculateLlamaCorrectness(response, retrievedDocuments),
        llamaRelevancy: this.calculateLlamaRelevancy(query, response),
        llamaFaithfulness: this.calculateLlamaFaithfulness(response, retrievedDocuments),
      };
      
      const executionTime = Date.now() - startTime;
      
      logger.info('[LLAMAINDEX] Evaluation complete:', {
        executionTime,
        llamaCorrectness: metrics.llamaCorrectness?.toFixed(2),
        llamaRelevancy: metrics.llamaRelevancy?.toFixed(2),
      });
      
      return {
        framework: 'llamaindex',
        metrics,
        timestamp: Date.now(),
        executionTime,
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      logger.error('[LLAMAINDEX] Evaluation failed:', error);
      return {
        framework: 'llamaindex',
        metrics: {},
        timestamp: Date.now(),
        executionTime,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
  
  /**
   * Merge framework results and map to dashboard metrics
   */
  private static mergeAndMapMetrics(frameworkResults: FrameworkResult[]): EvaluationMetrics {
    // Collect all metrics
    const allMetrics: Partial<EvaluationMetrics> = {};
    
    for (const result of frameworkResults) {
      Object.assign(allMetrics, result.metrics);
    }
    
    // Map to dashboard metrics with fallbacks
    const mapped: EvaluationMetrics = {
      // Core metrics - use direct values
      faithfulness: allMetrics.faithfulness ?? 0,
      answerRelevancy: allMetrics.answerRelevancy ?? 0,
      contextRelevancy: allMetrics.contextRelevancy ?? 0,
      contextPrecision: allMetrics.contextPrecision ?? 0,
      contextRecall: allMetrics.contextRecall ?? 0,
      correctness: allMetrics.correctness ?? 0,
      bleuScore: allMetrics.bleuScore ?? 0,
      rougeL: allMetrics.rougeL ?? 0,
      llamaCorrectness: allMetrics.llamaCorrectness ?? 0,
      llamaRelevancy: allMetrics.llamaRelevancy ?? 0,
      llamaFaithfulness: allMetrics.llamaFaithfulness ?? 0,
      
      // Mapped dashboard metrics with proper fallbacks
      groundedness: allMetrics.faithfulness ?? allMetrics.correctness ?? allMetrics.llamaFaithfulness ?? 0,
      coherence: allMetrics.correctness ?? allMetrics.llamaCorrectness ?? (allMetrics.rougeL ?? 0) ?? 0,
      relevance: allMetrics.contextRelevancy ?? allMetrics.answerRelevancy ?? allMetrics.llamaRelevancy ?? 0,
      
      // Overall score - average of available primary metrics
      overallScore: this.calculateOverallScore(allMetrics),
    };
    
    logger.info('[MultiFrameworkEvaluator] Metrics mapped:', {
      groundedness: mapped.groundedness.toFixed(2),
      coherence: mapped.coherence.toFixed(2),
      relevance: mapped.relevance.toFixed(2),
      overallScore: mapped.overallScore.toFixed(2),
    });
    
    return mapped;
  }
  
  /**
   * Calculate overall composite score
   */
  private static calculateOverallScore(metrics: Partial<EvaluationMetrics>): number {
    const scores = [
      metrics.faithfulness,
      metrics.answerRelevancy,
      metrics.contextRelevancy,
      metrics.contextPrecision,
      metrics.contextRecall,
      metrics.correctness,
    ].filter(s => s !== undefined && s !== null) as number[];
    
    if (scores.length === 0) return 0;
    return scores.reduce((a, b) => a + b, 0) / scores.length;
  }
  
  // ============ Metric Calculation Methods ============
  
  private static calculateFaithfulness(
    response: string,
    docs: Array<{ content: string; source: string; relevance?: number }>
  ): number {
    if (!response || docs.length === 0) return 0;
    
    const docContent = docs.map(d => d.content).join(' ');
    const responseWords = response.toLowerCase().split(/\s+/);
    const docWords = new Set(docContent.toLowerCase().split(/\s+/));
    
    const matchedWords = responseWords.filter(w => docWords.has(w)).length;
    return Math.min(100, (matchedWords / responseWords.length) * 100);
  }
  
  private static calculateAnswerRelevancy(query: string, response: string): number {
    if (!query || !response) return 0;
    
    const queryWords = query.toLowerCase().split(/\s+/);
    const responseWords = response.toLowerCase().split(/\s+/);
    
    // Count exact word matches
    const querySet = new Set(queryWords);
    const exactMatches = responseWords.filter(w => querySet.has(w)).length;
    
    // Also count words with more than 4 characters (likely meaningful)
    const meaningfulWords = responseWords.filter(w => w.length > 4 && querySet.has(w)).length;
    
    // Calculate semantic relevance: combine exact matches and meaningful words
    const exactScore = (exactMatches / responseWords.length);
    const meaningfulScore = (meaningfulWords / Math.min(queryWords.filter(w => w.length > 4).length, responseWords.filter(w => w.length > 4).length || 1));
    
    return Math.min(100, ((exactScore * 0.6 + meaningfulScore * 0.4) * 100));
  }
  
  private static calculateContextRelevancy(
    query: string,
    docs: Array<{ content: string; source: string; relevance?: number }>
  ): number {
    if (!query || docs.length === 0) return 0;
    
    const queryWords = new Set(query.toLowerCase().split(/\s+/));
    let relevantDocCount = 0;
    
    for (const doc of docs) {
      const docWords = new Set(doc.content.toLowerCase().split(/\s+/));
      const overlap = Array.from(queryWords).filter(w => docWords.has(w)).length;
      if (overlap > queryWords.size / 2) {
        relevantDocCount++;
      }
    }
    
    return Math.min(100, (relevantDocCount / docs.length) * 100);
  }
  
  private static calculateContextPrecision(
    response: string,
    docs: Array<{ content: string; source: string; relevance?: number }>
  ): number {
    if (!response || docs.length === 0) return 0;
    
    let precisionCount = 0;
    for (const doc of docs) {
      if (response.toLowerCase().includes(doc.content.toLowerCase().substring(0, 50))) {
        precisionCount++;
      }
    }
    
    return Math.min(100, (precisionCount / docs.length) * 100);
  }
  
  private static calculateContextRecall(
    docs: Array<{ content: string; source: string; relevance?: number }>
  ): number {
    if (docs.length === 0) return 0;
    
    // Recall score based on document count and their relevance scores
    // Assume 5 documents with high relevance = 100%
    const relevanceSum = docs.reduce((sum, doc) => sum + (doc.relevance ?? 50), 0);
    const avgRelevance = relevanceSum / docs.length;
    const docCountScore = Math.min(100, (docs.length / 5) * 100); // 5 docs = 100%
    
    // Combine document count and average relevance
    return (docCountScore * 0.6 + avgRelevance * 0.4);
  }
  
  private static calculateCorrectness(
    response: string,
    docs: Array<{ content: string; source: string; relevance?: number }>
  ): number {
    // Correctness combines faithfulness and answer quality
    const faithfulness = this.calculateFaithfulness(response, docs);
    const length = Math.min(100, (response.length / 500) * 100); // Penalize very short/long responses
    return (faithfulness * 0.7 + length * 0.3);
  }
  
  private static calculateBLEU(response: string, reference: string): number {
    if (!response || !reference) return 0;
    
    // Simplified BLEU: Use 1-gram and 2-gram precision
    const responseTokens = response.toLowerCase().split(/\s+/);
    const referenceTokens = reference.toLowerCase().split(/\s+/);
    
    // 1-gram matches
    let unigramMatches = 0;
    for (const token of responseTokens) {
      if (referenceTokens.includes(token)) {
        unigramMatches++;
      }
    }
    
    // 2-gram matches
    let bigramMatches = 0;
    for (let i = 0; i < responseTokens.length - 1; i++) {
      const bigram = responseTokens[i] + ' ' + responseTokens[i + 1];
      const referenceBigrams = [];
      for (let j = 0; j < referenceTokens.length - 1; j++) {
        referenceBigrams.push(referenceTokens[j] + ' ' + referenceTokens[j + 1]);
      }
      if (referenceBigrams.includes(bigram)) {
        bigramMatches++;
      }
    }
    
    // BLEU score combines unigram and bigram precision (weighted: 0.5 each)
    const unigramPrecision = responseTokens.length > 0 ? (unigramMatches / responseTokens.length) : 0;
    const bigramPrecision = responseTokens.length > 1 ? (bigramMatches / (responseTokens.length - 1)) : 0;
    
    return Math.min(100, ((unigramPrecision * 0.5 + bigramPrecision * 0.5) * 100));
  }
  
  private static calculateROUGE(response: string, reference: string): number {
    if (!response || !reference) return 0;
    
    // ROUGE-L: Longest Common Subsequence based metric
    const responseTokens = response.toLowerCase().split(/\s+/);
    const referenceTokens = reference.toLowerCase().split(/\s+/);
    
    // Calculate longest common subsequence length
    const lcsLength = this.longestCommonSubsequence(responseTokens, referenceTokens);
    
    // ROUGE-L Recall: LCS length / reference length
    // ROUGE-L Precision: LCS length / response length
    const recall = lcsLength / referenceTokens.length;
    const precision = lcsLength / responseTokens.length;
    
    // F-score: harmonic mean of recall and precision
    if (recall + precision === 0) return 0;
    const fScore = (2 * recall * precision) / (recall + precision);
    
    return Math.min(100, fScore * 100);
  }
  
  private static longestCommonSubsequence(arr1: string[], arr2: string[]): number {
    const m = arr1.length;
    const n = arr2.length;
    
    // Create DP table
    const dp: number[][] = Array(m + 1).fill(0).map(() => Array(n + 1).fill(0));
    
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (arr1[i - 1] === arr2[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1] + 1;
        } else {
          dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
        }
      }
    }
    
    return dp[m][n];
  }
  
  private static calculateLlamaCorrectness(
    response: string,
    docs: Array<{ content: string; source: string; relevance?: number }>
  ): number {
    // LlamaIndex correctness similar to RAGAS correctness
    return this.calculateCorrectness(response, docs);
  }
  
  private static calculateLlamaRelevancy(query: string, response: string): number {
    return this.calculateAnswerRelevancy(query, response);
  }
  
  private static calculateLlamaFaithfulness(
    response: string,
    docs: Array<{ content: string; source: string; relevance?: number }>
  ): number {
    return this.calculateFaithfulness(response, docs);
  }
}

export default MultiFrameworkEvaluator;
