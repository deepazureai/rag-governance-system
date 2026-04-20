/**
 * API Error Handler Utility
 * Converts API errors and responses into user-friendly messages
 */

interface ApiErrorResponse {
  success: false;
  error?: string;
  message?: string;
  details?: any;
}

interface ApiSuccessResponse<T = any> {
  success: true;
  data: T;
  message?: string;
  count?: number;
}

type ApiResponse<T = any> = ApiSuccessResponse<T> | ApiErrorResponse;

/**
 * Convert fetch error to user-friendly message
 */
export function getFetchErrorMessage(error: unknown, context: string = 'load data'): string {
  if (error instanceof TypeError) {
    if (error.message.includes('fetch')) {
      return 'Unable to connect to the platform. Please ensure the backend service is running and accessible.';
    }
    return `Connection error while trying to ${context}. Please check your network.`;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return `Unable to ${context}. Please try again later.`;
}

/**
 * Convert API response error to user-friendly message
 * Handles both success and error responses
 */
export function getApiErrorMessage(response: ApiResponse, context: string = 'operation'): string | null {
  if (!response.success) {
    // Prefer user-friendly message field, fallback to error
    if (response.message) {
      return response.message;
    }
    if (response.error) {
      return response.error;
    }
    return `Failed to complete ${context}. Please try again.`;
  }

  return null; // No error
}

/**
 * Get context-specific empty state message
 */
export function getEmptyStateMessage(context: 'applications' | 'metrics' | 'dashboard'): string {
  const messages: Record<string, string> = {
    applications: 'No applications added to the RAG Evaluation Platform yet.',
    metrics: 'No metrics data available. Select an application and click Refresh Metrics.',
    dashboard: 'No applications available. Add applications to get started.',
  };

  return messages[context] || 'No data available.';
}

/**
 * Extract user-friendly message from any error
 */
export function getUserFriendlyErrorMessage(error: unknown, context: string = 'operation'): string {
  // If it's an API response object
  if (typeof error === 'object' && error !== null && 'success' in error) {
    const apiErr = getApiErrorMessage(error as ApiResponse, context);
    if (apiErr) return apiErr;
  }

  // If it's a fetch or network error
  if (error instanceof Error || error instanceof TypeError) {
    return getFetchErrorMessage(error, context);
  }

  // Fallback
  return `Unable to ${context}. Please try again.`;
}

export type { ApiErrorResponse, ApiSuccessResponse, ApiResponse };
