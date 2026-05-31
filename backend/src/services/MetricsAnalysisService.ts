import { logger } from '../utils/logger.js';

export interface EvaluationMetrics {
  groundedness?: number;
  coherence?: number;
  relevance?: number;
  faithfulness?: number;
  answerRelevancy?: number;
  contextRelevancy?: number;
  contextPrecision?: number;
  contextRecall?: number;
  [key: string]: number | undefined;
}

export interface MetricAnalysis {
  metricName: string;
  value: number;
  status: 'critical' | 'warning' | 'good' | 'excellent';
  threshold: { min: number; target: number };
  issue: string | null;
  suggestion: string | null;
}

export interface AnalysisResult {
  timestamp: string;
  overallHealth: 'critical' | 'warning' | 'good' | 'excellent';
  scoreAverage: number;
  criticalIssues: string[];
  warnings: string[];
  metricsAnalysis: MetricAnalysis[];
  deepevalFindings: string;
}

/**
 * Metrics Analysis Service
 * Analyzes evaluation metrics to identify issues and generate recommendations
 */
export class MetricsAnalysisService {
  /**
   * Industry standard thresholds for RAG evaluation metrics
   */
  private readonly thresholds: Record<string, { min: number; target: number }> = {
    groundedness: { min: 0.6, target: 0.8 },
    coherence: { min: 0.65, target: 0.85 },
    relevance: { min: 0.7, target: 0.9 },
    faithfulness: { min: 0.6, target: 0.85 },
    answerRelevancy: { min: 0.65, target: 0.9 },
    contextRelevancy: { min: 0.6, target: 0.85 },
    contextPrecision: { min: 0.5, target: 0.8 },
    contextRecall: { min: 0.6, target: 0.9 },
    correctness: { min: 0.65, target: 0.9 },
    bleuScore: { min: 0.3, target: 0.6 },
    rougeL: { min: 0.4, target: 0.7 },
  };

  /**
   * Analyze evaluation metrics and generate findings
   */
  analyzeMetrics(metrics: EvaluationMetrics): AnalysisResult {
    try {
      const metricsArray = Object.entries(metrics)
        .filter(([, value]) => typeof value === 'number')
        .map(([name, value]) => ({ name, value: value as number }));

      if (metricsArray.length === 0) {
        throw new Error('No valid metrics provided for analysis');
      }

      // Analyze each metric
      const metricsAnalysis = metricsArray.map(({ name, value }) =>
        this.analyzeMetric(name, value)
      );

      // Calculate overall health
      const scoreAverage = metricsArray.reduce((sum, m) => sum + m.value, 0) / metricsArray.length;
      const overallHealth = this.getHealthStatus(scoreAverage);

      // Identify critical issues
      const criticalMetrics = metricsAnalysis.filter(m => m.status === 'critical');
      const warningMetrics = metricsAnalysis.filter(m => m.status === 'warning');

      const criticalIssues = criticalMetrics
        .map(m => m.issue)
        .filter((issue): issue is string => issue !== null);

      const warnings = warningMetrics
        .map(m => m.issue)
        .filter((issue): issue is string => issue !== null);

      // Generate DeepEval findings summary
      const deepevalFindings = this.generateDeepEvalFindings(
        metricsAnalysis,
        scoreAverage,
        criticalIssues,
        warnings
      );

      return {
        timestamp: new Date().toISOString(),
        overallHealth,
        scoreAverage,
        criticalIssues,
        warnings,
        metricsAnalysis,
        deepevalFindings,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error(`[MetricsAnalysisService] Error analyzing metrics: ${message}`);
      throw new Error(`Metrics analysis failed: ${message}`);
    }
  }

  /**
   * Analyze a single metric against thresholds
   */
  private analyzeMetric(metricName: string, value: number): MetricAnalysis {
    const threshold = this.thresholds[metricName] || { min: 0.5, target: 0.85 };

    let status: 'critical' | 'warning' | 'good' | 'excellent';
    if (value < threshold.min) {
      status = 'critical';
    } else if (value < threshold.min + 0.1) {
      status = 'warning';
    } else if (value >= threshold.target) {
      status = 'excellent';
    } else {
      status = 'good';
    }

    return {
      metricName,
      value,
      status,
      threshold,
      issue: this.getIssueMessage(metricName, value, threshold),
      suggestion: this.getSuggestion(metricName, value, threshold),
    };
  }

  /**
   * Get issue message for a metric below threshold
   */
  private getIssueMessage(metricName: string, value: number, threshold: { min: number; target: number }): string | null {
    if (value >= threshold.target - 0.05) {
      return null;
    }

    const deficitPercent = Math.round(((threshold.min - value) / threshold.min) * 100);

    const issues: Record<string, string> = {
      groundedness: `Low groundedness (${value.toFixed(2)}): LLM response may contain facts not supported by context`,
      coherence: `Low coherence (${value.toFixed(2)}): Response lacks logical flow and clarity`,
      relevance: `Low relevance (${value.toFixed(2)}): Response doesn't adequately address the user query`,
      faithfulness: `Low faithfulness (${value.toFixed(2)}): Response contains information not faithful to source context`,
      answerRelevancy: `Low answer relevancy (${value.toFixed(2)}): Generated answer drifts from the question`,
      contextRelevancy: `Low context relevancy (${value.toFixed(2)}): Retrieved context is not well-aligned with query`,
      contextPrecision: `Low context precision (${value.toFixed(2)}): Retrieved context contains irrelevant information`,
      contextRecall: `Low context recall (${value.toFixed(2)}): Important context chunks are missing from retrieval`,
    };

    return issues[metricName] || `Low ${metricName} score (${value.toFixed(2)})`;
  }

  /**
   * Get suggestion to improve a metric
   */
  private getSuggestion(metricName: string, value: number, threshold: { min: number; target: number }): string | null {
    if (value >= threshold.target - 0.05) {
      return null;
    }

    const suggestions: Record<string, string> = {
      groundedness: 'Improve retrieval quality: ensure context chunks are accurate and relevant. Refine query understanding to reduce hallucinations.',
      coherence: 'Restructure prompt to enforce step-by-step reasoning. Use examples in context to guide response format.',
      relevance: 'Enhance query-document matching in retrieval. Add query reformulation step to better capture intent.',
      faithfulness: 'Implement citation requirement in prompt. Add fact-checking mechanism to validate claims against source.',
      answerRelevancy: 'Refine prompt to include explicit instruction to directly answer the question. Add question-answer validation.',
      contextRelevancy: 'Improve retrieval ranking algorithm. Increase relevance weight in vector similarity search.',
      contextPrecision: 'Reduce false positives in retrieval. Use filtering or re-ranking to eliminate off-topic chunks.',
      contextRecall: 'Expand retrieval scope by increasing chunk count. Consider multiple retrieval strategies or query expansion.',
    };

    return suggestions[metricName] || `Investigate why ${metricName} is below target (${threshold.target.toFixed(2)})`;
  }

  /**
   * Get overall health status based on average score
   */
  private getHealthStatus(scoreAverage: number): 'critical' | 'warning' | 'good' | 'excellent' {
    if (scoreAverage < 0.60) return 'critical';
    if (scoreAverage < 0.70) return 'warning';
    if (scoreAverage < 0.85) return 'good';
    return 'excellent';
  }

  /**
   * Generate comprehensive DeepEval findings summary
   */
  private generateDeepEvalFindings(
    metricsAnalysis: MetricAnalysis[],
    scoreAverage: number,
    criticalIssues: string[],
    warnings: string[]
  ): string {
    let findings = '';

    // Overall assessment
    if (scoreAverage >= 0.85) {
      findings += `Overall System Performance: EXCELLENT (${scoreAverage.toFixed(2)}) - Your RAG system is performing well.\n`;
    } else if (scoreAverage >= 0.70) {
      findings += `Overall System Performance: GOOD (${scoreAverage.toFixed(2)}) - Room for improvement in specific areas.\n`;
    } else if (scoreAverage >= 0.60) {
      findings += `Overall System Performance: WARNING (${scoreAverage.toFixed(2)}) - Significant improvements needed.\n`;
    } else {
      findings += `Overall System Performance: CRITICAL (${scoreAverage.toFixed(2)}) - Immediate action required.\n`;
    }

    findings += '\n';

    // Critical issues
    if (criticalIssues.length > 0) {
      findings += 'CRITICAL ISSUES:\n';
      criticalIssues.forEach((issue, idx) => {
        findings += `${idx + 1}. ${issue}\n`;
      });
      findings += '\n';
    }

    // Strengths (excellent metrics)
    const strengths = metricsAnalysis.filter(m => m.status === 'excellent');
    if (strengths.length > 0) {
      findings += 'STRENGTHS:\n';
      strengths.forEach(m => {
        findings += `• ${m.metricName}: ${m.value.toFixed(2)} (exceeds target)\n`;
      });
      findings += '\n';
    }

    // Priority improvements
    const needsImprovement = metricsAnalysis.filter(m => m.suggestion !== null);
    if (needsImprovement.length > 0) {
      findings += 'PRIORITY IMPROVEMENTS:\n';
      needsImprovement.sort((a, b) => a.value - b.value).slice(0, 3).forEach((m, idx) => {
        findings += `${idx + 1}. ${m.metricName} (${m.value.toFixed(2)}): ${m.suggestion}\n`;
      });
    }

    return findings.trim();
  }
}

export const metricsAnalysisService = new MetricsAnalysisService();
