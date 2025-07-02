'use client';

import React from 'react';
import Link from 'next/link';
import { InitialReportStatus } from '@/hooks/useInitialReportStatus';

interface InitialReportStatusCardProps {
  projectId: string;
  status?: InitialReportStatus | null;
  onViewReport?: (reportId: string) => void;
  showProgress?: boolean;
}

const STATUS_CONFIG = {
  not_started: {
    color: 'gray',
    icon: 'clock',
    label: 'Not Started',
    description: 'Report generation has not been initiated'
  },
  generating: {
    color: 'blue',
    icon: 'spinner',
    label: 'Generating',
    description: 'Creating your competitive analysis report'
  },
  completed: {
    color: 'green',
    icon: 'check',
    label: 'Complete',
    description: 'Report is ready to view'
  },
  failed: {
    color: 'red',
    icon: 'x',
    label: 'Failed',
    description: 'Report generation encountered an error'
  }
};

const getQualityTier = (score?: number): { label: string; color: string } => {
  if (!score) return { label: 'Unknown', color: 'gray' };
  
  if (score >= 90) return { label: 'Excellent', color: 'green' };
  if (score >= 75) return { label: 'Good', color: 'blue' };
  if (score >= 60) return { label: 'Fair', color: 'yellow' };
  return { label: 'Needs Improvement', color: 'red' };
};

const getFreshnessLabel = (freshness: string): { label: string; color: string } => {
  switch (freshness) {
    case 'new':
      return { label: 'Fresh Data', color: 'green' };
    case 'existing':
      return { label: 'Existing Data', color: 'yellow' };
    case 'mixed':
      return { label: 'Mixed Data', color: 'blue' };
    case 'basic':
      return { label: 'Basic Data', color: 'gray' };
    default:
      return { label: 'Unknown', color: 'gray' };
  }
};

const StatusIcon: React.FC<{ type: string; className?: string }> = ({ type, className = "h-4 w-4" }) => {
  switch (type) {
    case 'spinner':
      return (
        <svg className={`animate-spin ${className}`} viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      );
    case 'check':
      return (
        <svg className={className} viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
      );
    case 'x':
      return (
        <svg className={className} viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
        </svg>
      );
    case 'clock':
    default:
      return (
        <svg className={className} viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
        </svg>
      );
  }
};

export default function InitialReportStatusCard({
  projectId,
  status,
  onViewReport,
  showProgress = true
}: InitialReportStatusCardProps) {
  const currentStatus = status?.status || 'not_started';
  const config = STATUS_CONFIG[currentStatus];
  const qualityTier = getQualityTier(status?.dataCompletenessScore);
  const freshnessInfo = getFreshnessLabel(status?.dataFreshness || 'basic');

  // Determine card styling based on status
  const getCardStyling = () => {
    const baseClasses = "bg-white border rounded-lg p-4 transition-all duration-200";
    
    switch (config.color) {
      case 'green':
        return `${baseClasses} border-green-200 hover:border-green-300`;
      case 'red':
        return `${baseClasses} border-red-200 hover:border-red-300`;
      case 'blue':
        return `${baseClasses} border-blue-200 hover:border-blue-300`;
      case 'yellow':
        return `${baseClasses} border-yellow-200 hover:border-yellow-300`;
      default:
        return `${baseClasses} border-gray-200 hover:border-gray-300`;
    }
  };

  const getStatusStyling = () => {
    switch (config.color) {
      case 'green':
        return 'text-green-600 bg-green-50';
      case 'red':
        return 'text-red-600 bg-red-50';
      case 'blue':
        return 'text-blue-600 bg-blue-50';
      case 'yellow':
        return 'text-yellow-600 bg-yellow-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <div className={getCardStyling()}>
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3">
          <div className={`flex-shrink-0 p-2 rounded-lg ${getStatusStyling()}`}>
            <StatusIcon type={config.icon} className={`h-5 w-5 text-${config.color}-600`} />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2">
              <h3 className="text-sm font-medium text-gray-900">
                Initial Report
              </h3>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-${config.color}-100 text-${config.color}-800`}>
                {config.label}
              </span>
            </div>
            
            <p className="mt-1 text-sm text-gray-500">
              {config.description}
            </p>

            {/* Quality and Freshness Indicators */}
            {status && currentStatus !== 'not_started' && (
              <div className="mt-2 flex items-center space-x-3">
                {status.dataCompletenessScore !== undefined && (
                  <div className="flex items-center space-x-1">
                    <span className="text-xs text-gray-500">Quality:</span>
                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-${qualityTier.color}-100 text-${qualityTier.color}-800`}>
                      {status.dataCompletenessScore}%
                    </span>
                  </div>
                )}
                
                <div className="flex items-center space-x-1">
                  <span className="text-xs text-gray-500">Data:</span>
                  <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-${freshnessInfo.color}-100 text-${freshnessInfo.color}-800`}>
                    {freshnessInfo.label}
                  </span>
                </div>
              </div>
            )}

            {/* Competitor Snapshots Summary */}
            {status?.competitorSnapshotsStatus && showProgress && (
              <div className="mt-2 text-xs text-gray-500">
                Snapshots: {status.competitorSnapshotsStatus.captured} captured
                {status.competitorSnapshotsStatus.failures && status.competitorSnapshotsStatus.failures.length > 0 && (
                  <span className="text-red-500 ml-1">
                    ({status.competitorSnapshotsStatus.failures.length} failed)
                  </span>
                )}
              </div>
            )}

            {/* Error Message */}
            {currentStatus === 'failed' && status?.error && (
              <div className="mt-2 text-xs text-red-600 bg-red-50 px-2 py-1 rounded">
                {status.error}
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex-shrink-0 ml-4">
          {currentStatus === 'completed' && status?.reportId && (
            <div className="space-y-1">
              {onViewReport ? (
                <button
                  onClick={() => onViewReport(status.reportId!)}
                  className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-green-700 bg-green-100 hover:bg-green-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                >
                  View Report
                </button>
              ) : (
                <Link
                  href={`/reports/${status.reportId}`}
                  className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-green-700 bg-green-100 hover:bg-green-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                >
                  View Report
                </Link>
              )}
              
              {status.generatedAt && (
                <div className="text-xs text-gray-500">
                  {new Date(status.generatedAt).toLocaleDateString()}
                </div>
              )}
            </div>
          )}

          {currentStatus === 'failed' && (
            <Link
              href={`/projects/${projectId}/reports/new`}
              className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Retry
            </Link>
          )}

          {currentStatus === 'not_started' && (
            <Link
              href={`/projects/${projectId}/reports/new?initial=true`}
              className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Generate
            </Link>
          )}
        </div>
      </div>

      {/* Minimal Progress Bar for Generating Status */}
      {currentStatus === 'generating' && showProgress && (
        <div className="mt-3">
          <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
            <span>Progress</span>
            <span>In Progress...</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-1.5">
            <div className="bg-blue-500 h-1.5 rounded-full animate-pulse" style={{ width: '60%' }} />
          </div>
        </div>
      )}
    </div>
  );
} 