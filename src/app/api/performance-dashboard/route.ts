/**
 * Performance Monitoring Dashboard API
 * Phase 3.1: Real-time performance dashboard endpoints
 * 
 * GET  /api/performance-dashboard - Get real-time dashboard data
 * POST /api/performance-dashboard - Acknowledge alerts and get project-specific performance
 */

import { NextRequest, NextResponse } from 'next/server';
import PerformanceMonitoringService from '../../../services/performanceMonitoringService';
// Generate correlation ID for request tracking
function generateCorrelationId(): string {
  return `perf-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

const performanceService = new PerformanceMonitoringService();

/**
 * GET /api/performance-dashboard
 * Get real-time performance dashboard data
 */
export async function GET(request: NextRequest) {
  const correlationId = generateCorrelationId();
  console.log(`[${correlationId}] GET /api/performance-dashboard`);
  
  try {
    const url = new URL(request.url);
    const timeRange = url.searchParams.get('timeRange') as '24h' | '7d' | '30d' | '90d' || '24h';
    const projectId = url.searchParams.get('projectId');
    
    if (projectId) {
      // Get project-specific performance summary
      const projectSummary = await performanceService.getProjectPerformanceSummary(projectId);
      
      return NextResponse.json({
        success: true,
        data: projectSummary,
        correlationId
      });
    } else {
      // Get system-wide dashboard data
      const dashboardData = await performanceService.getDashboardData(timeRange);
      
      return NextResponse.json({
        success: true,
        data: dashboardData,
        correlationId
      });
    }
    
  } catch (error) {
    console.error(`[${correlationId}] Performance dashboard GET failed:`, error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get dashboard data',
      correlationId
    }, { status: 500 });
  }
}

/**
 * POST /api/performance-dashboard
 * Acknowledge alerts or perform dashboard actions
 */
export async function POST(request: NextRequest) {
  const correlationId = generateCorrelationId();
  console.log(`[${correlationId}] POST /api/performance-dashboard`);
  
  try {
    const body = await request.json();
    const { action, alertId, projectId } = body;
    
    if (action === 'acknowledgeAlert' && alertId) {
      // Acknowledge a specific alert
      const result = await performanceService.acknowledgeAlert(alertId);
      
      return NextResponse.json({
        success: true,
        data: { acknowledged: result },
        message: 'Alert acknowledged successfully',
        correlationId
      });
      
    } else if (action === 'getProjectSummary' && projectId) {
      // Get project-specific performance summary
      const projectSummary = await performanceService.getProjectPerformanceSummary(projectId);
      
      return NextResponse.json({
        success: true,
        data: projectSummary,
        correlationId
      });
      
    } else {
      return NextResponse.json({
        success: false,
        error: 'Invalid action or missing required parameters',
        correlationId
      }, { status: 400 });
    }
    
  } catch (error) {
    console.error(`[${correlationId}] Performance dashboard POST failed:`, error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Dashboard action failed',
      correlationId
    }, { status: 500 });
  }
} 