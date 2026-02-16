/**
 * Production-ready logging utility
 * Replaces console.log with structured logging that can be disabled in production
 */

import * as Sentry from '@sentry/react-native';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogConfig {
  enableDebug: boolean;
  enableInfo: boolean;
  enableWarn: boolean;
  enableError: boolean;
  enableSentry: boolean;
}

const config: LogConfig = {
  enableDebug: __DEV__,
  enableInfo: true,
  enableWarn: true,
  enableError: true,
  enableSentry: !__DEV__,
};

class Logger {
  private prefix: string;

  constructor(prefix: string = '') {
    this.prefix = prefix;
  }

  private formatMessage(level: LogLevel, message: string, ...args: any[]): string {
    const timestamp = new Date().toISOString();
    const prefixStr = this.prefix ? `[${this.prefix}]` : '';
    return `${timestamp} ${level.toUpperCase()} ${prefixStr} ${message}`;
  }

  private sanitizeArgs(args: any[]): any[] {
    return args.map(arg => {
      if (typeof arg === 'object' && arg !== null) {
        const sanitized = { ...arg };
        // Remove sensitive fields
        const sensitiveKeys = ['password', 'token', 'apiKey', 'secret', 'creditCard', 'cvv', 'pin'];
        sensitiveKeys.forEach(key => {
          if (key in sanitized) {
            sanitized[key] = '[REDACTED]';
          }
        });
        return sanitized;
      }
      return arg;
    });
  }

  debug(message: string, ...args: any[]): void {
    if (config.enableDebug) {
      const sanitized = this.sanitizeArgs(args);
      console.log(this.formatMessage('debug', message), ...sanitized);
    }
  }

  info(message: string, ...args: any[]): void {
    if (config.enableInfo) {
      const sanitized = this.sanitizeArgs(args);
      console.log(this.formatMessage('info', message), ...sanitized);
    }
  }

  warn(message: string, ...args: any[]): void {
    if (config.enableWarn) {
      const sanitized = this.sanitizeArgs(args);
      console.warn(this.formatMessage('warn', message), ...sanitized);
      
      if (config.enableSentry) {
        Sentry.captureMessage(message, {
          level: 'warning',
          extra: { args: sanitized },
        });
      }
    }
  }

  error(message: string, error?: Error | any, ...args: any[]): void {
    if (config.enableError) {
      const sanitized = this.sanitizeArgs(args);
      console.error(this.formatMessage('error', message), error, ...sanitized);
      
      if (config.enableSentry && error) {
        Sentry.captureException(error, {
          extra: { message, args: sanitized },
        });
      }
    }
  }

  // Performance logging
  time(label: string): void {
    if (config.enableDebug) {
      console.time(label);
    }
  }

  timeEnd(label: string): void {
    if (config.enableDebug) {
      console.timeEnd(label);
    }
  }

  // Create child logger with prefix
  child(prefix: string): Logger {
    return new Logger(this.prefix ? `${this.prefix}:${prefix}` : prefix);
  }
}

// Export singleton instance
export const logger = new Logger();

// Export factory for creating prefixed loggers
export const createLogger = (prefix: string): Logger => new Logger(prefix);

// Export for testing/configuration
export const configureLogger = (newConfig: Partial<LogConfig>): void => {
  Object.assign(config, newConfig);
};
