import { format, parseISO } from 'date-fns';

export const formatDate = (date: string | Date, formatStr = 'MMM dd, yyyy') => {
  try {
    const parsedDate = typeof date === 'string' ? parseISO(date) : date;
    return format(parsedDate, formatStr);
  } catch {
    return date;
  }
};

export const formatDateTime = (date: string | Date) => {
  return formatDate(date, 'MMM dd, yyyy HH:mm');
};

export const formatTime = (date: string | Date) => {
  return formatDate(date, 'HH:mm:ss');
};

export const formatNumber = (value: number, decimals = 2) => {
  return value.toFixed(decimals);
};

export const formatPercentage = (value: number, decimals = 1) => {
  return `${value.toFixed(decimals)}%`;
};

export const formatLatency = (latencyMs: number) => {
  if (latencyMs < 1000) {
    return `${latencyMs.toFixed(0)}ms`;
  }
  return `${(latencyMs / 1000).toFixed(2)}s`;
};

export const getTrendColor = (trend: 'up' | 'down' | 'stable'): string => {
  switch (trend) {
    case 'up':
      return 'text-green-600';
    case 'down':
      return 'text-red-600';
    case 'stable':
      return 'text-gray-600';
    default:
      return 'text-gray-600';
  }
};

export const getTrendIcon = (trend: 'up' | 'down' | 'stable'): string => {
  switch (trend) {
    case 'up':
      return '↑';
    case 'down':
      return '↓';
    case 'stable':
      return '→';
    default:
      return '→';
  }
};

export const getSeverityColor = (severity: string): string => {
  switch (severity) {
    case 'critical':
      return 'bg-red-100 text-red-800';
    case 'warning':
      return 'bg-yellow-100 text-yellow-800';
    case 'info':
      return 'bg-blue-100 text-blue-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

export const getSeverityBorder = (severity: string): string => {
  switch (severity) {
    case 'critical':
      return 'border-red-300';
    case 'warning':
      return 'border-yellow-300';
    case 'info':
      return 'border-blue-300';
    default:
      return 'border-gray-300';
  }
};

export const getStatusColor = (status: string): string => {
  switch (status) {
    case 'active':
      return 'bg-green-100 text-green-800';
    case 'inactive':
      return 'bg-gray-100 text-gray-800';
    case 'archived':
      return 'bg-slate-100 text-slate-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

export const truncateText = (text: string, length: number): string => {
  if (text.length <= length) return text;
  return text.substring(0, length) + '...';
};

export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let timeoutId: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
};
