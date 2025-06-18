import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { z } from 'zod';
import { 
  logger, 
  generateCorrelationId, 
  trackDatabaseOperation,
  trackCorrelation,
  trackError 
} from '@/lib/logger';

const updateProjectSchema = z.object({
  name: z.string().min(1, 'Project name is required').max(255, 'Project name too long').optional(),
  description: z.string().max(1000, 'Description too long').optional(),
  status: z.enum(['DRAFT', 'ACTIVE', 'PAUSED', 'COMPLETED', 'ARCHIVED']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  endDate: z.string().datetime().optional(),
  parameters: z.any().optional(),
  tags: z.array(z.string()).optional(),
  competitorIds: z.array(z.string()).optional(),
});

// GET /api/projects/[id]
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const correlationId = generateCorrelationId();
  const logContext = {
    endpoint: `/api/projects/${(await context.params).id}`,
    method: 'GET',
    correlationId,
    projectId: (await context.params).id
  };

  try {
    trackCorrelation(correlationId, 'project_detail_request_received', logContext);
    logger.info('Project detail request received', logContext);

    // Validate project ID
    if (!(await context.params).id || (await context.params).id.length < 1) {
      trackCorrelation(correlationId, 'invalid_project_id', logContext);
      logger.warn('Invalid project ID provided', logContext);
      return NextResponse.json({ 
        error: 'Invalid project ID',
        correlationId 
      }, { status: 400 });
    }

    trackDatabaseOperation('findUnique', 'project', {
      ...logContext,
      query: 'fetch project with relations'
    });

    const project = await prisma.project.findUnique({
      where: {
        id: (await context.params).id
      },
      include: {
        competitors: {
          select: {
            id: true,
            name: true,
            website: true,
            industry: true,
            description: true
          }
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    if (!project) {
      trackCorrelation(correlationId, 'project_not_found', logContext);
      trackDatabaseOperation('findUnique', 'project', {
        ...logContext,
        success: true,
        recordData: { found: false }
      });

      logger.warn('Project not found', logContext);
      return NextResponse.json({ 
        error: 'Project not found',
        message: `No project found with ID: ${(await context.params).id}`,
        correlationId 
      }, { status: 404 });
    }

    trackCorrelation(correlationId, 'project_detail_retrieved', {
      ...logContext,
      projectName: project.name,
      competitorsCount: project.competitors.length,
      projectStatus: project.status
    });

    trackDatabaseOperation('findUnique', 'project', {
      ...logContext,
      success: true,
      recordData: { 
        found: true,
        name: project.name,
        competitorsCount: project.competitors.length,
        status: project.status
      }
    });

    logger.info('Project detail retrieved successfully', {
      ...logContext,
      projectName: project.name,
      competitorsCount: project.competitors.length,
      projectStatus: project.status
    });

    return NextResponse.json({
      ...project,
      correlationId
    });

  } catch (error) {
    trackCorrelation(correlationId, 'project_detail_error', {
      ...logContext,
      errorMessage: (error as Error).message
    });

    logger.error('Failed to fetch project details', error as Error, logContext);
    trackError(error as Error, 'project_detail', logContext);

    return NextResponse.json({ 
      error: 'Internal Server Error',
      message: 'Failed to fetch project details',
      correlationId 
    }, { status: 500 });
  }
}

// PUT /api/projects/[id]
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const correlationId = generateCorrelationId();
  const logContext = {
    endpoint: `/api/projects/${(await context.params).id}`,
    method: 'PUT',
    correlationId,
    projectId: (await context.params).id
  };

  try {
    trackCorrelation(correlationId, 'project_update_request_received', logContext);
    logger.info('Project update request received', logContext);

    // Validate project ID
    if (!(await context.params).id || (await context.params).id.length < 1) {
      trackCorrelation(correlationId, 'invalid_project_id', logContext);
      logger.warn('Invalid project ID provided', logContext);
      return NextResponse.json({ 
        error: 'Invalid project ID',
        correlationId 
      }, { status: 400 });
    }

    // Parse and validate request body
    let json;
    try {
      json = await request.json();
      trackCorrelation(correlationId, 'request_body_parsed', {
        ...logContext,
        hasBody: true,
        updateFields: Object.keys(json)
      });
    } catch (parseError) {
      trackCorrelation(correlationId, 'request_body_parse_failed', logContext);
      logger.warn('Invalid JSON in request body', logContext);
      return NextResponse.json({ 
        error: 'Invalid JSON in request body',
        correlationId 
      }, { status: 400 });
    }

    // Validate update data
    let validatedData;
    try {
      validatedData = updateProjectSchema.parse(json);
      trackCorrelation(correlationId, 'input_validation_passed', {
        ...logContext,
        updateFields: Object.keys(validatedData)
      });
    } catch (validationError) {
      trackCorrelation(correlationId, 'input_validation_failed', {
        ...logContext,
        validationErrors: validationError instanceof z.ZodError ? validationError.errors : []
      });
      
      logger.warn('Project update validation failed', {
        ...logContext,
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
      trackCorrelation(correlationId, 'empty_update_data', logContext);
      logger.warn('No valid update fields provided', logContext);
      return NextResponse.json({ 
        error: 'No valid update data provided',
        message: 'At least one field must be provided for update',
        correlationId 
      }, { status: 400 });
    }

    // Check if project exists
    trackDatabaseOperation('findUnique', 'project', {
      ...logContext,
      query: 'check project exists before update'
    });

    const existingProject = await prisma.project.findUnique({
      where: { id: (await context.params).id }
    });

    if (!existingProject) {
      trackCorrelation(correlationId, 'project_not_found_for_update', logContext);
      trackDatabaseOperation('findUnique', 'project', {
        ...logContext,
        success: true,
        recordData: { found: false }
      });

      logger.warn('Project not found for update', logContext);
      return NextResponse.json({ 
        error: 'Project not found',
        message: `No project found with ID: ${(await context.params).id}`,
        correlationId 
      }, { status: 404 });
    }

    // Prepare update data
    const { competitorIds, endDate, ...otherData } = validatedData;
    const updateData: any = { ...otherData };

    // Handle endDate conversion
    if (endDate) {
      updateData.endDate = new Date(endDate);
    }

    // Handle competitor connections
    if (competitorIds !== undefined) {
      updateData.competitors = {
        set: competitorIds.map((id: string) => ({ id }))
      };
    }

    trackCorrelation(correlationId, 'project_update_started', logContext);
    trackDatabaseOperation('update', 'project', {
      ...logContext,
      recordData: { ...updateData, competitorIds }
    });

    const project = await prisma.project.update({
      where: {
        id: (await context.params).id
      },
      data: updateData,
      include: {
        competitors: {
          select: {
            id: true,
            name: true,
            website: true,
            industry: true
          }
        }
      }
    });

    trackCorrelation(correlationId, 'project_update_completed', {
      ...logContext,
      projectName: project.name
    });

    trackDatabaseOperation('update', 'project', {
      ...logContext,
      success: true,
      recordData: { name: project.name }
    });

    logger.info('Project updated successfully', {
      ...logContext,
      projectName: project.name
    });

    return NextResponse.json({
      ...project,
      correlationId
    });

  } catch (error) {
    trackCorrelation(correlationId, 'project_update_error', {
      ...logContext,
      errorMessage: (error as Error).message
    });

    logger.error('Failed to update project', error as Error, logContext);
    trackError(error as Error, 'project_update', logContext);

    return NextResponse.json({ 
      error: 'Internal Server Error',
      message: 'Failed to update project',
      correlationId 
    }, { status: 500 });
  }
}

// DELETE /api/projects/[id]
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const correlationId = generateCorrelationId();
  const logContext = {
    endpoint: `/api/projects/${(await context.params).id}`,
    method: 'DELETE',
    correlationId,
    projectId: (await context.params).id
  };

  try {
    trackCorrelation(correlationId, 'project_delete_request_received', logContext);
    logger.info('Project delete request received', logContext);

    // Validate project ID
    if (!(await context.params).id || (await context.params).id.length < 1) {
      trackCorrelation(correlationId, 'invalid_project_id', logContext);
      logger.warn('Invalid project ID provided', logContext);
      return NextResponse.json({ 
        error: 'Invalid project ID',
        correlationId 
      }, { status: 400 });
    }

    // Check if project exists
    trackDatabaseOperation('findUnique', 'project', {
      ...logContext,
      query: 'check project exists before delete'
    });

    const existingProject = await prisma.project.findUnique({
      where: { id: (await context.params).id },
      include: {
        competitors: { select: { id: true } }
      }
    });

    if (!existingProject) {
      trackCorrelation(correlationId, 'project_not_found_for_delete', logContext);
      trackDatabaseOperation('findUnique', 'project', {
        ...logContext,
        success: true,
        recordData: { found: false }
      });

      logger.warn('Project not found for deletion', logContext);
      return NextResponse.json({ 
        error: 'Project not found',
        message: `No project found with ID: ${(await context.params).id}`,
        correlationId 
      }, { status: 404 });
    }

    const relatedDataCount = {
      competitors: existingProject.competitors.length
    };

    trackCorrelation(correlationId, 'project_delete_started', {
      ...logContext,
      projectName: existingProject.name,
      relatedDataCount
    });

    trackDatabaseOperation('delete', 'project', {
      ...logContext,
      recordData: { 
        name: existingProject.name,
        relatedDataCount
      }
    });

    await prisma.project.delete({
      where: {
        id: (await context.params).id
      }
    });

    trackCorrelation(correlationId, 'project_delete_completed', {
      ...logContext,
      projectName: existingProject.name,
      relatedDataCount
    });

    trackDatabaseOperation('delete', 'project', {
      ...logContext,
      success: true,
      recordData: { name: existingProject.name }
    });

    logger.info('Project deleted successfully', {
      ...logContext,
      projectName: existingProject.name,
      relatedDataCount
    });

    return NextResponse.json({
      message: 'Project deleted successfully',
      deletedProject: {
        id: existingProject.id,
        name: existingProject.name
      },
      relatedDataCount,
      correlationId
    }, { status: 200 });

  } catch (error) {
    trackCorrelation(correlationId, 'project_delete_error', {
      ...logContext,
      errorMessage: (error as Error).message
    });

    logger.error('Failed to delete project', error as Error, logContext);
    trackError(error as Error, 'project_delete', logContext);

    return NextResponse.json({ 
      error: 'Internal Server Error',
      message: 'Failed to delete project',
      correlationId 
    }, { status: 500 });
  }
} 