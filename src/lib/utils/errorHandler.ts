import { NextResponse } from 'next/server';
import { logger, trackError } from '../logger';

export interface APIError extends Error {
  statusCode?: number;
  code?: string;
  retryable?: boolean;
  userMessage?: string;
}

export interface ErrorHandlerOptions {
  operation: string;
  context?: Record<string, any>;
  fallbackMessage?: string;
  includeStackTrace?: boolean;
}

export class APIErrorHandler {
  static handle(error: Error, options: ErrorHandlerOptions): NextResponse {
    const {
      operation,
      context = {},
      fallbackMessage = 'An unexpected error occurred',
      includeStackTrace = false
    } = options;

    // Track the error for monitoring
    trackError(error, operation, context);

    // Enhance the error with better messaging
    const enhancedError = this.enhanceError(error);
    
    // Log the error with appropriate level
    if (enhancedError.statusCode && enhancedError.statusCode < 500) {
      logger.warn(`${operation} client error: ${enhancedError.message}`, context);
    } else {
      logger.error(`${operation} server error: ${enhancedError.message}`, enhancedError, context);
    }

    // Prepare response
    const statusCode = enhancedError.statusCode || 500;
    const userMessage = enhancedError.userMessage || enhancedError.message || fallbackMessage;
    
    const responseBody: any = {
      error: userMessage,
      code: enhancedError.code || 'UNKNOWN_ERROR',
      timestamp: new Date().toISOString(),
      operation
    };

    // Include retry information for retryable errors
    if (enhancedError.retryable) {
      responseBody.retryable = true;
      responseBody.retryAfter = this.getRetryAfter(enhancedError);
    }

    // Include context for debugging (only in development)
    if (process.env.NODE_ENV === 'development') {
      responseBody.context = context;
      if (includeStackTrace) {
        responseBody.stack = enhancedError.stack;
      }
    }

    return NextResponse.json(responseBody, { status: statusCode });
  }

  private static enhanceError(error: Error): APIError {
    const enhanced = error as APIError;

    // AWS Credential Errors
    if (error.name === 'ExpiredTokenException' || error.message.includes('token included in the request is expired')) {
      enhanced.statusCode = 503;
      enhanced.code = 'AWS_CREDENTIALS_EXPIRED';
      enhanced.userMessage = 'The service is temporarily unavailable due to expired credentials. Please try again later.';
      enhanced.retryable = false; // Requires manual intervention
      return enhanced;
    }

    if (error.name === 'UnauthorizedOperation' || error.message.includes('credentials')) {
      enhanced.statusCode = 503;
      enhanced.code = 'AWS_CREDENTIALS_INVALID';
      enhanced.userMessage = 'The service is temporarily unavailable due to authentication issues. Please try again later.';
      enhanced.retryable = false;
      return enhanced;
    }

    // AWS Region Errors
    if (error.message.includes('region') && error.message.includes('Bedrock')) {
      enhanced.statusCode = 503;
      enhanced.code = 'AWS_REGION_UNAVAILABLE';
      enhanced.userMessage = 'The AI service is not available in this region. Please contact support.';
      enhanced.retryable = false;
      return enhanced;
    }

    // Rate Limiting Errors
    if (error.name.includes('Throttling') || error.name.includes('TooManyRequests') || error.message.includes('rate limit')) {
      enhanced.statusCode = 429;
      enhanced.code = 'RATE_LIMIT_EXCEEDED';
      enhanced.userMessage = 'Service is temporarily overloaded. Please try again in a few minutes.';
      enhanced.retryable = true;
      return enhanced;
    }

    // Database Errors
    if (error.message.includes('database') || error.message.includes('connection') || error.message.includes('Prisma')) {
      enhanced.statusCode = 503;
      enhanced.code = 'DATABASE_ERROR';
      enhanced.userMessage = 'Database service is temporarily unavailable. Please try again later.';
      enhanced.retryable = true;
      return enhanced;
    }

    // Network Errors
    if (error.message.includes('ECONNRESET') || error.message.includes('ETIMEDOUT') || error.message.includes('ENOTFOUND')) {
      enhanced.statusCode = 503;
      enhanced.code = 'NETWORK_ERROR';
      enhanced.userMessage = 'Network connectivity issue. Please try again later.';
      enhanced.retryable = true;
      return enhanced;
    }

    // Validation Errors
    if (error.name === 'ValidationError' || error.message.includes('validation')) {
      enhanced.statusCode = 400;
      enhanced.code = 'VALIDATION_ERROR';
      enhanced.userMessage = error.message;
      enhanced.retryable = false;
      return enhanced;
    }

    // Authentication Errors
    if (error.message.includes('Unauthorized') || error.message.includes('authentication')) {
      enhanced.statusCode = 401;
      enhanced.code = 'AUTHENTICATION_ERROR';
      enhanced.userMessage = 'Authentication required. Please log in and try again.';
      enhanced.retryable = false;
      return enhanced;
    }

    // Not Found Errors
    if (error.message.includes('not found') || error.message.includes('Not found')) {
      enhanced.statusCode = 404;
      enhanced.code = 'RESOURCE_NOT_FOUND';
      enhanced.userMessage = 'The requested resource was not found.';
      enhanced.retryable = false;
      return enhanced;
    }

    // Service Unavailable
    if (error.name.includes('ServiceUnavailable') || error.message.includes('service unavailable')) {
      enhanced.statusCode = 503;
      enhanced.code = 'SERVICE_UNAVAILABLE';
      enhanced.userMessage = 'Service is temporarily unavailable. Please try again later.';
      enhanced.retryable = true;
      return enhanced;
    }

    // Report-specific errors
    if (error.name.includes('Report') || error.message.includes('report generation')) {
      enhanced.statusCode = 503;
      enhanced.code = 'REPORT_GENERATION_ERROR';
      enhanced.userMessage = 'Report generation service is temporarily unavailable. Please try again later.';
      enhanced.retryable = true;
      return enhanced;
    }

    // Analysis-specific errors
    if (error.name.includes('Analysis') || error.message.includes('analysis')) {
      enhanced.statusCode = 503;
      enhanced.code = 'ANALYSIS_ERROR';
      enhanced.userMessage = 'Analysis service is temporarily unavailable. Please try again later.';
      enhanced.retryable = true;
      return enhanced;
    }

    // Default to internal server error
    enhanced.statusCode = enhanced.statusCode || 500;
    enhanced.code = enhanced.code || 'INTERNAL_SERVER_ERROR';
    enhanced.userMessage = enhanced.userMessage || 'An unexpected error occurred. Please try again later.';
    enhanced.retryable = enhanced.retryable ?? true;

    return enhanced;
  }

  private static getRetryAfter(error: APIError): number {
    // Return retry delay in seconds based on error type
    switch (error.code) {
      case 'RATE_LIMIT_EXCEEDED':
        return 300; // 5 minutes for rate limits
      case 'DATABASE_ERROR':
        return 60; // 1 minute for database issues
      case 'NETWORK_ERROR':
        return 30; // 30 seconds for network issues
      case 'SERVICE_UNAVAILABLE':
        return 120; // 2 minutes for service issues
      default:
        return 60; // Default 1 minute
    }
  }

  static createError(message: string, statusCode: number = 500, code?: string, retryable: boolean = true): APIError {
    const error = new Error(message) as APIError;
    error.statusCode = statusCode;
    error.code = code;
    error.retryable = retryable;
    return error;
  }

  static isRetryableError(error: Error): boolean {
    const apiError = error as APIError;
    return apiError.retryable ?? true;
  }
}

// Utility function for API routes
export function handleAPIError(error: Error, operation: string, context?: Record<string, any>): NextResponse {
  return APIErrorHandler.handle(error, {
    operation,
    context,
    includeStackTrace: process.env.NODE_ENV === 'development'
  });
}

// Higher-order function for wrapping API route handlers
export function withErrorHandling<T extends any[], R>(
  handler: (...args: T) => Promise<R>,
  operation: string
) {
  return async (...args: T): Promise<R | NextResponse> => {
    try {
      return await handler(...args);
    } catch (error) {
      return handleAPIError(error as Error, operation);
    }
  };
} 