import winston from 'winston';
import path from 'path';
import { Logger } from '../../../shared/logger';

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf(({ timestamp, level, message, service, stack, ...meta }: any) => {
    let log = `${timestamp} [${service}] ${level.toUpperCase()}: ${message}`;
    if (Object.keys(meta).length > 0) {
      log += ` ${JSON.stringify(meta)}`;
    }
    if (stack) {
      log += `\n${stack}`;
    }
    return log;
  })
);

export const createLogger = (serviceName: string): Logger => {
  // Ensure logs directory exists
  const logsDir = process.env.NODE_ENV === 'production' ? '/app/logs' : './logs';
  
  const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: logFormat,
    defaultMeta: { service: serviceName },
    transports: [
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.simple()
        )
      }),
      new winston.transports.File({ 
        filename: path.join(logsDir, `${serviceName}.log`),
        level: 'info'
      }),
      new winston.transports.File({ 
        filename: path.join(logsDir, `${serviceName}-error.log`),
        level: 'error'
      }),
      new winston.transports.File({ 
        filename: path.join(logsDir, 'combined.log')
      })
    ],
  });

  return {
    info: (message: string, meta?: object) => logger.info(message, meta),
    error: (message: string, error?: Error, meta?: object) => {
      if (error) {
        logger.error(message, { error: error.message, stack: error.stack, ...meta });
      } else {
        logger.error(message, meta);
      }
    },
    warn: (message: string, meta?: object) => logger.warn(message, meta),
    debug: (message: string, meta?: object) => logger.debug(message, meta)
  };
};