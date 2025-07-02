'use client';

import React, { useEffect, useState } from 'react';
import { useInitialReportStatus, InitialReportStatusUpdate } from '@/hooks/useInitialReportStatus';
import { ProjectCreationErrorState, categorizeError, ErrorDisplay, ErrorRecoveryOptions } from './ErrorHandling';

interface InitialReportProgressIndicatorProps {
  projectId: string;
  onComplete?: (reportId: string) => void;
  onError?: (error: string) => void;
  compact?: boolean;
  showEstimatedTime?: boolean;
}

const PHASE_LABELS = {
  validation: 'Validating Project Data',
  snapshot_capture: 'Capturing Competitor Snapshots',
  data_collection: 'Collecting Additional Data',
  analysis: 'Analyzing Competitive Landscape',
  report_generation: 'Generating Report',
  completed: 'Report Complete'
} as const;

const PHASE_DESCRIPTIONS = {
  validation: 'Checking product information and competitor data availability',
  snapshot_capture: 'Capturing fresh snapshots from competitor websites',
  data_collection: 'Gathering additional competitive intelligence data',
  analysis: 'Running AI analysis on collected competitive data',
  report_generation: 'Creating your comprehensive competitive report',
  completed: 'Your competitive analysis report is ready!'
} as const;

export default function InitialReportProgressIndicator({
  projectId,
  onComplete,
  onError,
  compact = false,
  showEstimatedTime = true
}: InitialReportProgressIndicatorProps) {
  const [retryCount, setRetryCount] = useState(0);
  const [showDetails, setShowDetails] = useState(false);

  const {
    currentStatus,
    lastUpdate,
    isConnected,
    error: connectionError,
    connect,
    disconnect,
    fetchCurrentStatus
  } = useInitialReportStatus({
    projectId,
    autoConnect: true,
    onStatusUpdate: (update: InitialReportStatusUpdate) => {
      console.log('Progress update:', update);
    },
    onComplete: (reportId: string, dataCompletenessScore?: number) => {
      console.log('Report generation completed:', { reportId, dataCompletenessScore });
      onComplete?.(reportId);
    },
    onError: (error: string) => {
      console.error('Report generation error:', error);
      onError?.(error);
    }
  });

  // Fetch initial status on mount
  useEffect(() => {
    fetchCurrentStatus();
  }, [fetchCurrentStatus]);

  // Handle retry functionality
  const handleRetry = async () => {
    setRetryCount(prev => prev + 1);
    await fetchCurrentStatus();
    connect();
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  // Don't render if no project ID
  if (!projectId) {
    return null;
  }

  // If already completed and report exists, show success state
  if (currentStatus?.status === 'completed' && currentStatus?.reportExists) {
    return (
      <div className={`bg-green-50 border border-green-200 rounded-lg p-4 ${compact ? 'text-sm' : ''}`}>
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3 flex-1">
            <h3 className="text-sm font-medium text-green-800">
              Report Generation Complete!
            </h3>
            <div className="mt-1 text-sm text-green-700">
              Your competitive analysis report is ready to view.
              {currentStatus.dataCompletenessScore && (
                <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  {currentStatus.dataCompletenessScore}% Complete
                </span>
              )}
              <div className="mt-2 text-xs text-green-600">
                <a href="/help/immediate-reports#quality" target="_blank" className="underline hover:text-green-700">
                  Understanding quality scores
                </a>
              </div>
            </div>
            {currentStatus.reportId && onComplete && (
              <button
                onClick={() => onComplete(currentStatus.reportId!)}
                className="mt-2 inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-green-700 bg-green-100 hover:bg-green-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
              >
                View Report
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Error state with enhanced error handling
  if (currentStatus?.status === 'failed' || connectionError) {
    const rawError = {
      message: currentStatus?.error || connectionError || 'Unknown error occurred',
      status: currentStatus?.status === 'failed' ? 500 : 0,
      context: {
        projectId,
        phase: lastUpdate?.phase || 'unknown',
        isConnected,
        retryCount
      }
    };

    const errorState = categorizeError(rawError, {
      phase: lastUpdate?.phase || 'report_generation',
      projectId
    });

    // Add fallback options specific to report generation
    errorState.fallbackOptions = [
      {
        label: 'Retry Generation',
        description: 'Try generating the report again with the same parameters',
        action: handleRetry,
        primary: true
      },
      {
        label: 'Schedule for Later',
        description: 'Move report generation to background queue',
        action: () => {
          // This would call an API to schedule the report for later
          console.log('Scheduling report for later processing');
          onError?.('Report generation has been scheduled for background processing');
        }
      },
      {
        label: 'Continue to Project',
        description: 'Proceed to your project without the initial report',
        action: () => {
          // Navigate to project without report
          window.location.href = `/projects/${projectId}`;
        }
      }
    ];

    const handleRetryWithReducedScope = async () => {
      console.log('Retrying with reduced scope - skipping failed competitors');
      setRetryCount(prev => prev + 1);
      // This would call the API with reduced scope parameters
      await fetchCurrentStatus();
      connect();
    };

    const handleScheduleForLater = () => {
      console.log('Scheduling report for later processing');
      onError?.('Report generation has been scheduled for background processing');
    };

    const handleProceedWithoutReport = () => {
      window.location.href = `/projects/${projectId}`;
    };

    const handleContactSupport = () => {
      const supportUrl = new URL('/support', window.location.origin);
      supportUrl.searchParams.set('ref', errorState.supportInfo?.correlationId || '');
      supportUrl.searchParams.set('projectId', projectId);
      supportUrl.searchParams.set('issue', 'report-generation-failed');
      window.open(supportUrl.toString(), '_blank');
    };

    return (
      <div className={compact ? 'space-y-2' : 'space-y-4'}>
        <ErrorDisplay
          error={errorState}
          onRetry={handleRetry}
          compact={compact}
          showTechnicalDetails={showDetails}
        />
        
        {!compact && (
          <ErrorRecoveryOptions
            error={errorState}
            projectId={projectId}
            onRetryWithSameParams={handleRetry}
            onRetryWithReducedScope={handleRetryWithReducedScope}
            onScheduleForLater={handleScheduleForLater}
            onProceedWithoutReport={handleProceedWithoutReport}
            onContactSupport={handleContactSupport}
          />
        )}

        {/* Development debug info */}
        {process.env.NODE_ENV === 'development' && showDetails && (
          <div className="bg-gray-100 border border-gray-200 rounded p-3 text-xs font-mono">
            <div><strong>Debug Info:</strong></div>
            <div>Project ID: {projectId}</div>
            <div>Status: {currentStatus?.status || 'unknown'}</div>
            <div>Connected: {isConnected ? 'Yes' : 'No'}</div>
            <div>Retry Count: {retryCount}</div>
            <div>Phase: {lastUpdate?.phase || 'unknown'}</div>
            {lastUpdate && (
              <div>Last Update: {new Date(lastUpdate.timestamp).toLocaleString()}</div>
            )}
          </div>
        )}
      </div>
    );
  }

  // Progress state
  const progress = lastUpdate?.progress || 0;
  const phase = lastUpdate?.phase || 'validation';
  const isGenerating = currentStatus?.status === 'generating' || lastUpdate?.status === 'generating';

  return (
    <div className={`bg-blue-50 border border-blue-200 rounded-lg p-4 ${compact ? 'text-sm' : ''}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            {isGenerating ? (
              <svg className="animate-spin h-5 w-5 text-blue-500" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            ) : (
              <svg className="h-5 w-5 text-blue-500" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            )}
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">
              {PHASE_LABELS[phase]}
            </h3>
            <p className="text-sm text-blue-600">
              {PHASE_DESCRIPTIONS[phase]}
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium text-blue-800">{progress}%</span>
          <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
            isConnected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            {isConnected ? 'Connected' : 'Disconnected'}
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-blue-200 rounded-full h-2 mb-3">
        <div 
          className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Competitor Snapshots Status */}
      {lastUpdate?.competitorSnapshotsStatus && (
        <div className="mb-3 p-3 bg-blue-100 rounded">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-blue-800">Competitor Snapshots</span>
            <span className="text-blue-600">
              {lastUpdate.competitorSnapshotsStatus.captured} / {lastUpdate.competitorSnapshotsStatus.total}
            </span>
          </div>
          {lastUpdate.competitorSnapshotsStatus.current && (
            <div className="mt-1 text-xs text-blue-600">
              Currently processing: {lastUpdate.competitorSnapshotsStatus.current}
            </div>
          )}
          <div className="mt-2 w-full bg-blue-200 rounded-full h-1">
            <div 
              className="bg-blue-500 h-1 rounded-full transition-all duration-300"
              style={{ 
                width: `${(lastUpdate.competitorSnapshotsStatus.captured / lastUpdate.competitorSnapshotsStatus.total) * 100}%` 
              }}
            />
          </div>
        </div>
      )}

      {/* Estimated Completion Time */}
      {showEstimatedTime && lastUpdate?.estimatedCompletionTime && (
        <div className="text-xs text-blue-600">
          Estimated completion: {new Date(lastUpdate.estimatedCompletionTime).toLocaleTimeString()}
        </div>
      )}

      {/* Real-time Message */}
      {lastUpdate?.message && (
        <div className="mt-2 text-xs text-blue-700 bg-blue-100 px-2 py-1 rounded">
          {lastUpdate.message}
        </div>
      )}

      {/* Last Update Timestamp */}
      {lastUpdate?.timestamp && (
        <div className="mt-2 text-xs text-blue-500">
          Last updated: {new Date(lastUpdate.timestamp).toLocaleTimeString()}
        </div>
      )}
    </div>
  );
} 