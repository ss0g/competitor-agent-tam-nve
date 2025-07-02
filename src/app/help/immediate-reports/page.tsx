'use client';

import React, { useState } from 'react';

export default function ImmediateReportsHelpPage() {
  const [activeSection, setActiveSection] = useState('overview');

  const sections = [
    { id: 'overview', title: 'Overview', icon: '📊' },
    { id: 'quick-start', title: 'Quick Start', icon: '🚀' },
    { id: 'features', title: 'Key Features', icon: '⭐' },
    { id: 'quality', title: 'Report Quality', icon: '💎' },
    { id: 'troubleshooting', title: 'Troubleshooting', icon: '🔧' },
    { id: 'best-practices', title: 'Best Practices', icon: '💡' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Immediate Competitive Reports Guide
          </h1>
          <p className="mt-2 text-lg text-gray-600">
            Complete guide to generating instant competitive analysis reports
          </p>
        </div>

        <div className="flex gap-8">
          <div className="w-64 flex-shrink-0">
            <div className="sticky top-8">
              <nav className="space-y-1">
                {sections.map((section) => (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                      activeSection === section.id
                        ? 'bg-indigo-100 text-indigo-700 border-l-4 border-indigo-500'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <span className="mr-3">{section.icon}</span>
                    {section.title}
                  </button>
                ))}
              </nav>
            </div>
          </div>

          <div className="flex-1 max-w-4xl">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
              {activeSection === 'overview' && (
                <div className="space-y-6">
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">
                    What are Immediate Reports?
                  </h2>
                  <p className="text-gray-700 leading-7 mb-4">
                    Immediate reports generate your first competitive analysis instantly upon project creation, 
                    rather than waiting for the next scheduled run. This feature captures fresh competitor data 
                    in real-time and provides immediate insights into your competitive landscape.
                  </p>
                  
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-blue-900 mb-3">
                      🎯 Key Benefits
                    </h3>
                    <ul className="space-y-2 text-blue-800">
                      <li>✓ <strong>Instant Insights:</strong> Get competitive analysis within 45 seconds</li>
                      <li>✓ <strong>Fresh Data:</strong> Analysis based on current competitor state</li>
                      <li>✓ <strong>Quality Transparency:</strong> Clear indicators of data completeness</li>
                      <li>✓ <strong>Graceful Fallbacks:</strong> Handles data capture issues smoothly</li>
                    </ul>
                  </div>
                </div>
              )}

              {activeSection === 'quick-start' && (
                <div className="space-y-6">
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">
                    Quick Start Guide
                  </h2>
                  <div className="space-y-4">
                    <div className="border-l-4 border-indigo-500 pl-4">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        Step 1: Create a New Project
                      </h3>
                      <p className="text-gray-700">Navigate to "New Project" from your dashboard.</p>
                    </div>
                    <div className="border-l-4 border-indigo-500 pl-4">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        Step 2: Enter Product Details
                      </h3>
                      <p className="text-gray-700">Provide comprehensive product information including name, website, positioning, and target customers.</p>
                    </div>
                    <div className="border-l-4 border-indigo-500 pl-4">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        Step 3: Enable Immediate Reports
                      </h3>
                      <p className="text-gray-700">Check "Generate report immediately" and select your preferred template.</p>
                    </div>
                  </div>
                </div>
              )}

              {activeSection === 'features' && (
                <div className="space-y-6">
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">Key Features</h2>
                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="border border-gray-200 rounded-lg p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">⚡ Real-time Data Capture</h3>
                      <p className="text-gray-600">Fresh competitor snapshots captured during project creation.</p>
                    </div>
                    <div className="border border-gray-200 rounded-lg p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">📊 Quality Indicators</h3>
                      <p className="text-gray-600">Transparent quality scoring shows data completeness.</p>
                    </div>
                  </div>
                </div>
              )}

              {activeSection === 'quality' && (
                <div className="space-y-6">
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">Report Quality</h2>
                  <div className="space-y-3">
                    <div className="p-3 bg-green-100 rounded">
                      <span className="font-medium text-green-900">Excellent (90-100%)</span>
                      <p className="text-sm text-green-700">Fresh data, comprehensive analysis</p>
                    </div>
                    <div className="p-3 bg-blue-100 rounded">
                      <span className="font-medium text-blue-900">Good (75-89%)</span>
                      <p className="text-sm text-blue-700">Solid insights with minor limitations</p>
                    </div>
                    <div className="p-3 bg-yellow-100 rounded">
                      <span className="font-medium text-yellow-900">Fair (60-74%)</span>
                      <p className="text-sm text-yellow-700">Useful analysis with some data gaps</p>
                    </div>
                  </div>
                </div>
              )}

              {activeSection === 'troubleshooting' && (
                <div className="space-y-6">
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">Troubleshooting</h2>
                  <div className="space-y-4">
                    <div className="border border-red-200 rounded-lg p-4 bg-red-50">
                      <h3 className="font-semibold text-red-900 mb-2">Snapshot Capture Issues</h3>
                      <p className="text-red-700 text-sm">Some competitor websites may be inaccessible. The system will use existing data as fallback.</p>
                    </div>
                    <div className="border border-yellow-200 rounded-lg p-4 bg-yellow-50">
                      <h3 className="font-semibold text-yellow-900 mb-2">Timeout Issues</h3>
                      <p className="text-yellow-700 text-sm">Reports automatically move to background processing after 60 seconds.</p>
                    </div>
                  </div>
                </div>
              )}

              {activeSection === 'best-practices' && (
                <div className="space-y-6">
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">Best Practices</h2>
                  <div className="space-y-4">
                    <div className="border-l-4 border-indigo-500 pl-4">
                      <h4 className="font-medium text-gray-900">Choose Direct Competitors</h4>
                      <p className="text-sm text-gray-600">Select companies that directly compete for your target customers</p>
                    </div>
                    <div className="border-l-4 border-indigo-500 pl-4">
                      <h4 className="font-medium text-gray-900">Enable Fresh Snapshots</h4>
                      <p className="text-sm text-gray-600">Always check "Require fresh competitor snapshots" for best quality</p>
                    </div>
                    <div className="border-l-4 border-indigo-500 pl-4">
                      <h4 className="font-medium text-gray-900">Complete Product Information</h4>
                      <p className="text-sm text-gray-600">Fill out all product information fields thoroughly</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
