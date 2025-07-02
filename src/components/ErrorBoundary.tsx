'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { ProjectCreationErrorState, categorizeError, ErrorDisplay } from './projects/ErrorHandling';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  context?: {
    component: string;
    projectId?: string;
    phase?: string;
  };
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorState: ProjectCreationErrorState | null;
  retryCount: number;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);

    this.state = {
      hasError: false,
      error: null,
      errorState: null,
      retryCount: 0
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorState: null,
      retryCount: 0
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    // Categorize the error for better user experience
    const errorState = categorizeError(error, {
      phase: this.props.context?.phase || 'component_render',
      projectId: this.props.context?.projectId
    });

    this.setState({ errorState });

    // Call the onError callback if provided
    this.props.onError?.(error, errorInfo);

    // Send error to monitoring service
    this.reportError(error, errorInfo, errorState);
  }

  private reportError = (error: Error, errorInfo: ErrorInfo, errorState: ProjectCreationErrorState) => {
    // This would integrate with your error tracking service (e.g., Sentry, Bugsnag)
    try {
      const errorReport = {
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        correlationId: errorState.supportInfo?.correlationId,
        context: this.props.context,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href
      };

      // Send to error tracking service
      console.error('Error Report:', errorReport);
      
      // You could also send this to your analytics service
      // analytics.track('Component Error', errorReport);
    } catch (reportingError) {
      console.error('Failed to report error:', reportingError);
    }
  };

  private handleRetry = async () => {
    this.setState(prevState => ({
      hasError: false,
      error: null,
      errorState: null,
      retryCount: prevState.retryCount + 1
    }));
  };

  private handleContactSupport = () => {
    const { errorState, error } = this.state;
    const supportUrl = new URL('/support', window.location.origin);
    
    if (errorState?.supportInfo?.correlationId) {
      supportUrl.searchParams.set('ref', errorState.supportInfo.correlationId);
    }
    
    if (error?.message) {
      supportUrl.searchParams.set('error', error.message.substring(0, 200));
    }

    if (this.props.context?.projectId) {
      supportUrl.searchParams.set('projectId', this.props.context.projectId);
    }

    window.open(supportUrl.toString(), '_blank');
  };

  render() {
    if (this.state.hasError) {
      // Custom error UI using our enhanced error handling
      if (this.state.errorState) {
        return (
          <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
              <div className="text-center">
                <svg
                  className="mx-auto h-12 w-12 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.732 15.5c-.77.833.192 2.5 1.732 2.5z"
                  />
                </svg>
                <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
                  Something went wrong
                </h2>
                <p className="mt-2 text-center text-sm text-gray-600">
                  We're sorry for the inconvenience. Our team has been notified.
                </p>
              </div>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
              <ErrorDisplay
                error={this.state.errorState}
                onRetry={this.handleRetry}
                onContactSupport={this.handleContactSupport}
                showTechnicalDetails={false}
              />
            </div>

            {/* Development info */}
            {process.env.NODE_ENV === 'development' && (
              <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-2xl">
                <details className="bg-white border border-gray-200 rounded-lg p-4">
                  <summary className="text-sm font-medium text-gray-900 cursor-pointer">
                    Development Error Details
                  </summary>
                  <div className="mt-4 space-y-4">
                    <div>
                      <h4 className="text-sm font-medium text-gray-900">Error Message:</h4>
                      <pre className="mt-1 text-xs text-gray-600 bg-gray-50 p-2 rounded overflow-auto">
                        {this.state.error?.message}
                      </pre>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-900">Stack Trace:</h4>
                      <pre className="mt-1 text-xs text-gray-600 bg-gray-50 p-2 rounded overflow-auto max-h-40">
                        {this.state.error?.stack}
                      </pre>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-900">Context:</h4>
                      <pre className="mt-1 text-xs text-gray-600 bg-gray-50 p-2 rounded overflow-auto">
                        {JSON.stringify(this.props.context, null, 2)}
                      </pre>
                    </div>
                  </div>
                </details>
              </div>
            )}
          </div>
        );
      }

      // Fallback error UI if error categorization fails
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
          <div className="sm:mx-auto sm:w-full sm:max-w-md">
            <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
              <div className="text-center">
                <svg
                  className="mx-auto h-12 w-12 text-red-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.732 15.5c-.77.833.192 2.5 1.732 2.5z"
                  />
                </svg>
                <h2 className="mt-6 text-center text-2xl font-bold text-gray-900">
                  Unexpected Error
                </h2>
                <p className="mt-2 text-center text-sm text-gray-600">
                  Something went wrong. Please refresh the page or try again.
                </p>
                <div className="mt-6">
                  <button
                    onClick={this.handleRetry}
                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    Try Again {this.state.retryCount > 0 && `(${this.state.retryCount + 1})`}
                  </button>
                </div>
                <div className="mt-4">
                  <button
                    onClick={this.handleContactSupport}
                    className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    Contact Support
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary; 