'use client';

import React, { useState, useEffect } from 'react';
import { ReportQualityAssessment } from '@/services/reports/reportQualityService';

interface ReportQualityIndicatorsProps {
  reportId: string;
  className?: string;
  showRecommendations?: boolean;
  compact?: boolean;
}

interface QualityApiResponse {
  success: boolean;
  reportId: string;
  qualityAssessment: ReportQualityAssessment;
  timestamp: string;
  correlationId: string;
  error?: string;
}

export default function ReportQualityIndicators({
  reportId,
  className = '',
  showRecommendations = true,
  compact = false
}: ReportQualityIndicatorsProps) {
  const [qualityData, setQualityData] = useState<ReportQualityAssessment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchQualityAssessment();
  }, [reportId]);

  const fetchQualityAssessment = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/reports/${reportId}/quality`);
      const data: QualityApiResponse = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch quality assessment');
      }
      
      setQualityData(data.qualityAssessment);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load quality assessment');
    } finally {
      setLoading(false);
    }
  };

  const toggleSection = (sectionId: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId);
    } else {
      newExpanded.add(sectionId);
    }
    setExpandedSections(newExpanded);
  };

  const getQualityTierColor = (tier: string) => {
    switch (tier) {
      case 'excellent': return 'bg-green-100 text-green-800 border-green-200';
      case 'good': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'fair': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'poor': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getQualityTierIcon = (tier: string) => {
    switch (tier) {
      case 'excellent': return '✅';
      case 'good': return '✅';
      case 'fair': return '⚠️';
      case 'poor': return '🔶';
      case 'critical': return '❌';
      default: return '⚠️';
    }
  };

  const getConfidenceColor = (level: string) => {
    switch (level) {
      case 'high': return 'text-green-600';
      case 'medium': return 'text-yellow-600';
      case 'low': return 'text-orange-600';
      case 'critical': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getConfidenceIcon = (level: string) => {
    switch (level) {
      case 'high': return '✅';
      case 'medium': return '⚠️';
      case 'low': return '🔶';
      case 'critical': return '❌';
      default: return '⚠️';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-300';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'low': return 'bg-gray-100 text-gray-800 border-gray-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'data_collection': return '🗄️';
      case 'analysis_depth': return '📊';
      case 'freshness': return '🕒';
      case 'coverage': return '🎯';
      case 'methodology': return '💡';
      default: return '💡';
    }
  };

  const getTimeLabel = (timeToImplement: string) => {
    switch (timeToImplement) {
      case 'immediate': return { label: 'Immediate', color: 'text-green-600' };
      case 'short_term': return { label: 'Short term', color: 'text-blue-600' };
      case 'medium_term': return { label: 'Medium term', color: 'text-yellow-600' };
      case 'long_term': return { label: 'Long term', color: 'text-red-600' };
      default: return { label: 'Unknown', color: 'text-gray-600' };
    }
  };

  const getCostLabel = (cost: string) => {
    switch (cost) {
      case 'free': return { label: 'Free', color: 'text-green-600' };
      case 'low': return { label: 'Low cost', color: 'text-blue-600' };
      case 'medium': return { label: 'Medium cost', color: 'text-yellow-600' };
      case 'high': return { label: 'High cost', color: 'text-red-600' };
      default: return { label: 'Unknown', color: 'text-gray-600' };
    }
  };

  if (loading) {
    return (
      <div className={`bg-white rounded-lg border shadow-sm ${className}`}>
        <div className="p-6">
          <div className="animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="space-y-3">
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded w-2/3"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-red-50 border border-red-200 rounded-lg p-4 ${className}`}>
        <div className="flex items-center gap-2 text-red-800">
          <span>❌</span>
          <span>{error}</span>
          <button 
            onClick={fetchQualityAssessment}
            className="ml-2 px-3 py-1 bg-red-100 border border-red-300 rounded text-sm hover:bg-red-200"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!qualityData) {
    return null;
  }

  const { qualityScore, qualityTier, confidenceIndicators, recommendations, improvement, dataProfile } = qualityData;

  if (compact) {
    return (
      <div className={`flex items-center gap-4 ${className}`}>
        <div className="flex items-center gap-2">
          <span>{getQualityTierIcon(qualityTier)}</span>
          <span className="font-medium">{qualityScore.overall}%</span>
          <span className={`px-2 py-1 rounded-md text-sm border ${getQualityTierColor(qualityTier)}`}>
            {qualityTier}
          </span>
        </div>
        <div className="text-sm text-gray-600">
          Data: {qualityScore.dataCompleteness}% • 
          Fresh: {qualityScore.dataFreshness}% • 
          Confidence: {qualityScore.analysisConfidence}%
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Overall Quality Score */}
      <div className="bg-white rounded-lg border shadow-sm">
        <div className="px-6 py-4 border-b">
          <div className="flex items-center gap-2">
            <span>{getQualityTierIcon(qualityTier)}</span>
            <h3 className="text-lg font-semibold">Report Quality Assessment</h3>
          </div>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {/* Overall Score */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="text-3xl font-bold">{qualityScore.overall}%</div>
                <span className={`px-3 py-1 rounded-md border ${getQualityTierColor(qualityTier)}`}>
                  {qualityTier.charAt(0).toUpperCase() + qualityTier.slice(1)} Quality
                </span>
              </div>
              <div className="text-right text-sm text-gray-600">
                <div>Report Type: {qualityData.reportType}</div>
                <div>Assessed: {new Date(qualityData.timestamp).toLocaleDateString()}</div>
              </div>
            </div>

            {/* Score Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium">Data Completeness</span>
                  <span className="text-sm">{qualityScore.dataCompleteness}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full" 
                    style={{ width: `${qualityScore.dataCompleteness}%` }}
                  ></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium">Data Freshness</span>
                  <span className="text-sm">{qualityScore.dataFreshness}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-green-600 h-2 rounded-full" 
                    style={{ width: `${qualityScore.dataFreshness}%` }}
                  ></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium">Analysis Confidence</span>
                  <span className="text-sm">{qualityScore.analysisConfidence}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-purple-600 h-2 rounded-full" 
                    style={{ width: `${qualityScore.analysisConfidence}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Data Profile */}
      <div className="bg-white rounded-lg border shadow-sm">
        <div className="px-6 py-4 border-b">
          <div className="flex items-center gap-2">
            <span>🗄️</span>
            <h3 className="text-lg font-semibold">Data Profile</h3>
          </div>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{Math.round(dataProfile.competitorCoverage)}%</div>
              <div className="text-sm text-gray-600">Competitor Coverage</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{dataProfile.snapshotFreshness}</div>
              <div className="text-sm text-gray-600">Days Since Capture</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{dataProfile.analysisDepth}</div>
              <div className="text-sm text-gray-600">Analysis Depth</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{improvement.quickWins.length}</div>
              <div className="text-sm text-gray-600">Quick Wins Available</div>
            </div>
          </div>
        </div>
      </div>

      {/* Section Confidence Indicators */}
      <div className="bg-white rounded-lg border shadow-sm">
        <div className="px-6 py-4 border-b">
          <div className="flex items-center gap-2">
            <span>📊</span>
            <h3 className="text-lg font-semibold">Section Confidence Levels</h3>
          </div>
        </div>
        <div className="p-6">
          <div className="space-y-3">
            {Object.entries(confidenceIndicators).map(([sectionType, indicator]) => (
              <div key={sectionType} className="flex items-center justify-between p-3 border rounded">
                <div className="flex items-center gap-3">
                  <div className={getConfidenceColor(indicator.level)}>
                    <span>{getConfidenceIcon(indicator.level)}</span>
                  </div>
                  <div>
                    <div className="font-medium capitalize">
                      {sectionType.replace('_', ' ')}
                    </div>
                    <div className="text-sm text-gray-600">{indicator.explanation}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold">{indicator.score}%</div>
                  <span className={`px-2 py-1 rounded text-xs border ${getConfidenceColor(indicator.level)}`}>
                    {indicator.level}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Improvement Potential */}
      <div className="bg-white rounded-lg border shadow-sm">
        <div className="px-6 py-4 border-b">
          <div className="flex items-center gap-2">
            <span>📈</span>
            <h3 className="text-lg font-semibold">Improvement Potential</h3>
          </div>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 border rounded">
              <div className="text-2xl font-bold text-blue-600">{improvement.possibleScore}%</div>
              <div className="text-sm text-gray-600">With Current Data</div>
            </div>
            <div className="text-center p-4 border rounded">
              <div className="text-2xl font-bold text-green-600">{improvement.potentialScore}%</div>
              <div className="text-sm text-gray-600">Full Potential</div>
            </div>
            <div className="text-center p-4 border rounded">
              <div className="text-2xl font-bold text-purple-600">+{improvement.potentialScore - qualityScore.overall}%</div>
              <div className="text-sm text-gray-600">Possible Gain</div>
            </div>
          </div>
        </div>
      </div>

      {/* Recommendations */}
      {showRecommendations && recommendations.length > 0 && (
        <div className="bg-white rounded-lg border shadow-sm">
          <div className="px-6 py-4 border-b">
            <div className="flex items-center gap-2">
              <span>💡</span>
              <h3 className="text-lg font-semibold">Quality Improvement Recommendations</h3>
            </div>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {recommendations.map((rec) => (
                <div key={rec.id}>
                  <div 
                    className="flex items-center justify-between p-4 border rounded hover:bg-gray-50 cursor-pointer"
                    onClick={() => toggleSection(rec.id)}
                  >
                    <div className="flex items-center gap-3">
                      <span>{getCategoryIcon(rec.category)}</span>
                      <div>
                        <div className="font-medium">{rec.title}</div>
                        <div className="text-sm text-gray-600">{rec.description}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded text-xs border ${getPriorityColor(rec.priority)}`}>
                        {rec.priority}
                      </span>
                      <div className="text-sm text-gray-500">+{rec.estimatedImpact}%</div>
                      <span>{expandedSections.has(rec.id) ? '▲' : '▼'}</span>
                    </div>
                  </div>
                  {expandedSections.has(rec.id) && (
                    <div className="p-4 bg-gray-50 border-t">
                      <div className="space-y-3">
                        <div>
                          <h4 className="font-medium mb-2">Action Steps:</h4>
                          <ul className="space-y-1">
                            {rec.actionSteps.map((step, stepIndex) => (
                              <li key={stepIndex} className="flex items-start gap-2 text-sm">
                                <span className="text-gray-400 mt-1">•</span>
                                {step}
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <div className={getTimeLabel(rec.timeToImplement).color}>
                            ⏱️ {getTimeLabel(rec.timeToImplement).label}
                          </div>
                          <div className={getCostLabel(rec.cost).color}>
                            💰 {getCostLabel(rec.cost).label}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Quick Wins */}
      {improvement.quickWins.length > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center gap-2 text-green-800">
            <span>💡</span>
            <div className="font-medium">
              {improvement.quickWins.length} Quick Win{improvement.quickWins.length > 1 ? 's' : ''} Available
            </div>
          </div>
          <div className="text-green-700 mt-2">
            You can improve your report quality by up to{' '}
            <span className="font-bold">
              {improvement.quickWins.reduce((sum, rec) => sum + rec.estimatedImpact, 0)}%
            </span>{' '}
            with immediate, free actions.
          </div>
        </div>
      )}
    </div>
  );
} 