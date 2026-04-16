const fs = require('fs');
const path = require('path');

class Logger {
  constructor() {
    this.logDir = path.join(__dirname, '../../logs');
    this.ensureLogDirectory();
  }

  ensureLogDirectory() {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  getTimestamp() {
    return new Date().toISOString();
  }

  formatLog(level, message, meta = {}) {
    return JSON.stringify({
      timestamp: this.getTimestamp(),
      level,
      message,
      ...meta,
    });
  }

  writeToFile(level, message, meta) {
    const logFile = path.join(this.logDir, `${level.toLowerCase()}.log`);
    const logEntry = this.formatLog(level, message, meta) + '\n';
    fs.appendFileSync(logFile, logEntry);
  }

  writeToConsole(level, message, meta) {
    const colors = {
      error: '\x1b[31m',
      warn: '\x1b[33m',
      info: '\x1b[36m',
      debug: '\x1b[90m',
      reset: '\x1b[0m',
    };
    const color = colors[level.toLowerCase()] || colors.reset;
    console.log(`${color}[${level}]${colors.reset} ${message}`, meta);
  }

  log(level, message, meta = {}) {
    this.writeToFile(level, message, meta);
    if (process.env.NODE_ENV !== 'production') {
      this.writeToConsole(level, message, meta);
    }
  }

  error(message, error, meta = {}) {
    const errorMeta = {
      ...meta,
      errorMessage: error?.message,
      errorStack: error?.stack,
      errorCode: error?.code,
    };
    this.log('ERROR', message, errorMeta);
  }

  warn(message, meta = {}) {
    this.log('WARN', message, meta);
  }

  info(message, meta = {}) {
    this.log('INFO', message, meta);
  }

  debug(message, meta = {}) {
    if (process.env.LOG_LEVEL === 'debug') {
      this.log('DEBUG', message, meta);
    }
  }
}

module.exports = new Logger();
