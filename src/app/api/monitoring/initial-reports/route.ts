/**
 * Initial Reports Monitoring API
 * Phase 5.2.1: Production monitoring setup
 * 
 * Endpoints:
 * GET /api/monitoring/initial-reports - Dashboard metrics
 * GET /api/monitoring/initial-reports/alerts - Active alerts
 * GET /api/monitoring/initial-reports/trends - Historical trends
 */

import { NextRequest, NextResponse } from 'next/server';
import InitialReportMonitoringService from '../../../../services/monitoring/initialReportMonitoringService';
import { generateCorrelationId } from '../../../../lib/logger';

const monitoringService = new InitialReportMonitoringService();

export async function GET(request: NextRequest) {
  const correlationId = generateCorrelationId();
  const startTime = performance.now();
  
  try {
    const { searchParams } = new URL(request.url);
    const timeRange = (searchParams.get('timeRange') as '1h' | '24h' | '7d' | '30d') || '24h';
    const format = searchParams.get('format') || 'full'; // 'full', 'overview', 'alerts-only'
    
    console.log(`[${correlationId}] Getting initial reports monitoring data (${timeRange}, ${format})`);

    let responseData;

    switch (format) {
      case 'overview':
        // Return just overview metrics for lightweight requests
        const fullMetrics = await monitoringService.getDashboardMetrics(timeRange);
        responseData = {
          overview: fullMetrics.overview,
          alerts: fullMetrics.alerts.slice(0, 5), // Top 5 most critical alerts
          timestamp: new Date().toISOString()
        };
        break;

      case 'alerts-only':
        // Return only active alerts
        const alerts = await monitoringService.getActiveAlerts();
        responseData = {
          alerts,
          alertSummary: {
            critical: alerts.filter(a => a.type === 'CRITICAL').length,
            warning: alerts.filter(a => a.type === 'WARNING').length,
            budget: alerts.filter(a => a.type === 'BUDGET').length,
            total: alerts.length
          },
          timestamp: new Date().toISOString()
        };
        break;

      case 'metrics-only':
        // Return only real-time metrics without trends
        const metricsData = await monitoringService.getDashboardMetrics(timeRange);
        responseData = {
          overview: metricsData.overview,
          realTimeMetrics: metricsData.realTimeMetrics,
          recommendations: metricsData.recommendations,
          timestamp: new Date().toISOString()
        };
        break;

      default:
        // Return full dashboard data
        const dashboardData = await monitoringService.getDashboardMetrics(timeRange);
        responseData = {
          ...dashboardData,
          timestamp: new Date().toISOString(),
          correlationId: correlationId
        };
    }

    const responseTime = performance.now() - startTime;
    console.log(`[${correlationId}] Monitoring data retrieved in ${responseTime.toFixed(2)}ms`);

    // Add performance headers
    const response = NextResponse.json(responseData);
    response.headers.set('X-Response-Time', `${responseTime.toFixed(2)}ms`);
    response.headers.set('X-Correlation-ID', correlationId);
    response.headers.set('Cache-Control', 'no-cache, max-age=30'); // Cache for 30 seconds max
    
    return response;

  } catch (error) {
    console.error(`[${correlationId}] Monitoring API error:`, error);
    
    // Graceful degradation: Return fallback monitoring data instead of 500 error
    const fallbackResponse = {
      overview: {
        systemHealth: 'DEGRADED',
        activeInitialReports: 0,
        systemStatus: 'monitoring_unavailable',
        lastUpdated: new Date().toISOString()
      },
      realTimeMetrics: {
        generationSuccessRate: 95, // Assume reasonable default
        averageGenerationTime: 30000, // 30 seconds default
        peakGenerationTime: 60000, // 1 minute default
        freshDataUtilization: 90, // Assume reasonable default
        snapshotCaptureSuccessRate: 95 // Assume reasonable default
      },
      alerts: [],
      trends: [],
      recommendations: ['Monitoring service temporarily unavailable'],
      error: 'Monitoring service degraded',
      fallback: true,
      correlationId,
      timestamp: new Date().toISOString(),
      details: process.env.NODE_ENV === 'development' ? (error as Error)?.message : undefined
    };
    
    const response = NextResponse.json(fallbackResponse);
    response.headers.set('X-Correlation-ID', correlationId);
    response.headers.set('X-Monitoring-Status', 'degraded');
    response.headers.set('X-Fallback-Mode', 'true');
    
    return response;
  }
}

// POST endpoint for tracking custom events
export async function POST(request: NextRequest) {
  const correlationId = generateCorrelationId();
  
  try {
    const body = await request.json();
    const { reportId, event, metadata } = body;

    if (!reportId || !event) {
      return NextResponse.json({
        error: 'Missing required fields: reportId and event',
        correlationId
      }, { status: 400 });
    }

    console.log(`[${correlationId}] Tracking custom event: ${event} for report ${reportId}`);

    await monitoringService.trackReportGeneration(reportId, event, {
      ...metadata,
      source: 'api',
      userAgent: request.headers.get('user-agent'),
      ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      timestamp: new Date().toISOString()
    });

    return NextResponse.json({
      success: true,
      correlationId,
      timestamp: new Date().toISOString(),
      tracked: { reportId, event }
    });

  } catch (error) {
    console.error(`[${correlationId}] Event tracking error:`, error);
    
    // Graceful degradation: Accept the event tracking request even if it fails
    return NextResponse.json({
      success: false,
      accepted: true, // Indicate we accepted the request
      error: 'Event tracking temporarily unavailable',
      fallback: true,
      correlationId,
      timestamp: new Date().toISOString(),
      details: process.env.NODE_ENV === 'development' ? (error as Error)?.message : undefined
    }, { 
      status: 202, // Accepted - indicates request was received but may not be processed
      headers: {
        'X-Correlation-ID': correlationId,
        'X-Monitoring-Status': 'degraded'
      }
    });
  }
} 