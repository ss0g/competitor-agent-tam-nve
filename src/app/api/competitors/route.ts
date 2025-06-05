import { NextResponse } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/prisma'
import { 
  logger, 
  generateCorrelationId, 
  trackDatabaseOperation,
  trackCorrelation,
  trackError 
} from '@/lib/logger'

const competitorSchema = z.object({
  name: z.string().min(1, 'Company name is required').max(255, 'Company name too long'),
  website: z.string().optional().default('').transform(val => {
    if (!val || val.trim() === '') {
      // Generate a unique default website using timestamp
      return `https://placeholder-${Date.now()}-${Math.random().toString(36).substr(2, 9)}.com`;
    }
    if (!val.startsWith('http://') && !val.startsWith('https://')) {
      return `https://${val}`;
    }
    return val;
  }),
  description: z.string().optional(),
  industry: z.string().max(100, 'Industry name too long').optional().default('Other'),
  employeeCount: z.number().int().positive().optional(),
  revenue: z.number().positive().optional(),
  founded: z.number().int().min(1800).max(new Date().getFullYear()).optional(),
  headquarters: z.string().max(255, 'Headquarters location too long').optional(),
  socialMedia: z.any().optional(),
})

export async function POST(request: Request) {
  const correlationId = generateCorrelationId();
  const context = {
    endpoint: '/api/competitors',
    method: 'POST',
    correlationId
  };

  try {
    trackCorrelation(correlationId, 'competitor_creation_request_received', context);
    logger.info('Competitor creation request received', context);

    // Parse and validate request body
    let json;
    try {
      json = await request.json();
      trackCorrelation(correlationId, 'request_body_parsed', {
        ...context,
        hasBody: true,
        bodyKeys: Object.keys(json)
      });
    } catch (parseError) {
      trackCorrelation(correlationId, 'request_body_parse_failed', context);
      logger.warn('Invalid JSON in request body', context);
      return NextResponse.json({ 
        error: 'Invalid JSON in request body',
        correlationId 
      }, { status: 400 });
    }

    // Validate input schema
    let validatedData;
    try {
      validatedData = competitorSchema.parse(json);
      trackCorrelation(correlationId, 'input_validation_passed', {
        ...context,
        competitorName: validatedData.name
      });
    } catch (validationError) {
      trackCorrelation(correlationId, 'input_validation_failed', {
        ...context,
        validationErrors: validationError instanceof z.ZodError ? validationError.errors : []
      });
      
      logger.warn('Competitor validation failed', {
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

    // Check for duplicate competitors
    trackCorrelation(correlationId, 'duplicate_check_started', context);
    trackDatabaseOperation('findFirst', 'competitor', {
      ...context,
      query: 'duplicate check by name and website'
    });

    const existingCompetitor = await prisma.competitor.findFirst({
      where: {
        OR: [
          { name: validatedData.name },
          { website: validatedData.website }
        ]
      }
    });

    if (existingCompetitor) {
      trackCorrelation(correlationId, 'duplicate_competitor_found', {
        ...context,
        existingCompetitorId: existingCompetitor.id,
        duplicateField: existingCompetitor.name === validatedData.name ? 'name' : 'website'
      });

      trackDatabaseOperation('findFirst', 'competitor', {
        ...context,
        success: true,
        recordData: { found: true, duplicateField: existingCompetitor.name === validatedData.name ? 'name' : 'website' }
      });

      logger.warn('Duplicate competitor detected', {
        ...context,
        existingCompetitorId: existingCompetitor.id,
        duplicateField: existingCompetitor.name === validatedData.name ? 'name' : 'website'
      });

      return NextResponse.json({ 
        error: 'Competitor already exists',
        message: existingCompetitor.name === validatedData.name 
          ? 'A competitor with this name already exists'
          : 'A competitor with this website already exists',
        existingCompetitor: {
          id: existingCompetitor.id,
          name: existingCompetitor.name,
          website: existingCompetitor.website
        },
        correlationId 
      }, { status: 409 });
    }

    trackCorrelation(correlationId, 'duplicate_check_passed', context);
    trackDatabaseOperation('findFirst', 'competitor', {
      ...context,
      success: true,
      recordData: { found: false }
    });

    // Create competitor
    trackCorrelation(correlationId, 'competitor_creation_started', context);
    trackDatabaseOperation('create', 'competitor', {
      ...context,
      recordData: {
        name: validatedData.name,
        website: validatedData.website,
        industry: validatedData.industry
      }
    });

    const competitor = await prisma.competitor.create({
      data: {
        ...validatedData,
      },
    });

    trackCorrelation(correlationId, 'competitor_creation_completed', {
      ...context,
      competitorId: competitor.id
    });

    trackDatabaseOperation('create', 'competitor', {
      ...context,
      recordId: competitor.id,
      success: true
    });

    logger.info('Competitor created successfully', {
      ...context,
      competitorId: competitor.id,
      competitorName: competitor.name
    });

    return NextResponse.json({
      ...competitor,
      correlationId
    }, { status: 201 });

  } catch (error) {
    trackCorrelation(correlationId, 'competitor_creation_error', {
      ...context,
      errorMessage: (error as Error).message
    });

    logger.error('Failed to create competitor', error as Error, context);
    trackError(error as Error, 'competitor_creation', context);

    // Determine specific error type
    if (error instanceof Error) {
      if (error.message.includes('Unique constraint')) {
        return NextResponse.json({ 
          error: 'Competitor already exists',
          message: 'A competitor with this name or website already exists',
          correlationId 
        }, { status: 409 });
      }
      
      if (error.message.includes('Foreign key constraint')) {
        return NextResponse.json({ 
          error: 'Invalid reference',
          message: 'Referenced data does not exist',
          correlationId 
        }, { status: 400 });
      }
    }

    return NextResponse.json({ 
      error: 'Internal Server Error',
      message: 'Failed to create competitor',
      correlationId 
    }, { status: 500 });
  }
}

export async function GET(request: Request) {
  const correlationId = generateCorrelationId();
  const context = {
    endpoint: '/api/competitors',
    method: 'GET',
    correlationId
  };

  try {
    trackCorrelation(correlationId, 'competitors_list_request_received', context);
    logger.info('Competitors list request received', context);

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams?.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams?.get('limit') || '10')));
    const search = searchParams?.get('search') || '';

    const enhancedContext = {
      ...context,
      page,
      limit,
      hasSearch: !!search
    };

    // Calculate offset for pagination
    const offset = (page - 1) * limit;

    // Build where clause for search
    const whereClause = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' as const } },
            { website: { contains: search, mode: 'insensitive' as const } },
            { description: { contains: search, mode: 'insensitive' as const } },
            { industry: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {};

    trackCorrelation(correlationId, 'competitors_query_started', enhancedContext);

    // Get total count for pagination
    trackDatabaseOperation('count', 'competitor', {
      ...enhancedContext,
      query: 'total count with search filter'
    });

    const total = await prisma.competitor.count({
      where: whereClause,
    });

    trackDatabaseOperation('count', 'competitor', {
      ...enhancedContext,
      success: true,
      recordData: { total }
    });

    // Get competitors with pagination
    trackDatabaseOperation('findMany', 'competitor', {
      ...enhancedContext,
      query: 'paginated list with search filter'
    });

    const competitors = await prisma.competitor.findMany({
      where: whereClause,
      skip: offset,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        reports: {
          select: {
            id: true,
            name: true,
            createdAt: true
          },
          take: 3,
          orderBy: { createdAt: 'desc' }
        },
        snapshots: {
          select: {
            id: true,
            createdAt: true
          },
          take: 1,
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    trackDatabaseOperation('findMany', 'competitor', {
      ...enhancedContext,
      success: true,
      recordData: { count: competitors.length }
    });

    // Calculate pagination info
    const pages = Math.ceil(total / limit);

    trackCorrelation(correlationId, 'competitors_list_completed', {
      ...enhancedContext,
      totalRecords: total,
      returnedRecords: competitors.length
    });

    logger.info('Competitors list retrieved successfully', {
      ...enhancedContext,
      totalRecords: total,
      returnedRecords: competitors.length
    });

    return NextResponse.json({
      competitors,
      pagination: {
        total,
        pages,
        page,
        limit,
      },
      correlationId
    });

  } catch (error) {
    trackCorrelation(correlationId, 'competitors_list_error', {
      ...context,
      errorMessage: (error as Error).message
    });

    logger.error('Failed to fetch competitors', error as Error, context);
    trackError(error as Error, 'competitors_list', context);

    return NextResponse.json({ 
      error: 'Internal Server Error',
      message: 'Failed to fetch competitors',
      correlationId 
    }, { status: 500 });
  }
} 