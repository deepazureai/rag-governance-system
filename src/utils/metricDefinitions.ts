/**
 * Metric Definitions and Descriptions
 * Provides tooltips and detailed explanations for all evaluation metrics
 * Used across dashboard for consistent documentation
 */

export interface MetricDefinition {
  label: string;
  description: string;
  explanation: string;
  goodRange: string;
  warningRange: string;
  poorRange: string;
  framework: 'ragas' | 'bleu_rouge' | 'llamaindex';
}

export const METRIC_DEFINITIONS: Record<string, MetricDefinition> = {
  // RAGAS Metrics
  groundedness: {
    label: 'Groundedness',
    description: 'Measures if the response is supported by the provided context',
    explanation: 'Checks whether claims in the response can be verified against the source documents. High groundedness means the answer stays faithful to the provided context without hallucinating.',
    goodRange: '80-100',
    warningRange: '60-79',
    poorRange: '0-59',
    framework: 'ragas',
  },
  coherence: {
    label: 'Coherence',
    description: 'Measures how logically consistent and well-structured the response is',
    explanation: 'Evaluates whether the response flows naturally, with clear logical connections between ideas. High coherence means the answer is easy to follow and understand.',
    goodRange: '80-100',
    warningRange: '60-79',
    poorRange: '0-59',
    framework: 'ragas',
  },
  relevance: {
    label: 'Relevance',
    description: 'Measures how well the response addresses the user\'s query',
    explanation: 'Assesses whether the answer directly answers the question asked and stays on topic. High relevance means every part of the response contributes to answering the query.',
    goodRange: '80-100',
    warningRange: '60-79',
    poorRange: '0-59',
    framework: 'ragas',
  },
  faithfulness: {
    label: 'Faithfulness',
    description: 'Measures if the response accurately reflects the source information',
    explanation: 'Checks that the response doesn\'t misrepresent, distort, or misinterpret information from the context. High faithfulness means accurate representation of facts.',
    goodRange: '80-100',
    warningRange: '60-79',
    poorRange: '0-59',
    framework: 'ragas',
  },
  answerRelevancy: {
    label: 'Answer Relevancy',
    description: 'Measures how directly the answer addresses the specific question',
    explanation: 'Evaluates the specificity and directness of the answer to the user\'s query. High answer relevancy means the response is targeted and minimizes unnecessary information.',
    goodRange: '80-100',
    warningRange: '60-79',
    poorRange: '0-59',
    framework: 'ragas',
  },
  contextPrecision: {
    label: 'Context Precision',
    description: 'Measures how much of the retrieved context is relevant to answering the query',
    explanation: 'Assesses whether the retrieved documents are focused and relevant. High precision means fewer irrelevant documents are included in the context.',
    goodRange: '80-100',
    warningRange: '60-79',
    poorRange: '0-59',
    framework: 'ragas',
  },
  contextRecall: {
    label: 'Context Recall',
    description: 'Measures if all necessary information from context is retrieved',
    explanation: 'Checks whether the retrieval system found all relevant documents needed to answer the query. High recall means important context isn\'t missed.',
    goodRange: '80-100',
    warningRange: '60-79',
    poorRange: '0-59',
    framework: 'ragas',
  },

  // BLEU/ROUGE Metrics
  bleuScore: {
    label: 'BLEU Score',
    description: 'Measures n-gram overlap between response and reference text',
    explanation: 'BLEU (Bilingual Evaluation Understudy) compares generated text with reference translations using n-gram precision. Higher scores indicate more similar text at word/phrase level.',
    goodRange: '0.7-1.0',
    warningRange: '0.5-0.69',
    poorRange: '0-0.49',
    framework: 'bleu_rouge',
  },
  rougeL: {
    label: 'ROUGE-L',
    description: 'Measures longest common subsequence between response and reference',
    explanation: 'ROUGE-L evaluates overlap using longest common subsequences, capturing word ordering. Useful for assessing fluency and structural similarity.',
    goodRange: '0.7-1.0',
    warningRange: '0.5-0.69',
    poorRange: '0-0.49',
    framework: 'bleu_rouge',
  },
  precision: {
    label: 'Precision',
    description: 'Measures how many relevant items were retrieved vs total retrieved',
    explanation: 'Precision = relevant items retrieved / total items retrieved. High precision means few false positives; most retrieved items are truly relevant.',
    goodRange: '0.8-1.0',
    warningRange: '0.6-0.79',
    poorRange: '0-0.59',
    framework: 'bleu_rouge',
  },
  recall: {
    label: 'Recall',
    description: 'Measures how many relevant items were found vs total relevant items',
    explanation: 'Recall = relevant items retrieved / total relevant items. High recall means few false negatives; most relevant items are found.',
    goodRange: '0.8-1.0',
    warningRange: '0.6-0.79',
    poorRange: '0-0.59',
    framework: 'bleu_rouge',
  },

  // LLamaIndex Metrics
  llamaCorrectness: {
    label: 'Correctness',
    description: 'LLM judges if the response contains factually correct information',
    explanation: 'An LLM evaluates whether the response is factually accurate and error-free. High correctness means the answer is free from factual errors.',
    goodRange: '80-100',
    warningRange: '60-79',
    poorRange: '0-59',
    framework: 'llamaindex',
  },
  llamaRelevancy: {
    label: 'Relevancy',
    description: 'LLM judges if the response is relevant to the query',
    explanation: 'An LLM assesses whether the answer addresses the user\'s question comprehensively. High relevancy means the response directly answers what was asked.',
    goodRange: '80-100',
    warningRange: '60-79',
    poorRange: '0-59',
    framework: 'llamaindex',
  },
  llamaFaithfulness: {
    label: 'Faithfulness',
    description: 'LLM judges if the response stays faithful to the context',
    explanation: 'An LLM evaluates whether the answer is supported by the provided context without hallucination. High faithfulness means no made-up information.',
    goodRange: '80-100',
    warningRange: '60-79',
    poorRange: '0-59',
    framework: 'llamaindex',
  },
  overallScore: {
    label: 'Overall Score',
    description: 'Aggregate LLM judgment of response quality',
    explanation: 'A composite score combining correctness, relevancy, and faithfulness. Higher scores indicate better overall quality across all dimensions.',
    goodRange: '80-100',
    warningRange: '60-79',
    poorRange: '0-59',
    framework: 'llamaindex',
  },
};

/**
 * Get metric definition by label
 */
export function getMetricDefinition(label: string): MetricDefinition | undefined {
  // Convert label to key (e.g., "BLEU Score" -> "bleuScore")
  const key = Object.keys(METRIC_DEFINITIONS).find(
    k => {
      const metric = METRIC_DEFINITIONS[k as keyof typeof METRIC_DEFINITIONS];
      return metric && metric.label === label;
    }
  );
  return key ? METRIC_DEFINITIONS[key as keyof typeof METRIC_DEFINITIONS] : undefined;
}

/**
 * Get tooltip text for a metric
 */
export function getMetricTooltip(label: string): string {
  const definition = getMetricDefinition(label);
  if (!definition) return '';
  
  return `${definition.description}\n\nGood: ${definition.goodRange}\nWarning: ${definition.warningRange}\nPoor: ${definition.poorRange}`;
}

/**
 * Get score color based on metric value and ranges
 */
export function getScoreColor(value: number, definition: MetricDefinition): string {
  const goodValues = definition.goodRange.split('-').map(v => parseFloat(v));
  const warnValues = definition.warningRange.split('-').map(v => parseFloat(v));
  
  const goodMin = goodValues[0];
  const goodMax = goodValues[1];
  const warnMin = warnValues[0];
  const warnMax = warnValues[1];
  
  // Check for valid parsed values
  if (typeof goodMin === 'number' && typeof goodMax === 'number' && !isNaN(goodMin) && !isNaN(goodMax)) {
    if (value >= goodMin && value <= goodMax) return 'text-green-600 bg-green-50';
  }
  
  if (typeof warnMin === 'number' && typeof warnMax === 'number' && !isNaN(warnMin) && !isNaN(warnMax)) {
    if (value >= warnMin && value <= warnMax) return 'text-amber-600 bg-amber-50';
  }
  
  return 'text-red-600 bg-red-50';
}
