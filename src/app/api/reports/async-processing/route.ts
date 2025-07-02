/**
 * Phase 4.2: Async Report Processing API
 * Direct access to enhanced async processing with fallback mechanisms
 */

import { NextRequest, NextResponse } from 'next/server';
import { asyncReportProcessingService } from '@/services/reports/asyncReportProcessingService';
import { handleAPIError } from '@/lib/utils/errorHandler';
import { logger, generateCorrelationId, trackCorrelation } from '@/lib/logger';
import { prisma } from '@/lib/prisma';

// Request interface for async processing
interface AsyncProcessingRequest {
  projectId: string;
  timeout?: number;
  priority?: 'high' | 'normal' | 'low';
  fallbackToQueue?: boolean;
  enableGracefulDegradation?: boolean;
  maxConcurrentProcessing?: number;
  notifyOnCompletion?: boolean;
  retryAttempts?: number;
}

// Response interface
interface AsyncProcessingResponse {
  success: boolean;
  processingResult: {
    success: boolean;
    reportId?: string;
    processingMethod: 'immediate' | 'queued' | 'fallback' | 'failed';
    processingTime: number;
    timeoutExceeded: boolean;
    fallbackUsed: boolean;
    queueScheduled: boolean;
    error?: string;
    retryCount: number;
    taskId?: string;
    estimatedQueueCompletion?: string;
  };
  correlationId: string;
  timestamp: string;
}

/**
 * POST /api/reports/async-processing
 * Trigger async report processing with enhanced fallback mechanisms
 */
export async function POST(request: NextRequest) {
  const correlationId = generateCorrelationId();
  const logContext = {
    operation: 'asyncReportProcessing',
    correlationId
  };

  try {
    logger.info('Async report processing request received', logContext);

    const body: AsyncProcessingRequest = await request.json();
    const { projectId, ...options } = body;

    if (!projectId) {
      return NextResponse.json(
        { error: 'Project ID is required', correlationId },
        { status: 400 }
      );
    }

    // Verify project exists
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: {
        id: true,
        name: true,
        competitors: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found', correlationId },
        { status: 404 }
      );
    }

    if (project.competitors.length === 0) {
      return NextResponse.json(
        { error: 'Project has no competitors for analysis', correlationId },
        { status: 400 }
      );
    }

    const enhancedLogContext = {
      ...logContext,
      projectId,
      projectName: project.name,
      competitorCount: project.competitors.length,
      options
    };

    logger.info('Starting async report processing', enhancedLogContext);

    // Process with enhanced async processing service
    const processingResult = await asyncReportProcessingService.processInitialReport(
      projectId,
      {
        timeout: options.timeout || 45000, // Default 45 seconds per implementation plan
        priority: options.priority || 'normal',
        fallbackToQueue: options.fallbackToQueue !== false, // Default to true
        enableGracefulDegradation: options.enableGracefulDegradation !== false, // Default to true
        maxConcurrentProcessing: options.maxConcurrentProcessing || 5,
        notifyOnCompletion: options.notifyOnCompletion !== false, // Default to true
        retryAttempts: options.retryAttempts || 2
      }
    );

    const response: AsyncProcessingResponse = {
      success: true,
      processingResult: {
        success: processingResult.success,
        reportId: processingResult.reportId,
        processingMethod: processingResult.processingMethod,
        processingTime: processingResult.processingTime,
        timeoutExceeded: processingResult.timeoutExceeded,
        fallbackUsed: processingResult.fallbackUsed,
        queueScheduled: processingResult.queueScheduled,
        error: processingResult.error,
        retryCount: processingResult.retryCount,
        taskId: processingResult.taskId,
        estimatedQueueCompletion: processingResult.estimatedQueueCompletion?.toISOString()
      },
      correlationId,
      timestamp: new Date().toISOString()
    };

    trackCorrelation(correlationId, 'async_processing_completed', {
      ...enhancedLogContext,
      success: processingResult.success,
      processingMethod: processingResult.processingMethod,
      processingTime: processingResult.processingTime,
      fallbackUsed: processingResult.fallbackUsed,
      queueScheduled: processingResult.queueScheduled
    });

    logger.info('Async report processing completed successfully', {
      ...enhancedLogContext,
      success: processingResult.success,
      processingMethod: processingResult.processingMethod,
      processingTime: processingResult.processingTime,
      reportId: processingResult.reportId
    });

    return NextResponse.json(response);

  } catch (error) {
    logger.error('Async report processing failed', error as Error, logContext);
    return handleAPIError(error as Error, correlationId);
  }
}

/**
 * GET /api/reports/async-processing/status
 * Get current async processing statistics and status
 */
export async function GET(request: NextRequest) {
  const correlationId = generateCorrelationId();
  const logContext = {
    operation: 'getAsyncProcessingStatus',
    correlationId
  };

  try {
    logger.info('Async processing status request received', logContext);

    // Get processing statistics
    const stats = asyncReportProcessingService.getProcessingStatistics();

    const response = {
      success: true,
      statistics: {
        concurrentProcessing: stats.concurrentProcessing,
        maxConcurrentProcessing: stats.maxConcurrentProcessing,
        activeProcesses: stats.activeProcesses,
        availableCapacity: stats.maxConcurrentProcessing - stats.concurrentProcessing,
        capacityUtilization: (stats.concurrentProcessing / stats.maxConcurrentProcessing) * 100
      },
      serviceHealth: {
        status: stats.concurrentProcessing < stats.maxConcurrentProcessing ? 'healthy' : 'at_capacity',
        canProcessImmediately: stats.concurrentProcessing < stats.maxConcurrentProcessing,
        recommendedAction: stats.concurrentProcessing >= stats.maxConcurrentProcessing 
          ? 'Queue processing recommended' 
          : 'Immediate processing available'
      },
      correlationId,
      timestamp: new Date().toISOString()
    };

    trackCorrelation(correlationId, 'async_processing_status_retrieved', {
      ...logContext,
      concurrentProcessing: stats.concurrentProcessing,
      maxConcurrentProcessing: stats.maxConcurrentProcessing,
      capacityUtilization: response.statistics.capacityUtilization
    });

    logger.info('Async processing status retrieved successfully', {
      ...logContext,
      concurrentProcessing: stats.concurrentProcessing,
      maxConcurrentProcessing: stats.maxConcurrentProcessing
    });

    return NextResponse.json(response);

  } catch (error) {
    logger.error('Failed to get async processing status', error as Error, logContext);
    return handleAPIError(error as Error, correlationId);
  }
} 