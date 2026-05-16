/**
 * Custom error types for type-safe error handling
 */

export class DebuggerError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 500,
  ) {
    super(message);
    this.name = 'DebuggerError';
  }
}

export class ValidationError extends DebuggerError {
  constructor(message: string) {
    super('VALIDATION_ERROR', message, 400);
    this.name = 'ValidationError';
  }
}

export class AppNotFoundError extends DebuggerError {
  constructor(appId: string) {
    super('APP_NOT_FOUND', `App ${appId} not found`, 404);
    this.name = 'AppNotFoundError';
  }
}

export class LLMError extends DebuggerError {
  constructor(message: string) {
    super('LLM_ERROR', message, 500);
    this.name = 'LLMError';
  }
}

export class DatabaseError extends DebuggerError {
  constructor(message: string) {
    super('DATABASE_ERROR', message, 500);
    this.name = 'DatabaseError';
  }
}

export function isDebuggerError(error: unknown): error is DebuggerError {
  return error instanceof DebuggerError;
}

export function getErrorResponse(error: unknown): {
  code: string;
  message: string;
  statusCode: number;
} {
  if (isDebuggerError(error)) {
    return {
      code: error.code,
      message: error.message,
      statusCode: error.statusCode,
    };
  }

  if (error instanceof Error) {
    return {
      code: 'INTERNAL_ERROR',
      message: error.message,
      statusCode: 500,
    };
  }

  return {
    code: 'UNKNOWN_ERROR',
    message: 'An unknown error occurred',
    statusCode: 500,
  };
}
