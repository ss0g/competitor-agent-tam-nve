'use client';

import React, { useState, useEffect } from 'react';
import { DocumentTextIcon, ArrowDownTrayIcon, ClockIcon } from '@heroicons/react/24/outline';

interface ReportFile {
  filename: string;
  projectId: string;
  generatedAt: string;
  size: number;
  downloadUrl: string;
}

export default function ReportsPage() {
  const [reports, setReports] = useState<ReportFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/reports/list');
      const data = await response.json();
      
      if (response.ok) {
        setReports(data.reports || []);
      } else {
        setError(data.error || 'Failed to fetch reports');
      }
    } catch (err) {
      setError('Failed to fetch reports');
      console.error('Error fetching reports:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
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
            >
              Start Analysis
            </a>
          </div>
        </div>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {reports.map((report) => (
              <li key={report.filename}>
                <div className="px-4 py-4 flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <DocumentTextIcon className="h-8 w-8 text-gray-400" />
                    </div>
                    <div className="ml-4">
                      <div className="flex items-center">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          Project: {report.projectId}
                        </p>
                      </div>
                      <div className="flex items-center mt-1">
                        <ClockIcon className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                        <p className="text-sm text-gray-500">
                          Generated: {formatDate(report.generatedAt)}
                        </p>
                        <span className="mx-2 text-gray-300">•</span>
                        <p className="text-sm text-gray-500">
                          Size: {formatFileSize(report.size)}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <a
                      href={report.downloadUrl}
                      className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      download
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
          onClick={fetchReports}
          className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
        >
          Refresh Reports
        </button>
      </div>
    </div>
  );
} 