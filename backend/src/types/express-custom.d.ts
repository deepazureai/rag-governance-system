/**
 * Type augmentation for Express to properly type req.params and req.query
 * This prevents TypeScript errors when accessing Express route parameters and query strings
 */

import 'express';

declare global {
  namespace Express {
    interface Request {
      /**
       * req.params are always strings in Express route handlers
       * Even though the @types/express types it as string | string[],
       * in practice route params are always single string values
       */
      params: Record<string, string>;
      /**
       * req.query values can be strings or string[], but we need to handle both cases
       * TypeScript 4.4+ handles Record with union types better
       */
      query: Record<string, string | string[] | undefined>;
    }
  }
}

/**
 * Type assertion helper for Express param values
 * Casts string | string[] to string (since in practice they're always strings in params)
 */
export function assertString(value: string | string[] | undefined): string {
  if (!value) return '';
  if (Array.isArray(value)) return value[0] || '';
  return value;
}

export {};
