import { NextRequest, NextResponse } from 'next/server';
import { productionRolloutService } from '@/lib/deployment/productionRollout';
import { featureFlags } from '@/lib/env';
import { trackEvent, generateCorrelationId } from '@/lib/logger';

export async function POST(request: NextRequest) {
  // Check if debug endpoints are enabled (for security)
  if (!featureFlags.isDebugEndpointsEnabled()) {
    return NextResponse.json(
      { error: 'Deployment endpoints are disabled' }, 
      { status: 403 }
    );
  }

  const correlationId = generateCorrelationId();

  try {
    const body = await request.json();
    const reason = body.reason || 'Manual rollback requested';

    // Additional logging for rollback requests
    trackEvent({
      eventType: 'deployment_rollback_requested',
      category: 'business',
      metadata: {
        reason,
        userAgent: request.headers.get('user-agent') || 'unknown',
        isProduction: featureFlags.isProductionEnvironment(),
        urgency: body.urgency || 'normal'
      }
    }, {
      correlationId,
      operation: 'rollback_deployment'
    });

    const result = await productionRolloutService.rollbackToPreviousPhase(reason);

    if (result.success) {
      trackEvent({
        eventType: 'deployment_rollback_completed',
        category: 'business',
        metadata: {
          newPhase: result.newPhase,
          reason,
          message: result.message
        }
      }, {
        correlationId,
        operation: 'deployment_rollback_completed'
      });

      // If this is an emergency rollback, also disable the feature completely
      if (body.emergency === true) {
        process.env.ENABLE_COMPARATIVE_REPORTS = 'false';
        
        trackEvent({
          eventType: 'emergency_feature_disabled',
          category: 'business',
          metadata: {
            feature: 'comparative_reports',
            reason: 'Emergency rollback',
            details: reason
          }
        }, {
          correlationId,
          operation: 'emergency_feature_disable'
        });
      }
    }

    return NextResponse.json({
      result,
      rollbackDetails: {
        reason,
        emergency: body.emergency || false,
        featureDisabled: body.emergency === true
      },
      timestamp: new Date().toISOString(),
      correlationId
    });

  } catch (error) {
    trackEvent({
      eventType: 'deployment_rollback_error',
      category: 'error',
      metadata: {
        error: (error as Error).message
      }
    }, {
      correlationId,
      operation: 'deployment_rollback_error'
    });

    return NextResponse.json(
      { 
        error: 'Failed to rollback deployment',
        message: (error as Error).message,
        correlationId 
      }, 
      { status: 500 }
    );
  }
}

// GET endpoint to check if automatic rollback should be triggered
export async function GET() {
  if (!featureFlags.isDebugEndpointsEnabled()) {
    return NextResponse.json(
      { error: 'Deployment endpoints are disabled' }, 
      { status: 403 }
    );
  }

  try {
    const shouldRollback = productionRolloutService.shouldTriggerAutomaticRollback();
    
    return NextResponse.json({
      shouldTriggerAutomaticRollback: shouldRollback,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    // Graceful degradation: Return conservative rollback recommendation
    return NextResponse.json({
      shouldTriggerAutomaticRollback: false, // Conservative default
      reason: 'Rollback monitoring temporarily unavailable',
      fallback: true,
      timestamp: new Date().toISOString(),
      error: 'Rollback status check degraded'
    }, {
      headers: {
        'X-Monitoring-Status': 'degraded',
        'X-Fallback-Mode': 'true'
      }
    });
  }
} 