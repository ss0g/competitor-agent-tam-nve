import { TrendAnalysis } from '@/lib/trends';
import { useMemo } from 'react';

interface TrendAnalysisProps {
  trends: TrendAnalysis[];
  isLoading?: boolean;
}

interface CategoryData {
  trends: TrendAnalysis[];
  averageImpact: number;
  averageConfidence: number;
}

export function TrendAnalysisView({ trends, isLoading = false }: TrendAnalysisProps) {
  const categoryData = useMemo(() => {
    const categories = trends.reduce((acc, trend) => {
      if (!acc[trend.category]) {
        acc[trend.category] = {
          trends: [],
          averageImpact: 0,
          averageConfidence: 0,
        };
      }
      acc[trend.category].trends.push(trend);
      return acc;
    }, {} as Record<string, CategoryData>);

    // Calculate averages
    Object.values(categories).forEach(category => {
      const totalTrends = category.trends.length;
      category.averageImpact = category.trends.reduce((sum, t) => sum + t.impact, 0) / totalTrends;
      category.averageConfidence = category.trends.reduce((sum, t) => sum + t.confidence, 0) / totalTrends;
    });

    return categories;
  }, [trends]);

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        <div className="h-4 bg-gray-200 rounded w-5/6"></div>
      </div>
    );
  }

  if (trends.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        Not enough historical data to analyze trends.
      </div>
    );
  }

  const getCategoryColor = (category: string) => {
    switch (category.toLowerCase()) {
      case 'product':
        return 'bg-blue-50 border-blue-200';
      case 'marketing':
        return 'bg-purple-50 border-purple-200';
      case 'competitive':
        return 'bg-green-50 border-green-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const getImpactColor = (impact: number) => {
    if (impact > 0.5) return 'text-green-600';
    if (impact > 0) return 'text-green-500';
    if (impact === 0) return 'text-gray-500';
    if (impact > -0.5) return 'text-red-500';
    return 'text-red-600';
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence > 0.8) return 'text-green-600';
    if (confidence > 0.6) return 'text-green-500';
    if (confidence > 0.4) return 'text-yellow-500';
    return 'text-red-500';
  };

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900">Historical Trends Analysis</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Object.entries(categoryData).map(([category, data]) => (
          <div
            key={category}
            className={`rounded-lg border p-4 ${getCategoryColor(category)}`}
          >
            <div className="flex justify-between items-center mb-4">
              <h4 className="font-medium text-gray-900">{category}</h4>
              <div className="text-sm">
                <div className={getImpactColor(data.averageImpact)}>
                  Impact: {(data.averageImpact * 100).toFixed(1)}%
                </div>
                <div className={getConfidenceColor(data.averageConfidence)}>
                  Confidence: {(data.averageConfidence * 100).toFixed(1)}%
                </div>
              </div>
            </div>

            <div className="space-y-3">
              {data.trends.map((trend, index) => (
                <div key={index} className="bg-white rounded p-3 shadow-sm">
                  <p className="text-gray-800 mb-2">{trend.trend}</p>
                  <div className="flex justify-between text-sm">
                    <span className={getImpactColor(trend.impact)}>
                      Impact: {(trend.impact * 100).toFixed(1)}%
                    </span>
                    <span className={getConfidenceColor(trend.confidence)}>
                      Confidence: {(trend.confidence * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 