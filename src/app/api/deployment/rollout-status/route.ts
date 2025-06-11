import { NextRequest, NextResponse } from 'next/server';
import { productionRolloutService } from '@/lib/deployment/productionRollout';
import { featureFlags } from '@/lib/env';
import { trackEvent, generateCorrelationId } from '@/lib/logger';

export async function GET(request: NextRequest) {
  // Check if debug endpoints are enabled (for security)
  if (!featureFlags.isDebugEndpointsEnabled()) {
    return NextResponse.json(
      { error: 'Deployment endpoints are disabled' }, 
      { status: 403 }
    );
  }

  const correlationId = generateCorrelationId();

  try {
    trackEvent({
      eventType: 'deployment_status_requested',
      category: 'system_event',
      metadata: {
        userAgent: request.headers.get('user-agent') || 'unknown'
      }
    }, {
      correlationId,
      operation: 'get_deployment_status'
    });

    const rolloutStatus = await productionRolloutService.getRolloutStatus();
    const deploymentGuide = productionRolloutService.getDeploymentGuide();

    return NextResponse.json({
      status: rolloutStatus,
      deploymentGuide,
      environment: {
        nodeEnv: process.env.NODE_ENV,
        deploymentEnv: process.env.DEPLOYMENT_ENVIRONMENT,
        comparativeReportsEnabled: featureFlags.isComparativeReportsEnabled(),
        performanceMonitoringEnabled: featureFlags.isPerformanceMonitoringEnabled()
      },
      timestamp: new Date().toISOString(),
      correlationId
    });

  } catch (error) {
    trackEvent({
      eventType: 'deployment_status_error',
      category: 'error',
      metadata: {
        error: (error as Error).message
      }
    }, {
      correlationId,
      operation: 'get_deployment_status_error'
    });

    return NextResponse.json(
      { 
        error: 'Failed to get deployment status',
        message: (error as Error).message,
        correlationId 
      }, 
      { status: 500 }
    );
  }
} 