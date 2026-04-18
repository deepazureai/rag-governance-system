export class Logger {
  private context: string = 'App';

  constructor(context?: string) {
    if (context) {
      this.context = context;
    }
  }

  info(message: string, data?: any) {
    console.log(`[${new Date().toISOString()}] [${this.context}] INFO: ${message}`, data || '');
  }

  debug(message: string, data?: any) {
    if (process.env.DEBUG === 'true') {
      console.debug(`[${new Date().toISOString()}] [${this.context}] DEBUG: ${message}`, data || '');
    }
  }

  warn(message: string, data?: any) {
    console.warn(`[${new Date().toISOString()}] [${this.context}] WARN: ${message}`, data || '');
  }

  error(message: string, error?: any) {
    console.error(`[${new Date().toISOString()}] [${this.context}] ERROR: ${message}`, error || '');
  }
}

export const logger = new Logger();
