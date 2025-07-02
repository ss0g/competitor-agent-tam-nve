/**
 * Phase 5.3.1: Configuration Rollback API
 * Endpoint for rolling back configuration changes
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { ConfigurationManagementService } from '@/services/configurationManagementService';

const configService = ConfigurationManagementService.getInstance();

/**
 * POST /api/admin/initial-reports/config/rollback
 * Rollback configuration to a previous state
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { rollbackToken, updatedBy, reason } = body;

    if (!rollbackToken) {
      return NextResponse.json(
        { 
          error: 'Invalid request',
          message: 'Rollback token is required' 
        },
        { status: 400 }
      );
    }

    logger.info('Configuration rollback requested', {
      rollbackToken,
      updatedBy,
      reason
    });

    const result = await configService.rollbackConfiguration(rollbackToken, updatedBy);

    if (!result.success) {
      logger.warn('Configuration rollback failed', {
        errors: result.validationErrors,
        rollbackToken,
        updatedBy
      });

      return NextResponse.json(
        { 
          error: 'Configuration rollback failed',
          validationErrors: result.validationErrors
        },
        { status: 400 }
      );
    }

    logger.info('Configuration rollback completed successfully', {
      rollbackToken,
      updatedBy,
      updatedFields: result.updatedFields
    });

    return NextResponse.json(result);

  } catch (error) {
    logger.error('Configuration rollback failed', error as Error);
    
    return NextResponse.json(
      { 
        error: 'Configuration rollback failed',
        message: (error as Error).message 
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/initial-reports/config/rollback
 * Get available rollback tokens
 */
export async function GET(request: NextRequest) {
  try {
    const availableTokens = configService.getAvailableRollbackTokens();

    logger.info('Available rollback tokens retrieved', {
      tokenCount: availableTokens.length
    });

    return NextResponse.json({
      availableTokens,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Failed to retrieve rollback tokens', error as Error);
    
    return NextResponse.json(
      { 
        error: 'Failed to retrieve rollback tokens',
        message: (error as Error).message 
      },
      { status: 500 }
    );
  }
} 