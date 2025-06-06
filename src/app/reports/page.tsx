'use client';

import React, { useState, useEffect } from 'react';
import { DocumentTextIcon, ArrowDownTrayIcon, ClockIcon, EyeIcon } from '@heroicons/react/24/outline';
import { useObservability } from '@/hooks/useObservability';
import ErrorBoundary from '@/components/ErrorBoundary';

interface ReportFile {
  id?: string;
  filename?: string;
  projectId: string;
  projectName?: string;
  title?: string;
  generatedAt: string;
  size?: number;
  downloadUrl: string;
  source: 'database' | 'file';
  status?: string;
  competitorName?: string;
}

function ReportsPageContent() {
  const [reports, setReports] = useState<ReportFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize observability tracking
  const observability = useObservability({
    feature: 'reports_list',
    userId: 'anonymous', // You can get this from auth context
    sessionId: 'session_' + Date.now(),
  });

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Track API call with observability
      const data = await observability.trackApiCall(
        'fetch_reports_list',
        async () => {
          const response = await fetch('/api/reports/list');
          const responseData = await response.json();
          
          if (!response.ok) {
            throw new Error(responseData.error || 'Failed to fetch reports');
          }
          
          return responseData;
        },
        {
          url: '/api/reports/list',
          operation: 'fetch_reports',
        }
      );
      
      setReports(data.reports || []);
      
      // Log successful data retrieval
      observability.logEvent('reports_loaded', 'business', {
        reportCount: data.reports?.length || 0,
        sources: data.sources,
        total: data.total,
      });
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch reports';
      setError(errorMessage);
      
      // Error is already logged by trackApiCall, but log UI state change
      observability.logEvent('reports_load_failed', 'error', {
        errorMessage,
        userVisible: true,
      });
    } finally {
      setLoading(false);
      
      // Log loading state change
      observability.logEvent('reports_loading_complete', 'system_event', {
        hasError: !!error,
        reportCount: reports.length,
      });
    }
  };

  const formatFileSize = (bytes?: number): string => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleString();
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center min-h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <header className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900">Generated Reports</h1>
        <p className="mt-2 text-gray-600">
          Download and review your competitor analysis reports
        </p>
      </header>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
          <div className="text-red-800">{error}</div>
        </div>
      )}

      {reports.length === 0 ? (
        <div className="text-center py-12">
          <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No reports yet</h3>
          <p className="mt-1 text-sm text-gray-500">
            Use the Chat Agent to generate your first competitor analysis report.
          </p>
          <div className="mt-6">
            <a
              href="/chat"
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              onClick={() => {
                observability.trackNavigation('/reports', '/chat', 'click');
              }}
            >
              Start Analysis
            </a>
          </div>
        </div>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {reports.map((report) => (
              <li key={report.id || report.filename || `${report.projectId}-${report.source}`}>
                <div className="px-4 py-4 flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <DocumentTextIcon className="h-8 w-8 text-gray-400" />
                    </div>
                    <div className="ml-4">
                      <div className="flex items-center">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {report.title || `Project: ${report.projectName || report.projectId}`}
                        </p>
                        <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          report.source === 'database' 
                            ? 'bg-blue-100 text-blue-800' 
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {report.source === 'database' ? 'Database' : 'File'}
                        </span>
                        {report.status && (
                          <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            report.status === 'COMPLETED' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {report.status}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center mt-1">
                        <ClockIcon className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                        <p className="text-sm text-gray-500">
                          Generated: {formatDate(report.generatedAt)}
                        </p>
                        {report.competitorName && (
                          <>
                            <span className="mx-2 text-gray-300">•</span>
                            <p className="text-sm text-gray-500">
                              Competitor: {report.competitorName}
                            </p>
                          </>
                        )}
                        {report.size && (
                          <>
                            <span className="mx-2 text-gray-300">•</span>
                            <p className="text-sm text-gray-500">
                              Size: {formatFileSize(report.size)}
                            </p>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <a
                      href={`/reports/${report.id || report.filename}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center px-3 py-2 border border-blue-300 shadow-sm text-sm leading-4 font-medium rounded-md text-blue-700 bg-blue-50 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      onClick={() => {
                        observability.trackInteraction('click', 'read_report_button', {
                          reportId: report.id || report.filename,
                          reportSource: report.source,
                          projectId: report.projectId,
                          competitorName: report.competitorName,
                        });
                        observability.trackNavigation('/reports', `/reports/${report.id || report.filename}`, 'click');
                      }}
                    >
                      <EyeIcon className="-ml-0.5 mr-2 h-4 w-4" />
                      Read Report
                    </a>
                    <a
                      href={report.downloadUrl}
                      className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      download
                      onClick={() => {
                        observability.trackInteraction('click', 'download_report_button', {
                          reportId: report.id || report.filename,
                          reportSource: report.source,
                          projectId: report.projectId,
                          competitorName: report.competitorName,
                          downloadUrl: report.downloadUrl,
                        });
                      }}
                    >
                      <ArrowDownTrayIcon className="-ml-0.5 mr-2 h-4 w-4" />
                      Download
                    </a>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-8 text-center">
        <button
          onClick={() => {
            observability.trackInteraction('click', 'refresh_reports_button', {
              currentReportCount: reports.length,
            });
            fetchReports();
          }}
          className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
        >
          Refresh Reports
        </button>
      </div>
    </div>
  );
}

export default function ReportsPage() {
  return (
    <ErrorBoundary 
      feature="reports_list" 
      onError={(error, errorInfo, correlationId) => {
        console.error('Reports page error boundary triggered:', {
          error: error.message,
          correlationId,
          componentStack: errorInfo.componentStack,
        });
      }}
    >
      <ReportsPageContent />
    </ErrorBoundary>
  );
} 