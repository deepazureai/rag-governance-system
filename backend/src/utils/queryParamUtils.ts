/**
 * Utility functions for safely extracting and validating Express query parameters
 */

/**
 * Extract a single string from Express query parameter
 * Handles the case where req.query values can be string | string[]
 */
export function getQueryString(value: string | string[] | undefined, defaultValue: string = ''): string {
  if (!value) return defaultValue;
  if (Array.isArray(value)) return value[0] || defaultValue;
  return value;
}

/**
 * Extract multiple query strings as array
 * Normalizes to always return an array
 */
export function getQueryArray(value: string | string[] | undefined): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  return [value];
}

/**
 * Extract and validate a query parameter as a specific type
 */
export function getQueryParam(
  value: string | string[] | undefined,
  type: 'string' | 'number' | 'boolean' = 'string',
  defaultValue?: any
): any {
  const stringValue = getQueryString(value);
  
  if (!stringValue) return defaultValue;

  switch (type) {
    case 'number':
      const num = parseInt(stringValue, 10);
      return isNaN(num) ? defaultValue : num;
    case 'boolean':
      return stringValue.toLowerCase() === 'true' || stringValue === '1';
    case 'string':
    default:
      return stringValue;
  }
}

/**
 * Type assertion helper - safely cast string | string[] to string
 * Used for strict type checking with Express parameters
 */
export function asString(value: string | string[] | undefined): string {
  if (!value) return '';
  if (Array.isArray(value)) return value[0] || '';
  return value;
}

/**
 * Type assertion helper - safely cast to string and trim
 */
export function asStringTrimmed(value: string | string[] | undefined): string {
  return asString(value).trim();
}
