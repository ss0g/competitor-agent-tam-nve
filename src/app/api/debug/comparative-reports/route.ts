import { NextRequest, NextResponse } from 'next/server';
import { comparativeReportMonitoring } from '@/lib/monitoring/comparativeReportMonitoring';
import { featureFlags } from '@/lib/env';
import { prisma } from '@/lib/prisma';
import { trackEvent, generateCorrelationId } from '@/lib/logger';

export async function GET(request: NextRequest) {
  // Check if debug endpoints are enabled
  if (!featureFlags.isDebugEndpointsEnabled()) {
    return NextResponse.json(
      { error: 'Debug endpoints are disabled' }, 
      { status: 403 }
    );
  }

  const correlationId = generateCorrelationId();
  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get('projectId');
  const timeRange = searchParams.get('timeRange') || '1h';

  try {
    trackEvent({
      eventType: 'debug_dashboard_accessed',
      category: 'system_event',
      metadata: {
        projectId: projectId || 'system_wide',
        timeRange,
        userAgent: request.headers.get('user-agent') || 'unknown'
      }
    }, {
      correlationId,
      operation: 'debug_dashboard_access'
    });

    if (projectId) {
      // Project-specific debugging
      const [metrics, project, alerts] = await Promise.all([
        comparativeReportMonitoring.getProjectMetrics(projectId),
        getProjectDetails(projectId),
        comparativeReportMonitoring.getSystemAlerts()
      ]);

      const timeline = comparativeReportMonitoring.generateTimeline(metrics.timeline);
      const projectAlerts = alerts.filter(alert => 
        alert.data.projectId === projectId || alert.type === 'system_health'
      );

      return NextResponse.json({
        type: 'project_debug',
        projectId,
        project: project ? {
          id: project.id,
          name: project.name,
          productCount: (project as any).products?.length || 0,
          competitorCount: (project as any).competitors?.length || 0,
          createdAt: project.createdAt,
          lastReportAt: (project as any).reports?.[0]?.createdAt || null
        } : null,
        metrics: {
          reportCount: metrics.reportCount,
          averageProcessingTime: Math.round(metrics.averageProcessingTime),
          successRate: Math.round(metrics.successRate * 100),
          lastReportGenerated: metrics.lastReportGenerated,
          issues: metrics.issues
        },
        timeline: timeline.slice(-20), // Last 20 events
        alerts: projectAlerts,
        recommendations: generateProjectRecommendations(metrics),
        debug: {
          correlationId,
          timestamp: new Date().toISOString(),
          timeRange
        }
      });
    } else {
      // System-wide health monitoring
      const [health, alerts] = await Promise.all([
        comparativeReportMonitoring.generateHealthDashboard(),
        comparativeReportMonitoring.getSystemAlerts()
      ]);

      const systemStats = await getSystemStatistics();

      return NextResponse.json({
        type: 'system_health',
        health: {
          totalReports: health.totalReports,
          failureRate: Math.round(health.failureRate * 100),
          averageProcessingTime: Math.round(health.averageProcessingTime),
          queueDepth: health.queueDepth,
          activeProjects: health.activeProjects,
          errorRate: Math.round(health.errorRate * 100),
          status: determineSystemStatus(health)
        },
        alerts,
        system: systemStats,
        configuration: {
          comparativeReportsEnabled: featureFlags.isComparativeReportsEnabled(),
          rolloutPercentage: process.env.COMPARATIVE_REPORTS_ROLLOUT_PERCENTAGE || '100',
          performanceMonitoring: featureFlags.isPerformanceMonitoringEnabled(),
          environment: process.env.DEPLOYMENT_ENVIRONMENT || 'development'
        },
        debug: {
          correlationId,
          timestamp: new Date().toISOString(),
          timeRange
        }
      });
    }
  } catch (error) {
    trackEvent({
      eventType: 'debug_dashboard_error',
      category: 'error',
      metadata: {
        error: (error as Error).message,
        projectId: projectId || 'system_wide',
        stack: (error as Error).stack
      }
    }, {
      correlationId,
      operation: 'debug_dashboard_error'
    });

    // Graceful degradation: Return fallback debug data instead of 500 error
    const fallbackResponse = {
      type: projectId ? 'project_health' : 'system_health',
      health: {
        totalReports: 0,
        failureRate: 0,
        averageProcessingTime: 30000, // 30 seconds default
        queueDepth: 0,
        activeProjects: 0,
        errorRate: 0,
        status: 'degraded'
      },
      alerts: [],
      system: {
        totalProjects: 0,
        reportsLast24h: 0,
        totalProducts: 0,
        totalCompetitors: 0,
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        nodeVersion: process.version,
        error: 'Monitoring temporarily unavailable'
      },
      configuration: {
        comparativeReportsEnabled: true,
        rolloutPercentage: '100',
        performanceMonitoring: false,
        environment: process.env.NODE_ENV || 'development'
      },
      debug: {
        correlationId,
        timestamp: new Date().toISOString(),
        fallback: true,
        error: 'Debug dashboard temporarily unavailable',
        message: (error as Error).message
      }
    };

    return NextResponse.json(fallbackResponse, {
      headers: {
        'X-Monitoring-Status': 'degraded',
        'X-Fallback-Mode': 'true',
        'X-Correlation-ID': correlationId
      }
    });
  }
}

async function getProjectDetails(projectId: string) {
  try {
    return await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        products: {
          select: { id: true, name: true, website: true }
        },
        competitors: {
          select: { id: true, name: true, website: true }
        },
        reports: {
          select: { id: true, createdAt: true, reportType: true },
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      }
    });
  } catch (error) {
    console.error('Error fetching project details:', error);
    return null;
  }
}

async function getSystemStatistics() {
  try {
    const [projectCount, reportCount, productCount, competitorCount] = await Promise.all([
      prisma.project.count(),
      prisma.report.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
          }
        }
      }),
      (prisma as any).product?.count() || 0,
      prisma.competitor.count()
    ]);

    return {
      totalProjects: projectCount,
      reportsLast24h: reportCount,
      totalProducts: productCount,
      totalCompetitors: competitorCount,
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      nodeVersion: process.version
    };
  } catch (error) {
    console.error('Error fetching system statistics:', error);
    return {
      totalProjects: 0,
      reportsLast24h: 0,
      totalProducts: 0,
      totalCompetitors: 0,
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      nodeVersion: process.version,
      error: 'Could not fetch database statistics'
    };
  }
}

function determineSystemStatus(health: any): 'healthy' | 'warning' | 'critical' {
  if (health.errorRate > 0.1) return 'critical'; // >10% error rate
  if (health.failureRate > 0.2) return 'critical'; // >20% failure rate
  if (health.averageProcessingTime > 180000) return 'critical'; // >3 minutes
  
  if (health.errorRate > 0.05) return 'warning'; // >5% error rate
  if (health.failureRate > 0.1) return 'warning'; // >10% failure rate
  if (health.averageProcessingTime > 120000) return 'warning'; // >2 minutes
  if (health.queueDepth > 10) return 'warning'; // High queue depth
  
  return 'healthy';
}

function generateProjectRecommendations(metrics: any): string[] {
  const recommendations: string[] = [];
  
  if (metrics.successRate < 0.8) {
    recommendations.push('Consider reviewing project configuration - success rate is below 80%');
  }
  
  if (metrics.averageProcessingTime > 120000) {
    recommendations.push('Report generation is slow - check product website accessibility and competitor data quality');
  }
  
  if (metrics.issues.length > 0) {
    recommendations.push(`Address ${metrics.issues.length} identified issues to improve performance`);
  }
  
  if (metrics.reportCount === 0) {
    recommendations.push('No reports generated yet - trigger initial report generation');
  }
  
  if (!metrics.lastReportGenerated) {
    recommendations.push('No recent report activity - check auto-generation configuration');
  } else {
    const lastReport = new Date(metrics.lastReportGenerated);
    const daysSinceLastReport = (Date.now() - lastReport.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceLastReport > 7) {
      recommendations.push('Last report was generated over a week ago - check scheduling configuration');
    }
  }
  
  return recommendations;
}

// Health check endpoint for monitoring systems
export async function HEAD() {
  try {
    // Graceful degradation: Always return 200 for monitoring systems
    // Even if debug endpoints are disabled, provide basic health check
    if (!featureFlags.isDebugEndpointsEnabled()) {
      return new NextResponse(null, { 
        status: 200,
        headers: {
          'X-System-Status': 'operational',
          'X-Monitoring': 'limited',
          'X-Debug-Disabled': 'true'
        }
      });
    }
    
    try {
      const health = comparativeReportMonitoring.generateHealthDashboard();
      const status = determineSystemStatus(health);
      
      return new NextResponse(null, { 
        status: 200, // Always return 200 for monitoring systems
        headers: {
          'X-System-Status': status,
          'X-Error-Rate': (health.errorRate * 100).toFixed(1),
          'X-Queue-Depth': health.queueDepth.toString(),
          'X-Active-Projects': health.activeProjects.toString(),
          'X-Monitoring': 'enabled'
        }
      });
    } catch (healthError) {
      // Fallback health response - still return 200 for monitoring
      return new NextResponse(null, { 
        status: 200,
        headers: {
          'X-System-Status': 'degraded',
          'X-Monitoring': 'fallback',
          'X-Health-Error': 'true'
        }
      });
    }
  } catch {
    // Final fallback - always return 200 for monitoring systems
    return new NextResponse(null, { 
      status: 200,
      headers: {
        'X-System-Status': 'operational',
        'X-Monitoring': 'basic'
      }
    });
  }
} 