'use client';

import { useState } from 'react';
import type { ContentAnalysis, AnalysisInsight } from '@/lib/analysis';
import { TokenUsageDisplay } from './TokenUsageDisplay';

interface ContentAnalysisProps {
  analysis: ContentAnalysis;
  isLoading?: boolean;
}

interface AnalysisTabProps {
  analysis: AnalysisInsight;
  isActive: boolean;
}

function AnalysisTab({ analysis, isActive }: AnalysisTabProps) {
  const [activeTab, setActiveTab] = useState<keyof AnalysisInsight>('summary');

  const tabs: Array<{ key: keyof AnalysisInsight; label: string }> = [
    { key: 'summary', label: 'Summary' },
    { key: 'keyChanges', label: 'Key Changes' },
    { key: 'marketingChanges', label: 'Marketing' },
    { key: 'productChanges', label: 'Product' },
    { key: 'competitiveInsights', label: 'Insights' },
    { key: 'suggestedActions', label: 'Actions' },
  ];

  const renderContent = (content: string | string[]) => {
    if (typeof content === 'string') {
      return <p className="text-gray-600">{content}</p>;
    }

    return (
      <ul className="list-disc list-inside space-y-2">
        {content.map((item, index) => (
          <li key={index} className="text-gray-600">
            {item}
          </li>
        ))}
      </ul>
    );
  };

  if (!isActive) return null;

  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200">
        <nav className="flex space-x-4 px-4" aria-label="Tabs">
          {tabs.map(({ key, label: tabLabel }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`
                px-3 py-2 text-sm font-medium rounded-md
                ${
                  activeTab === key
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-500 hover:text-gray-700'
                }
              `}
            >
              {tabLabel}
            </button>
          ))}
        </nav>
      </div>

      <div className="prose max-w-none">
        {renderContent(analysis[activeTab])}
      </div>
    </div>
  );
}

export function ContentAnalysisView({ analysis, isLoading = false }: ContentAnalysisProps) {
  const [activeAnalysis, setActiveAnalysis] = useState<'primary' | 'secondary'>('primary');

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        <div className="h-4 bg-gray-200 rounded w-5/6"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex space-x-4">
          <button
            onClick={() => setActiveAnalysis('primary')}
            className={`
              px-4 py-2 text-sm font-medium rounded-md
              ${
                activeAnalysis === 'primary'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }
            `}
          >
            Claude Analysis
          </button>
          <button
            onClick={() => setActiveAnalysis('secondary')}
            className={`
              px-4 py-2 text-sm font-medium rounded-md
              ${
                activeAnalysis === 'secondary'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }
            `}
          >
            Mistral Analysis
          </button>
        </div>

        <div className="text-sm text-gray-600">
          <div>Agreement: {(analysis.confidence.agreement * 100).toFixed(1)}%</div>
          <div>Key Points Overlap: {(analysis.confidence.keyPointsOverlap * 100).toFixed(1)}%</div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <AnalysisTab
          analysis={analysis.primary}
          isActive={activeAnalysis === 'primary'}
        />
        <AnalysisTab
          analysis={analysis.secondary}
          isActive={activeAnalysis === 'secondary'}
        />
      </div>

      {/* Token Usage Display */}
      <TokenUsageDisplay usage={analysis.usage} />
    </div>
  );
} 