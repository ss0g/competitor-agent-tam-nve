'use client';

import Link from 'next/link'
import { useState, useEffect } from 'react';

interface ReportFile {
  filename: string;
  projectId: string;
  generatedAt: string;
  size: number;
  downloadUrl: string;
}

export default function Home() {
  const [recentReports, setRecentReports] = useState<ReportFile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRecentReports();
  }, []);

  const fetchRecentReports = async () => {
    try {
      const response = await fetch('/api/reports/list');
      const data = await response.json();
      
      if (response.ok) {
        // Get the 3 most recent reports
        setRecentReports((data.reports || []).slice(0, 3));
      }
    } catch (error) {
      console.error('Error fetching reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <header className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900">Competitor Research Dashboard</h1>
        <p className="mt-2 text-gray-600">Monitor and analyze your competitors in real-time</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Chat Agent Card - Featured */}
        <div className="md:col-span-2 lg:col-span-1 bg-gradient-to-r from-blue-600 to-blue-700 p-6 rounded-lg shadow-md text-white">
          <h2 className="text-xl font-semibold mb-4">🤖 AI Chat Agent</h2>
          <p className="text-blue-100 mb-4">
            Start a conversation with our AI agent to set up automated competitor research projects.
          </p>
          <Link 
            href="/chat" 
            className="block w-full text-center bg-white text-blue-600 py-2 px-4 rounded hover:bg-blue-50 transition font-medium"
          >
            Start Chat Session
          </Link>
        </div>

        {/* Quick Actions Card */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="space-y-3">
            <Link 
              href="/chat" 
              className="block w-full text-center bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 transition"
            >
              New Analysis Project
            </Link>
            <Link 
              href="/reports" 
              className="block w-full text-center bg-green-600 text-white py-2 px-4 rounded hover:bg-green-700 transition"
            >
              View All Reports
            </Link>
          </div>
        </div>

        {/* Recent Reports Card */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Reports</h2>
          {loading ? (
            <div className="flex justify-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            </div>
          ) : recentReports.length === 0 ? (
            <div className="space-y-3">
              <p className="text-gray-600">No reports generated yet</p>
              <p className="text-sm text-gray-500">
                Use the Chat Agent to set up your first automated competitor analysis project.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentReports.map((report) => (
                <div key={report.filename} className="border-l-4 border-blue-500 pl-3">
                  <p className="text-sm font-medium text-gray-900">
                    {report.projectId}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatDate(report.generatedAt)}
                  </p>
                  <a 
                    href={report.downloadUrl}
                    className="text-xs text-blue-600 hover:text-blue-800"
                    download
                  >
                    Download Report
                  </a>
                </div>
              ))}
              <Link 
                href="/reports"
                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                View all reports →
              </Link>
            </div>
          )}
        </div>

        {/* Status Card */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">System Status</h2>
          <div className="space-y-3">
            <div className="flex items-center">
              <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
              <span className="text-sm text-gray-600">Chat Agent Online</span>
            </div>
            <div className="flex items-center">
              <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
              <span className="text-sm text-gray-600">Report Generator Ready</span>
            </div>
            <div className="flex items-center">
              <div className="w-2 h-2 bg-blue-400 rounded-full mr-2"></div>
              <span className="text-sm text-gray-600">Analysis Engine Active</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
