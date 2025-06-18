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
    // Additional safety check for production environment
    if (featureFlags.isProductionEnvironment()) {
      const body = await request.json().catch(() => ({}));
      const confirmationToken = body.confirmationToken;
      
      if (!confirmationToken || confirmationToken !== 'CONFIRM_PHASE_ADVANCE') {
        return NextResponse.json(
          { 
            error: 'Production deployment requires confirmation token',
            requiredToken: 'CONFIRM_PHASE_ADVANCE'
          }, 
          { status: 400 }
        );
      }
    }

    trackEvent({
      eventType: 'deployment_phase_advance_requested',
      category: 'business',
      metadata: {
        userAgent: request.headers.get('user-agent') || 'unknown',
        isProduction: featureFlags.isProductionEnvironment()
      }
    }, {
      correlationId,
      operation: 'advance_deployment_phase'
    });

    const result = await productionRolloutService.advanceToNextPhase();

    if (result.success) {
      trackEvent({
        eventType: 'deployment_phase_advanced',
        category: 'business',
        metadata: {
          newPhase: result.newPhase,
          message: result.message
        }
      }, {
        correlationId,
        operation: 'deployment_phase_advanced'
      });
    }

    return NextResponse.json({
      result,
      timestamp: new Date().toISOString(),
      correlationId
    });

  } catch (error) {
    trackEvent({
      eventType: 'deployment_advance_error',
      category: 'error',
      metadata: {
        error: (error as Error).message
      }
    }, {
      correlationId,
      operation: 'deployment_advance_error'
    });

    return NextResponse.json(
      { 
        error: 'Failed to advance deployment phase',
        message: (error as Error).message,
        correlationId 
      }, 
      { status: 500 }
    );
  }
} 