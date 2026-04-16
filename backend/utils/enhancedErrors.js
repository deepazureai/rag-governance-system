class ApplicationError extends Error {
  constructor(message, userMessage, code, statusCode = 500, details = {}) {
    super(message);
    this.name = this.constructor.name;
    this.userMessage = userMessage;
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    this.timestamp = new Date().toISOString();
    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends ApplicationError {
  constructor(message, userMessage = 'Invalid input provided', details = {}) {
    super(message, userMessage, 'VALIDATION_ERROR', 400, details);
  }
}

class AuthenticationError extends ApplicationError {
  constructor(message = 'Authentication failed', userMessage = 'Authentication failed. Please try again.', details = {}) {
    super(message, userMessage, 'AUTH_ERROR', 401, details);
  }
}

class AuthorizationError extends ApplicationError {
  constructor(message = 'Insufficient permissions', userMessage = 'You do not have permission to perform this action.', details = {}) {
    super(message, userMessage, 'AUTHZ_ERROR', 403, details);
  }
}

class NotFoundError extends ApplicationError {
  constructor(resource = 'Resource', userMessage = `${resource} not found`, details = {}) {
    super(`${resource} not found`, userMessage, 'NOT_FOUND', 404, details);
  }
}

class ConnectionError extends ApplicationError {
  constructor(connectorType, message, userMessage = 'Unable to connect to data source', details = {}) {
    super(
      message,
      userMessage,
      `CONNECTION_ERROR_${connectorType.toUpperCase()}`,
      503,
      { connectorType, ...details }
    );
  }
}

class DatabaseError extends ApplicationError {
  constructor(message, userMessage = 'Database operation failed', details = {}) {
    super(message, userMessage, 'DATABASE_ERROR', 500, details);
  }
}

class AzureError extends ApplicationError {
  constructor(service, message, userMessage = `${service} service unavailable`, details = {}) {
    super(message, userMessage, `AZURE_ERROR_${service.toUpperCase()}`, 503, { service, ...details });
  }
}

class TimeoutError extends ApplicationError {
  constructor(operation = 'Operation', userMessage = 'Request timed out. Please try again.', details = {}) {
    super(`${operation} timeout`, userMessage, 'TIMEOUT_ERROR', 504, details);
  }
}

class RateLimitError extends ApplicationError {
  constructor(userMessage = 'Too many requests. Please try again later.', details = {}) {
    super('Rate limit exceeded', userMessage, 'RATE_LIMIT_ERROR', 429, details);
  }
}

class ExternalServiceError extends ApplicationError {
  constructor(serviceName, message, userMessage = `${serviceName} service error`, details = {}) {
    super(message, userMessage, `EXTERNAL_ERROR_${serviceName.toUpperCase()}`, 502, { serviceName, ...details });
  }
}

class ConfigurationError extends ApplicationError {
  constructor(message, userMessage = 'System configuration error', details = {}) {
    super(message, userMessage, 'CONFIG_ERROR', 500, details);
  }
}

module.exports = {
  ApplicationError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConnectionError,
  DatabaseError,
  AzureError,
  TimeoutError,
  RateLimitError,
  ExternalServiceError,
  ConfigurationError,
};
