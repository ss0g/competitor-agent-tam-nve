import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAutoReportService } from '@/services/autoReportGenerationService';
import { logger, trackBusinessEvent, generateCorrelationId } from '@/lib/logger';
import { ProductScrapingService } from '@/services/productScrapingService';
import { SmartSchedulingService } from '@/services/smartSchedulingService';
import { smartAIService } from '@/services/smartAIService'; // PHASE AI-2: Import SmartAIService
import { productRepository } from '@/lib/repositories';
import { InitialComparativeReportService } from '@/services/reports/initialComparativeReportService'; // PHASE 1.2: Import InitialComparativeReportService
import { asyncReportProcessingService } from '@/services/reports/asyncReportProcessingService'; // PHASE 4.2: Enhanced async processing
import { withRetry, withLock } from '@/lib/concurrency'; // Import concurrency utilities

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
  // PHASE 1.2: Enhanced initial report generation options
  generateInitialReport?: boolean;  // New flag for immediate report generation (default: true)
  requireFreshSnapshots?: boolean;  // Require fresh competitor snapshots (default: true)
  reportName?: string;
  parameters?: any;
  // PHASE AI-2: Auto-AI analysis configuration
  enableAIAnalysis?: boolean;       // Auto-enable AI analysis for ACTIVE projects (default: true)
  aiAnalysisTypes?: ('competitive' | 'trend' | 'comprehensive')[];
  aiAutoTrigger?: boolean;          // Trigger initial AI analysis immediately
}

// Get auto report service
const autoReportService = getAutoReportService();

// POST /api/projects
export async function POST(request: Request) {
  const correlationId = generateCorrelationId();
  const context = { operation: 'createProjectWithProduct', correlationId };
  
  try {
    logger.info('Processing project creation request', { ...context });
    trackBusinessEvent('project_creation_started', context);
    
    // Always use mock user (auth disabled)
    const mockUser = await getOrCreateMockUser();

    // Parse and validate request body
    const json: EnhancedProjectRequest = await request.json();
    
    if (!json.name) {
      logger.warn('Invalid project creation request: name is required', { ...context, payload: json });
      return NextResponse.json({ error: 'Project name is required' }, { status: 400 });
    }
    
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

    // Wrap the project creation in withRetry and withLock
    // This ensures we handle concurrent project creation and retry on race conditions
    const finalResult = await withRetry(async () => {
      // Use a unique lock key based on user ID and project name to prevent duplicate projects
      const lockKey = `project_creation:${mockUser.id}:${json.name}`;
      
      return await withLock(lockKey, async () => {
        // Inside the lock, perform the transaction and product creation
            // Wrap project creation in retry and lock for handling race conditions
    const result = await withRetry(async () => {
      // Use a unique lock key based on user ID and project name to prevent duplicate projects
      const lockKey = `project_creation:${mockUser.id}:${json.name}`;
      
      return await withLock(lockKey, async () => {
        return await prisma.$transaction(async (tx) => {
          const project = await tx.project.create({
            data: {
              name: json.name,
              description: json.description,
              status: 'ACTIVE', // ← PHASE 1.3: Auto-activate projects
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
      });
    }, {
      maxRetries: 3,
      initialDelay: 300,
      maxDelay: 2000,
      onRetry: (error, attempt) => {
        logger.warn('Retrying project creation due to concurrent operation error', {
          ...context,
          attempt,
          error: error.message
        });
      }
    });

        // Create product entity using repository (outside transaction to avoid typing issues)
        const product = await productRepository.create({
          name: json.productName || json.name,
          website: json.productWebsite,
          positioning: json.positioning || 'Competitive product analysis',
          customerData: json.customerData || 'To be analyzed through competitive research',
          userProblem: json.userProblem || 'Market positioning and competitive advantage',
          industry: json.industry || 'General',
          projectId: result.project.id
        });

        return { project: result.project, product };
      });
    }, {
      maxRetries: 3,
      initialDelay: 300,
      maxDelay: 2000,
      onRetry: (error, attempt) => {
        logger.warn('Retrying project creation due to concurrent operation error', {
          ...context,
          attempt,
          error: error.message
        });
      }
    });

    // ← PHASE 1.3: Trigger smart scheduling immediately after project creation
    let smartSchedulingStatus = null;
    try {
      const smartScheduler = new SmartSchedulingService();
      smartSchedulingStatus = await smartScheduler.checkAndTriggerScraping(finalResult.project.id);
      
      logger.info('Smart scheduling triggered successfully', {
        ...context,
        projectId: finalResult.project.id,
        smartSchedulingTriggered: smartSchedulingStatus.triggered,
        tasksExecuted: smartSchedulingStatus.tasksExecuted
      });
    } catch (schedulingError) {
      logger.warn('Smart scheduling failed but project creation successful', {
        ...context,
        projectId: finalResult.project.id,
        error: (schedulingError as Error).message
      });
    }

    // ← PHASE AI-2: Auto-setup AI analysis for ACTIVE projects
    let aiAnalysisStatus = null;
    const enableAIAnalysis = json.enableAIAnalysis !== false; // Default to true
    const aiAnalysisTypes = json.aiAnalysisTypes || ['competitive', 'comprehensive'];
    const aiAutoTrigger = json.aiAutoTrigger !== false; // Default to true

    if (finalResult.project.status === 'ACTIVE' && enableAIAnalysis) {
      try {
        logger.info('Setting up AI analysis for ACTIVE project', {
          ...context,
          projectId: finalResult.project.id,
          aiAnalysisTypes,
          aiAutoTrigger
        });

        // Setup auto AI analysis configuration
        const aiFrequency = json.frequency === 'biweekly' ? 'weekly' : 
                           (json.frequency && ['daily', 'weekly', 'monthly'].includes(json.frequency)) ? 
                           json.frequency as 'daily' | 'weekly' | 'monthly' : 'weekly';
        
        await smartAIService.setupAutoAnalysis(finalResult.project.id, {
          frequency: aiFrequency,
          analysisTypes: aiAnalysisTypes,
          autoTrigger: aiAutoTrigger,
          dataCutoffDays: 7
        });

        // If auto-trigger is enabled, perform initial AI analysis with fresh data
        if (aiAutoTrigger && smartSchedulingStatus?.triggered) {
          // Wait a moment for scraping to stabilize
          await new Promise(resolve => setTimeout(resolve, 3000));
          
          logger.info('Triggering initial AI analysis', {
            ...context,
            projectId: finalResult.project.id,
            analysisTypes: aiAnalysisTypes
          });

          const initialAnalysis = await smartAIService.analyzeWithSmartScheduling({
            projectId: finalResult.project.id,
            analysisType: 'comprehensive',
            forceFreshData: false, // Data should be fresh from smart scheduling
            context: { 
              setupReason: 'initial_project_creation',
              projectName: finalResult.project.name,
              productWebsite: json.productWebsite
            }
          });

          aiAnalysisStatus = {
            setupComplete: true,
            initialAnalysisTriggered: true,
            analysisLength: initialAnalysis.analysis.length,
            dataFreshGuaranteed: initialAnalysis.analysisMetadata.dataFreshGuaranteed,
            correlationId: initialAnalysis.analysisMetadata.correlationId
          };

          trackBusinessEvent('initial_ai_analysis_completed', {
            ...context,
            projectId: finalResult.project.id,
            analysisCorrelationId: initialAnalysis.analysisMetadata.correlationId,
            dataFreshGuaranteed: initialAnalysis.analysisMetadata.dataFreshGuaranteed
          });
        } else {
          aiAnalysisStatus = {
            setupComplete: true,
            initialAnalysisTriggered: false,
            reason: aiAutoTrigger ? 'waiting_for_data' : 'auto_trigger_disabled'
          };
        }

        logger.info('AI analysis setup completed', {
          ...context,
          projectId: finalResult.project.id,
          aiAnalysisStatus
        });

      } catch (aiError) {
        logger.warn('AI analysis setup failed but project creation successful', {
          ...context,
          projectId: finalResult.project.id,
          error: (aiError as Error).message
        });

        aiAnalysisStatus = {
          setupComplete: false,
          error: (aiError as Error).message,
          initialAnalysisTriggered: false
        };
      }
    } else {
      logger.info('AI analysis not enabled for project', {
        ...context,
        projectId: finalResult.project.id,
        status: finalResult.project.status,
        enableAIAnalysis
      });

      aiAnalysisStatus = {
        setupComplete: false,
        reason: finalResult.project.status !== 'ACTIVE' ? 
          'project_not_active' : 'ai_analysis_disabled',
        initialAnalysisTriggered: false
      };
    }

    trackBusinessEvent('project_with_product_created_successfully', {
      ...context,
      projectId: finalResult.project.id,
      productId: finalResult.product.id,
      projectName: finalResult.project.name,
      productName: finalResult.product.name,
      competitorCount: finalResult.project.competitors.length,
      smartSchedulingTriggered: smartSchedulingStatus?.triggered || false,
      // PHASE AI-2: Track AI analysis setup
      aiAnalysisEnabled: enableAIAnalysis,
      aiAnalysisSetupComplete: aiAnalysisStatus?.setupComplete || false,
      aiInitialAnalysisTriggered: aiAnalysisStatus?.initialAnalysisTriggered || false
    });

    logger.info('Project with product created successfully', {
      ...context,
      projectId: finalResult.project.id,
      productId: finalResult.product.id,
      projectName: finalResult.project.name,
      productName: finalResult.product.name,
      competitorCount: finalResult.project.competitors.length,
      smartSchedulingStatus
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

    // PHASE 4.2: Enhanced async processing with sophisticated fallback mechanisms
    let reportGenerationInfo: any = null;
    const shouldGenerateInitialReport = (json.generateInitialReport !== false && json.autoGenerateInitialReport !== false) && competitorIds.length > 0;

    if (shouldGenerateInitialReport) {
      try {
        logger.info('Starting async initial report processing with enhanced fallbacks', {
          ...context,
          projectId: finalResult.project.id,
          productId: finalResult.product.id,
          competitorCount: competitorIds.length,
          requireFreshSnapshots: json.requireFreshSnapshots !== false
        });

        // PHASE 4.2: Use AsyncReportProcessingService for enhanced processing
        const processingResult = await asyncReportProcessingService.processInitialReport(
          finalResult.project.id,
          {
            timeout: 45000, // 45 seconds per implementation plan
            priority: 'high',
            fallbackToQueue: true, // Enable sophisticated fallback strategy
            enableGracefulDegradation: true,
            maxConcurrentProcessing: 5,
            notifyOnCompletion: false,
            retryAttempts: 2
          }
        );

        // Build response based on processing result
        if (processingResult.success) {
          reportGenerationInfo = {
            initialReportGenerated: true,
            reportId: processingResult.reportId,
            reportStatus: 'completed',
            reportTitle: processingResult.report?.title,
            processingMethod: processingResult.processingMethod,
            processingTime: processingResult.processingTime,
            dataFreshness: 'new', // Fresh data was used
            competitorSnapshotsCaptured: true,
            fallbackUsed: processingResult.fallbackUsed,
            timeoutExceeded: processingResult.timeoutExceeded
          };

          trackBusinessEvent('async_report_generated_successfully', {
            ...context,
            projectId: finalResult.project.id,
            reportId: processingResult.reportId,
            processingMethod: processingResult.processingMethod,
            processingTime: processingResult.processingTime,
            fallbackUsed: processingResult.fallbackUsed
          });

        } else if (processingResult.queueScheduled) {
          // Processing was scheduled in queue
          reportGenerationInfo = {
            initialReportGenerated: false,
            fallbackScheduled: true,
            taskId: processingResult.taskId,
            processingMethod: processingResult.processingMethod,
            estimatedQueueCompletion: processingResult.estimatedQueueCompletion,
            error: processingResult.error,
            timeoutExceeded: processingResult.timeoutExceeded,
            fallbackUsed: processingResult.fallbackUsed
          };

          trackBusinessEvent('async_report_queued_for_processing', {
            ...context,
            projectId: finalResult.project.id,
            taskId: processingResult.taskId,
            processingMethod: processingResult.processingMethod,
            estimatedCompletion: processingResult.estimatedQueueCompletion?.toISOString()
          });

        } else {
          // Complete failure
          reportGenerationInfo = {
            initialReportGenerated: false,
            fallbackScheduled: false,
            error: processingResult.error,
            processingMethod: processingResult.processingMethod,
            processingTime: processingResult.processingTime,
            timeoutExceeded: processingResult.timeoutExceeded,
            fallbackUsed: processingResult.fallbackUsed
          };

          trackBusinessEvent('async_report_generation_failed', {
            ...context,
            projectId: finalResult.project.id,
            error: processingResult.error,
            processingMethod: processingResult.processingMethod,
            timeoutExceeded: processingResult.timeoutExceeded
          });
        }

        logger.info('Async report processing completed', {
          ...context,
          projectId: finalResult.project.id,
          success: processingResult.success,
          processingMethod: processingResult.processingMethod,
          processingTime: processingResult.processingTime,
          fallbackUsed: processingResult.fallbackUsed,
          queueScheduled: processingResult.queueScheduled
        });

      } catch (processingError) {
        logger.error('Async report processing failed completely', processingError as Error, {
          ...context,
          projectId: finalResult.project.id,
          errorMessage: (processingError as Error).message
        });

        reportGenerationInfo = {
          initialReportGenerated: false,
          fallbackScheduled: false,
          error: `Async processing failed: ${(processingError as Error).message}`,
          processingMethod: 'failed'
        };

        trackBusinessEvent('async_report_processing_system_failure', {
          ...context,
          projectId: finalResult.project.id,
          error: (processingError as Error).message
        });
      }
    } else {
      logger.info('Initial report generation not requested or no competitors available', {
        ...context,
        projectId: finalResult.project.id,
        generateInitialReport: json.generateInitialReport,
        autoGenerateInitialReport: json.autoGenerateInitialReport,
        competitorCount: competitorIds.length
      });
    }

    if (json.frequency && ['daily', 'weekly', 'biweekly', 'monthly'].includes(json.frequency)) {
      try {
        logger.info('Setting up periodic reports for project', {
          ...context,
          projectId: finalResult.project.id,
          frequency: json.frequency
        });

        const schedule = await autoReportService.schedulePeriodicReports(
          finalResult.project.id,
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
          projectId: finalResult.project.id,
          frequency: json.frequency,
          nextScheduledReport: schedule.nextRunTime.toISOString()
        });

        logger.info('Periodic reports scheduled', {
          ...context,
          projectId: finalResult.project.id,
          frequency: json.frequency,
          nextScheduledReport: schedule.nextRunTime.toISOString()
        });
      } catch (scheduleError) {
        logger.error('Failed to schedule periodic reports', scheduleError as Error, {
          ...context,
          projectId: finalResult.project.id
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
      smartScheduling: smartSchedulingStatus, // ← PHASE 1.3: Include smart scheduling status in response
      aiAnalysis: aiAnalysisStatus, // ← PHASE AI-2: Include AI analysis status in response
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