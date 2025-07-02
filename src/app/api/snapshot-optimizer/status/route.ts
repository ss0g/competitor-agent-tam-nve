import { NextRequest, NextResponse } from 'next/server';
import { competitorSnapshotOptimizer } from '@/services/competitorSnapshotOptimizer';
import { logger } from '@/lib/logger';

/**
 * GET /api/snapshot-optimizer/status
 * 
 * Returns current status of the snapshot optimizer including:
 * - Circuit breaker state
 * - Daily snapshot count vs limit
 * - Active throttled domains
 * - Configuration settings
 */
export async function GET(request: NextRequest) {
  try {
    const status = competitorSnapshotOptimizer.getSystemStatus();
    
    logger.info('Snapshot optimizer status requested', {
      status,
      requestedAt: new Date()
    });

    return NextResponse.json({
      success: true,
      status,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Failed to get snapshot optimizer status', error as Error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get optimizer status',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/snapshot-optimizer/status
 * 
 * Updates snapshot optimizer configuration
 * Body should contain partial configuration updates
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { config } = body;

    if (!config) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing config in request body',
          timestamp: new Date().toISOString()
        },
        { status: 400 }
      );
    }

    // Update configuration
    competitorSnapshotOptimizer.updateConfig(config);
    
    // Get updated status
    const updatedStatus = competitorSnapshotOptimizer.getSystemStatus();

    logger.info('Snapshot optimizer configuration updated', {
      updatedConfig: config,
      newStatus: updatedStatus,
      updatedAt: new Date()
    });

    return NextResponse.json({
      success: true,
      message: 'Configuration updated successfully',
      status: updatedStatus,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Failed to update snapshot optimizer configuration', error as Error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update configuration',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
} 