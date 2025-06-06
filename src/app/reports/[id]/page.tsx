'use client';

import React, { useState, useEffect } from 'react';
import { ArrowLeftIcon, ArrowDownTrayIcon, PrinterIcon } from '@heroicons/react/24/outline';
import { useParams, useRouter } from 'next/navigation';
import ReportViewer from '@/components/reports/ReportViewer';
import { ReportData } from '@/types/report';
import { useObservability } from '@/hooks/useObservability';
import ErrorBoundary from '@/components/ErrorBoundary';

function ReportViewerPageContent() {
  const params = useParams();
  const router = useRouter();
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reportId = params?.id as string;

  // Initialize observability tracking
  const observability = useObservability({
    feature: 'report_viewer',
    userId: 'anonymous', // You can get this from auth context
    sessionId: 'session_' + Date.now(),
  });

  useEffect(() => {
    if (reportId) {
      fetchReport();
    }
  }, [reportId]);

  const fetchReport = async () => {
    try {
      setLoading(true);
      setError(null);

      // Log report fetch attempt
      observability.logEvent('report_fetch_started', 'system_event', {
        reportId,
        source: reportId.endsWith('.md') ? 'file' : 'database',
      });

      // Track the fetch operation with automatic performance and error logging
      const reportData = await observability.trackApiCall(
        'fetch_report_data',
        async () => {
          // First try as database report
          let response = await fetch(`/api/reports/database/${reportId}`);
          
          if (response.ok) {
            const markdown = await response.text();
            return { markdown, source: 'database' };
          } else if (reportId.endsWith('.md')) {
            // Try as file report
            response = await fetch(`/api/reports/download?filename=${encodeURIComponent(reportId)}`);
            if (response.ok) {
              const markdown = await response.text();
              return { markdown, source: 'file' };
            } else {
              throw new Error('Report not found');
            }
          } else {
            throw new Error('Report not found');
          }
        },
        {
          reportId,
          operation: 'fetch_report',
        }
      );

      // Parse the markdown with performance tracking
      const parseStartTime = performance.now();
      const parsedReport = parseMarkdownReport(reportData.markdown);
      const parseDuration = observability.logPerformance('parse_markdown_report', parseStartTime, {
        reportId,
        source: reportData.source,
        markdownLength: reportData.markdown.length,
      });

      setReport(parsedReport);

      // Log successful report load
      observability.logEvent('report_loaded', 'business', {
        reportId,
        source: reportData.source,
        title: parsedReport.title,
        sectionCount: parsedReport.sections?.length || 0,
        contentLength: reportData.markdown.length,
        parseDuration,
      });

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load report';
      setError(errorMessage);
      
      // Error is already logged by trackApiCall, but log UI state change
      observability.logEvent('report_load_failed', 'error', {
        reportId,
        errorMessage,
        userVisible: true,
      });
    } finally {
      setLoading(false);
      
      // Log loading completion
      observability.logEvent('report_loading_complete', 'system_event', {
        reportId,
        hasError: !!error,
        loadSuccess: !!report,
      });
    }
  };

  const parseMarkdownReport = (markdown: string): ReportData => {
    const lines = markdown.split('\n');
    const report: ReportData = {
      sections: [],
      rawContent: markdown
    };

    let currentSection: { title: string; content: string; order: number } | null = null;
    let sectionOrder = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Extract title (first # header)
      if (line.startsWith('# ') && !report.title) {
        report.title = line.substring(2);
        continue;
      }

      // Extract main sections (## headers)
      if (line.startsWith('## ')) {
        // Save previous section
        if (currentSection && currentSection.content.trim()) {
          report.sections!.push(currentSection);
        }

        // Start new section
        const sectionTitle = line.substring(3);
        currentSection = {
          title: sectionTitle,
          content: '',
          order: sectionOrder++
        };
        continue;
      }

      // Extract metadata from Report Details section
      if (line.startsWith('- **') && currentSection?.title === 'Report Details') {
        if (line.includes('Project:')) {
          report.projectName = line.split('Project:**')[1]?.trim();
        } else if (line.includes('Competitor:')) {
          report.competitorName = line.split('Competitor:**')[1]?.trim();
        } else if (line.includes('Generated:')) {
          report.generatedAt = line.split('Generated:**')[1]?.trim();
        } else if (line.includes('Status:')) {
          report.status = line.split('Status:**')[1]?.trim();
        }
        // Add to section content
        if (currentSection) {
          currentSection.content += line + '\n';
        }
        continue;
      }

      // Add to current section content
      if (currentSection) {
        currentSection.content += line + '\n';
      } else if (!report.description && line && !line.startsWith('#')) {
        // Use first non-header line as description
        report.description = line;
      }
    }

    // Add final section
    if (currentSection && currentSection.content.trim()) {
      report.sections!.push(currentSection);
    }

    return report;
  };

  const handlePrint = () => {
    observability.trackInteraction('click', 'print_report_button', {
      reportId,
      reportTitle: report?.title,
    });
    
    observability.logEvent('report_print_initiated', 'user_action', {
      reportId,
      reportTitle: report?.title,
    });
    
    window.print();
  };

  const handleDownload = () => {
    if (report?.rawContent) {
      observability.trackInteraction('click', 'download_report_button', {
        reportId,
        reportTitle: report?.title,
        contentLength: report.rawContent.length,
      });

      const blob = new Blob([report.rawContent], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${report.title || 'report'}.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      observability.logEvent('report_download_completed', 'user_action', {
        reportId,
        reportTitle: report?.title,
        filename: `${report.title || 'report'}.md`,
        contentLength: report.rawContent.length,
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div 
          className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"
          role="status"
          aria-label="Loading report"
        ></div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Report Not Found</h1>
          <p className="text-gray-600 mb-4">{error || 'The requested report could not be found.'}</p>
          <button
            onClick={() => {
              observability.trackInteraction('click', 'error_go_back_button', {
                reportId,
                errorMessage: error,
              });
              observability.trackNavigation(`/reports/${reportId}`, '/reports', 'click');
              router.back();
            }}
            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            <ArrowLeftIcon className="-ml-0.5 mr-2 h-4 w-4" />
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200 print:hidden">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => {
                observability.trackInteraction('click', 'back_to_reports_button', {
                  reportId,
                  reportTitle: report?.title,
                });
                observability.trackNavigation(`/reports/${reportId}`, '/reports', 'click');
                router.back();
              }}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              <ArrowLeftIcon className="-ml-0.5 mr-2 h-4 w-4" />
              Back to Reports
            </button>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={handlePrint}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                <PrinterIcon className="-ml-0.5 mr-2 h-4 w-4" />
                Print
              </button>
              <button
                onClick={handleDownload}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                <ArrowDownTrayIcon className="-ml-0.5 mr-2 h-4 w-4" />
                Download
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Report Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <ReportViewer report={report} />
      </div>
    </div>
  );
}

export default function ReportViewerPage() {
  return (
    <ErrorBoundary 
      feature="report_viewer" 
      onError={(error, errorInfo, correlationId) => {
        console.error('Report viewer error boundary triggered:', {
          error: error.message,
          correlationId,
          componentStack: errorInfo.componentStack,
        });
      }}
    >
      <ReportViewerPageContent />
    </ErrorBoundary>
  );
} 