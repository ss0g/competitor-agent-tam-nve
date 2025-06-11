import { trackEvent, trackError, trackPerformance, generateCorrelationId } from '../logger';
import { env, featureFlags, productionConfig } from '../env';

export interface ReportGenerationMetric {
  projectId: string;
  phase: string;
  timestamp: string;
  correlationId: string;
  data: {
    [key: string]: any;
  };
}

export interface SystemHealthMetrics {
  totalReports: number;
  failureRate: number;
  averageProcessingTime: number;
  queueDepth: number;
  activeProjects: number;
  errorRate: number;
  timestamp: string;
}

export interface ProjectMetrics {
  projectId: string;
  reportCount: number;
  averageProcessingTime: number;
  successRate: number;
  lastReportGenerated: string | null;
  issues: string[];
  timeline: ReportGenerationMetric[];
}

export class ComparativeReportMonitoring {
  private metrics: Map<string, ReportGenerationMetric> = new Map();
  private readonly maxMetricsAge = productionConfig.monitoring.retentionHours * 60 * 60 * 1000;

  constructor() {
    // Clean up old metrics periodically
    setInterval(() => {
      this.cleanupOldMetrics();
    }, 30 * 60 * 1000); // Clean every 30 minutes
  }

  trackReportGeneration(projectId: string, phase: string, data: any): void {
    if (!featureFlags.isPerformanceMonitoringEnabled()) {
      return;
    }

    const timestamp = new Date().toISOString();
    const correlationId = data.correlationId || generateCorrelationId();
    const key = `${projectId}_${phase}_${Date.now()}`;
    
    const metric: ReportGenerationMetric = {
      projectId,
      phase,
      timestamp,
      correlationId,
      data: {
        ...data,
        correlationId
      }
    };

    this.metrics.set(key, metric);

    // Structured logging for easy querying
    trackEvent({
      eventType: 'comparative_report_metric',
      category: 'business',
      metadata: {
        project_id: projectId,
        phase,
        timestamp,
        correlation_id: correlationId,
        ...data
      }
    }, {
      correlationId,
      projectId,
      operation: 'track_report_generation'
    });

    // Track performance metrics
    if (data.processingTime) {
      trackPerformance(`comparative_report_${phase}`, data.processingTime, {
        correlationId,
        projectId,
        operation: phase
      });
    }

    // Track errors if present
    if (phase === 'failed' && data.error) {
      trackError(new Error(data.error), `comparative_report_${phase}`, {
        correlationId,
        projectId,
        phase,
        ...data
      });
    }
  }

  getProjectMetrics(projectId: string): ProjectMetrics {
    const projectMetrics = Array.from(this.metrics.values())
      .filter(metric => metric.projectId === projectId)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    const completedReports = projectMetrics.filter(m => m.phase === 'completed');
    const failedReports = projectMetrics.filter(m => m.phase === 'failed');
    const processingTimes = completedReports
      .map(m => m.data.totalTime || m.data.processingTime)
      .filter(time => time !== undefined);

    const issues = this.identifyProjectIssues(projectMetrics);
    const lastCompleted = completedReports[completedReports.length - 1];

    return {
      projectId,
      reportCount: completedReports.length,
      averageProcessingTime: processingTimes.length > 0 
        ? processingTimes.reduce((sum, time) => sum + time, 0) / processingTimes.length 
        : 0,
      successRate: projectMetrics.length > 0 
        ? completedReports.length / (completedReports.length + failedReports.length) 
        : 0,
      lastReportGenerated: lastCompleted?.timestamp || null,
      issues,
      timeline: projectMetrics
    };
  }

  generateHealthDashboard(): SystemHealthMetrics {
    const now = Date.now();
    const oneHourAgo = now - (60 * 60 * 1000);
    
    const recentMetrics = Array.from(this.metrics.values())
      .filter(metric => new Date(metric.timestamp).getTime() > oneHourAgo);

    const completedReports = recentMetrics.filter(m => m.phase === 'completed');
    const failedReports = recentMetrics.filter(m => m.phase === 'failed');
    const queuedReports = recentMetrics.filter(m => m.phase === 'queued');
    const processingTimes = completedReports
      .map(m => m.data.totalTime || m.data.processingTime)
      .filter(time => time !== undefined);

    const totalReports = completedReports.length + failedReports.length;
    const failureRate = totalReports > 0 ? failedReports.length / totalReports : 0;
    const errorRate = this.calculateErrorRate(recentMetrics);

    return {
      totalReports: completedReports.length,
      failureRate,
      averageProcessingTime: processingTimes.length > 0 
        ? processingTimes.reduce((sum, time) => sum + time, 0) / processingTimes.length 
        : 0,
      queueDepth: queuedReports.length,
      activeProjects: new Set(recentMetrics.map(m => m.projectId)).size,
      errorRate,
      timestamp: new Date().toISOString()
    };
  }

  getSystemAlerts(): SystemAlert[] {
    const health = this.generateHealthDashboard();
    const alerts: SystemAlert[] = [];

    // Error rate alert
    if (health.errorRate > productionConfig.limits.errorRateThreshold) {
      alerts.push({
        type: 'error_rate_high',
        severity: 'critical',
        message: `Error rate ${(health.errorRate * 100).toFixed(1)}% exceeds threshold ${(productionConfig.limits.errorRateThreshold * 100).toFixed(1)}%`,
        timestamp: new Date().toISOString(),
        data: { currentRate: health.errorRate, threshold: productionConfig.limits.errorRateThreshold }
      });
    }

    // Processing time alert
    if (health.averageProcessingTime > productionConfig.timeouts.reportGeneration) {
      alerts.push({
        type: 'processing_time_high',
        severity: 'warning',
        message: `Average processing time ${Math.round(health.averageProcessingTime)}ms exceeds timeout ${productionConfig.timeouts.reportGeneration}ms`,
        timestamp: new Date().toISOString(),
        data: { currentTime: health.averageProcessingTime, threshold: productionConfig.timeouts.reportGeneration }
      });
    }

    // Queue depth alert
    if (health.queueDepth > productionConfig.limits.maxConcurrentReports * 2) {
      alerts.push({
        type: 'queue_depth_high',
        severity: 'warning',
        message: `Queue depth ${health.queueDepth} is unusually high`,
        timestamp: new Date().toISOString(),
        data: { currentDepth: health.queueDepth, normalCapacity: productionConfig.limits.maxConcurrentReports }
      });
    }

    return alerts;
  }

  private calculateErrorRate(metrics: ReportGenerationMetric[]): number {
    const errorMetrics = metrics.filter(m => 
      m.phase === 'failed' || 
      m.phase === 'error' || 
      (m.data.error && m.data.error !== null)
    );
    
    const totalOperations = metrics.filter(m => 
      m.phase === 'completed' || 
      m.phase === 'failed' || 
      m.phase === 'error'
    );

    return totalOperations.length > 0 ? errorMetrics.length / totalOperations.length : 0;
  }

  private identifyProjectIssues(metrics: ReportGenerationMetric[]): string[] {
    const issues: string[] = [];
    
    // Check for recent failures
    const recentFailures = metrics.filter(m => 
      m.phase === 'failed' && 
      Date.now() - new Date(m.timestamp).getTime() < 60 * 60 * 1000 // Last hour
    );

    if (recentFailures.length > 0) {
      issues.push(`${recentFailures.length} report generation failures in the last hour`);
    }

    // Check for slow processing
    const processingTimes = metrics
      .filter(m => m.phase === 'completed')
      .map(m => m.data.totalTime || m.data.processingTime)
      .filter(time => time !== undefined);

    if (processingTimes.some(time => time > productionConfig.timeouts.reportGeneration)) {
      issues.push('Slow report generation detected (>2 minutes)');
    }

    // Check for stale data
    const dataFreshness = metrics.filter(m => 
      m.phase === 'data_gathering' && 
      m.data.productDataStale === true
    );

    if (dataFreshness.length > 0) {
      issues.push('Stale product data detected');
    }

    // Check for low confidence scores
    const lowConfidence = metrics.filter(m => 
      m.phase === 'ai_analysis' && 
      m.data.confidenceScore < 0.7
    );

    if (lowConfidence.length > 0) {
      issues.push('Low AI analysis confidence scores detected');
    }

    return issues;
  }

  private cleanupOldMetrics(): void {
    const cutoffTime = Date.now() - this.maxMetricsAge;
    
    for (const [key, metric] of this.metrics.entries()) {
      if (new Date(metric.timestamp).getTime() < cutoffTime) {
        this.metrics.delete(key);
      }
    }

    // Log cleanup activity
    trackEvent({
      eventType: 'metrics_cleanup',
      category: 'system_event',
      metadata: {
        remainingMetrics: this.metrics.size,
        cutoffTime: new Date(cutoffTime).toISOString()
      }
    }, {
      correlationId: generateCorrelationId(),
      operation: 'cleanup_old_metrics'
    });
  }

  // Utility method for correlation ID tracking
  generateTimeline(metrics: ReportGenerationMetric[]): TimelineEntry[] {
    return metrics.map(metric => ({
      timestamp: metric.timestamp,
      phase: metric.phase,
      duration: metric.data.duration || 0,
      success: !['failed', 'error'].includes(metric.phase),
      details: {
        correlationId: metric.correlationId,
        ...metric.data
      }
    }));
  }
}

export interface SystemAlert {
  type: 'error_rate_high' | 'processing_time_high' | 'queue_depth_high' | 'system_health';
  severity: 'info' | 'warning' | 'critical';
  message: string;
  timestamp: string;
  data: Record<string, any>;
}

export interface TimelineEntry {
  timestamp: string;
  phase: string;
  duration: number;
  success: boolean;
  details: Record<string, any>;
}

// Singleton instance for global use
export const comparativeReportMonitoring = new ComparativeReportMonitoring(); 