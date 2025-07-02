'use client';

import React, { useState } from 'react';

// Enhanced error state interface
export interface ProjectCreationErrorState {
  type: 'validation' | 'snapshot_capture' | 'analysis' | 'generation' | 'timeout' | 'system' | 'network' | 'rate_limit';
  message: string;
  retryable: boolean;
  retryAction?: () => Promise<void>;
  fallbackOptions?: Array<{
    label: string;
    action: () => void;
    description: string;
    primary?: boolean;
  }>;
  supportInfo?: {
    correlationId: string;
    errorCode: string;
    timestamp: string;
    projectId?: string;
    phase?: string;
  };
  technicalDetails?: string;
  userImpact?: 'low' | 'medium' | 'high';
}

// User-friendly error messages
const ERROR_MESSAGES = {
  COMPETITOR_SNAPSHOT_FAILED: {
    title: "Competitor Data Capture Issues",
    message: "Some competitor websites couldn't be captured. Your report will use existing data where available.",
    userImpact: 'medium' as const,
    retryable: true
  },
  ANALYSIS_TIMEOUT: {
    title: "Report Taking Longer Than Expected",
    message: "Report generation is taking longer than expected. We've moved it to our background queue.",
    userImpact: 'low' as const,
    retryable: false
  },
  RATE_LIMIT_EXCEEDED: {
    title: "High System Load",
    message: "We're currently processing many requests. Your report has been queued and will complete shortly.",
    userImpact: 'low' as const,
    retryable: false
  },
  NETWORK_ERROR: {
    title: "Connection Issue",
    message: "Connection issue detected. Please check your internet connection and try again.",
    userImpact: 'high' as const,
    retryable: true
  },
  SYSTEM_ERROR: {
    title: "Technical Issue",
    message: "Technical issue encountered. Our team has been notified and your project data is safe.",
    userImpact: 'high' as const,
    retryable: true
  },
  VALIDATION_ERROR: {
    title: "Project Setup Issue",
    message: "There's an issue with your project setup. Please review the information and try again.",
    userImpact: 'medium' as const,
    retryable: true
  },
  SNAPSHOT_CAPTURE_TIMEOUT: {
    title: "Competitor Website Timeout",
    message: "Some competitor websites are taking too long to respond. We'll continue with available data.",
    userImpact: 'medium' as const,
    retryable: true
  }
};

// Error categorization helper
export const categorizeError = (error: any, context?: { phase?: string; projectId?: string }): ProjectCreationErrorState => {
  const timestamp = new Date().toISOString();
  const correlationId = `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Network/connection errors
  if (error.name === 'TypeError' || error.message?.includes('fetch') || error.message?.includes('network')) {
    return {
      type: 'network',
      ...ERROR_MESSAGES.NETWORK_ERROR,
      retryable: true,
      supportInfo: {
        correlationId,
        errorCode: 'NETWORK_ERROR',
        timestamp,
        ...context
      },
      technicalDetails: error.message
    };
  }

  // Rate limiting errors
  if (error.status === 429 || error.message?.includes('rate limit') || error.message?.includes('quota')) {
    return {
      type: 'rate_limit',
      ...ERROR_MESSAGES.RATE_LIMIT_EXCEEDED,
      retryable: false,
      supportInfo: {
        correlationId,
        errorCode: 'RATE_LIMIT_EXCEEDED',
        timestamp,
        ...context
      },
      technicalDetails: error.message
    };
  }

  // Validation errors
  if (error.status === 400 || error.message?.includes('validation') || error.message?.includes('required')) {
    return {
      type: 'validation',
      ...ERROR_MESSAGES.VALIDATION_ERROR,
      retryable: true,
      supportInfo: {
        correlationId,
        errorCode: 'VALIDATION_ERROR',
        timestamp,
        ...context
      },
      technicalDetails: error.message
    };
  }

  // Timeout errors
  if (error.message?.includes('timeout') || error.code === 'TIMEOUT') {
    const isSnapshotTimeout = context?.phase === 'snapshot_capture';
    const errorInfo = isSnapshotTimeout ? ERROR_MESSAGES.SNAPSHOT_CAPTURE_TIMEOUT : ERROR_MESSAGES.ANALYSIS_TIMEOUT;
    
    return {
      type: 'timeout',
      ...errorInfo,
      retryable: isSnapshotTimeout,
      supportInfo: {
        correlationId,
        errorCode: isSnapshotTimeout ? 'SNAPSHOT_TIMEOUT' : 'ANALYSIS_TIMEOUT',
        timestamp,
        ...context
      },
      technicalDetails: error.message
    };
  }

  // Default system error
  return {
    type: 'system',
    ...ERROR_MESSAGES.SYSTEM_ERROR,
    retryable: true,
    supportInfo: {
      correlationId,
      errorCode: 'SYSTEM_ERROR',
      timestamp,
      ...context
    },
    technicalDetails: error.message || error.toString()
  };
};

interface ErrorDisplayProps {
  error: ProjectCreationErrorState;
  onRetry?: () => Promise<void>;
  onSelectFallback?: (option: ProjectCreationErrorState['fallbackOptions'][0]) => void;
  onContactSupport?: () => void;
  compact?: boolean;
  showTechnicalDetails?: boolean;
}

export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
  error,
  onRetry,
  onSelectFallback,
  onContactSupport,
  compact = false,
  showTechnicalDetails = false
}) => {
  const [isRetrying, setIsRetrying] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const handleRetry = async () => {
    if (!error.retryable || !onRetry) return;

    setIsRetrying(true);
    try {
      await onRetry();
      setRetryCount(prev => prev + 1);
    } catch (retryError) {
      console.error('Retry failed:', retryError);
    } finally {
      setIsRetrying(false);
    }
  };

  const getErrorStyling = () => {
    switch (error.userImpact) {
      case 'high':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'medium':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'low':
        return 'bg-blue-50 border-blue-200 text-blue-800';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  const getIconColor = () => {
    switch (error.userImpact) {
      case 'high':
        return 'text-red-400';
      case 'medium':
        return 'text-yellow-400';
      case 'low':
        return 'text-blue-400';
      default:
        return 'text-gray-400';
    }
  };

  return (
    <div className={`border rounded-lg p-4 ${getErrorStyling()} ${compact ? 'text-sm' : ''}`}>
      <div className="flex items-start">
        <div className="flex-shrink-0">
          {error.userImpact === 'high' ? (
            <svg className={`h-5 w-5 ${getIconColor()}`} viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          ) : error.userImpact === 'medium' ? (
            <svg className={`h-5 w-5 ${getIconColor()}`} viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          ) : (
            <svg className={`h-5 w-5 ${getIconColor()}`} viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          )}
        </div>
        
        <div className="ml-3 flex-1">
          <h3 className={`font-medium ${compact ? 'text-sm' : 'text-base'}`}>
            {error.title}
          </h3>
          <p className={`mt-1 ${compact ? 'text-xs' : 'text-sm'}`}>
            {error.message}
          </p>

          {/* Action Buttons */}
          <div className="mt-4 flex flex-wrap gap-2">
            {error.retryable && onRetry && (
              <button
                onClick={handleRetry}
                disabled={isRetrying}
                className={`inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded ${
                  error.userImpact === 'high' 
                    ? 'text-red-700 bg-red-100 hover:bg-red-200 focus:ring-red-500' 
                    : error.userImpact === 'medium'
                    ? 'text-yellow-700 bg-yellow-100 hover:bg-yellow-200 focus:ring-yellow-500'
                    : 'text-blue-700 bg-blue-100 hover:bg-blue-200 focus:ring-blue-500'
                } focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50`}
              >
                {isRetrying ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-3 w-3" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Retrying...
                  </>
                ) : (
                  <>
                    Try Again
                    {retryCount > 0 && ` (${retryCount + 1})`}
                  </>
                )}
              </button>
            )}

            {error.fallbackOptions && error.fallbackOptions.length > 0 && (
              <>
                {error.fallbackOptions.map((option, index) => (
                  <button
                    key={index}
                    onClick={() => onSelectFallback?.(option)}
                    className={`inline-flex items-center px-3 py-1.5 border text-xs font-medium rounded focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                      option.primary 
                        ? 'border-transparent bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-indigo-500'
                        : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50 focus:ring-indigo-500'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </>
            )}

            <button
              onClick={() => setShowDetails(!showDetails)}
              className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              {showDetails ? 'Hide Details' : 'Show Details'}
            </button>

            {onContactSupport && (
              <button
                onClick={onContactSupport}
                className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Contact Support
              </button>
            )}
          </div>

          {/* Technical Details */}
          {showDetails && (
            <div className="mt-4 p-3 bg-white bg-opacity-50 rounded border text-xs font-mono">
              <div className="space-y-1">
                <div><strong>Error ID:</strong> {error.supportInfo?.correlationId}</div>
                <div><strong>Error Code:</strong> {error.supportInfo?.errorCode}</div>
                <div><strong>Timestamp:</strong> {error.supportInfo?.timestamp}</div>
                {error.supportInfo?.projectId && (
                  <div><strong>Project ID:</strong> {error.supportInfo.projectId}</div>
                )}
                {error.supportInfo?.phase && (
                  <div><strong>Phase:</strong> {error.supportInfo.phase}</div>
                )}
                <div><strong>Type:</strong> {error.type}</div>
                {error.technicalDetails && (
                  <div className="mt-2">
                    <strong>Technical Details:</strong>
                    <div className="mt-1 p-2 bg-gray-100 rounded text-xs">
                      {error.technicalDetails}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Error Recovery Options Component
interface ErrorRecoveryOptionsProps {
  error: ProjectCreationErrorState;
  projectId?: string;
  onRetryWithSameParams: () => Promise<void>;
  onRetryWithReducedScope: () => Promise<void>;
  onScheduleForLater: () => void;
  onProceedWithoutReport: () => void;
  onContactSupport: () => void;
}

export const ErrorRecoveryOptions: React.FC<ErrorRecoveryOptionsProps> = ({
  error,
  projectId,
  onRetryWithSameParams,
  onRetryWithReducedScope,
  onScheduleForLater,
  onProceedWithoutReport,
  onContactSupport
}) => {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);

  const executeOption = async (optionKey: string, action: () => Promise<void> | void) => {
    setSelectedOption(optionKey);
    setIsExecuting(true);
    
    try {
      await action();
    } catch (error) {
      console.error('Recovery option failed:', error);
    } finally {
      setIsExecuting(false);
      setSelectedOption(null);
    }
  };

  const recoveryOptions = [
    {
      key: 'retry-same',
      title: 'Try Again',
      description: 'Retry with the same settings and parameters',
      icon: '🔄',
      action: () => executeOption('retry-same', onRetryWithSameParams),
      available: error.retryable,
      primary: error.type === 'network' || error.type === 'timeout'
    },
    {
      key: 'retry-reduced',
      title: 'Try with Reduced Scope',
      description: 'Skip failed competitors and use existing data where possible',
      icon: '⚡',
      action: () => executeOption('retry-reduced', onRetryWithReducedScope),
      available: error.type === 'snapshot_capture' || error.type === 'timeout',
      primary: error.type === 'snapshot_capture'
    },
    {
      key: 'schedule-later',
      title: 'Schedule for Later',
      description: 'Move report generation to background queue for processing',
      icon: '⏰',
      action: () => executeOption('schedule-later', async () => onScheduleForLater()),
      available: true,
      primary: error.type === 'rate_limit'
    },
    {
      key: 'proceed-without',
      title: 'Proceed to Project',
      description: 'Continue to your project without the initial report',
      icon: '➡️',
      action: () => executeOption('proceed-without', async () => onProceedWithoutReport()),
      available: true,
      primary: false
    },
    {
      key: 'contact-support',
      title: 'Contact Support',
      description: 'Get help from our technical support team',
      icon: '🆘',
      action: () => executeOption('contact-support', async () => onContactSupport()),
      available: error.userImpact === 'high',
      primary: false
    }
  ];

  const availableOptions = recoveryOptions.filter(option => option.available);

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Recovery Options</h3>
      <p className="text-sm text-gray-600 mb-6">
        Choose how you'd like to proceed. We recommend trying the highlighted option first.
      </p>
      
      <div className="space-y-3">
        {availableOptions.map((option) => (
          <button
            key={option.key}
            onClick={option.action}
            disabled={isExecuting}
            className={`w-full text-left p-4 border rounded-lg transition-all duration-200 ${
              option.primary 
                ? 'border-indigo-200 bg-indigo-50 hover:bg-indigo-100' 
                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
            } ${isExecuting ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            <div className="flex items-start">
              <span className="text-2xl mr-3 mt-1">{option.icon}</span>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h4 className={`font-medium ${option.primary ? 'text-indigo-900' : 'text-gray-900'}`}>
                    {option.title}
                    {option.primary && (
                      <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-800">
                        Recommended
                      </span>
                    )}
                  </h4>
                  {selectedOption === option.key && isExecuting && (
                    <svg className="animate-spin h-4 w-4 text-indigo-600" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  )}
                </div>
                <p className={`text-sm mt-1 ${option.primary ? 'text-indigo-700' : 'text-gray-600'}`}>
                  {option.description}
                </p>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Error Context */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <h4 className="text-sm font-medium text-gray-900 mb-2">Error Context</h4>
        <div className="text-xs text-gray-600 space-y-1">
          <div>Error Type: <span className="font-mono">{error.type}</span></div>
          <div>Impact Level: <span className="font-mono">{error.userImpact}</span></div>
          {error.supportInfo?.correlationId && (
            <div>Reference ID: <span className="font-mono">{error.supportInfo.correlationId}</span></div>
          )}
        </div>
      </div>
    </div>
  );
}; 