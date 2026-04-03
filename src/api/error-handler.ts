import { AxiosError } from 'axios';
import { ApiResponse } from '@/types';

export class ApiErrorHandler {
  static handle(error: unknown): ApiResponse<null> {
    if (error instanceof AxiosError) {
      const message =
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.message ||
        'An error occurred';

      const status = error.response?.status;

      if (status === 400) {
        return {
          success: false,
          error: 'Bad Request',
          message: message,
        };
      }

      if (status === 401) {
        return {
          success: false,
          error: 'Unauthorized',
          message: 'Please log in again',
        };
      }

      if (status === 403) {
        return {
          success: false,
          error: 'Forbidden',
          message: 'You do not have permission to access this resource',
        };
      }

      if (status === 404) {
        return {
          success: false,
          error: 'Not Found',
          message: 'The requested resource was not found',
        };
      }

      if (status === 500) {
        return {
          success: false,
          error: 'Server Error',
          message: 'An internal server error occurred',
        };
      }

      return {
        success: false,
        error: error.code || 'Unknown Error',
        message: message,
      };
    }

    return {
      success: false,
      error: 'Unknown Error',
      message: error instanceof Error ? error.message : 'An unexpected error occurred',
    };
  }

  static isNetworkError(error: unknown): boolean {
    if (error instanceof AxiosError) {
      return !error.response && error.message === 'Network Error';
    }
    return false;
  }

  static isTimeoutError(error: unknown): boolean {
    if (error instanceof AxiosError) {
      return error.code === 'ECONNABORTED';
    }
    return false;
  }
}
