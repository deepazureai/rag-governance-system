/**
 * useApiCall - Custom hook for standardized API calls with error handling
 * Provides consistent error handling, loading states, and response handling
 */

import { useState, useCallback } from 'react';
import {
  ApiResponse,
  ErrorCode,
  getErrorMessage,
  isError,
  isSuccess,
} from '@/src/utils/apiResponse';

interface UseApiCallState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  errorCode: ErrorCode | null;
}

interface UseApiCallOptions {
  onSuccess?: (data: unknown) => void;
  onError?: (error: string, code: ErrorCode) => void;
  showErrorToast?: boolean;
}

export function useApiCall<T = unknown>(options?: UseApiCallOptions) {
  const [state, setState] = useState<UseApiCallState<T>>({
    data: null,
    loading: false,
    error: null,
    errorCode: null,
  });

  const execute = useCallback(
    async (url: string, config?: RequestInit) => {
      setState({ data: null, loading: true, error: null, errorCode: null });

      try {
        const response = await fetch(url, {
          ...config,
          headers: {
            'Content-Type': 'application/json',
            ...config?.headers,
          },
        });

        const json = (await response.json()) as ApiResponse<T>;

        if (isSuccess(json)) {
          setState({ data: json.data, loading: false, error: null, errorCode: null });
          options?.onSuccess?.(json.data);
          return json;
        }

        if (isError(json)) {
          const errorMessage = getErrorMessage(json);
          const errorCode = (json.error?.code || 'INTERNAL_ERROR') as ErrorCode;

          setState({
            data: null,
            loading: false,
            error: errorMessage,
            errorCode,
          });

          options?.onError?.(errorMessage, errorCode);

          if (options?.showErrorToast) {
            console.error(`[API Error] ${errorCode}: ${errorMessage}`);
          }

          return json;
        }

        // Handle response without proper format
        throw new Error('Invalid API response format');
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'An unexpected error occurred';
        const errorCode = 'INTERNAL_ERROR' as ErrorCode;

        setState({
          data: null,
          loading: false,
          error: errorMessage,
          errorCode,
        });

        options?.onError?.(errorMessage, errorCode);

        return {
          status: 'error' as const,
          message: errorMessage,
          timestamp: new Date().toISOString(),
        };
      }
    },
    [options]
  );

  const reset = useCallback(() => {
    setState({ data: null, loading: false, error: null, errorCode: null });
  }, []);

  return {
    ...state,
    execute,
    reset,
  };
}
