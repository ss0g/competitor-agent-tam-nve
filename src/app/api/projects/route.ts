import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAutoReportService } from '@/services/autoReportGenerationService';
import { logger, trackBusinessEvent, generateCorrelationId } from '@/lib/logger';
import { ProductScrapingService } from '@/services/productScrapingService';
import { productRepository } from '@/lib/repositories';

// Default mock user for testing without authentication
const DEFAULT_USER_EMAIL = 'mock@example.com';

async function getOrCreateMockUser() {
  let mockUser = await prisma.user.findFirst({
    where: { email: DEFAULT_USER_EMAIL }
  });
  
  if (!mockUser) {
    mockUser = await prisma.user.create({
      data: {
        email: DEFAULT_USER_EMAIL,
        name: 'Mock User'
      }
    });
  }
  return mockUser;
}

// GET /api/projects
export async function GET() {
  try {
    // Always use mock user (auth disabled)
    const mockUser = await getOrCreateMockUser();

    const projects = await prisma.project.findMany({
      where: {
        userId: mockUser.id
      },
      include: {
        competitors: true,
        // TODO: Fix products include - may need to check Prisma schema relations
        // products: true,
      }
    });

    return NextResponse.json(projects);
  } catch (error) {
    console.error('Error fetching projects:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// Enhanced interface for project creation with product information
interface EnhancedProjectRequest {
  name: string;
  description?: string;
  productName?: string;
  productWebsite?: string;          // REQUIRED: User's product website
  positioning?: string;
  customerData?: string;
  userProblem?: string;
  industry?: string;
  autoAssignCompetitors?: boolean;
  competitorIds?: string[];
  frequency?: 'daily' | 'weekly' | 'biweekly' | 'monthly';
  reportTemplate?: 'comprehensive' | 'executive' | 'technical' | 'strategic';
  autoGenerateInitialReport?: boolean;
  reportName?: string;
  parameters?: any;
}

// POST /api/projects
export async function POST(request: Request) {
  const correlationId = generateCorrelationId();
  const context = { operation: 'createProjectWithProduct', correlationId };

  try {
    // Always use mock user (auth disabled)
    const mockUser = await getOrCreateMockUser();

    const json: EnhancedProjectRequest = await request.json();
    
    if (!json.productWebsite) {
      trackBusinessEvent('project_creation_failed_validation', {
        ...context,
        reason: 'missing_product_website',
        projectName: json.name
      });
      
      return NextResponse.json({
        error: 'Product website is required for competitive analysis',
        correlationId
      }, { status: 400 });
    }

    trackBusinessEvent('project_creation_started', {
      ...context,
      projectName: json.name,
      productWebsite: json.productWebsite,
      productName: json.productName,
      autoAssignCompetitors: json.autoAssignCompetitors,
      frequency: json.frequency,
      autoGenerateInitialReport: json.autoGenerateInitialReport !== false // Default to true
    });

    logger.info('Creating new project with product', {
      ...context,
      projectName: json.name,
      productWebsite: json.productWebsite,
      userId: mockUser.id
    });
    
    let competitorIds = json.competitorIds || [];
    
    if (competitorIds.length === 0 || json.autoAssignCompetitors === true) {
      const allCompetitors = await prisma.competitor.findMany({
        select: { id: true, name: true }
      });
      competitorIds = allCompetitors.map(c => c.id);
      
      logger.info(`Auto-assigning ${allCompetitors.length} competitors to project`, {
        ...context,
        projectName: json.name,
        competitorNames: allCompetitors.map(c => c.name)
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      const project = await tx.project.create({
        data: {
          name: json.name,
          description: json.description,
          userId: mockUser.id,
          parameters: {
            ...json.parameters || {},
            autoAssignedCompetitors: competitorIds.length > 0 && (json.competitorIds?.length === 0 || json.autoAssignCompetitors === true),
            assignedCompetitorCount: competitorIds.length,
            frequency: json.frequency,
            autoGenerateInitialReport: json.autoGenerateInitialReport !== false,
            reportTemplate: json.reportTemplate || 'comprehensive',
            hasProduct: true,
            productWebsite: json.productWebsite
          },
          competitors: {
            connect: competitorIds.map((id: string) => ({ id }))
          }
        },
        include: {
          competitors: true
        }
      });

      return { project };
    });

    // 2. NEW: Create product entity using repository (outside transaction to avoid typing issues)
    const product = await productRepository.create({
      name: json.productName || json.name,
      website: json.productWebsite,
      positioning: json.positioning || 'Competitive product analysis',
      customerData: json.customerData || 'To be analyzed through competitive research',
      userProblem: json.userProblem || 'Market positioning and competitive advantage',
      industry: json.industry || 'General',
      projectId: result.project.id
    });

    const finalResult = { project: result.project, product };

    trackBusinessEvent('project_with_product_created_successfully', {
      ...context,
      projectId: finalResult.project.id,
      productId: finalResult.product.id,
      projectName: finalResult.project.name,
      productName: finalResult.product.name,
      competitorCount: finalResult.project.competitors.length
    });

    logger.info('Project with product created successfully', {
      ...context,
      projectId: finalResult.project.id,
      productId: finalResult.product.id,
      projectName: finalResult.project.name,
      productName: finalResult.product.name,
      competitorCount: finalResult.project.competitors.length
    });

    const productScrapingService = new ProductScrapingService();
    
    productScrapingService.scrapeProductById(finalResult.product.id)
      .then(() => {
        trackBusinessEvent('product_scraping_completed', {
          ...context,
          productId: finalResult.product.id,
          productWebsite: finalResult.product.website
        });
        logger.info('Product scraping completed', {
          ...context,
          productId: finalResult.product.id
        });
      })
      .catch(error => {
        trackBusinessEvent('product_scraping_failed', {
          ...context,
          productId: finalResult.product.id,
          error: error.message
        });
        logger.warn('Product scraping failed during project creation', {
          ...context,
          productId: finalResult.product.id,
          error: error.message
        });
      });

    const autoReportService = getAutoReportService();
    let reportGenerationInfo: any = null;

    if (json.autoGenerateInitialReport !== false && competitorIds.length > 0) {
      try {
        logger.info('Generating initial report for project', {
          ...context,
          projectId: result.project.id
        });

        // PHASE 2.1 FIX: Use comparative report generation instead of individual reports
        const reportTask = await autoReportService.generateInitialComparativeReport(result.project.id);

        reportGenerationInfo = {
          initialReportQueued: true,
          taskId: reportTask.taskId,
          queuePosition: reportTask.queuePosition,
          estimatedCompletion: new Date(Date.now() + (reportTask.queuePosition * 120000)) // 2 min per report
        };

        trackBusinessEvent('initial_report_generation_queued', {
          ...context,
          projectId: result.project.id,
          taskId: reportTask.taskId,
          queuePosition: reportTask.queuePosition
        });

        logger.info('Initial report generation queued', {
          ...context,
          projectId: result.project.id,
          taskId: reportTask.taskId
        });
      } catch (reportError) {
        logger.error('Failed to queue initial report generation', reportError as Error, {
          ...context,
          projectId: result.project.id
        });
        reportGenerationInfo = {
          initialReportQueued: false,
          error: 'Failed to queue initial report generation'
        };
      }
    }

    if (json.frequency && ['daily', 'weekly', 'biweekly', 'monthly'].includes(json.frequency)) {
      try {
        logger.info('Setting up periodic reports for project', {
          ...context,
          projectId: result.project.id,
          frequency: json.frequency
        });

        const schedule = await autoReportService.schedulePeriodicReports(
          result.project.id,
          json.frequency,
          {
            reportTemplate: json.reportTemplate || 'comprehensive'
          }
        );

        reportGenerationInfo = {
          ...reportGenerationInfo,
          periodicReportsScheduled: true,
          frequency: json.frequency,
          nextScheduledReport: schedule.nextRunTime
        };

        trackBusinessEvent('periodic_reports_scheduled', {
          ...context,
          projectId: result.project.id,
          frequency: json.frequency,
          nextScheduledReport: schedule.nextRunTime.toISOString()
        });

        logger.info('Periodic reports scheduled', {
          ...context,
          projectId: result.project.id,
          frequency: json.frequency,
          nextScheduledReport: schedule.nextRunTime.toISOString()
        });
      } catch (scheduleError) {
        logger.error('Failed to schedule periodic reports', scheduleError as Error, {
          ...context,
          projectId: result.project.id
        });
        reportGenerationInfo = {
          ...reportGenerationInfo,
          periodicReportsScheduled: false,
          scheduleError: 'Failed to schedule periodic reports'
        };
      }
    }

    const response = {
      ...finalResult.project,
      product: finalResult.product,
      reportGeneration: reportGenerationInfo,
      correlationId
    };

    trackBusinessEvent('project_creation_completed', {
      ...context,
      projectId: finalResult.project.id,
      productId: finalResult.product.id,
      success: true,
      hasReportGeneration: !!reportGenerationInfo
    });

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    trackBusinessEvent('project_creation_failed', {
      ...context,
      errorMessage: (error as Error).message
    });

    logger.error('Error creating project with product', error as Error, context);
    return NextResponse.json({ 
      error: 'Internal Server Error',
      correlationId 
    }, { status: 500 });
  }
} 