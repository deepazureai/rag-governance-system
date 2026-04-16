export class FrontendLogger {
  static log(level: 'debug' | 'info' | 'warn' | 'error', message: string, meta?: Record<string, any>) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...meta,
    };

    const jsonString = JSON.stringify(logEntry);

    switch (level) {
      case 'error':
        console.error(jsonString);
        break;
      case 'warn':
        console.warn(jsonString);
        break;
      case 'info':
        console.info(jsonString);
        break;
      case 'debug':
        console.debug(jsonString);
        break;
    }
  }

  static error(message: string, error?: Error, meta?: Record<string, any>) {
    this.log('error', message, {
      errorMessage: error?.message,
      errorStack: error?.stack,
      ...meta,
    });
  }

  static warn(message: string, meta?: Record<string, any>) {
    this.log('warn', message, meta);
  }

  static info(message: string, meta?: Record<string, any>) {
    this.log('info', message, meta);
  }

  static debug(message: string, meta?: Record<string, any>) {
    this.log('debug', message, meta);
  }
}
