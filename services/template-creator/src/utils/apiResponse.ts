export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  errorCode?: string;
  message?: string;
}

export function successResponse<T>(data: T, message = 'Success'): ApiResponse<T> {
  return {
    success: true,
    data,
    message,
  };
}

export function errorResponse(error: string, errorCode = 'UNKNOWN_ERROR'): ApiResponse {
  return {
    success: false,
    error,
    errorCode,
  };
}

export function warningResponse<T>(data: T, warning: string): ApiResponse<T> {
  return {
    success: true,
    data,
    message: warning,
  };
}

export function isSuccess(response: ApiResponse): boolean {
  return response.success === true;
}

