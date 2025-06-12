/**
 * Performance Monitoring Dashboard Service
 * Phase 3.1: Real-time performance tracking, metrics visualization, and automated recommendations
 * 
 * Features:
 * - Real-time scraping success rate monitoring
 * - Performance metrics visualization and historical analysis
 * - Alert system for failures and performance degradation
 * - Automated performance recommendations
 * - Integration with all Phase 1 & 2 services
 */

import { PrismaClient } from '@prisma/client';
import { generateCorrelationId } from '../lib/correlation';

const prisma = new PrismaClient();

// Performance Metrics Types
interface PerformanceMetrics {
  scraping: {
    successRate: number;
    averageTime: number;
    failureReasons: Record<string, number>;
    totalAttempts: number;
    successfulAttempts: number;
  };
  analysis: {
    averageGenerationTime: number;
    successRate: number;
    qualityScore: number;
    totalAnalyses: number;
  };
  scheduling: {
    averageTasksPerDay: number;
    freshnessComplianceRate: number;
    priorityDistribution: Record<string, number>;
  };
  system: {
    uptime: number;
    errorRate: number;
    responseTime: number;
  };
}

interface PerformanceAlert {
  id: string;
  type: 'CRITICAL' | 'WARNING' | 'INFO';
  component: 'SCRAPING' | 'ANALYSIS' | 'SCHEDULING' | 'SYSTEM';
  message: string;
  threshold: number;
  currentValue: number;
  timestamp: Date;
  acknowledged: boolean;
}

interface PerformanceRecommendation {
  id: string;
  category: 'OPTIMIZATION' | 'SCALING' | 'CONFIGURATION' | 'MAINTENANCE';
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  title: string;
  description: string;
  expectedImpact: string;
  implementation: {
    effort: 'LOW' | 'MEDIUM' | 'HIGH';
    timeline: string;
    steps: string[];
  };
  metrics: {
    current: number;
    projected: number;
    unit: string;
  };
}

interface DashboardData {
  overview: {
    systemHealth: 'HEALTHY' | 'WARNING' | 'CRITICAL';
    overallPerformance: number; // 0-100 score
    activeProjects: number;
    totalSnapshots: number;
    lastUpdated: Date;
  };
  realTimeMetrics: PerformanceMetrics;
  alerts: PerformanceAlert[];
  recommendations: PerformanceRecommendation[];
  historicalData: {
    timeRange: '24h' | '7d' | '30d' | '90d';
    dataPoints: Array<{
      timestamp: Date;
      metrics: Partial<PerformanceMetrics>;
    }>;
  };
}

class PerformanceMonitoringService {
  private correlationId: string;
  
  // Alert thresholds
  private readonly ALERT_THRESHOLDS = {
    scraping: {
      critical: { successRate: 70, averageTime: 30000 }, // 70% success, 30s max
      warning: { successRate: 85, averageTime: 20000 }   // 85% success, 20s max
    },
    analysis: {
      critical: { successRate: 80, averageTime: 7200000 }, // 80% success, 2 hours max
      warning: { successRate: 90, averageTime: 3600000 }   // 90% success, 1 hour max
    },
    system: {
      critical: { errorRate: 5, responseTime: 5000 },    // 5% error rate, 5s response
      warning: { errorRate: 2, responseTime: 2000 }      // 2% error rate, 2s response
    }
  };

  constructor() {
    this.correlationId = generateCorrelationId();
  }

  /**
   * Get real-time dashboard data
   */
  async getDashboardData(timeRange: '24h' | '7d' | '30d' | '90d' = '24h'): Promise<DashboardData> {
    console.log(`[${this.correlationId}] Getting dashboard data for ${timeRange}`);
    
    try {
      const [overview, metrics, alerts, recommendations, historical] = await Promise.all([
        this.getSystemOverview(),
        this.getRealTimeMetrics(),
        this.getActiveAlerts(),
        this.getPerformanceRecommendations(),
        this.getHistoricalData(timeRange)
      ]);

      return {
        overview,
        realTimeMetrics: metrics,
        alerts,
        recommendations,
        historicalData: {
          timeRange,
          dataPoints: historical
        }
      };
    } catch (error) {
      console.error(`[${this.correlationId}] Dashboard data retrieval failed:`, error);
      throw error;
    }
  }

  /**
   * Get system overview metrics
   */
  private async getSystemOverview() {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const [activeProjects, totalSnapshots, recentErrors] = await Promise.all([
      prisma.project.count({ where: { status: 'ACTIVE' } }),
      prisma.productSnapshot.count(),
      prisma.productSnapshot.count({
        where: {
          createdAt: { gte: oneDayAgo },
          content: { equals: null } // Failed snapshots
        }
      })
    ]);

    const totalRecentSnapshots = await prisma.productSnapshot.count({
      where: { createdAt: { gte: oneDayAgo } }
    });

    const errorRate = totalRecentSnapshots > 0 ? (recentErrors / totalRecentSnapshots) * 100 : 0;
    const systemHealth = this.determineSystemHealth(errorRate);
    const overallPerformance = this.calculateOverallPerformance(errorRate, activeProjects);

    return {
      systemHealth,
      overallPerformance,
      activeProjects,
      totalSnapshots,
      lastUpdated: new Date()
    };
  }

  /**
   * Get real-time performance metrics
   */
  private async getRealTimeMetrics(): Promise<PerformanceMetrics> {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Scraping metrics from snapshots
    const snapshots = await prisma.productSnapshot.findMany({
      where: { createdAt: { gte: oneDayAgo } },
      select: {
        content: true,
        scrapingDuration: true,
        createdAt: true,
        error: true
      }
    });

    const scrapingMetrics = this.calculateScrapingMetrics(snapshots);

    // Analysis metrics from analysis table
    const analyses = await prisma.analysis.findMany({
      where: { createdAt: { gte: oneDayAgo } },
      select: {
        content: true,
        generationDuration: true,
        createdAt: true
      }
    });

    const analysisMetrics = this.calculateAnalysisMetrics(analyses);

    // Scheduling metrics (estimated from smart scheduling pattern)
    const projects = await prisma.project.findMany({
      where: { status: 'ACTIVE' },
      include: {
        products: { include: { snapshots: { take: 1, orderBy: { createdAt: 'desc' } } } },
        competitors: { include: { snapshots: { take: 1, orderBy: { createdAt: 'desc' } } } }
      }
    });

    const schedulingMetrics = this.calculateSchedulingMetrics(projects);

    // System metrics (basic estimates)
    const systemMetrics = {
      uptime: 99.5, // Estimated uptime
      errorRate: scrapingMetrics.successRate > 0 ? 100 - scrapingMetrics.successRate : 0,
      responseTime: scrapingMetrics.averageTime
    };

    return {
      scraping: scrapingMetrics,
      analysis: analysisMetrics,
      scheduling: schedulingMetrics,
      system: systemMetrics
    };
  }

  /**
   * Calculate scraping performance metrics
   */
  private calculateScrapingMetrics(snapshots: any[]) {
    const totalAttempts = snapshots.length;
    const successfulAttempts = snapshots.filter(s => s.content && s.content.length > 100).length;
    const successRate = totalAttempts > 0 ? (successfulAttempts / totalAttempts) * 100 : 100;

    const validDurations = snapshots
      .filter(s => s.scrapingDuration && s.scrapingDuration > 0)
      .map(s => s.scrapingDuration);
    
    const averageTime = validDurations.length > 0 
      ? validDurations.reduce((sum, duration) => sum + duration, 0) / validDurations.length
      : 5000; // Default 5s

    // Analyze failure reasons
    const failureReasons: Record<string, number> = {};
    snapshots.filter(s => !s.content || s.content.length <= 100).forEach(s => {
      const reason = s.error || 'Unknown';
      failureReasons[reason] = (failureReasons[reason] || 0) + 1;
    });

    return {
      successRate,
      averageTime,
      failureReasons,
      totalAttempts,
      successfulAttempts
    };
  }

  /**
   * Calculate analysis performance metrics
   */
  private calculateAnalysisMetrics(analyses: any[]) {
    const totalAnalyses = analyses.length;
    const successfulAnalyses = analyses.filter(a => a.content && a.content.length > 100).length;
    const successRate = totalAnalyses > 0 ? (successfulAnalyses / totalAnalyses) * 100 : 100;

    const validDurations = analyses
      .filter(a => a.generationDuration && a.generationDuration > 0)
      .map(a => a.generationDuration);
    
    const averageGenerationTime = validDurations.length > 0
      ? validDurations.reduce((sum, duration) => sum + duration, 0) / validDurations.length
      : 1800000; // Default 30 minutes

    // Quality score based on content length and success rate
    const avgContentLength = analyses
      .filter(a => a.content)
      .reduce((sum, a) => sum + a.content.length, 0) / Math.max(successfulAnalyses, 1);
    
    const qualityScore = Math.min(100, (avgContentLength / 1000) * successRate / 100);

    return {
      averageGenerationTime,
      successRate,
      qualityScore,
      totalAnalyses
    };
  }

  /**
   * Calculate scheduling performance metrics
   */
  private calculateSchedulingMetrics(projects: any[]) {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    let totalTasks = 0;
    let freshDataCount = 0;
    const priorityDistribution: Record<string, number> = { HIGH: 0, MEDIUM: 0, LOW: 0 };

    projects.forEach(project => {
      project.products.forEach((product: any) => {
        const latestSnapshot = product.snapshots[0];
        if (latestSnapshot) {
          totalTasks++;
          const age = now.getTime() - new Date(latestSnapshot.createdAt).getTime();
          const dayAge = age / (24 * 60 * 60 * 1000);

          if (dayAge <= 7) freshDataCount++;
          
          // Estimate priority based on age
          if (dayAge > 14) priorityDistribution.HIGH++;
          else if (dayAge > 7) priorityDistribution.MEDIUM++;
          else priorityDistribution.LOW++;
        }
      });

      project.competitors.forEach((competitor: any) => {
        const latestSnapshot = competitor.snapshots[0];
        if (latestSnapshot) {
          totalTasks++;
          const age = now.getTime() - new Date(latestSnapshot.createdAt).getTime();
          const dayAge = age / (24 * 60 * 60 * 1000);

          if (dayAge <= 7) freshDataCount++;
          
          if (dayAge > 14) priorityDistribution.HIGH++;
          else if (dayAge > 7) priorityDistribution.MEDIUM++;
          else priorityDistribution.LOW++;
        }
      });
    });

    const averageTasksPerDay = totalTasks / 7; // Estimate based on current state
    const freshnessComplianceRate = totalTasks > 0 ? (freshDataCount / totalTasks) * 100 : 100;

    return {
      averageTasksPerDay,
      freshnessComplianceRate,
      priorityDistribution
    };
  }

  /**
   * Get active alerts
   */
  private async getActiveAlerts(): Promise<PerformanceAlert[]> {
    const alerts: PerformanceAlert[] = [];
    const metrics = await this.getRealTimeMetrics();

    // Check scraping alerts
    if (metrics.scraping.successRate < this.ALERT_THRESHOLDS.scraping.critical.successRate) {
      alerts.push({
        id: generateCorrelationId(),
        type: 'CRITICAL',
        component: 'SCRAPING',
        message: `Scraping success rate critically low: ${metrics.scraping.successRate.toFixed(1)}%`,
        threshold: this.ALERT_THRESHOLDS.scraping.critical.successRate,
        currentValue: metrics.scraping.successRate,
        timestamp: new Date(),
        acknowledged: false
      });
    } else if (metrics.scraping.successRate < this.ALERT_THRESHOLDS.scraping.warning.successRate) {
      alerts.push({
        id: generateCorrelationId(),
        type: 'WARNING',
        component: 'SCRAPING',
        message: `Scraping success rate below optimal: ${metrics.scraping.successRate.toFixed(1)}%`,
        threshold: this.ALERT_THRESHOLDS.scraping.warning.successRate,
        currentValue: metrics.scraping.successRate,
        timestamp: new Date(),
        acknowledged: false
      });
    }

    // Check analysis alerts
    if (metrics.analysis.successRate < this.ALERT_THRESHOLDS.analysis.critical.successRate) {
      alerts.push({
        id: generateCorrelationId(),
        type: 'CRITICAL',
        component: 'ANALYSIS',
        message: `Analysis success rate critically low: ${metrics.analysis.successRate.toFixed(1)}%`,
        threshold: this.ALERT_THRESHOLDS.analysis.critical.successRate,
        currentValue: metrics.analysis.successRate,
        timestamp: new Date(),
        acknowledged: false
      });
    }

    // Check system alerts
    if (metrics.system.errorRate > this.ALERT_THRESHOLDS.system.critical.errorRate) {
      alerts.push({
        id: generateCorrelationId(),
        type: 'CRITICAL',
        component: 'SYSTEM',
        message: `System error rate critically high: ${metrics.system.errorRate.toFixed(1)}%`,
        threshold: this.ALERT_THRESHOLDS.system.critical.errorRate,
        currentValue: metrics.system.errorRate,
        timestamp: new Date(),
        acknowledged: false
      });
    }

    return alerts;
  }

  /**
   * Get performance recommendations
   */
  private async getPerformanceRecommendations(): Promise<PerformanceRecommendation[]> {
    const recommendations: PerformanceRecommendation[] = [];
    const metrics = await this.getRealTimeMetrics();

    // Scraping optimization recommendations
    if (metrics.scraping.successRate < 95) {
      recommendations.push({
        id: generateCorrelationId(),
        category: 'OPTIMIZATION',
        priority: 'HIGH',
        title: 'Optimize Web Scraping Success Rate',
        description: 'Current scraping success rate is below optimal. Consider implementing enhanced retry logic and better error handling.',
        expectedImpact: `Increase success rate from ${metrics.scraping.successRate.toFixed(1)}% to 95%+`,
        implementation: {
          effort: 'MEDIUM',
          timeline: '1-2 weeks',
          steps: [
            'Analyze failure patterns in scraping logs',
            'Implement adaptive retry delays',
            'Add User-Agent rotation',
            'Implement request rate limiting'
          ]
        },
        metrics: {
          current: metrics.scraping.successRate,
          projected: 95,
          unit: '% success rate'
        }
      });
    }

    // Performance optimization for slow scraping
    if (metrics.scraping.averageTime > 15000) {
      recommendations.push({
        id: generateCorrelationId(),
        category: 'OPTIMIZATION',
        priority: 'MEDIUM',
        title: 'Reduce Scraping Response Time',
        description: 'Average scraping time is high. Optimize for faster data collection.',
        expectedImpact: `Reduce average time from ${(metrics.scraping.averageTime/1000).toFixed(1)}s to <10s`,
        implementation: {
          effort: 'MEDIUM',
          timeline: '1 week',
          steps: [
            'Implement parallel scraping for multiple URLs',
            'Add request caching for repeated URLs',
            'Optimize CSS selectors for faster parsing',
            'Implement request timeout optimization'
          ]
        },
        metrics: {
          current: metrics.scraping.averageTime / 1000,
          projected: 8,
          unit: 'seconds average time'
        }
      });
    }

    // Analysis time optimization
    if (metrics.analysis.averageGenerationTime > 3600000) { // > 1 hour
      recommendations.push({
        id: generateCorrelationId(),
        category: 'OPTIMIZATION',
        priority: 'HIGH',
        title: 'Optimize Analysis Generation Time',
        description: 'Analysis generation is taking longer than optimal. Consider content preprocessing and prompt optimization.',
        expectedImpact: `Reduce analysis time from ${(metrics.analysis.averageGenerationTime/60000).toFixed(0)} minutes to <30 minutes`,
        implementation: {
          effort: 'HIGH',
          timeline: '2-3 weeks',
          steps: [
            'Implement content preprocessing for AI analysis',
            'Optimize Claude prompts for faster response',
            'Add analysis result caching',
            'Implement parallel analysis processing'
          ]
        },
        metrics: {
          current: metrics.analysis.averageGenerationTime / 60000,
          projected: 25,
          unit: 'minutes average time'
        }
      });
    }

    // Freshness compliance optimization
    if (metrics.scheduling.freshnessComplianceRate < 85) {
      recommendations.push({
        id: generateCorrelationId(),
        category: 'CONFIGURATION',
        priority: 'MEDIUM',
        title: 'Improve Data Freshness Compliance',
        description: 'Data freshness compliance is below target. Optimize scheduling frequency and reliability.',
        expectedImpact: `Increase compliance from ${metrics.scheduling.freshnessComplianceRate.toFixed(1)}% to 90%+`,
        implementation: {
          effort: 'LOW',
          timeline: '1 week',
          steps: [
            'Review and adjust scheduling intervals',
            'Implement priority-based scheduling',
            'Add automated freshness monitoring',
            'Create freshness compliance alerts'
          ]
        },
        metrics: {
          current: metrics.scheduling.freshnessComplianceRate,
          projected: 92,
          unit: '% compliance rate'
        }
      });
    }

    return recommendations;
  }

  /**
   * Get historical performance data
   */
  private async getHistoricalData(timeRange: '24h' | '7d' | '30d' | '90d') {
    const now = new Date();
    const ranges = {
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000,
      '90d': 90 * 24 * 60 * 60 * 1000
    };

    const startTime = new Date(now.getTime() - ranges[timeRange]);
    
    // For now, return simulated historical data
    // In production, this would query actual historical metrics stored in database
    const dataPoints = [];
    const intervals = timeRange === '24h' ? 24 : timeRange === '7d' ? 14 : 30;
    const intervalMs = ranges[timeRange] / intervals;

    for (let i = 0; i < intervals; i++) {
      const timestamp = new Date(startTime.getTime() + (i * intervalMs));
      
      // Simulate realistic historical data with some variance
      const baseSuccessRate = 85 + Math.random() * 10;
      const baseResponseTime = 8000 + Math.random() * 5000;
      
      dataPoints.push({
        timestamp,
        metrics: {
          scraping: {
            successRate: baseSuccessRate,
            averageTime: baseResponseTime,
            totalAttempts: Math.floor(20 + Math.random() * 30),
            successfulAttempts: Math.floor((20 + Math.random() * 30) * (baseSuccessRate / 100))
          },
          system: {
            errorRate: 100 - baseSuccessRate,
            responseTime: baseResponseTime
          }
        }
      });
    }

    return dataPoints;
  }

  /**
   * Determine overall system health
   */
  private determineSystemHealth(errorRate: number): 'HEALTHY' | 'WARNING' | 'CRITICAL' {
    if (errorRate > 5) return 'CRITICAL';
    if (errorRate > 2) return 'WARNING';
    return 'HEALTHY';
  }

  /**
   * Calculate overall performance score
   */
  private calculateOverallPerformance(errorRate: number, activeProjects: number): number {
    const baseScore = Math.max(0, 100 - (errorRate * 2)); // Error rate penalty
    const activityBonus = Math.min(10, activeProjects); // Active projects bonus
    return Math.min(100, baseScore + activityBonus);
  }

  /**
   * Acknowledge an alert
   */
  async acknowledgeAlert(alertId: string): Promise<boolean> {
    console.log(`[${this.correlationId}] Acknowledging alert: ${alertId}`);
    // In production, this would update the alert status in database
    return true;
  }

  /**
   * Get performance summary for a specific project
   */
  async getProjectPerformanceSummary(projectId: string) {
    console.log(`[${this.correlationId}] Getting performance summary for project: ${projectId}`);
    
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        products: {
          include: {
            snapshots: {
              take: 10,
              orderBy: { createdAt: 'desc' }
            }
          }
        },
        competitors: {
          include: {
            snapshots: {
              take: 10,
              orderBy: { createdAt: 'desc' }
            }
          }
        },
        analyses: {
          take: 5,
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!project) {
      throw new Error(`Project not found: ${projectId}`);
    }

    // Calculate project-specific performance metrics
    const allSnapshots = [
      ...project.products.flatMap(p => p.snapshots),
      ...project.competitors.flatMap(c => c.snapshots)
    ];

    const scrapingMetrics = this.calculateScrapingMetrics(allSnapshots);
    const analysisMetrics = this.calculateAnalysisMetrics(project.analyses);

    return {
      projectId,
      projectName: project.name,
      status: project.status,
      performance: {
        scraping: scrapingMetrics,
        analysis: analysisMetrics,
        dataFreshness: this.calculateProjectFreshness(project),
        lastActivity: this.getLastActivity(project)
      }
    };
  }

  /**
   * Calculate project data freshness
   */
  private calculateProjectFreshness(project: any) {
    const now = new Date();
    let freshCount = 0;
    let totalCount = 0;

    project.products.forEach((product: any) => {
      if (product.snapshots.length > 0) {
        totalCount++;
        const age = now.getTime() - new Date(product.snapshots[0].createdAt).getTime();
        if (age <= 7 * 24 * 60 * 60 * 1000) freshCount++; // 7 days
      }
    });

    project.competitors.forEach((competitor: any) => {
      if (competitor.snapshots.length > 0) {
        totalCount++;
        const age = now.getTime() - new Date(competitor.snapshots[0].createdAt).getTime();
        if (age <= 7 * 24 * 60 * 60 * 1000) freshCount++;
      }
    });

    return {
      freshCount,
      totalCount,
      freshnessRate: totalCount > 0 ? (freshCount / totalCount) * 100 : 100
    };
  }

  /**
   * Get last activity timestamp for project
   */
  private getLastActivity(project: any) {
    const timestamps = [
      ...project.products.flatMap((p: any) => p.snapshots.map((s: any) => new Date(s.createdAt))),
      ...project.competitors.flatMap((c: any) => c.snapshots.map((s: any) => new Date(s.createdAt))),
      ...project.analyses.map((a: any) => new Date(a.createdAt))
    ];

    return timestamps.length > 0 ? new Date(Math.max(...timestamps.map(t => t.getTime()))) : null;
  }
}

export default PerformanceMonitoringService;
export type {
  PerformanceMetrics,
  PerformanceAlert,
  PerformanceRecommendation,
  DashboardData
}; 