'use client';

import React, { useState, useEffect } from 'react';
import { X, AlertCircle } from 'lucide-react';

interface Toast {
  id: string;
  message: string;
  type: 'error' | 'success' | 'warning' | 'info';
  correlationId?: string;
  autoClose?: boolean;
}

interface ErrorToastProps {
  toasts: Toast[];
  onRemove: (id: string) => void;
}

export const ErrorToast: React.FC<ErrorToastProps> = ({ toasts, onRemove }) => {
  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2 max-w-md">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`flex items-start gap-3 p-4 rounded-lg shadow-lg ${
            toast.type === 'error'
              ? 'bg-red-50 border-l-4 border-red-500'
              : toast.type === 'success'
                ? 'bg-green-50 border-l-4 border-green-500'
                : toast.type === 'warning'
                  ? 'bg-yellow-50 border-l-4 border-yellow-500'
                  : 'bg-blue-50 border-l-4 border-blue-500'
          }`}
        >
          <AlertCircle
            className={`w-5 h-5 mt-0.5 flex-shrink-0 ${
              toast.type === 'error'
                ? 'text-red-600'
                : toast.type === 'success'
                  ? 'text-green-600'
                  : toast.type === 'warning'
                    ? 'text-yellow-600'
                    : 'text-blue-600'
            }`}
          />
          <div className="flex-1">
            <p
              className={`text-sm font-medium ${
                toast.type === 'error'
                  ? 'text-red-900'
                  : toast.type === 'success'
                    ? 'text-green-900'
                    : toast.type === 'warning'
                      ? 'text-yellow-900'
                      : 'text-blue-900'
              }`}
            >
              {toast.message}
            </p>
            {toast.correlationId && (
              <p className="text-xs text-gray-500 mt-1">ID: {toast.correlationId}</p>
            )}
          </div>
          <button
            onClick={() => onRemove(toast.id)}
            className={`flex-shrink-0 p-1 rounded hover:bg-white hover:bg-opacity-50 transition-colors ${
              toast.type === 'error'
                ? 'text-red-600'
                : toast.type === 'success'
                  ? 'text-green-600'
                  : toast.type === 'warning'
                    ? 'text-yellow-600'
                    : 'text-blue-600'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
};

export const useToast = () => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = (message: string, type: 'error' | 'success' | 'warning' | 'info' = 'info', correlationId?: string) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newToast: Toast = {
      id,
      message,
      type,
      correlationId,
      autoClose: type !== 'error',
    };

    setToasts((prev) => [...prev, newToast]);

    if (newToast.autoClose) {
      setTimeout(() => removeToast(id), 5000);
    }

    return id;
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return { toasts, addToast, removeToast };
};
