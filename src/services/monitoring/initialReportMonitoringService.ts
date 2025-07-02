/**
 * Initial Report Monitoring Service
 * Phase 5.2.1: Production monitoring setup for immediate comparative reports
 * 
 * Features:
 * - Business metrics tracking (success rates, data quality, user experience)
 * - Performance monitoring (generation times, snapshot capture rates)
 * - Resource utilization tracking (costs, rate limiting, storage)
 * - Real-time alerting with configurable thresholds
 * - Historical trend analysis and dashboard data
 */

import { PrismaClient } from '@prisma/client';
import { generateCorrelationId } from '../../lib/logger';

const prisma = new PrismaClient();

// Business Metrics Interface from Phase 5.2.1
export interface InitialReportMetrics {
  // Performance Metrics
  generationSuccessRate: number; // Target: >95%
  averageGenerationTime: number; // Target: <45s
  peakGenerationTime: number; // Target: <60s
  
  // Data Quality Metrics  
  dataCompletenessDistribution: Record<string, number>; // Score ranges
  freshDataUtilization: number; // % using fresh snapshots
  fallbackUsageRate: number; // % using fallback scenarios
  
  // User Experience Metrics
  userSatisfactionScore: number; // Target: >4.0/5.0
  reportViewRate: number; // % of users viewing generated reports
  retryAttemptRate: number; // % requiring retry
  
  // Resource Metrics
  snapshotCaptureSuccessRate: number; // Target: >80%
  rateLimitTriggerFrequency: number;
  resourceUtilization: number; // CPU/memory usage
  costPerReport: number; // Financial tracking
}

// Alert Configuration from Phase 5.2.1
export interface ProductionAlerts {
  CRITICAL: {
    reportSuccessRate: { threshold: number; window: string };
    systemErrorRate: { threshold: number; window: string };
    averageResponseTime: { threshold: number; window: string };
    snapshotCaptureFailureRate: { threshold: number; window: string };
    dataCompletenessScore: { threshold: number; window: string };
  };
  WARNING: {
    reportSuccessRate: { threshold: number; window: string };
    dataCompletenessScore: { threshold: number; window: string };
    snapshotSuccessRate: { threshold: number; window: string };
    generationTimeIncrease: { threshold: number; window: string };
    fallbackUsageIncrease: { threshold: number; window: string };
  };
  BUDGET: {
    dailyCostThreshold: number;
    hourlySnapshotLimit: number;
    storageUsageThreshold: number;
    monthlyBudgetThreshold: number;
  };
}

export interface AlertEvent {
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
  resolvedAt?: Date;
  metadata?: Record<string, unknown>;
}

export interface DashboardMetrics {
  overview: {
    systemHealth: 'HEALTHY' | 'WARNING' | 'CRITICAL';
    overallScore: number; // 0-100
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

export class InitialReportMonitoringService {
  private correlationId: string;
  
  // Alert thresholds from Phase 5.2.1 specification
  private readonly PRODUCTION_ALERTS: ProductionAlerts = {
    CRITICAL: {
      reportSuccessRate: { threshold: 0.85, window: '5m' },
      systemErrorRate: { threshold: 0.05, window: '1m' },
      averageResponseTime: { threshold: 60000, window: '5m' }, // 60 seconds
      snapshotCaptureFailureRate: { threshold: 0.30, window: '5m' }, // >30% failure rate
      dataCompletenessScore: { threshold: 30, window: '15m' } // <30% completeness
    },
    WARNING: {
      reportSuccessRate: { threshold: 0.90, window: '10m' },
      dataCompletenessScore: { threshold: 50, window: '15m' },
      snapshotSuccessRate: { threshold: 0.80, window: '10m' },
      generationTimeIncrease: { threshold: 45000, window: '10m' }, // >45 seconds
      fallbackUsageIncrease: { threshold: 0.20, window: '15m' } // >20% fallback usage
    },
    BUDGET: {
      dailyCostThreshold: 500, // $500/day
      hourlySnapshotLimit: 1000,
      storageUsageThreshold: 0.85, // 85% of allocated storage
      monthlyBudgetThreshold: 10000 // $10,000/month
    }
  };

  constructor() {
    this.correlationId = generateCorrelationId();
  }

  /**
   * Get comprehensive dashboard metrics for immediate reports
   */
  async getDashboardMetrics(timeRange: '1h' | '24h' | '7d' | '30d' = '24h'): Promise<DashboardMetrics> {
    console.log(`[${this.correlationId}] Getting dashboard metrics for immediate reports (${timeRange})`);
    
    try {
      const [overview, realTimeMetrics, alerts, trends, recommendations] = await Promise.all([
        this.getSystemOverview(timeRange),
        this.getRealTimeMetrics(timeRange),
        this.getActiveAlerts(),
        this.getTrendData(timeRange),
        this.getPerformanceRecommendations()
      ]);

      return {
        overview,
        realTimeMetrics,
        alerts,
        trends,
        recommendations
      };
    } catch (error) {
      console.error(`[${this.correlationId}] Dashboard metrics retrieval failed:`, error);
      throw error;
    }
  }

  /**
   * Get system overview for immediate reports
   */
  private async getSystemOverview(timeRange: string) {
    const timeWindow = this.getTimeWindow(timeRange);
    
    const [
      totalInitialReports,
      successfulReports,
      activeReports,
      recentErrors
    ] = await Promise.all([
      prisma.report.count({
        where: {
          isInitialReport: true,
          createdAt: { gte: timeWindow }
        }
      }),
      prisma.report.count({
        where: {
          isInitialReport: true,
          createdAt: { gte: timeWindow },
          status: 'completed'
        }
      }),
      prisma.report.count({
        where: {
          isInitialReport: true,
          status: 'generating'
        }
      }),
      prisma.report.count({
        where: {
          isInitialReport: true,
          createdAt: { gte: timeWindow },
          status: 'failed'
        }
      })
    ]);

    const successRate = totalInitialReports > 0 ? successfulReports / totalInitialReports : 1;
    const errorRate = totalInitialReports > 0 ? recentErrors / totalInitialReports : 0;
    
    const systemHealth = this.determineSystemHealth(successRate, errorRate);
    const overallScore = this.calculateOverallScore(successRate, errorRate, activeReports);

    return {
      systemHealth,
      overallScore,
      activeInitialReports: activeReports,
      totalInitialReportsGenerated: totalInitialReports,
      lastUpdated: new Date()
    };
  }

  /**
   * Get real-time metrics for immediate reports
   */
  private async getRealTimeMetrics(timeRange: string): Promise<InitialReportMetrics> {
    const timeWindow = this.getTimeWindow(timeRange);
    
    // Get initial reports data
    const initialReports = await prisma.report.findMany({
      where: {
        isInitialReport: true,
        createdAt: { gte: timeWindow }
      },
      select: {
        id: true,
        status: true,
        dataCompletenessScore: true,
        dataFreshness: true,
        competitorSnapshotsCaptured: true,
        generationContext: true,
        createdAt: true,
        updatedAt: true,
        views: true
      }
    });

    // Calculate performance metrics
    const totalReports = initialReports.length;
    const successfulReports = initialReports.filter(r => r.status === 'completed').length;
    const generationSuccessRate = totalReports > 0 ? successfulReports / totalReports : 0;

    // Calculate generation times from generationContext
    const generationTimes = initialReports
      .map(r => r.generationContext as any)
      .filter(ctx => ctx?.generationTime)
      .map(ctx => ctx.generationTime);
    
    const averageGenerationTime = generationTimes.length > 0 
      ? generationTimes.reduce((sum, time) => sum + time, 0) / generationTimes.length 
      : 0;
    
    const peakGenerationTime = generationTimes.length > 0 
      ? Math.max(...generationTimes) 
      : 0;

    // Data quality metrics
    const dataCompletenessScores = initialReports
      .map(r => r.dataCompletenessScore)
      .filter(score => score !== null);
    
    const dataCompletenessDistribution = this.calculateDistribution(dataCompletenessScores, [
      { label: 'excellent', min: 90, max: 100 },
      { label: 'good', min: 75, max: 89 },
      { label: 'fair', min: 60, max: 74 },
      { label: 'poor', min: 0, max: 59 }
    ]);

    const freshDataReports = initialReports.filter(r => r.dataFreshness === 'new').length;
    const freshDataUtilization = totalReports > 0 ? freshDataReports / totalReports : 0;

    const fallbackReports = initialReports.filter(r => {
      const context = r.generationContext as any;
      return context?.usedPartialDataGeneration === true;
    }).length;
    const fallbackUsageRate = totalReports > 0 ? fallbackReports / totalReports : 0;

    // User experience metrics  
    const viewedReports = initialReports.filter(r => r.views && r.views > 0).length;
    const reportViewRate = totalReports > 0 ? viewedReports / totalReports : 0;

    // Estimate retry rate from failed reports that were later successful
    const retryAttemptRate = 0.05; // Placeholder - would need more sophisticated tracking

    // Resource metrics
    const snapshotCaptureData = initialReports.map(r => r.competitorSnapshotsCaptured || 0);
    const successfulSnapshots = snapshotCaptureData.filter(count => count > 0).length;
    const snapshotCaptureSuccessRate = totalReports > 0 ? successfulSnapshots / totalReports : 0;

    // Estimate costs (placeholder - would integrate with actual cost tracking)
    const costPerReport = 2.50; // $2.50 per report including snapshot capture

    return {
      generationSuccessRate,
      averageGenerationTime,
      peakGenerationTime,
      dataCompletenessDistribution,
      freshDataUtilization,
      fallbackUsageRate,
      userSatisfactionScore: 4.2, // Placeholder - would integrate with feedback system
      reportViewRate,
      retryAttemptRate,
      snapshotCaptureSuccessRate,
      rateLimitTriggerFrequency: 0.02, // Placeholder - would integrate with rate limiting service
      resourceUtilization: 0.65, // Placeholder - would integrate with system monitoring
      costPerReport
    };
  }

  /**
   * Get active alerts for immediate reports
   */
  async getActiveAlerts(): Promise<AlertEvent[]> {
    const alerts: AlertEvent[] = [];
    const metrics = await this.getRealTimeMetrics('1h');
    
    // Critical alerts
    if (metrics.generationSuccessRate < this.PRODUCTION_ALERTS.CRITICAL.reportSuccessRate.threshold) {
      alerts.push({
        id: generateCorrelationId(),
        type: 'CRITICAL',
        category: 'performance',
        metric: 'generationSuccessRate',
        message: `Initial report success rate critically low: ${(metrics.generationSuccessRate * 100).toFixed(1)}%`,
        currentValue: metrics.generationSuccessRate,
        threshold: this.PRODUCTION_ALERTS.CRITICAL.reportSuccessRate.threshold,
        window: this.PRODUCTION_ALERTS.CRITICAL.reportSuccessRate.window,
        timestamp: new Date(),
        correlationId: this.correlationId,
        acknowledged: false,
        metadata: {
          targetSuccessRate: 0.95,
          recommendedAction: 'Investigate snapshot capture failures and system capacity'
        }
      });
    }

    if (metrics.averageGenerationTime > this.PRODUCTION_ALERTS.CRITICAL.averageResponseTime.threshold) {
      alerts.push({
        id: generateCorrelationId(),
        type: 'CRITICAL',
        category: 'performance', 
        metric: 'averageGenerationTime',
        message: `Average generation time critically high: ${Math.round(metrics.averageGenerationTime)}ms`,
        currentValue: metrics.averageGenerationTime,
        threshold: this.PRODUCTION_ALERTS.CRITICAL.averageResponseTime.threshold,
        window: this.PRODUCTION_ALERTS.CRITICAL.averageResponseTime.window,
        timestamp: new Date(),
        correlationId: this.correlationId,
        acknowledged: false,
        metadata: {
          targetTime: 45000,
          recommendedAction: 'Scale snapshot capture capacity or optimize data collection'
        }
      });
    }

    // Warning alerts
    if (metrics.snapshotCaptureSuccessRate < this.PRODUCTION_ALERTS.WARNING.snapshotSuccessRate.threshold) {
      alerts.push({
        id: generateCorrelationId(),
        type: 'WARNING',
        category: 'quality',
        metric: 'snapshotCaptureSuccessRate',
        message: `Snapshot capture success rate below target: ${(metrics.snapshotCaptureSuccessRate * 100).toFixed(1)}%`,
        currentValue: metrics.snapshotCaptureSuccessRate,
        threshold: this.PRODUCTION_ALERTS.WARNING.snapshotSuccessRate.threshold,
        window: this.PRODUCTION_ALERTS.WARNING.snapshotSuccessRate.window,
        timestamp: new Date(),
        correlationId: this.correlationId,
        acknowledged: false,
        metadata: {
          targetRate: 0.85,
          recommendedAction: 'Review competitor website accessibility and timeout settings'
        }
      });
    }

    if (metrics.fallbackUsageRate > this.PRODUCTION_ALERTS.WARNING.fallbackUsageIncrease.threshold) {
      alerts.push({
        id: generateCorrelationId(),
        type: 'WARNING',
        category: 'quality',
        metric: 'fallbackUsageRate',
        message: `Fallback usage rate high: ${(metrics.fallbackUsageRate * 100).toFixed(1)}%`,
        currentValue: metrics.fallbackUsageRate,
        threshold: this.PRODUCTION_ALERTS.WARNING.fallbackUsageIncrease.threshold,
        window: this.PRODUCTION_ALERTS.WARNING.fallbackUsageIncrease.window,
        timestamp: new Date(),
        correlationId: this.correlationId,
        acknowledged: false,
        metadata: {
          targetRate: 0.10,
          recommendedAction: 'Improve snapshot capture reliability and data collection'
        }
      });
    }

    // Budget alerts
    const dailyCost = metrics.costPerReport * 100; // Estimate based on daily volume
    if (dailyCost > this.PRODUCTION_ALERTS.BUDGET.dailyCostThreshold) {
      alerts.push({
        id: generateCorrelationId(),
        type: 'BUDGET',
        category: 'cost',
        metric: 'dailyCost',
        message: `Daily cost approaching threshold: $${dailyCost.toFixed(2)}`,
        currentValue: dailyCost,
        threshold: this.PRODUCTION_ALERTS.BUDGET.dailyCostThreshold,
        window: '24h',
        timestamp: new Date(),
        correlationId: this.correlationId,
        acknowledged: false,
        metadata: {
          monthlyProjection: dailyCost * 30,
          recommendedAction: 'Review cost optimization opportunities and usage patterns'
        }
      });
    }

    return alerts;
  }

  /**
   * Get trend data for charts and analysis
   */
  private async getTrendData(timeRange: string) {
    const timeWindow = this.getTimeWindow(timeRange);
    const intervals = this.getTimeIntervals(timeRange);
    
    const trends = {
      successRateTrend: [] as Array<{ timestamp: Date; value: number }>,
      performanceTrend: [] as Array<{ timestamp: Date; value: number }>,
      qualityTrend: [] as Array<{ timestamp: Date; value: number }>,
      costTrend: [] as Array<{ timestamp: Date; value: number }>
    };

    for (const interval of intervals) {
      const reports = await prisma.report.findMany({
        where: {
          isInitialReport: true,
          createdAt: {
            gte: interval.start,
            lt: interval.end
          }
        },
        select: {
          status: true,
          dataCompletenessScore: true,
          generationContext: true
        }
      });

      const total = reports.length;
      const successful = reports.filter(r => r.status === 'completed').length;
      const successRate = total > 0 ? successful / total : 0;

      const generationTimes = reports
        .map(r => r.generationContext as any)
        .filter(ctx => ctx?.generationTime)
        .map(ctx => ctx.generationTime);
      const avgTime = generationTimes.length > 0 
        ? generationTimes.reduce((sum, time) => sum + time, 0) / generationTimes.length 
        : 0;

      const qualityScores = reports
        .map(r => r.dataCompletenessScore)
        .filter(score => score !== null);
      const avgQuality = qualityScores.length > 0
        ? qualityScores.reduce((sum, score) => sum + score!, 0) / qualityScores.length
        : 0;

      const cost = total * 2.50; // $2.50 per report

      trends.successRateTrend.push({ timestamp: interval.start, value: successRate });
      trends.performanceTrend.push({ timestamp: interval.start, value: avgTime });
      trends.qualityTrend.push({ timestamp: interval.start, value: avgQuality });
      trends.costTrend.push({ timestamp: interval.start, value: cost });
    }

    return trends;
  }

  /**
   * Get performance recommendations based on current metrics
   */
  private async getPerformanceRecommendations() {
    const metrics = await this.getRealTimeMetrics('24h');
    const recommendations = [];

    // Performance recommendations
    if (metrics.averageGenerationTime > 30000) {
      recommendations.push({
        type: 'performance' as const,
        priority: 'high' as const,
        title: 'Optimize Generation Time',
        description: 'Average generation time exceeds 30 seconds',
        impact: 'Improve user experience and reduce timeout failures',
        action: 'Consider parallel snapshot capture and analysis optimization'
      });
    }

    // Quality recommendations
    if (metrics.snapshotCaptureSuccessRate < 0.85) {
      recommendations.push({
        type: 'quality' as const,
        priority: 'high' as const,
        title: 'Improve Snapshot Capture',
        description: 'Snapshot capture success rate below 85%',
        impact: 'Better data quality and reduced fallback usage',
        action: 'Review timeout settings and competitor website accessibility'
      });
    }

    if (metrics.fallbackUsageRate > 0.15) {
      recommendations.push({
        type: 'quality' as const,
        priority: 'medium' as const,
        title: 'Reduce Fallback Usage',
        description: 'High fallback usage indicates data collection issues',
        impact: 'Improve report quality and user satisfaction',
        action: 'Enhance snapshot capture reliability and data collection strategies'
      });
    }

    // Cost recommendations
    if (metrics.costPerReport > 3.00) {
      recommendations.push({
        type: 'cost' as const,
        priority: 'medium' as const,
        title: 'Optimize Cost per Report',
        description: 'Cost per report exceeds target of $2.50',
        impact: 'Reduce operational costs while maintaining quality',
        action: 'Review resource utilization and implement cost optimization strategies'
      });
    }

    return recommendations;
  }

  /**
   * Track a specific initial report generation event
   */
  async trackReportGeneration(reportId: string, event: string, metadata: Record<string, unknown>) {
    console.log(`[${this.correlationId}] Tracking initial report event: ${event} for ${reportId}`);
    
    try {
      // Update report with tracking information
      await prisma.report.update({
        where: { id: reportId },
        data: {
          generationContext: {
            ...metadata,
            lastEvent: event,
            trackedAt: new Date().toISOString(),
            correlationId: this.correlationId
          }
        }
      });

      // Emit metric for real-time monitoring
      this.emitMetric('initial_report_generation', {
        reportId,
        event,
        timestamp: new Date(),
        ...metadata
      });

    } catch (error) {
      console.error(`[${this.correlationId}] Failed to track report generation:`, error);
    }
  }

  /**
   * Helper methods
   */
  private getTimeWindow(timeRange: string): Date {
    const now = new Date();
    switch (timeRange) {
      case '1h': return new Date(now.getTime() - 60 * 60 * 1000);
      case '24h': return new Date(now.getTime() - 24 * 60 * 60 * 1000);
      case '7d': return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case '30d': return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      default: return new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }
  }

  private getTimeIntervals(timeRange: string): Array<{ start: Date; end: Date }> {
    const now = new Date();
    const intervals = [];
    
    let intervalSize: number;
    let intervalCount: number;
    
    switch (timeRange) {
      case '1h':
        intervalSize = 5 * 60 * 1000; // 5 minutes
        intervalCount = 12;
        break;
      case '24h':
        intervalSize = 60 * 60 * 1000; // 1 hour
        intervalCount = 24;
        break;
      case '7d':
        intervalSize = 24 * 60 * 60 * 1000; // 1 day
        intervalCount = 7;
        break;
      case '30d':
        intervalSize = 24 * 60 * 60 * 1000; // 1 day
        intervalCount = 30;
        break;
      default:
        intervalSize = 60 * 60 * 1000;
        intervalCount = 24;
    }

    for (let i = intervalCount - 1; i >= 0; i--) {
      const end = new Date(now.getTime() - i * intervalSize);
      const start = new Date(end.getTime() - intervalSize);
      intervals.push({ start, end });
    }

    return intervals;
  }

  private calculateDistribution(scores: (number | null)[], ranges: Array<{ label: string; min: number; max: number }>) {
    const validScores = scores.filter(s => s !== null) as number[];
    const total = validScores.length;
    
    if (total === 0) return {};

    const distribution: Record<string, number> = {};
    
    for (const range of ranges) {
      const count = validScores.filter(score => score >= range.min && score <= range.max).length;
      distribution[range.label] = count / total;
    }

    return distribution;
  }

  private determineSystemHealth(successRate: number, errorRate: number): 'HEALTHY' | 'WARNING' | 'CRITICAL' {
    if (successRate < 0.85 || errorRate > 0.15) return 'CRITICAL';
    if (successRate < 0.95 || errorRate > 0.05) return 'WARNING';
    return 'HEALTHY';
  }

  private calculateOverallScore(successRate: number, errorRate: number, activeReports: number): number {
    const performanceScore = Math.max(0, successRate * 100);
    const reliabilityScore = Math.max(0, (1 - errorRate) * 100);
    const capacityScore = activeReports > 10 ? 80 : 100; // Penalty for high queue depth
    
    return Math.round((performanceScore + reliabilityScore + capacityScore) / 3);
  }

  private emitMetric(metricName: string, data: Record<string, unknown>) {
    // Integration point for Prometheus metrics
    console.log(`[METRIC] ${metricName}:`, data);
    
    // This would integrate with actual monitoring system:
    // prometheus.register.metric(metricName, data);
    // grafana.emit(metricName, data);
  }
}

export default InitialReportMonitoringService; 