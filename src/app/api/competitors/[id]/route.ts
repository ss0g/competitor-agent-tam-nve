import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { z } from 'zod';
import { 
  logger, 
  generateCorrelationId, 
  trackDatabaseOperation,
  trackCorrelation,
  trackError 
} from '@/lib/logger';

const updateCompetitorSchema = z.object({
  name: z.string().min(1, 'Company name is required').max(255, 'Company name too long').optional(),
  website: z.string().url('Invalid website URL').optional(),
  description: z.string().max(1000, 'Description too long').optional(),
  industry: z.string().min(1, 'Industry is required').max(100, 'Industry name too long').optional(),
  employeeCount: z.number().int().positive().optional(),
  revenue: z.number().positive().optional(),
  founded: z.number().int().min(1800).max(new Date().getFullYear()).optional(),
  headquarters: z.string().max(255, 'Headquarters location too long').optional(),
  socialMedia: z.any().optional(),
});

// GET /api/competitors/[id]
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const correlationId = generateCorrelationId();
  const context = {
    endpoint: `/api/competitors/${params.id}`,
    method: 'GET',
    correlationId,
    competitorId: params.id
  };

  try {
    trackCorrelation(correlationId, 'competitor_detail_request_received', context);
    logger.info('Competitor detail request received', context);

    // Validate competitor ID
    if (!params.id || params.id.length < 1) {
      trackCorrelation(correlationId, 'invalid_competitor_id', context);
      logger.warn('Invalid competitor ID provided', context);
      return NextResponse.json({ 
        error: 'Invalid competitor ID',
        correlationId 
      }, { status: 400 });
    }

    trackDatabaseOperation('findUnique', 'competitor', {
      ...context,
      query: 'fetch competitor with relations'
    });

    const competitor = await prisma.competitor.findUnique({
      where: {
        id: params.id
      },
      include: {
        reports: {
          select: {
            id: true,
            name: true,
            createdAt: true,
            updatedAt: true
          },
          orderBy: { createdAt: 'desc' }
        },
                 snapshots: {
           select: {
             id: true,
             createdAt: true,
             metadata: true
           },
           orderBy: { createdAt: 'desc' },
           take: 5
         }
      }
    });

    if (!competitor) {
      trackCorrelation(correlationId, 'competitor_not_found', context);
      trackDatabaseOperation('findUnique', 'competitor', {
        ...context,
        success: true,
        recordData: { found: false }
      });

      logger.warn('Competitor not found', context);
      return NextResponse.json({ 
        error: 'Competitor not found',
        message: `No competitor found with ID: ${params.id}`,
        correlationId 
      }, { status: 404 });
    }

    trackCorrelation(correlationId, 'competitor_detail_retrieved', {
      ...context,
      competitorName: competitor.name,
      reportsCount: competitor.reports.length,
      snapshotsCount: competitor.snapshots.length
    });

    trackDatabaseOperation('findUnique', 'competitor', {
      ...context,
      success: true,
      recordData: { 
        found: true,
        name: competitor.name,
        reportsCount: competitor.reports.length,
        snapshotsCount: competitor.snapshots.length
      }
    });

    logger.info('Competitor detail retrieved successfully', {
      ...context,
      competitorName: competitor.name,
      reportsCount: competitor.reports.length,
      snapshotsCount: competitor.snapshots.length
    });

    return NextResponse.json({
      ...competitor,
      correlationId
    });

  } catch (error) {
    trackCorrelation(correlationId, 'competitor_detail_error', {
      ...context,
      errorMessage: (error as Error).message
    });

    logger.error('Failed to fetch competitor details', error as Error, context);
    trackError(error as Error, 'competitor_detail', context);

    return NextResponse.json({ 
      error: 'Internal Server Error',
      message: 'Failed to fetch competitor details',
      correlationId 
    }, { status: 500 });
  }
}

// PUT /api/competitors/[id]
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const correlationId = generateCorrelationId();
  const context = {
    endpoint: `/api/competitors/${params.id}`,
    method: 'PUT',
    correlationId,
    competitorId: params.id
  };

  try {
    trackCorrelation(correlationId, 'competitor_update_request_received', context);
    logger.info('Competitor update request received', context);

    // Validate competitor ID
    if (!params.id || params.id.length < 1) {
      trackCorrelation(correlationId, 'invalid_competitor_id', context);
      logger.warn('Invalid competitor ID provided', context);
      return NextResponse.json({ 
        error: 'Invalid competitor ID',
        correlationId 
      }, { status: 400 });
    }

    // Parse and validate request body
    let json;
    try {
      json = await request.json();
      trackCorrelation(correlationId, 'request_body_parsed', {
        ...context,
        hasBody: true,
        updateFields: Object.keys(json)
      });
    } catch (parseError) {
      trackCorrelation(correlationId, 'request_body_parse_failed', context);
      logger.warn('Invalid JSON in request body', context);
      return NextResponse.json({ 
        error: 'Invalid JSON in request body',
        correlationId 
      }, { status: 400 });
    }

    // Validate update data
    let validatedData;
    try {
      validatedData = updateCompetitorSchema.parse(json);
      trackCorrelation(correlationId, 'input_validation_passed', {
        ...context,
        updateFields: Object.keys(validatedData)
      });
    } catch (validationError) {
      trackCorrelation(correlationId, 'input_validation_failed', {
        ...context,
        validationErrors: validationError instanceof z.ZodError ? validationError.errors : []
      });
      
      logger.warn('Competitor update validation failed', {
        ...context,
        validationErrors: validationError instanceof z.ZodError ? validationError.errors : []
      });

      const errors = validationError instanceof z.ZodError 
        ? validationError.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message
          }))
        : [{ field: 'unknown', message: 'Validation failed' }];

      return NextResponse.json({ 
        error: 'Validation failed',
        validationErrors: errors,
        correlationId 
      }, { status: 400 });
    }

    // Check if update data is empty
    if (Object.keys(validatedData).length === 0) {
      trackCorrelation(correlationId, 'empty_update_data', context);
      logger.warn('No valid update fields provided', context);
      return NextResponse.json({ 
        error: 'No valid update data provided',
        message: 'At least one field must be provided for update',
        correlationId 
      }, { status: 400 });
    }

    // Check if competitor exists
    trackDatabaseOperation('findUnique', 'competitor', {
      ...context,
      query: 'check competitor exists before update'
    });

    const existingCompetitor = await prisma.competitor.findUnique({
      where: { id: params.id }
    });

    if (!existingCompetitor) {
      trackCorrelation(correlationId, 'competitor_not_found_for_update', context);
      trackDatabaseOperation('findUnique', 'competitor', {
        ...context,
        success: true,
        recordData: { found: false }
      });

      logger.warn('Competitor not found for update', context);
      return NextResponse.json({ 
        error: 'Competitor not found',
        message: `No competitor found with ID: ${params.id}`,
        correlationId 
      }, { status: 404 });
    }

    // Check for duplicate name/website if being updated
    if (validatedData.name || validatedData.website) {
      const duplicateConditions = [];
      if (validatedData.name && validatedData.name !== existingCompetitor.name) {
        duplicateConditions.push({ name: validatedData.name });
      }
      if (validatedData.website && validatedData.website !== existingCompetitor.website) {
        duplicateConditions.push({ website: validatedData.website });
      }

      if (duplicateConditions.length > 0) {
        trackDatabaseOperation('findFirst', 'competitor', {
          ...context,
          query: 'check for duplicates during update'
        });

        const duplicateCompetitor = await prisma.competitor.findFirst({
          where: {
            AND: [
              { id: { not: params.id } },
              { OR: duplicateConditions }
            ]
          }
        });

        if (duplicateCompetitor) {
          trackCorrelation(correlationId, 'duplicate_competitor_found_during_update', {
            ...context,
            duplicateCompetitorId: duplicateCompetitor.id
          });

          logger.warn('Duplicate competitor detected during update', {
            ...context,
            duplicateCompetitorId: duplicateCompetitor.id
          });

          return NextResponse.json({ 
            error: 'Competitor already exists',
            message: 'Another competitor with this name or website already exists',
            existingCompetitor: {
              id: duplicateCompetitor.id,
              name: duplicateCompetitor.name,
              website: duplicateCompetitor.website
            },
            correlationId 
          }, { status: 409 });
        }
      }
    }

    trackCorrelation(correlationId, 'competitor_update_started', context);
    trackDatabaseOperation('update', 'competitor', {
      ...context,
      recordData: validatedData
    });

    const competitor = await prisma.competitor.update({
      where: {
        id: params.id
      },
      data: validatedData,
      include: {
        reports: {
          select: {
            id: true,
            name: true,
            createdAt: true
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    trackCorrelation(correlationId, 'competitor_update_completed', {
      ...context,
      competitorName: competitor.name
    });

    trackDatabaseOperation('update', 'competitor', {
      ...context,
      success: true,
      recordData: { name: competitor.name }
    });

    logger.info('Competitor updated successfully', {
      ...context,
      competitorName: competitor.name
    });

    return NextResponse.json({
      ...competitor,
      correlationId
    });

  } catch (error) {
    trackCorrelation(correlationId, 'competitor_update_error', {
      ...context,
      errorMessage: (error as Error).message
    });

    logger.error('Failed to update competitor', error as Error, context);
    trackError(error as Error, 'competitor_update', context);

    // Handle specific database errors
    if (error instanceof Error) {
      if (error.message.includes('Unique constraint')) {
        return NextResponse.json({ 
          error: 'Competitor already exists',
          message: 'A competitor with this name or website already exists',
          correlationId 
        }, { status: 409 });
      }
    }

    return NextResponse.json({ 
      error: 'Internal Server Error',
      message: 'Failed to update competitor',
      correlationId 
    }, { status: 500 });
  }
}

// DELETE /api/competitors/[id]
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const correlationId = generateCorrelationId();
  const context = {
    endpoint: `/api/competitors/${params.id}`,
    method: 'DELETE',
    correlationId,
    competitorId: params.id
  };

  try {
    trackCorrelation(correlationId, 'competitor_delete_request_received', context);
    logger.info('Competitor delete request received', context);

    // Validate competitor ID
    if (!params.id || params.id.length < 1) {
      trackCorrelation(correlationId, 'invalid_competitor_id', context);
      logger.warn('Invalid competitor ID provided', context);
      return NextResponse.json({ 
        error: 'Invalid competitor ID',
        correlationId 
      }, { status: 400 });
    }

    // Check if competitor exists and get related data count
    trackDatabaseOperation('findUnique', 'competitor', {
      ...context,
      query: 'check competitor exists before delete with relations count'
    });

    const existingCompetitor = await prisma.competitor.findUnique({
      where: { id: params.id },
      include: {
        reports: { select: { id: true } },
        snapshots: { select: { id: true } }
      }
    });

    if (!existingCompetitor) {
      trackCorrelation(correlationId, 'competitor_not_found_for_delete', context);
      trackDatabaseOperation('findUnique', 'competitor', {
        ...context,
        success: true,
        recordData: { found: false }
      });

      logger.warn('Competitor not found for deletion', context);
      return NextResponse.json({ 
        error: 'Competitor not found',
        message: `No competitor found with ID: ${params.id}`,
        correlationId 
      }, { status: 404 });
    }

    const relatedDataCount = {
      reports: existingCompetitor.reports.length,
      snapshots: existingCompetitor.snapshots.length
    };

    trackCorrelation(correlationId, 'competitor_delete_started', {
      ...context,
      competitorName: existingCompetitor.name,
      relatedDataCount
    });

    trackDatabaseOperation('delete', 'competitor', {
      ...context,
      recordData: { 
        name: existingCompetitor.name,
        relatedDataCount
      }
    });

    await prisma.competitor.delete({
      where: {
        id: params.id
      }
    });

    trackCorrelation(correlationId, 'competitor_delete_completed', {
      ...context,
      competitorName: existingCompetitor.name,
      relatedDataCount
    });

    trackDatabaseOperation('delete', 'competitor', {
      ...context,
      success: true,
      recordData: { name: existingCompetitor.name }
    });

    logger.info('Competitor deleted successfully', {
      ...context,
      competitorName: existingCompetitor.name,
      relatedDataCount
    });

    return NextResponse.json({
      message: 'Competitor deleted successfully',
      deletedCompetitor: {
        id: existingCompetitor.id,
        name: existingCompetitor.name
      },
      relatedDataCount,
      correlationId
    }, { status: 200 });

  } catch (error) {
    trackCorrelation(correlationId, 'competitor_delete_error', {
      ...context,
      errorMessage: (error as Error).message
    });

    logger.error('Failed to delete competitor', error as Error, context);
    trackError(error as Error, 'competitor_delete', context);

    // Handle specific database errors
    if (error instanceof Error) {
      if (error.message.includes('Foreign key constraint')) {
        return NextResponse.json({ 
          error: 'Cannot delete competitor',
          message: 'Competitor has associated data that must be removed first',
          correlationId 
        }, { status: 409 });
      }
    }

    return NextResponse.json({ 
      error: 'Internal Server Error',
      message: 'Failed to delete competitor',
      correlationId 
    }, { status: 500 });
  }
} 