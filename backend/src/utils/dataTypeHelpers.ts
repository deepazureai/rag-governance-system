/**
 * Data Type Helper Functions
 * Safe conversion functions for common TypeScript type errors
 */

/**
 * Safely convert unknown value to Date
 * Handles strings, numbers, Date objects, and fallback to current time
 */
export function safeToDate(value: unknown, fallback: Date = new Date()): Date {
  if (value instanceof Date) {
    return value;
  }
  
  if (typeof value === 'string') {
    const parsed = new Date(value);
    return isValidDate(parsed) ? parsed : fallback;
  }
  
  if (typeof value === 'number') {
    const parsed = new Date(value);
    return isValidDate(parsed) ? parsed : fallback;
  }
  
  // Invalid or undefined value - return fallback
  return fallback;
}

/**
 * Safely extract date from record with fallback to alternative field
 * Used for camelCase and snake_case field variants
 */
export function extractDate(record: Record<string, unknown>, primaryField: string, secondaryField?: string, fallback?: Date): Date {
  const primaryValue = record[primaryField];
  
  // Try primary field first
  if (primaryValue !== undefined && primaryValue !== null) {
    const date = safeToDate(primaryValue, fallback);
    if (isValidDate(date)) {
      return date;
    }
  }
  
  // Try secondary field if provided
  if (secondaryField) {
    const secondaryValue = record[secondaryField];
    if (secondaryValue !== undefined && secondaryValue !== null) {
      const date = safeToDate(secondaryValue, fallback);
      if (isValidDate(date)) {
        return date;
      }
    }
  }
  
  // Return fallback
  return fallback || new Date();
}

/**
 * Validate if Date object is valid
 */
function isValidDate(date: Date): boolean {
  return date instanceof Date && !isNaN(date.getTime());
}

/**
 * Safely cast validationStatus to correct type
 */
export function safeValidationStatus(value: string): 'valid' | 'partial' | 'invalid' {
  if (value === 'valid' || value === 'partial' || value === 'invalid') {
    return value;
  }
  // Default to 'invalid' if unexpected value
  return 'invalid';
}

/**
 * Safely get size of Set (avoid .length error)
 */
export function getSafeSetSize(set: Set<any>): number {
  return set.size || 0;
}

/**
 * Safely extract string value from record
 */
export function extractString(record: Record<string, unknown>, primaryField: string, secondaryField?: string, fallback: string = ''): string {
  const primaryValue = record[primaryField];
  
  if (primaryValue !== undefined && primaryValue !== null && typeof primaryValue === 'string') {
    return primaryValue;
  }
  
  if (secondaryField) {
    const secondaryValue = record[secondaryField];
    if (secondaryValue !== undefined && secondaryValue !== null && typeof secondaryValue === 'string') {
      return secondaryValue;
    }
  }
  
  return fallback;
}

/**
 * Safely extract number value from record
 */
export function extractNumber(record: Record<string, unknown>, primaryField: string, secondaryField?: string, fallback: number = 0): number {
  const primaryValue = record[primaryField];
  
  if (primaryValue !== undefined && primaryValue !== null && typeof primaryValue === 'number') {
    return primaryValue;
  }
  
  if (secondaryField) {
    const secondaryValue = record[secondaryField];
    if (secondaryValue !== undefined && secondaryValue !== null && typeof secondaryValue === 'number') {
      return secondaryValue;
    }
  }
  
  return fallback;
}
