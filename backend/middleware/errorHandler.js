class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
    this.name = 'ApiError';
  }
}

const errorHandler = (err, req, res, next) => {
  console.error('[Error]', err);

  if (err instanceof ApiError) {
    return res.status(err.status).json({
      success: false,
      error: {
        status: err.status,
        message: err.message,
      },
    });
  }

  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      error: {
        status: 400,
        message: 'Validation error',
        details: err.message,
      },
    });
  }

  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      error: {
        status: 400,
        message: 'Invalid ID format',
      },
    });
  }

  // Default error response
  res.status(500).json({
    success: false,
    error: {
      status: 500,
      message: 'Internal server error',
    },
  });
};

module.exports = { ApiError, errorHandler };
