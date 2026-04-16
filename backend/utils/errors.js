class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

class ValidationError extends ApiError {
  constructor(message) {
    super(400, message);
    this.name = 'ValidationError';
  }
}

class NotFoundError extends ApiError {
  constructor(resource) {
    super(404, `${resource} not found`);
    this.name = 'NotFoundError';
  }
}

class UnauthorizedError extends ApiError {
  constructor(message = 'Unauthorized') {
    super(401, message);
    this.name = 'UnauthorizedError';
  }
}

module.exports = {
  ApiError,
  ValidationError,
  NotFoundError,
  UnauthorizedError,
};
