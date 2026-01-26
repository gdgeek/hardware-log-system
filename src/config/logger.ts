import winston from 'winston';
import path from 'path';
import fs from 'fs';

// Get log level and file from environment variables (with defaults)
const logLevel = process.env.LOG_LEVEL || 'info';
const logFile = process.env.LOG_FILE || 'logs/app.log';

// Ensure log directory exists
const logDir = path.dirname(logFile);
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

/**
 * Custom format for log messages
 */
const customFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

/**
 * Console format for development
 */
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let metaStr = '';
    if (Object.keys(meta).length > 0) {
      metaStr = '\n' + JSON.stringify(meta, null, 2);
    }
    return `${timestamp} [${level}]: ${message}${metaStr}`;
  })
);

/**
 * Winston logger instance
 */
export const logger = winston.createLogger({
  level: logLevel,
  format: customFormat,
  transports: [
    // Write all logs to file
    new winston.transports.File({
      filename: logFile,
      maxsize: 10485760, // 10MB
      maxFiles: 5,
      tailable: true,
    }),
    // Write error logs to separate file
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      maxsize: 10485760, // 10MB
      maxFiles: 5,
      tailable: true,
    }),
  ],
});

// Add console transport (always enabled for container logs visibility)
logger.add(
  new winston.transports.Console({
    format: consoleFormat,
  })
);

/**
 * Stream for Morgan HTTP request logging
 */
export const logStream = {
  write: (message: string) => {
    logger.info(message.trim());
  },
};

/**
 * Log an error with context
 */
export function logError(message: string, error: Error, context?: Record<string, unknown>): void {
  logger.error(message, {
    error: {
      message: error.message,
      stack: error.stack,
      name: error.name,
    },
    ...context,
  });
}

/**
 * Log an API request
 */
export function logRequest(
  method: string,
  path: string,
  statusCode: number,
  duration: number,
  context?: Record<string, unknown>
): void {
  logger.info('API Request', {
    method,
    path,
    statusCode,
    duration,
    ...context,
  });
}

/**
 * Log a database operation
 */
export function logDatabaseOperation(
  operation: string,
  duration: number,
  success: boolean,
  context?: Record<string, unknown>
): void {
  const level = success ? 'info' : 'error';
  logger.log(level, 'Database Operation', {
    operation,
    duration,
    success,
    ...context,
  });
}
