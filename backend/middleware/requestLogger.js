const { v4: uuidv4 } = require('uuid');
const logger = require('./logger');

const requestLogger = (req, res, next) => {
  const correlationId = uuidv4();
  req.correlationId = correlationId;
  res.set('X-Correlation-ID', correlationId);

  const startTime = Date.now();
  const originalSend = res.send;

  res.send = function (data) {
    const duration = Date.now() - startTime;
    const logMeta = {
      correlationId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    };

    if (res.statusCode >= 400) {
      logger.warn(`${req.method} ${req.path} - ${res.statusCode}`, logMeta);
    } else {
      logger.info(`${req.method} ${req.path} - ${res.statusCode}`, logMeta);
    }

    res.send = originalSend;
    return res.send(data);
  };

  logger.debug(`Incoming request`, {
    correlationId,
    method: req.method,
    path: req.path,
  });

  next();
};

module.exports = requestLogger;
