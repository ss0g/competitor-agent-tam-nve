/**
 * Phase 5.3.1: Admin Configuration Management API
 * Endpoints for managing immediate reports configuration
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { ConfigurationManagementService } from '@/services/configurationManagementService';
import { ConfigUpdateRequest } from '@/types/initialReportConfig';

const configService = ConfigurationManagementService.getInstance();

/**
 * GET /api/admin/initial-reports/config
 * Get current configuration
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const includeAudit = searchParams.get('includeAudit') === 'true';
    const includeRollbackTokens = searchParams.get('includeRollbackTokens') === 'true';

    const currentConfig = configService.getCurrentConfig();
    
    const response: any = {
      config: currentConfig,
      timestamp: new Date().toISOString()
    };

    if (includeAudit) {
      const auditLimit = parseInt(searchParams.get('auditLimit') || '50');
      response.auditLog = configService.getAuditLog(auditLimit);
    }

    if (includeRollbackTokens) {
      response.availableRollbackTokens = configService.getAvailableRollbackTokens();
    }

    logger.info('Configuration retrieved', {
      includeAudit,
      includeRollbackTokens,
      configKeys: Object.keys(currentConfig)
    });

    return NextResponse.json(response);

  } catch (error) {
    logger.error('Failed to retrieve configuration', error as Error);
    
    return NextResponse.json(
      { 
        error: 'Failed to retrieve configuration',
        message: (error as Error).message 
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/initial-reports/config
 * Update configuration
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { config, reason, updatedBy } = body as ConfigUpdateRequest;

    if (!config || Object.keys(config).length === 0) {
      return NextResponse.json(
        { 
          error: 'Invalid request',
          message: 'Configuration updates are required' 
        },
        { status: 400 }
      );
    }

    // Assess performance impact before applying changes
    const performanceImpact = configService.assessPerformanceImpact(config);
    
    logger.info('Configuration update requested', {
      updatedBy,
      reason,
      updateFields: Object.keys(config),
      performanceImpact: performanceImpact.estimatedImpact
    });

    // Validate that high-impact changes include proper justification
    if (performanceImpact.estimatedImpact === 'high' && !reason) {
      return NextResponse.json(
        { 
          error: 'Justification required',
          message: 'High-impact configuration changes require a reason',
          performanceImpact
        },
        { status: 400 }
      );
    }

    const result = await configService.updateConfiguration({
      config,
      reason,
      updatedBy
    });

    if (!result.success) {
      logger.warn('Configuration update failed', {
        errors: result.validationErrors,
        updatedBy
      });

      return NextResponse.json(
        { 
          error: 'Configuration validation failed',
          validationErrors: result.validationErrors,
          performanceImpact
        },
        { status: 400 }
      );
    }

    logger.info('Configuration updated successfully', {
      updatedBy,
      updatedFields: result.updatedFields,
      rollbackToken: result.rollbackInfo?.rollbackToken
    });

    return NextResponse.json({
      ...result,
      performanceImpact
    });

  } catch (error) {
    logger.error('Configuration update failed', error as Error);
    
    return NextResponse.json(
      { 
        error: 'Configuration update failed',
        message: (error as Error).message 
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/initial-reports/config/reload
 * Reload configuration from environment
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { updatedBy } = body;

    logger.info('Configuration reload requested', { updatedBy });

    const result = await configService.reloadFromEnvironment(updatedBy);

    if (!result.success) {
      logger.warn('Configuration reload failed', {
        errors: result.validationErrors,
        updatedBy
      });

      return NextResponse.json(
        { 
          error: 'Configuration reload failed',
          validationErrors: result.validationErrors
        },
        { status: 400 }
      );
    }

    logger.info('Configuration reloaded successfully', {
      updatedBy,
      updatedFields: result.updatedFields
    });

    return NextResponse.json(result);

  } catch (error) {
    logger.error('Configuration reload failed', error as Error);
    
    return NextResponse.json(
      { 
        error: 'Configuration reload failed',
        message: (error as Error).message 
      },
      { status: 500 }
    );
  }
} 