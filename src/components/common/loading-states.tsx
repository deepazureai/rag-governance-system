/**
 * Reusable loading state component
 * Shows skeleton loaders, progress bars, and loading indicators
 */

import { Skeleton } from '@/components/ui/skeleton';
import { Loader2, AlertCircle, CheckCircle } from 'lucide-react';

export interface LoadingStateProps {
  isLoading: boolean;
  error: string | null;
  isEmpty: boolean;
  emptyMessage: string;
  children: React.ReactNode;
  onRetry?: () => void;
}

export function LoadingState({
  isLoading,
  error,
  isEmpty,
  emptyMessage,
  children,
  onRetry,
}: LoadingStateProps) {
  if (isLoading) {
    return (
      <div className="space-y-4 p-4">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-semibold text-red-900 mb-1">Error</h3>
            <p className="text-sm text-red-800 mb-3">{error}</p>
            {onRetry && (
              <button
                onClick={onRetry}
                className="text-sm font-medium text-red-700 hover:text-red-900 underline"
              >
                Try again
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (isEmpty) {
    return (
      <div className="p-8 bg-blue-50 border border-blue-200 rounded-lg text-center">
        <p className="text-blue-900 font-medium mb-1">No data</p>
        <p className="text-sm text-blue-700">{emptyMessage}</p>
      </div>
    );
  }

  return <>{children}</>;
}

/**
 * Inline loading indicator
 */
export function InlineLoader({ text = 'Loading...' }: { text?: string }) {
  return (
    <div className="flex items-center gap-2 text-gray-600">
      <Loader2 className="w-4 h-4 animate-spin" />
      <span className="text-sm">{text}</span>
    </div>
  );
}

/**
 * Success feedback component
 */
export function SuccessFeedback({ message }: { message: string }) {
  return (
    <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
      <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
      <div>
        <h3 className="font-semibold text-green-900 text-sm">{message}</h3>
      </div>
    </div>
  );
}

/**
 * Error feedback component
 */
export function ErrorFeedback({
  message,
  details,
  onDismiss,
}: {
  message: string;
  details?: string;
  onDismiss?: () => void;
}) {
  return (
    <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
      <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
      <div className="flex-1">
        <h3 className="font-semibold text-red-900 text-sm">{message}</h3>
        {details && <p className="text-xs text-red-700 mt-1">{details}</p>}
      </div>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="text-red-600 hover:text-red-900 flex-shrink-0"
        >
          ✕
        </button>
      )}
    </div>
  );
}

/**
 * Skeleton loaders for common patterns
 */
export function MetricCardSkeleton() {
  return (
    <div className="p-4 bg-white border border-gray-200 rounded-lg space-y-2">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-8 w-16" />
      <Skeleton className="h-3 w-12" />
    </div>
  );
}

export function TableRowSkeleton() {
  return (
    <div className="grid grid-cols-4 gap-4 p-4 border-b border-gray-200">
      <Skeleton className="h-4" />
      <Skeleton className="h-4" />
      <Skeleton className="h-4" />
      <Skeleton className="h-4" />
    </div>
  );
}

/**
 * Page loading state
 */
export function PageLoader({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
        <p className="text-gray-600">{message}</p>
      </div>
    </div>
  );
}
