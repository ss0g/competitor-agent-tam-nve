'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { ExclamationTriangleIcon, ArrowPathIcon, ArrowLeftIcon } from '@heroicons/react/24/outline';
import { trackError, generateCorrelationId, LogContext } from '@/lib/logger';

interface Props {
  children: ReactNode;
  fallbackComponent?: React.ComponentType<{ error: Error; resetError: () => void; correlationId: string }>;
  feature?: string;
  onError?: (error: Error, errorInfo: ErrorInfo, correlationId: string) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  correlationId: string;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      correlationId: generateCorrelationId(),
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
      correlationId: generateCorrelationId(),
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const { feature, onError } = this.props;
    const { correlationId } = this.state;

    // Log error with comprehensive context
    const logContext: LogContext = {
      correlationId,
      feature: feature || 'unknown',
      componentStack: errorInfo.componentStack,
      errorBoundary: true,
    };

    trackError(error, 'react_error_boundary', logContext);

    // Call custom error handler if provided
    if (onError) {
      onError(error, errorInfo, correlationId);
    }

    this.setState({ errorInfo });

    // Log to external services in production
    if (process.env.NODE_ENV === 'production') {
      this.logToExternalServices(error, errorInfo, correlationId);
    }
  }

  private logToExternalServices(error: Error, errorInfo: ErrorInfo, correlationId: string) {
    // Here you would integrate with external error tracking services
    // Examples: Sentry, LogRocket, Bugsnag, etc.
    console.error('Error logged to external services:', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      correlationId,
      timestamp: new Date().toISOString(),
    });
  }

  resetError = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      correlationId: generateCorrelationId(),
    });
  };

  render() {
    const { hasError, error, correlationId } = this.state;
    const { children, fallbackComponent: FallbackComponent, feature } = this.props;

    if (hasError && error) {
      // Use custom fallback component if provided
      if (FallbackComponent) {
        return (
          <FallbackComponent 
            error={error} 
            resetError={this.resetError} 
            correlationId={correlationId}
          />
        );
      }

      // Default error UI
      return (
        <DefaultErrorFallback 
          error={error}
          resetError={this.resetError}
          correlationId={correlationId}
          feature={feature}
        />
      );
    }

    return children;
  }
}

interface DefaultErrorFallbackProps {
  error: Error;
  resetError: () => void;
  correlationId: string;
  feature?: string;
}

const DefaultErrorFallback: React.FC<DefaultErrorFallbackProps> = ({
  error,
  resetError,
  correlationId,
  feature,
}) => {
  const handleGoBack = () => {
    trackError(
      new Error('User navigated back from error page'),
      'error_page_navigation',
      { correlationId, feature, action: 'go_back' }
    );
    window.history.back();
  };

  const handleRetry = () => {
    trackError(
      new Error('User attempted error recovery'),
      'error_page_retry',
      { correlationId, feature, action: 'retry' }
    );
    resetError();
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto">
        <div className="bg-white shadow-lg rounded-lg p-6">
          {/* Error Icon */}
          <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full">
            <ExclamationTriangleIcon className="w-6 h-6 text-red-600" />
          </div>

          {/* Error Title */}
          <div className="mt-4 text-center">
            <h3 className="text-lg font-medium text-gray-900">
              Something went wrong
            </h3>
            <p className="mt-2 text-sm text-gray-500">
              We encountered an unexpected error while loading the {feature || 'page'}.
            </p>
          </div>

          {/* Error Details (Development Only) */}
          {process.env.NODE_ENV === 'development' && (
            <div className="mt-4 p-3 bg-gray-100 rounded-md">
              <p className="text-xs font-mono text-gray-700 break-all">
                {error.message}
              </p>
            </div>
          )}

          {/* Correlation ID */}
          <div className="mt-4 p-2 bg-blue-50 rounded-md">
            <p className="text-xs text-blue-700">
              Error ID: <span className="font-mono">{correlationId}</span>
            </p>
            <p className="text-xs text-blue-600 mt-1">
              Please provide this ID when contacting support.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="mt-6 flex flex-col space-y-3 sm:flex-row sm:space-y-0 sm:space-x-3">
            <button
              onClick={handleRetry}
              className="flex-1 flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <ArrowPathIcon className="w-4 h-4 mr-2" />
              Try Again
            </button>
            <button
              onClick={handleGoBack}
              className="flex-1 flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <ArrowLeftIcon className="w-4 h-4 mr-2" />
              Go Back
            </button>
          </div>

          {/* Additional Help */}
          <div className="mt-4 text-center">
            <p className="text-xs text-gray-500">
              If this problem persists, please{' '}
              <a 
                href="/support" 
                className="text-blue-600 hover:text-blue-500"
                onClick={() => {
                  trackError(
                    new Error('User clicked support link from error page'),
                    'error_page_support_link',
                    { correlationId, feature, action: 'support_link' }
                  );
                }}
              >
                contact support
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ErrorBoundary; 