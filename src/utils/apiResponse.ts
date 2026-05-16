/**
 * Standardized API Response and Error Handling
 * Ensures consistent response format and error handling across all services
 */

export type ApiResponseStatus = 'success' | 'error' | 'warning' | 'loading';

export interface ApiResponse<T = unknown> {
  status: ApiResponseStatus;
  data?: T;
  error?: ApiError;
  message: string;
  timestamp: string;
  traceId?: string;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  field?: string;
  suggestions?: string[];
}

export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'AUTHENTICATION_ERROR'
  | 'AUTHORIZATION_ERROR'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'RATE_LIMITED'
  | 'SERVICE_UNAVAILABLE'
  | 'INTERNAL_ERROR'
  | 'EXTERNAL_SERVICE_ERROR'
  | 'TIMEOUT'
  | 'INVALID_INPUT';

export const ERROR_MESSAGES: Record<ErrorCode, string> = {
  VALIDATION_ERROR: 'Invalid input provided. Please check your data and try again.',
  AUTHENTICATION_ERROR: 'Authentication failed. Please log in and try again.',
  AUTHORIZATION_ERROR: 'You do not have permission to perform this action.',
  NOT_FOUND: 'The requested resource was not found.',
  CONFLICT: 'This resource already exists or there is a conflict.',
  RATE_LIMITED: 'Too many requests. Please wait and try again later.',
  SERVICE_UNAVAILABLE: 'Service is temporarily unavailable. Please try again soon.',
  INTERNAL_ERROR: 'An unexpected error occurred. Please try again later.',
  EXTERNAL_SERVICE_ERROR: 'An external service is unavailable. Please try again later.',
  TIMEOUT: 'Request timed out. Please try again.',
  INVALID_INPUT: 'The provided input is invalid or malformed.',
};

export const HTTP_STATUS_CODES: Record<ErrorCode, number> = {
  VALIDATION_ERROR: 400,
  AUTHENTICATION_ERROR: 401,
  AUTHORIZATION_ERROR: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  RATE_LIMITED: 429,
  SERVICE_UNAVAILABLE: 503,
  INTERNAL_ERROR: 500,
  EXTERNAL_SERVICE_ERROR: 502,
  TIMEOUT: 504,
  INVALID_INPUT: 400,
};

/**
 * Create success response
 */
export function successResponse<T>(
  data: T,
  message = 'Operation successful',
  traceId?: string
): ApiResponse<T> {
  return {
    status: 'success',
    data,
    message,
    timestamp: new Date().toISOString(),
    traceId,
  };
}

/**
 * Create error response
 */
export function errorResponse(
  code: ErrorCode,
  customMessage?: string,
  details?: Record<string, unknown>,
  traceId?: string
): ApiResponse<null> {
  return {
    status: 'error',
    data: null,
    error: {
      code,
      message: customMessage || ERROR_MESSAGES[code],
      details,
    },
    message: ERROR_MESSAGES[code],
    timestamp: new Date().toISOString(),
    traceId,
  };
}

/**
 * Create warning response (partial success)
 */
export function warningResponse<T>(
  data: T,
  code: ErrorCode,
  customMessage?: string,
  traceId?: string
): ApiResponse<T> {
  return {
    status: 'warning',
    data,
    error: {
      code,
      message: customMessage || ERROR_MESSAGES[code],
    },
    message: 'Operation completed with warnings',
    timestamp: new Date().toISOString(),
    traceId,
  };
}

/**
 * Type guard to check if response is success
 */
export function isSuccess<T>(response: ApiResponse<T>): response is ApiResponse<T> & { data: T } {
  return response.status === 'success' && response.data !== undefined;
}

/**
 * Type guard to check if response is error
 */
export function isError(response: ApiResponse): response is ApiResponse & { error: ApiError } {
  return response.status === 'error' && response.error !== undefined;
}

/**
 * Type guard to check if response is warning
 */
export function isWarning(response: ApiResponse): response is ApiResponse & { error: ApiError } {
  return response.status === 'warning' && response.error !== undefined;
}

/**
 * Extract user-friendly error message from response
 */
export function getErrorMessage(response: ApiResponse): string {
  if (isError(response) || isWarning(response)) {
    return response.error?.message || response.message;
  }
  return response.message;
}

/**
 * Extract HTTP status code from error code
 */
export function getStatusCode(code: ErrorCode): number {
  return HTTP_STATUS_CODES[code] || 500;
}
