/**
 * Smart Scheduling API Endpoint - Phase 1.2
 * Provides REST API access to the SmartSchedulingService
 * 
 * Endpoints:
 * - POST: Trigger smart scheduling for a project
 * - GET: Get freshness status for a project
 */

import { NextRequest, NextResponse } from 'next/server';
import { SmartSchedulingService } from '@/services/smartSchedulingService';
import { logger, generateCorrelationId, trackErrorWithCorrelation } from '@/lib/logger';

// Initialize SmartSchedulingService
const smartSchedulingService = new SmartSchedulingService();

/**
 * POST /api/projects/[id]/smart-scheduling
 * Trigger smart scheduling for a project
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const correlationId = generateCorrelationId();
  const projectId = params.id;
  const context = { projectId, correlationId, operation: 'triggerSmartScheduling' };

  try {
    logger.info('Smart scheduling API triggered', context);

    if (!projectId) {
      return NextResponse.json(
        { error: 'Project ID is required', correlationId },
        { status: 400 }
      );
    }

    // Execute smart scheduling
    const result = await smartSchedulingService.checkAndTriggerScraping(projectId);

    logger.info('Smart scheduling API completed', {
      ...context,
      triggered: result.triggered,
      tasksExecuted: result.tasksExecuted,
      successfulTasks: result.results.filter(r => r.success).length
    });

    return NextResponse.json({
      success: true,
      projectId,
      scrapingTriggered: result.triggered,
      tasksExecuted: result.tasksExecuted,
      results: result.results,
      correlationId,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    trackErrorWithCorrelation(
      error as Error,
      'triggerSmartScheduling',
      correlationId,
      {
        ...context,
        service: 'SmartSchedulingAPI',
        method: 'POST',
        isRecoverable: false,
        suggestedAction: 'Check project existence and smart scheduling service'
      }
    );

    logger.error('Smart scheduling API failed', {
      ...context,
      error: (error as Error).message
    });

    return NextResponse.json(
      { 
        error: (error as Error).message,
        correlationId,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/projects/[id]/smart-scheduling
 * Get freshness status for a project
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const correlationId = generateCorrelationId();
  const projectId = params.id;
  const context = { projectId, correlationId, operation: 'getFreshnessStatus' };

  try {
    logger.info('Freshness status API requested', context);

    if (!projectId) {
      return NextResponse.json(
        { error: 'Project ID is required', correlationId },
        { status: 400 }
      );
    }

    // Get freshness status
    const status = await smartSchedulingService.getFreshnessStatus(projectId);

    logger.info('Freshness status API completed', {
      ...context,
      overallStatus: status.overallStatus,
      productsNeedingScraping: status.products?.filter((p: any) => p.needsScraping).length || 0,
      competitorsNeedingScraping: status.competitors?.filter((c: any) => c.needsScraping).length || 0
    });

    return NextResponse.json({
      success: true,
      projectId,
      ...status,
      correlationId,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    trackErrorWithCorrelation(
      error as Error,
      'getFreshnessStatus',
      correlationId,
      {
        ...context,
        service: 'SmartSchedulingAPI',
        method: 'GET',
        isRecoverable: false,
        suggestedAction: 'Check project existence and database connectivity'
      }
    );

    logger.error('Freshness status API failed', {
      ...context,
      error: (error as Error).message
    });

    return NextResponse.json(
      { 
        error: (error as Error).message,
        correlationId,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
} 