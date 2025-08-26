export interface Logger {
  info(message: string, meta?: object): void;
  error(message: string, error?: Error, meta?: object): void;
  warn(message: string, meta?: object): void;
  debug(message: string, meta?: object): void;
}

// Simple console-based logger for shared use
export const createSimpleLogger = (serviceName: string): Logger => {
  const formatMessage = (level: string, message: string, meta?: object) => {
    const timestamp = new Date().toISOString();
    let log = `${timestamp} [${serviceName}] ${level.toUpperCase()}: ${message}`;
    if (meta && Object.keys(meta).length > 0) {
      log += ` ${JSON.stringify(meta)}`;
    }
    return log;
  };

  return {
    info: (message: string, meta?: object) => {
      console.log(formatMessage('info', message, meta));
    },
    error: (message: string, error?: Error, meta?: object) => {
      const errorMeta = error ? { error: error.message, stack: error.stack, ...meta } : meta;
      console.error(formatMessage('error', message, errorMeta));
    },
    warn: (message: string, meta?: object) => {
      console.warn(formatMessage('warn', message, meta));
    },
    debug: (message: string, meta?: object) => {
      if (process.env.LOG_LEVEL === 'debug') {
        console.debug(formatMessage('debug', message, meta));
      }
    }
  };
};