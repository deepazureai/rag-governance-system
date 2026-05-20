/**
 * Data Sanitizer Utility
 * Removes special characters from data while preserving comma delimiters and essential punctuation
 */

export class DataSanitizer {
  /**
   * Sanitize a single field/value by removing special characters
   * Preserves: alphanumeric, spaces, commas (delimiters), periods, hyphens, underscores, parentheses
   * Removes: other special characters that could break data pipelines
   */
  static sanitizeField(value: string): string {
    if (!value || typeof value !== 'string') {
      return '';
    }

    // Regex explanation:
    // [a-zA-Z0-9] - Keep alphanumeric characters
    // \s - Keep whitespace (spaces, tabs, newlines)
    // , - Keep comma delimiter (critical for CSV compatibility)
    // . - Keep period for decimals and sentences
    // - - Keep hyphens
    // _ - Keep underscores
    // () - Keep parentheses for grouping
    // / - Keep forward slash for dates/paths
    // : - Keep colon for times
    // ; - Keep semicolon
    // ' - Keep single quote for contractions
    // " - Keep double quotes for quoted strings
    // Replace everything else with empty string
    const sanitized = value.replace(/[^a-zA-Z0-9\s,.\-_()/:;'"]/g, '');

    // Remove multiple consecutive spaces
    return sanitized.replace(/\s+/g, ' ').trim();
  }

  /**
   * Sanitize prompt field - more permissive, keeps more punctuation
   */
  static sanitizePrompt(prompt: string): string {
    if (!prompt || typeof prompt !== 'string') {
      return '';
    }

    // For prompts, keep more punctuation for natural language
    // Keep: alphanumeric, spaces, common punctuation (.,!?;:'"()-/&@#)
    const sanitized = prompt.replace(/[^a-zA-Z0-9\s,.\-_()/:;'"!?&@#]/g, '');

    return sanitized.replace(/\s+/g, ' ').trim();
  }

  /**
   * Sanitize response field - similar to prompt
   */
  static sanitizeResponse(response: string): string {
    if (!response || typeof response !== 'string') {
      return '';
    }

    // Responses also need natural language punctuation
    const sanitized = response.replace(/[^a-zA-Z0-9\s,.\-_()/:;'"!?&@#\n]/g, '');

    return sanitized.replace(/\s+/g, ' ').trim();
  }

  /**
   * Sanitize context field - preserve all paragraph breaks and structure
   */
  static sanitizeContext(context: string): string {
    if (!context || typeof context !== 'string') {
      return '';
    }

    // Context can have newlines for paragraph separation
    const sanitized = context.replace(/[^a-zA-Z0-9\s,.\-_()/:;'"!?&@#\n]/g, '');

    // Preserve paragraph breaks (double newlines) but cleanup excessive whitespace
    return sanitized.replace(/\n\n+/g, '\n\n').replace(/[ \t]+/g, ' ').trim();
  }

  /**
   * Sanitize an entire record object
   */
  static sanitizeRecord(
    record: Record<string, any>
  ): Record<string, any> {
    const sanitized: Record<string, any> = {};

    for (const [key, value] of Object.entries(record)) {
      if (typeof value === 'string') {
        // Apply field-specific sanitization based on key names
        if (
          key.toLowerCase().includes('prompt') ||
          key.toLowerCase().includes('query')
        ) {
          sanitized[key] = this.sanitizePrompt(value);
        } else if (
          key.toLowerCase().includes('response') ||
          key.toLowerCase().includes('answer')
        ) {
          sanitized[key] = this.sanitizeResponse(value);
        } else if (key.toLowerCase().includes('context')) {
          sanitized[key] = this.sanitizeContext(value);
        } else {
          sanitized[key] = this.sanitizeField(value);
        }
      } else {
        // Keep non-string values as-is
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  /**
   * Validate if data is comma-delimited safe
   * Returns true if commas are properly preserved and not escaped incorrectly
   */
  static isCommaDelimiterSafe(value: string): boolean {
    if (!value || typeof value !== 'string') {
      return true;
    }

    // Check if value contains unescaped special characters that would break CSV
    // Allow: commas, alphanumeric, spaces, and basic punctuation
    const csvUnsafePattern = /[^a-zA-Z0-9\s,.\-_()/:;'"!?&@#]/g;
    return !csvUnsafePattern.test(value);
  }
}
