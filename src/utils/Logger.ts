import winston from 'winston';
import * as path from 'path';

/**
 * Logger utility using Winston
 */
export class Logger {
  private static instance: winston.Logger;

  /**
   * Get logger instance
   */
  static getInstance(): winston.Logger {
    if (!this.instance) {
      this.instance = winston.createLogger({
        level: process.env.LOG_LEVEL || 'info',
        format: winston.format.combine(
          winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
          winston.format.errors({ stack: true }),
          winston.format.splat(),
          winston.format.printf(({ level, message, timestamp, ...metadata }) => {
            let msg = `${timestamp} [${level.toUpperCase()}]: ${message}`;
            if (Object.keys(metadata).length > 0) {
              msg += ` ${JSON.stringify(metadata)}`;
            }
            return msg;
          })
        ),
        transports: [
          new winston.transports.Console({
            format: winston.format.combine(
              winston.format.colorize(),
              winston.format.printf(({ level, message, timestamp }) => {
                return `${timestamp} ${level}: ${message}`;
              })
            ),
          }),
        ],
      });
    }

    return this.instance;
  }

  /**
   * Add file transport for logging to file
   */
  static addFileTransport(outputDir: string): void {
    const logger = this.getInstance();
    const logFile = path.join(outputDir, `sitediff-${Date.now()}.log`);

    logger.add(
      new winston.transports.File({
        filename: logFile,
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.json()
        ),
      })
    );

    logger.info(`Logging to file: ${logFile}`);
  }

  /**
   * Set log level
   */
  static setLevel(level: string): void {
    this.getInstance().level = level;
  }
}

// Export convenience methods
export const logger = Logger.getInstance();
