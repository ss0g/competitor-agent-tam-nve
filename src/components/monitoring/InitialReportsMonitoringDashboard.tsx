'use client';

/**
 * Initial Reports Monitoring Dashboard
 * Phase 5.2.1: Production monitoring setup
 * 
 * Features:
 * - Real-time business metrics display
 * - Alert management and visualization
 * - Performance trends and charts
 * - System health overview
 * - Actionable recommendations
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertTriangle, CheckCircle, Clock, TrendingUp, RefreshCw } from 'lucide-react';

// Types from the monitoring service
interface InitialReportMetrics {
  generationSuccessRate: number;
  averageGenerationTime: number;
  peakGenerationTime: number;
  dataCompletenessDistribution: Record<string, number>;
  freshDataUtilization: number;
  fallbackUsageRate: number;
  userSatisfactionScore: number;
  reportViewRate: number;
  retryAttemptRate: number;
  snapshotCaptureSuccessRate: number;
  rateLimitTriggerFrequency: number;
  resourceUtilization: number;
  costPerReport: number;
}

interface AlertEvent {
  id: string;
  type: 'CRITICAL' | 'WARNING' | 'BUDGET';
  category: 'performance' | 'quality' | 'cost' | 'user_experience';
  metric: string;
  message: string;
  currentValue: number;
  threshold: number;
  window: string;
  timestamp: Date;
  correlationId: string;
  acknowledged: boolean;
  metadata?: Record<string, unknown>;
}

interface DashboardData {
  overview: {
    systemHealth: 'HEALTHY' | 'WARNING' | 'CRITICAL';
    overallScore: number;
    activeInitialReports: number;
    totalInitialReportsGenerated: number;
    lastUpdated: Date;
  };
  realTimeMetrics: InitialReportMetrics;
  alerts: AlertEvent[];
  trends: {
    successRateTrend: Array<{ timestamp: Date; value: number }>;
    performanceTrend: Array<{ timestamp: Date; value: number }>;
    qualityTrend: Array<{ timestamp: Date; value: number }>;
    costTrend: Array<{ timestamp: Date; value: number }>;
  };
  recommendations: Array<{
    type: 'performance' | 'quality' | 'cost';
    priority: 'high' | 'medium' | 'low';
    title: string;
    description: string;
    impact: string;
    action: string;
  }>;
}

interface InitialReportsMonitoringDashboardProps {
  autoRefresh?: boolean;
  refreshInterval?: number; // milliseconds
}

export function InitialReportsMonitoringDashboard({ 
  autoRefresh = true, 
  refreshInterval = 30000 
}: InitialReportsMonitoringDashboardProps) {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<'1h' | '24h' | '7d' | '30d'>('24h');
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const fetchDashboardData = useCallback(async () => {
    try {
      setError(null);
      const response = await fetch(`/api/monitoring/initial-reports?timeRange=${timeRange}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch dashboard data: ${response.statusText}`);
      }
      
      const data = await response.json();
      setDashboardData(data);
      setLastRefresh(new Date());
    } catch (err) {
      console.error('Dashboard data fetch error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  }, [timeRange]);

  // Initial load and auto-refresh
  useEffect(() => {
    fetchDashboardData();
    
    if (autoRefresh) {
      const interval = setInterval(fetchDashboardData, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [fetchDashboardData, autoRefresh, refreshInterval]);

  const getHealthBadgeColor = (health: string) => {
    switch (health) {
      case 'HEALTHY': return 'bg-green-500';
      case 'WARNING': return 'bg-yellow-500';
      case 'CRITICAL': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getAlertBadgeColor = (type: string) => {
    switch (type) {
      case 'CRITICAL': return 'bg-red-500';
      case 'WARNING': return 'bg-yellow-500';
      case 'BUDGET': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  const formatPercentage = (value: number) => `${(value * 100).toFixed(1)}%`;
  const formatTime = (ms: number) => `${(ms / 1000).toFixed(1)}s`;
  const formatCost = (cost: number) => `$${cost.toFixed(2)}`;

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading monitoring dashboard...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="flex items-center text-red-600">
              <AlertTriangle className="h-5 w-5 mr-2" />
              Dashboard Error
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={fetchDashboardData} variant="outline">
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!dashboardData) {
    return <div className="p-8">No dashboard data available</div>;
  }

  const { overview, realTimeMetrics, alerts, recommendations } = dashboardData;

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Initial Reports Monitoring</h1>
          <p className="text-gray-600">Production monitoring dashboard for immediate comparative reports</p>
        </div>
        <div className="flex items-center space-x-4">
          <select 
            value={timeRange} 
            onChange={(e) => setTimeRange(e.target.value as '1h' | '24h' | '7d' | '30d')}
            className="border rounded px-3 py-1"
          >
            <option value="1h">Last Hour</option>
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
          </select>
          <Button onClick={fetchDashboardData} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* System Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Health</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <Badge className={`${getHealthBadgeColor(overview.systemHealth)} text-white`}>
                {overview.systemHealth}
              </Badge>
              <span className="text-2xl font-bold">{overview.overallScore}/100</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Reports</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overview.activeInitialReports}</div>
            <p className="text-xs text-muted-foreground">Currently generating</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatPercentage(realTimeMetrics.generationSuccessRate)}</div>
            <p className="text-xs text-muted-foreground">
              Target: &gt;95%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Generation Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatTime(realTimeMetrics.averageGenerationTime)}</div>
            <p className="text-xs text-muted-foreground">
              Target: &lt;45s
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Dashboard Tabs */}
      <Tabs defaultValue="metrics" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="metrics">Metrics</TabsTrigger>
          <TabsTrigger value="alerts">
            Alerts 
            {alerts.length > 0 && (
              <Badge className="ml-2 h-5 w-5 rounded-full bg-red-500 text-white text-xs">
                {alerts.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="quality">Data Quality</TabsTrigger>
          <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
        </TabsList>

        <TabsContent value="metrics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Performance Metrics */}
            <Card>
              <CardHeader>
                <CardTitle>Performance Metrics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span>Success Rate:</span>
                  <span className="font-mono">{formatPercentage(realTimeMetrics.generationSuccessRate)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Avg Time:</span>
                  <span className="font-mono">{formatTime(realTimeMetrics.averageGenerationTime)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Peak Time:</span>
                  <span className="font-mono">{formatTime(realTimeMetrics.peakGenerationTime)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Retry Rate:</span>
                  <span className="font-mono">{formatPercentage(realTimeMetrics.retryAttemptRate)}</span>
                </div>
              </CardContent>
            </Card>

            {/* Data Quality Metrics */}
            <Card>
              <CardHeader>
                <CardTitle>Data Quality</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span>Fresh Data Usage:</span>
                  <span className="font-mono">{formatPercentage(realTimeMetrics.freshDataUtilization)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Snapshot Success:</span>
                  <span className="font-mono">{formatPercentage(realTimeMetrics.snapshotCaptureSuccessRate)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Fallback Usage:</span>
                  <span className="font-mono">{formatPercentage(realTimeMetrics.fallbackUsageRate)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Report View Rate:</span>
                  <span className="font-mono">{formatPercentage(realTimeMetrics.reportViewRate)}</span>
                </div>
              </CardContent>
            </Card>

            {/* Resource Metrics */}
            <Card>
              <CardHeader>
                <CardTitle>Resource Utilization</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span>System Load:</span>
                  <span className="font-mono">{formatPercentage(realTimeMetrics.resourceUtilization)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Rate Limit Hits:</span>
                  <span className="font-mono">{formatPercentage(realTimeMetrics.rateLimitTriggerFrequency)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Cost per Report:</span>
                  <span className="font-mono">{formatCost(realTimeMetrics.costPerReport)}</span>
                </div>
                <div className="flex justify-between">
                  <span>User Satisfaction:</span>
                  <span className="font-mono">{realTimeMetrics.userSatisfactionScore.toFixed(1)}/5.0</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-4">
          {alerts.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center text-gray-500">
                  <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
                  <p>No active alerts. System is operating normally.</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {alerts.map((alert) => (
                <Card key={alert.id} className={`border-l-4 ${
                  alert.type === 'CRITICAL' ? 'border-l-red-500' : 
                  alert.type === 'WARNING' ? 'border-l-yellow-500' : 'border-l-blue-500'
                }`}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <CardTitle className="flex items-center">
                        <Badge className={`mr-2 ${getAlertBadgeColor(alert.type)} text-white`}>
                          {alert.type}
                        </Badge>
                        {alert.message}
                      </CardTitle>
                      <span className="text-sm text-gray-500">
                        {new Date(alert.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-semibold">Current Value:</span> {alert.currentValue.toFixed(2)}
                      </div>
                      <div>
                        <span className="font-semibold">Threshold:</span> {alert.threshold.toFixed(2)}
                      </div>
                      <div>
                        <span className="font-semibold">Window:</span> {alert.window}
                      </div>
                      <div>
                        <span className="font-semibold">Category:</span> {alert.category}
                      </div>
                    </div>
                    {alert.metadata?.recommendedAction && (
                      <div className="mt-4 p-3 bg-blue-50 rounded border-l-4 border-l-blue-500">
                        <p className="text-sm"><strong>Recommended Action:</strong> {alert.metadata.recommendedAction}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="quality" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Data Completeness Distribution</CardTitle>
              <CardDescription>Quality score distribution across generated reports</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(realTimeMetrics.dataCompletenessDistribution).map(([tier, percentage]) => (
                  <div key={tier} className="flex items-center justify-between">
                    <span className="capitalize">{tier}:</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-32 bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${
                            tier === 'excellent' ? 'bg-green-500' :
                            tier === 'good' ? 'bg-blue-500' :
                            tier === 'fair' ? 'bg-yellow-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${percentage * 100}%` }}
                        />
                      </div>
                      <span className="font-mono text-sm">{formatPercentage(percentage)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recommendations" className="space-y-4">
          {recommendations.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center text-gray-500">
                  <TrendingUp className="h-12 w-12 mx-auto mb-4 text-green-500" />
                  <p>No recommendations at this time. System is performing optimally.</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {recommendations.map((rec, index) => (
                <Card key={index} className={`border-l-4 ${
                  rec.priority === 'high' ? 'border-l-red-500' :
                  rec.priority === 'medium' ? 'border-l-yellow-500' : 'border-l-green-500'
                }`}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <CardTitle className="flex items-center">
                        <Badge className={`mr-2 ${
                          rec.priority === 'high' ? 'bg-red-500' :
                          rec.priority === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
                        } text-white`}>
                          {rec.priority.toUpperCase()}
                        </Badge>
                        {rec.title}
                      </CardTitle>
                      <Badge variant="outline">{rec.type}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-700 mb-2">{rec.description}</p>
                    <div className="bg-blue-50 p-3 rounded border-l-4 border-l-blue-500 mb-3">
                      <p className="text-sm"><strong>Impact:</strong> {rec.impact}</p>
                    </div>
                    <div className="bg-green-50 p-3 rounded border-l-4 border-l-green-500">
                      <p className="text-sm"><strong>Action:</strong> {rec.action}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Footer */}
      <div className="text-center text-sm text-gray-500">
        Last updated: {lastRefresh.toLocaleString()} | 
        Auto-refresh: {autoRefresh ? `Every ${refreshInterval/1000}s` : 'Disabled'}
      </div>
    </div>
  );
} 