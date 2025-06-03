import { useState, useEffect } from 'react';
import { ReportData, ReportSection, ReportVersion } from '@/lib/reports';

interface ReportGeneratorProps {
  competitorId: string;
  competitorName: string;
}

interface TimeframeOption {
  label: string;
  value: number; // days
}

const timeframeOptions: TimeframeOption[] = [
  { label: 'Last 7 Days', value: 7 },
  { label: 'Last 30 Days', value: 30 },
  { label: 'Last 90 Days', value: 90 },
];

export function ReportGeneratorView({ competitorId, competitorName }: ReportGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedTimeframe, setSelectedTimeframe] = useState<number>(30);
  const [report, setReport] = useState<ReportData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [versions, setVersions] = useState<ReportVersion[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<string | null>(null);
  const [changeLog, setChangeLog] = useState<string>('');
  const [isLoadingVersions, setIsLoadingVersions] = useState(false);

  useEffect(() => {
    if (report?.version?.number) {
      loadVersions();
    }
  }, [report?.version?.number]);

  const loadVersions = async () => {
    setIsLoadingVersions(true);
    try {
      const response = await fetch(`/api/reports/versions?competitorId=${competitorId}`);
      if (!response.ok) {
        throw new Error('Failed to load report versions');
      }
      const data = await response.json();
      setVersions(data);
    } catch (err) {
      console.error('Error loading versions:', err);
    } finally {
      setIsLoadingVersions(false);
    }
  };

  const generateReport = async () => {
    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch(`/api/reports/generate?competitorId=${competitorId}&timeframe=${selectedTimeframe}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          changeLog: changeLog.trim() || undefined,
        }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to generate report');
      }

      const data = await response.json();
      setReport(data);
      setChangeLog('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsGenerating(false);
    }
  };

  const loadVersion = async (versionId: string) => {
    try {
      const response = await fetch(`/api/reports/versions/${versionId}`);
      if (!response.ok) {
        throw new Error('Failed to load version');
      }
      const data = await response.json();
      setReport(data);
      setSelectedVersion(versionId);
    } catch (err) {
      console.error('Error loading version:', err);
      setError(err instanceof Error ? err.message : 'Failed to load version');
    }
  };

  const getSectionIcon = (type: ReportSection['type']) => {
    switch (type) {
      case 'summary':
        return '📊';
      case 'changes':
        return '📈';
      case 'trends':
        return '📋';
      case 'recommendations':
        return '💡';
      default:
        return '📄';
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Generate Competitor Report
        </h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Time Period
            </label>
            <select
              value={selectedTimeframe}
              onChange={(e) => setSelectedTimeframe(Number(e.target.value))}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              {timeframeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Change Log (optional)
            </label>
            <textarea
              value={changeLog}
              onChange={(e) => setChangeLog(e.target.value)}
              placeholder="Describe what's new in this version..."
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              rows={3}
            />
          </div>

          <button
            onClick={generateReport}
            disabled={isGenerating}
            className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
              isGenerating
                ? 'bg-blue-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {isGenerating ? 'Generating Report...' : 'Generate Report'}
          </button>

          {error && (
            <div className="text-red-600 text-sm mt-2">
              Error: {error}
            </div>
          )}
        </div>
      </div>

      {report && (
        <div className="bg-white rounded-lg shadow">
          {/* Version Selector */}
          {versions.length > 0 && (
            <div className="p-4 bg-gray-50 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <label className="text-sm font-medium text-gray-700">
                    Version:
                  </label>
                  <select
                    value={selectedVersion || ''}
                    onChange={(e) => loadVersion(e.target.value)}
                    className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  >
                    <option value="">Current</option>
                    {versions.map((v) => (
                      <option key={v.id} value={v.id}>
                        v{v.versionNumber} - {new Date(v.createdAt).toLocaleDateString()}
                      </option>
                    ))}
                  </select>
                </div>
                {report.version && (
                  <div className="text-sm text-gray-500">
                    Version {report.version.number} •{' '}
                    {new Date(report.version.createdAt).toLocaleDateString()}
                  </div>
                )}
              </div>
              {report.version?.changeLog && (
                <div className="mt-2 text-sm text-gray-600">
                  <span className="font-medium">Changes: </span>
                  {report.version.changeLog}
                </div>
              )}
            </div>
          )}

          {/* Report Header */}
          <div className="p-6 border-b border-gray-200">
            <h1 className="text-2xl font-bold text-gray-900">{report.title}</h1>
            <p className="mt-2 text-gray-600">{report.description}</p>
            
            {/* Metadata */}
            <div className="mt-4 grid grid-cols-2 gap-4 text-sm text-gray-500">
              <div>
                <span className="font-medium">Analysis Period:</span>{' '}
                {report.metadata.dateRange.start.toLocaleDateString()} -{' '}
                {report.metadata.dateRange.end.toLocaleDateString()}
              </div>
              <div>
                <span className="font-medium">Analyses Performed:</span>{' '}
                {report.metadata.analysisCount}
              </div>
              <div>
                <span className="font-medium">Significant Changes:</span>{' '}
                {report.metadata.significantChanges}
              </div>
              <div>
                <span className="font-medium">Website:</span>{' '}
                <a
                  href={report.metadata.competitor.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800"
                >
                  {report.metadata.competitor.url}
                </a>
              </div>
            </div>
          </div>

          {/* Report Sections */}
          <div className="divide-y divide-gray-200">
            {report.sections
              .sort((a, b) => a.order - b.order)
              .map((section) => (
                <div key={section.title} className="p-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                    <span className="mr-2">{getSectionIcon(section.type)}</span>
                    {section.title}
                  </h2>
                  <div className="prose max-w-none">
                    {section.content.split('\n').map((paragraph, index) => (
                      <p key={index} className="mb-4 text-gray-600">
                        {paragraph}
                      </p>
                    ))}
                  </div>
                </div>
              ))}
          </div>

          {/* Export Actions */}
          <div className="p-6 bg-gray-50 border-t border-gray-200">
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => window.print()}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                🖨️ Print Report
              </button>
              <button
                onClick={() => {/* TODO: Implement PDF export */}}
                className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700"
              >
                📥 Export as PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 