export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    correlationId?: string;
  };
}

export class ErrorTranslator {
  static getErrorMessage(code: string, defaultMessage: string): string {
    const errorMap: Record<string, string> = {
      VALIDATION_ERROR: 'Please check your input and try again.',
      AUTH_ERROR: 'Authentication failed. Please log in again.',
      AUTHZ_ERROR: 'You do not have permission to perform this action.',
      NOT_FOUND: 'The requested resource was not found.',
      CONNECTION_ERROR_DATABASE: 'Unable to connect to the database. Please check your connection settings.',
      CONNECTION_ERROR_AZURE: 'Unable to connect to Azure. Please check your credentials.',
      CONNECTION_ERROR_SPLUNK: 'Unable to connect to Splunk. Please check your settings.',
      CONNECTION_ERROR_DATADOG: 'Unable to connect to Datadog. Please check your API key.',
      DATABASE_ERROR: 'A database error occurred. Please try again.',
      AZURE_ERROR_KEYVAULT: 'Azure Key Vault is unavailable. Please try again later.',
      AZURE_ERROR_MONITOR: 'Azure Monitor service is unavailable. Please try again later.',
      AZURE_ERROR_BLOB: 'Azure Blob Storage is unavailable. Please try again later.',
      TIMEOUT_ERROR: 'Request timed out. Please try again.',
      RATE_LIMIT_ERROR: 'Too many requests. Please wait a moment and try again.',
      EXTERNAL_ERROR_SPLUNK: 'Splunk service is currently unavailable. Please try again later.',
      EXTERNAL_ERROR_DATADOG: 'Datadog service is currently unavailable. Please try again later.',
      CONFIG_ERROR: 'System configuration error. Please contact support.',
      INTERNAL_SERVER_ERROR: 'An unexpected error occurred. Please try again later.',
    };

    return errorMap[code] || defaultMessage;
  }

  static parseApiError(error: any): { message: string; code: string; correlationId?: string } {
    if (error?.response?.data?.error) {
      const { code, message, correlationId } = error.response.data.error;
      return {
        message: this.getErrorMessage(code, message),
        code,
        correlationId,
      };
    }

    if (error?.message) {
      return {
        message: error.message,
        code: 'UNKNOWN_ERROR',
      };
    }

    return {
      message: 'An unexpected error occurred. Please try again later.',
      code: 'UNKNOWN_ERROR',
    };
  }
}

export class FrontendErrorLogger {
  static logError(level: 'error' | 'warn' | 'info', message: string, error?: any, meta?: Record<string, any>) {
    const errorData = {
      timestamp: new Date().toISOString(),
      level,
      message,
      error: error ? {
        message: error?.message,
        code: error?.code,
        stack: error?.stack,
      } : undefined,
      ...meta,
    };

    if (level === 'error') {
      console.error(JSON.stringify(errorData, null, 2));
      // Send to backend logging endpoint if needed
      this.sendToBackend(errorData);
    } else {
      console.warn(JSON.stringify(errorData, null, 2));
    }
  }

  static sendToBackend(errorData: any) {
    try {
      // This would send errors to backend logging API
      // fetch('/api/logs', { method: 'POST', body: JSON.stringify(errorData) });
    } catch (e) {
      // Silent fail
    }
  }
}
