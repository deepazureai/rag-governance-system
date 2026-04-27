const logger = require('../utils/logger');
const appInsights = require('../utils/appInsights');
const { ApplicationError } = require('../utils/enhancedErrors');

const enhancedErrorHandler = (err, req, res, next) => {
  const correlationId = req.correlationId || 'unknown';

  if (!err.statusCode) {
    logger.error('Unhandled error', err, { correlationId, path: req.path });
    appInsights.trackException(err, { correlationId, path: req.path });

    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred. Please try again later.',
        correlationId,
      },
    });
  }

  const { statusCode, userMessage, code, details } = err;

  logger.error(err.message, err, {
    correlationId,
    errorCode: code,
    statusCode,
    details,
    path: req.path,
    method: req.method,
  });

  appInsights.trackTrace(err.message, appInsights.Contracts?.SeverityLevel?.Error || 3, {
    correlationId,
    errorCode: code,
    statusCode,
    ...details,
  });

  res.status(statusCode).json({
    success: false,
    error: {
      code,
      message: userMessage,
      correlationId,
    },
  });
};

module.exports = { enhancedErrorHandler };
