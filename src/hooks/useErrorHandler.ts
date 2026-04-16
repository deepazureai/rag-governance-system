import { useState, useCallback } from 'react';
import { ErrorTranslator, FrontendErrorLogger } from '@/src/utils/errorHandler';
import { FrontendLogger } from '@/src/utils/logger';
import { useToast } from '@/src/components/notifications/ErrorToast';

export const useErrorHandler = () => {
  const { addToast } = useToast();
  const [error, setError] = useState<any>(null);

  const handleError = useCallback((error: any, customMessage?: string) => {
    const { message, code, correlationId } = ErrorTranslator.parseApiError(error);

    FrontendLogger.error(customMessage || message, error, {
      errorCode: code,
      correlationId,
    });

    setError({ message, code, correlationId });

    addToast(message, 'error', correlationId);

    return { message, code, correlationId };
  }, [addToast]);

  const handleSuccess = useCallback((message: string) => {
    FrontendLogger.info(message);
    addToast(message, 'success');
  }, [addToast]);

  const handleWarning = useCallback((message: string) => {
    FrontendLogger.warn(message);
    addToast(message, 'warning');
  }, [addToast]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    error,
    handleError,
    handleSuccess,
    handleWarning,
    clearError,
  };
};
