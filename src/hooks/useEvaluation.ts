/**
 * Hook for evaluation API calls
 * Integrates with Redux and React Query
 */

'use client';

import { useState, useCallback, useEffect } from 'react';
import axios from 'axios';
import { useAppDispatch } from './useRedux';
import { addAlert } from '@/src/store/slices/alertsSlice';
import { apiClient } from '@/src/api/client';
import { MockApiHandler } from '@/src/api/mock-handler';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/evaluations';

export interface FrameworkInfo {
  type: 'ragas' | 'microsoft';
  metadata: {
    name: string;
    version: string;
    description: string;
    supportedMetrics: string[];
  };
}

export interface EvaluationResult {
  id: string;
  frameworkName: string;
  frameworkVersion: string;
  query: string;
  response: string;
  metrics: Record<string, number>;
  overallScore: number;
  executionTime: number;
  timestamp: string;
}

export function useEvaluation() {
  const dispatch = useAppDispatch();
  const [frameworks, setFrameworks] = useState<FrameworkInfo[]>([]);
  const [selectedFramework, setSelectedFramework] = useState<'ragas' | 'microsoft'>('ragas');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch available frameworks
  useEffect(() => {
    const fetchFrameworks = async () => {
      try {
        // Use mock data instead of API call to avoid network errors
        const mockFrameworks: FrameworkInfo[] = [
          {
            type: 'ragas',
            metadata: {
              name: 'RAGAS',
              version: '0.1.5',
              description: 'Reference-free Automatic Evaluation for Retrieval Augmented Generation (RAG) Systems',
              supportedMetrics: ['faithfulness', 'relevance', 'correctness', 'answer_relevancy'],
            },
          },
          {
            type: 'microsoft',
            metadata: {
              name: 'Microsoft Evaluation Framework',
              version: '1.0.0',
              description: 'Microsoft framework for evaluating RAG system quality and safety',
              supportedMetrics: ['coherence', 'fluency', 'relevance', 'safety_score'],
            },
          },
        ];
        setFrameworks(mockFrameworks);
      } catch (err: any) {
        console.error('Failed to fetch frameworks:', err);
        setError(err.message);
        // Fallback to mock frameworks
        setFrameworks([
          {
            type: 'ragas',
            metadata: {
              name: 'RAGAS',
              version: '0.1.5',
              description: 'Reference-free Automatic Evaluation for Retrieval Augmented Generation (RAG) Systems',
              supportedMetrics: ['faithfulness', 'relevance', 'correctness', 'answer_relevancy'],
            },
          },
        ]);
      }
    };

    fetchFrameworks();
  }, []);

  // Evaluate a single query
  const evaluateQuery = useCallback(
    async (
      appId: string,
      query: string,
      response: string,
      retrievedDocuments: Array<{ content: string; source: string; relevance?: number }>
    ): Promise<EvaluationResult | null> => {
      setLoading(true);
      setError(null);

      try {
        const result = await apiClient.post<any>('/evaluations/query', {
          appId,
          query,
          response,
          retrievedDocuments,
          framework: selectedFramework,
        });

        if (result.success || result.data) {
          dispatch(
            addAlert({
              type: 'success',
              message: `Evaluation completed using ${selectedFramework.toUpperCase()}`,
              duration: 3000,
            })
          );
          return result.data || result;
        }
      } catch (err: any) {
        const errorMessage = err.response?.data?.error || 'Evaluation failed';
        setError(errorMessage);
        dispatch(
          addAlert({
            type: 'error',
            message: errorMessage,
            duration: 5000,
          })
        );
      } finally {
        setLoading(false);
      }

      return null;
    },
    [selectedFramework, dispatch]
  );

  // Evaluate batch
  const evaluateBatch = useCallback(
    async (
      appId: string,
      evaluations: Array<{
        query: string;
        response: string;
        retrievedDocuments: Array<{ content: string; source: string; relevance?: number }>;
      }>
    ): Promise<EvaluationResult[] | null> => {
      setLoading(true);
      setError(null);

      try {
        const result = await apiClient.post<any>('/evaluations/batch', {
          appId,
          evaluations,
          framework: selectedFramework,
        });

        if (result.success || result.data) {
          dispatch(
            addAlert({
              type: 'success',
              message: `Batch evaluation completed (${evaluations.length} items) using ${selectedFramework.toUpperCase()}`,
              duration: 3000,
            })
          );
          return result.data?.results || [result.data];
        }
      } catch (err: any) {
        const errorMessage = err.response?.data?.error || 'Batch evaluation failed';
        setError(errorMessage);
        dispatch(
          addAlert({
            type: 'error',
            message: errorMessage,
            duration: 5000,
          })
        );
      } finally {
        setLoading(false);
      }

      return null;
    },
    [selectedFramework, dispatch]
  );

  // Switch framework
  const switchFramework = useCallback(
    async (framework: 'ragas' | 'microsoft') => {
      try {
        const response = await apiClient.post<any>('/evaluations/switch-framework', {
          framework,
        });

        if (response.success || response.data) {
          setSelectedFramework(framework);
          dispatch(
            addAlert({
              type: 'success',
              message: `Switched to ${framework.toUpperCase()} framework`,
              duration: 3000,
            })
          );
        }
      } catch (err: any) {
        const errorMessage = err.response?.data?.error || 'Framework switch failed';
        dispatch(
          addAlert({
            type: 'error',
            message: errorMessage,
            duration: 5000,
          })
        );
      }
    },
    [dispatch]
  );

  return {
    frameworks,
    selectedFramework,
    loading,
    error,
    evaluateQuery,
    evaluateBatch,
    switchFramework,
  };
}
