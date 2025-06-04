export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

export interface LogContext {
  requestId?: string;
  userId?: string;
  competitorId?: string;
  reportId?: string;
  sessionId?: string;
  [key: string]: any;
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: LogContext;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
  performance?: {
    duration: number;
    operation: string;
  };
}

export interface EventData {
  eventType: string;
  category: 'user_action' | 'system_event' | 'error' | 'performance' | 'business';
  metadata?: Record<string, any>;
}

class Logger {
  private logLevel: LogLevel;
  private context: LogContext = {};

  constructor(level: LogLevel = LogLevel.INFO) {
    this.logLevel = level;
  }

  setLogLevel(level: LogLevel): void {
    this.logLevel = level;
  }

  setContext(context: LogContext): void {
    this.context = { ...this.context, ...context };
  }

  clearContext(): void {
    this.context = {};
  }

  debug(message: string, context?: LogContext): void {
    this.log(LogLevel.DEBUG, message, context);
  }

  info(message: string, context?: LogContext): void {
    this.log(LogLevel.INFO, message, context);
  }

  warn(message: string, context?: LogContext): void {
    this.log(LogLevel.WARN, message, context);
  }

  error(message: string, error?: Error, context?: LogContext): void {
    const errorContext = error ? {
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      }
    } : {};
    
    this.log(LogLevel.ERROR, message, { ...context, ...errorContext });
  }

  performance(operation: string, duration: number, context?: LogContext): void {
    this.log(LogLevel.INFO, `Performance: ${operation}`, {
      ...context,
      performance: {
        duration,
        operation,
      }
    });
  }

  event(eventData: EventData, context?: LogContext): void {
    this.log(LogLevel.INFO, `Event: ${eventData.eventType}`, {
      ...context,
      event: eventData,
    });
  }

  private log(level: LogLevel, message: string, context?: LogContext): void {
    if (level < this.logLevel) {
      return;
    }

    const logEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context: { ...this.context, ...context },
    };

    // Extract error and performance data to top level
    if (context?.error) {
      logEntry.error = context.error;
    }
    if (context?.performance) {
      logEntry.performance = context.performance;
    }

    const formattedMessage = this.formatLog(logEntry);
    
    // Output to console with appropriate method
    switch (level) {
      case LogLevel.DEBUG:
        console.debug(formattedMessage);
        break;
      case LogLevel.INFO:
        console.log(formattedMessage);
        break;
      case LogLevel.WARN:
        console.warn(formattedMessage);
        break;
      case LogLevel.ERROR:
        console.error(formattedMessage);
        break;
    }

    // In production, you might want to send logs to external services
    this.sendToExternalService(logEntry);
  }

  private formatLog(entry: LogEntry): string {
    const level = LogLevel[entry.level];
    const timestamp = entry.timestamp;
    const message = entry.message;
    
    let formatted = `[${timestamp}] [${level}] ${message}`;
    
    if (entry.context && Object.keys(entry.context).length > 0) {
      formatted += ` | Context: ${JSON.stringify(entry.context)}`;
    }
    
    if (entry.error) {
      formatted += ` | Error: ${entry.error.name}: ${entry.error.message}`;
      if (entry.error.stack) {
        formatted += `\nStack: ${entry.error.stack}`;
      }
    }
    
    if (entry.performance) {
      formatted += ` | Performance: ${entry.performance.operation} took ${entry.performance.duration}ms`;
    }
    
    return formatted;
  }

  private sendToExternalService(entry: LogEntry): void {
    // This is where you would send logs to external services like:
    // - CloudWatch Logs
    // - DataDog
    // - Sentry
    // - Custom logging endpoint
    
    // For now, we'll just store in memory or local file in development
    if (process.env.NODE_ENV === 'development') {
      // Could write to file or send to local logging service
      return;
    }

    // Example: Send to AWS CloudWatch (implement as needed)
    // this.sendToCloudWatch(entry);
  }

  // Helper method to create performance timing
  async timeOperation<T>(
    operation: string,
    fn: () => Promise<T>,
    context?: LogContext
  ): Promise<T> {
    const start = Date.now();
    try {
      const result = await fn();
      const duration = Date.now() - start;
      this.performance(operation, duration, context);
      return result;
    } catch (error) {
      const duration = Date.now() - start;
      this.error(`${operation} failed after ${duration}ms`, error as Error, context);
      throw error;
    }
  }

  // Helper method to create a child logger with additional context
  child(context: LogContext): Logger {
    const childLogger = new Logger(this.logLevel);
    childLogger.setContext({ ...this.context, ...context });
    return childLogger;
  }
}

// Create and export a singleton logger instance
const logger = new Logger(
  process.env.NODE_ENV === 'development' ? LogLevel.DEBUG : LogLevel.INFO
);

export { logger };

// Export specific event tracking functions
export const trackEvent = (eventData: EventData, context?: LogContext) => {
  logger.event(eventData, context);
};

export const trackError = (error: Error, operation: string, context?: LogContext) => {
  logger.error(`Error in ${operation}`, error, context);
  
  // Track as event for analytics
  trackEvent({
    eventType: 'error_occurred',
    category: 'error',
    metadata: {
      operation,
      errorType: error.name,
      errorMessage: error.message,
    }
  }, context);
};

export const trackPerformance = (operation: string, duration: number, context?: LogContext) => {
  logger.performance(operation, duration, context);
  
  // Track as event for analytics
  trackEvent({
    eventType: 'performance_metric',
    category: 'performance',
    metadata: {
      operation,
      duration,
    }
  }, context);
};

export const trackUserAction = (action: string, context?: LogContext) => {
  trackEvent({
    eventType: action,
    category: 'user_action',
  }, context);
};

export const trackBusinessEvent = (event: string, metadata?: Record<string, any>, context?: LogContext) => {
  trackEvent({
    eventType: event,
    category: 'business',
    metadata,
  }, context);
}; 