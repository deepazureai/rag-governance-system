/**
 * Safe parameter parsing utilities for Express route handlers
 * Handles Express's string | string[] | undefined types
 */

/**
 * Safely extracts a string parameter from request.params or request.query
 * Handles string | string[] | undefined gracefully
 * @param value - The value to parse (typically from req.params or req.query)
 * @returns The string value or undefined if not valid
 */
export function getStringParam(value: unknown): string | undefined {
  if (typeof value === 'string') {
    return value;
  }
  if (Array.isArray(value) && typeof value[0] === 'string') {
    return value[0];
  }
  return undefined;
}

/**
 * Safely extracts a numeric parameter from request.query
 * @param value - The value to parse
 * @param defaultValue - Default value if parsing fails
 * @returns The parsed number or default value
 */
export function getNumberParam(value: unknown, defaultValue: number = 0): number {
  const strValue = getStringParam(value);
  if (!strValue) return defaultValue;
  const parsed = parseInt(strValue, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Safely extracts a boolean parameter from request.query
 * @param value - The value to parse
 * @returns The boolean value
 */
export function getBooleanParam(value: unknown): boolean {
  const strValue = getStringParam(value);
  return strValue === 'true' || strValue === '1' || strValue === 'yes';
}
