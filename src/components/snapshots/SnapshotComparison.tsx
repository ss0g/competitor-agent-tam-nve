import { useState } from 'react';
import { ContentDiff } from '@/lib/diff';

interface SnapshotComparisonProps {
  oldSnapshotId: string;
  newSnapshotId: string;
}

interface ComparisonResult {
  diff: ContentDiff;
  significantChanges: string[];
  formattedDiff: string;
  metadata: {
    oldSnapshot: {
      timestamp: string;
      title: string;
    };
    newSnapshot: {
      timestamp: string;
      title: string;
    };
  };
}

export function SnapshotComparison({ oldSnapshotId, newSnapshotId }: SnapshotComparisonProps) {
  const [comparison, setComparison] = useState<ComparisonResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const compareSnapshots = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/snapshots/compare', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          oldSnapshotId,
          newSnapshotId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to compare snapshots');
      }

      const data = await response.json();
      setComparison(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-medium text-gray-900">Compare Snapshots</h2>
        <button
          onClick={compareSnapshots}
          disabled={isLoading}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
        >
          {isLoading ? 'Comparing...' : 'Compare'}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md">
          {error}
        </div>
      )}

      {comparison && (
        <div className="space-y-6">
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <div className="px-4 py-5 sm:px-6">
              <h3 className="text-lg font-medium text-gray-900">Significant Changes</h3>
              {comparison.significantChanges.length === 0 ? (
                <p className="mt-2 text-sm text-gray-500">No significant changes detected</p>
              ) : (
                <ul className="mt-2 text-sm text-gray-500 list-disc list-inside">
                  {comparison.significantChanges.map((change, index) => (
                    <li key={index}>{change}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <div className="px-4 py-5 sm:px-6">
              <h3 className="text-lg font-medium text-gray-900">Content Changes</h3>
              <div className="mt-4">
                <div className="flex justify-between text-sm text-gray-500 mb-4">
                  <span>
                    From: {new Date(comparison.metadata.oldSnapshot.timestamp).toLocaleString()}
                  </span>
                  <span>
                    To: {new Date(comparison.metadata.newSnapshot.timestamp).toLocaleString()}
                  </span>
                </div>
                <pre className="text-sm font-mono bg-gray-50 p-4 rounded-md overflow-auto max-h-96 whitespace-pre-wrap">
                  {comparison.formattedDiff || 'No content changes'}
                </pre>
              </div>
            </div>
          </div>

          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <div className="px-4 py-5 sm:px-6">
              <h3 className="text-lg font-medium text-gray-900">Change Statistics</h3>
              <dl className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="bg-green-50 p-4 rounded-md">
                  <dt className="text-sm font-medium text-green-800">Added Lines</dt>
                  <dd className="mt-1 text-2xl font-semibold text-green-600">
                    {comparison.diff.stats.addedLines}
                  </dd>
                </div>
                <div className="bg-red-50 p-4 rounded-md">
                  <dt className="text-sm font-medium text-red-800">Removed Lines</dt>
                  <dd className="mt-1 text-2xl font-semibold text-red-600">
                    {comparison.diff.stats.removedLines}
                  </dd>
                </div>
                <div className="bg-blue-50 p-4 rounded-md">
                  <dt className="text-sm font-medium text-blue-800">Change Percentage</dt>
                  <dd className="mt-1 text-2xl font-semibold text-blue-600">
                    {comparison.diff.stats.changePercentage.toFixed(1)}%
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 