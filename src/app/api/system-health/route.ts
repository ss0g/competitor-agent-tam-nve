/**
 * System Health Monitoring API
 * Phase 3.3: Automated health checks and self-healing endpoints
 * 
 * GET  /api/system-health - Get system health status and reports
 * POST /api/system-health - Trigger health checks or self-healing actions
 */

import { NextRequest, NextResponse } from 'next/server';
import SystemHealthService from '../../../services/systemHealthService';

// Generate correlation ID for request tracking
function generateCorrelationId(): string {
  return `health-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

const systemHealthService = new SystemHealthService();

/**
 * GET /api/system-health
 * Get system health status, reports, and recommendations
 */
export async function GET(request: NextRequest) {
  const correlationId = generateCorrelationId();
  console.log(`[${correlationId}] GET /api/system-health`);
  
  try {
    const url = new URL(request.url);
    const action = url.searchParams.get('action') || 'status';
    
    switch (action) {
      case 'status':
        // Get comprehensive system health status
        const healthStatus = await systemHealthService.performSystemHealthCheck();
        
        return NextResponse.json({
          success: true,
          data: healthStatus,
          correlationId
        });
        
      case 'report':
        // Get comprehensive health report with recommendations
        const healthReport = await systemHealthService.getSystemHealthReport();
        
        return NextResponse.json({
          success: true,
          data: healthReport,
          correlationId
        });
        
      case 'recommendations':
        // Get proactive recommendations
        const recommendations = await systemHealthService.generateProactiveRecommendations();
        
        return NextResponse.json({
          success: true,
          data: recommendations,
          correlationId
        });
        
      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action parameter',
          availableActions: ['status', 'report', 'recommendations'],
          correlationId
        }, { status: 400 });
    }
    
  } catch (error) {
    console.error(`[${correlationId}] System health GET failed:`, error);
    
    // Graceful degradation: Return fallback health data
    const fallbackHealth = {
      systemStatus: 'DEGRADED',
      activeIssues: [],
      serviceHealthChecks: [],
      overallScore: 70, // Assume moderate health
      systemHealth: 'WARNING',
      lastUpdated: new Date().toISOString(),
      recommendations: ['System health monitoring temporarily unavailable'],
      error: 'Health monitoring service degraded'
    };
    
    return NextResponse.json({
      success: true,
      data: fallbackHealth,
      fallback: true,
      correlationId,
      error: error instanceof Error ? error.message : 'Failed to get system health data'
    }, {
      headers: {
        'X-Monitoring-Status': 'degraded',
        'X-Fallback-Mode': 'true'
      }
    });
  }
}

/**
 * POST /api/system-health
 * Trigger health checks or self-healing actions
 */
export async function POST(request: NextRequest) {
  const correlationId = generateCorrelationId();
  console.log(`[${correlationId}] POST /api/system-health`);
  
  try {
    const body = await request.json();
    const { action, issueId, parameters } = body;
    
    switch (action) {
      case 'runHealthCheck':
        // Trigger comprehensive health check
        const healthStatus = await systemHealthService.performSystemHealthCheck();
        
        return NextResponse.json({
          success: true,
          data: healthStatus,
          message: 'System health check completed',
          correlationId
        });
        
      case 'attemptSelfHealing':
        if (!issueId) {
          return NextResponse.json({
            success: false,
            error: 'Issue ID is required for self-healing action',
            correlationId
          }, { status: 400 });
        }
        
        // First get current issues to find the one to heal
        const currentStatus = await systemHealthService.performSystemHealthCheck();
        const issue = currentStatus.activeIssues.find(i => i.id === issueId);
        
        if (!issue) {
          return NextResponse.json({
            success: false,
            error: 'Issue not found',
            correlationId
          }, { status: 404 });
        }
        
        // Attempt self-healing
        const healingAction = await systemHealthService.attemptSelfHealing(issue);
        
        return NextResponse.json({
          success: true,
          data: healingAction,
          message: `Self-healing action ${healingAction.status.toLowerCase()}`,
          correlationId
        });
        
      case 'generateRecommendations':
        // Generate proactive recommendations
        const recommendations = await systemHealthService.generateProactiveRecommendations();
        
        return NextResponse.json({
          success: true,
          data: recommendations,
          message: `Generated ${recommendations.length} proactive recommendations`,
          correlationId
        });
        
      case 'getHealthReport':
        // Generate comprehensive health report
        const healthReport = await systemHealthService.getSystemHealthReport();
        
        return NextResponse.json({
          success: true,
          data: healthReport,
          message: 'System health report generated',
          correlationId
        });
        
      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action parameter',
          availableActions: [
            'runHealthCheck',
            'attemptSelfHealing',
            'generateRecommendations',
            'getHealthReport'
          ],
          correlationId
        }, { status: 400 });
    }
    
  } catch (error) {
    console.error(`[${correlationId}] System health POST failed:`, error);
    
    // Graceful degradation: Return accepted response even if action fails
    return NextResponse.json({
      success: false,
      accepted: true, // Indicate request was accepted
      error: error instanceof Error ? error.message : 'System health action temporarily unavailable',
      fallback: true,
      correlationId,
      message: 'Health action request accepted but service is temporarily degraded'
    }, { 
      status: 202, // Accepted
      headers: {
        'X-Monitoring-Status': 'degraded',
        'X-Fallback-Mode': 'true'
      }
    });
  }
} 