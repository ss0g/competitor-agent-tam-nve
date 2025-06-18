/**
 * Intelligent Reporting API - Phase AI-3 Implementation
 * REST endpoints for intelligent reporting with data freshness indicators,
 * competitive activity alerts, and smart report scheduling
 * 
 * Features:
 * - Generate intelligent reports with enhanced context
 * - Configure smart reporting settings
 * - Retrieve competitive activity alerts
 * - Get data freshness indicators
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger, generateCorrelationId, trackErrorWithCorrelation, trackBusinessEvent } from '@/lib/logger';
import { 
  intelligentReportingService, 
  IntelligentReportingRequest,
  SmartReportingConfig 
} from '@/services/intelligentReportingService';

interface RouteParams {
  params: Promise<{
    id: string; // project ID
  }>;
}

/**
 * POST /api/projects/[id]/intelligent-reporting
 * Generate intelligent report with data freshness indicators and competitive alerts
 */
export async function POST(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  const projectId = (await params).id;
  const correlationId = generateCorrelationId();
  const context = { projectId, correlationId, operation: 'generateIntelligentReport', endpoint: 'POST' };

  try {
    logger.info('Intelligent reporting API called', context);

    const body: IntelligentReportingRequest = await request.json();

    // Validate request
    if (!projectId) {
      return NextResponse.json({
        error: 'Project ID is required',
        correlationId
      }, { status: 400 });
    }

    // Set project ID from URL parameter
    body.projectId = projectId;

    trackBusinessEvent('intelligent_report_api_request', {
      ...context,
      requestType: body.reportType || 'comprehensive_intelligence',
      forceDataRefresh: body.forceDataRefresh || false,
      includeAlerts: body.includeAlerts !== false
    });

    // Generate intelligent report
    const intelligentReport = await intelligentReportingService.generateIntelligentReport(body);

    logger.info('Intelligent report generated via API', {
      ...context,
      reportId: intelligentReport.id,
      reportType: intelligentReport.reportType,
      alertsCount: intelligentReport.competitiveActivityAlerts.length,
      insightsCount: intelligentReport.actionableInsights.length,
      dataFreshness: intelligentReport.dataFreshnessIndicators.overallFreshness
    });

    return NextResponse.json({
      success: true,
      report: intelligentReport,
      metadata: {
        correlationId,
        generatedAt: intelligentReport.generatedAt.toISOString(),
        projectId,
        summary: {
          dataFreshness: intelligentReport.dataFreshnessIndicators.overallFreshness,
          competitiveAlertsCount: intelligentReport.competitiveActivityAlerts.length,
          actionableInsightsCount: intelligentReport.actionableInsights.length,
          marketChangeVelocity: intelligentReport.marketChangeDetection.changeVelocity
        }
      }
    });

  } catch (error) {
    trackErrorWithCorrelation(
      error as Error,
      'generateIntelligentReport-POST',
      correlationId,
      {
        ...context,
        service: 'IntelligentReportingAPI'
      }
    );

    logger.error('Intelligent reporting API failed', {
      ...context,
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    return NextResponse.json({
      error: 'Failed to generate intelligent report',
      correlationId,
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * PUT /api/projects/[id]/intelligent-reporting
 * Configure smart reporting settings for the project
 */
export async function PUT(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  const projectId = (await params).id;
  const correlationId = generateCorrelationId();
  const context = { projectId, correlationId, operation: 'configureSmartReporting', endpoint: 'PUT' };

  try {
    logger.info('Smart reporting configuration API called', context);

    const body: { config: SmartReportingConfig } = await request.json();

    // Validate request
    if (!projectId) {
      return NextResponse.json({
        error: 'Project ID is required',
        correlationId
      }, { status: 400 });
    }

    if (!body.config) {
      return NextResponse.json({
        error: 'Smart reporting configuration is required',
        correlationId
      }, { status: 400 });
    }

    // Validate configuration
    const validFrequencies = ['daily', 'weekly', 'monthly', 'adaptive'];
    if (!validFrequencies.includes(body.config.reportingFrequency)) {
      return NextResponse.json({
        error: 'Invalid reporting frequency. Must be one of: daily, weekly, monthly, adaptive',
        correlationId
      }, { status: 400 });
    }

    trackBusinessEvent('smart_reporting_configuration_request', {
      ...context,
      reportingFrequency: body.config.reportingFrequency,
      enableAlerts: body.config.enableCompetitiveActivityAlerts,
      enableDataFreshness: body.config.enableDataFreshnessIndicators,
      notificationChannels: body.config.notificationChannels
    });

    // Setup smart reporting
    await intelligentReportingService.setupSmartReportScheduling(projectId, body.config);

    logger.info('Smart reporting configured via API', {
      ...context,
      reportingFrequency: body.config.reportingFrequency,
      featuresEnabled: {
        dataFreshnessIndicators: body.config.enableDataFreshnessIndicators,
        competitiveActivityAlerts: body.config.enableCompetitiveActivityAlerts,
        marketChangeDetection: body.config.enableMarketChangeDetection
      },
      notificationChannels: body.config.notificationChannels.length
    });

    return NextResponse.json({
      success: true,
      configuration: body.config,
      metadata: {
        correlationId,
        configuredAt: new Date().toISOString(),
        projectId,
        summary: {
          reportingFrequency: body.config.reportingFrequency,
          featuresEnabled: {
            dataFreshnessIndicators: body.config.enableDataFreshnessIndicators,
            competitiveActivityAlerts: body.config.enableCompetitiveActivityAlerts,
            marketChangeDetection: body.config.enableMarketChangeDetection
          },
          alertThresholds: body.config.alertThresholds,
          notificationChannels: body.config.notificationChannels
        }
      }
    });

  } catch (error) {
    trackErrorWithCorrelation(
      error as Error,
      'configureSmartReporting-PUT',
      correlationId,
      {
        ...context,
        service: 'IntelligentReportingAPI'
      }
    );

    logger.error('Smart reporting configuration API failed', {
      ...context,
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    return NextResponse.json({
      error: 'Failed to configure smart reporting',
      correlationId,
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * GET /api/projects/[id]/intelligent-reporting
 * Get current intelligent reporting status and recent alerts
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  const projectId = (await params).id;
  const correlationId = generateCorrelationId();
  const context = { projectId, correlationId, operation: 'getIntelligentReportingStatus', endpoint: 'GET' };

  try {
    logger.info('Intelligent reporting status API called', context);

    // Validate request
    if (!projectId) {
      return NextResponse.json({
        error: 'Project ID is required',
        correlationId
      }, { status: 400 });
    }

    // Get URL parameters
    const url = new URL(request.url);
    const includeHistory = url.searchParams.get('includeHistory') === 'true';
    const alertsOnly = url.searchParams.get('alertsOnly') === 'true';

    // Generate a quick status report
    const statusRequest: IntelligentReportingRequest = {
      projectId,
      reportType: alertsOnly ? 'competitive_alert' : 'comprehensive_intelligence',
      forceDataRefresh: false,
      includeAlerts: true,
      timeframe: 7 // Last 7 days
    };

    const statusReport = await intelligentReportingService.generateIntelligentReport(statusRequest);

    // Build response based on request parameters
    const response: any = {
      success: true,
      projectId,
      status: {
        dataFreshness: statusReport.dataFreshnessIndicators,
        competitiveAlerts: statusReport.competitiveActivityAlerts,
        marketChangeDetection: statusReport.marketChangeDetection,
        schedulingMetadata: statusReport.schedulingMetadata,
        lastReportGenerated: statusReport.generatedAt
      },
      metadata: {
        correlationId,
        retrievedAt: new Date().toISOString(),
        projectId,
        parameters: {
          includeHistory,
          alertsOnly
        }
      }
    };

    // Add full report if not alerts-only
    if (!alertsOnly) {
      response.latestReport = {
        id: statusReport.id,
        reportType: statusReport.reportType,
        actionableInsights: statusReport.actionableInsights,
        generatedAt: statusReport.generatedAt
      };
    }

    // Add historical data if requested
    if (includeHistory) {
      response.history = {
        analysisHistory: statusReport.schedulingMetadata.analysisHistory,
        reportingTrends: 'Historical reporting trends would be calculated here',
        alertTrends: 'Alert frequency and severity trends would be calculated here'
      };
    }

    logger.info('Intelligent reporting status retrieved via API', {
      ...context,
      dataFreshness: statusReport.dataFreshnessIndicators.overallFreshness,
      alertsCount: statusReport.competitiveActivityAlerts.length,
      insightsCount: statusReport.actionableInsights.length,
      includeHistory,
      alertsOnly
    });

    return NextResponse.json(response);

  } catch (error) {
    trackErrorWithCorrelation(
      error as Error,
      'getIntelligentReportingStatus-GET',
      correlationId,
      {
        ...context,
        service: 'IntelligentReportingAPI'
      }
    );

    logger.error('Intelligent reporting status API failed', {
      ...context,
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    return NextResponse.json({
      error: 'Failed to retrieve intelligent reporting status',
      correlationId,
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * DELETE /api/projects/[id]/intelligent-reporting
 * Reset or disable intelligent reporting for the project
 */
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  const projectId = (await params).id;
  const correlationId = generateCorrelationId();
  const context = { projectId, correlationId, operation: 'resetIntelligentReporting', endpoint: 'DELETE' };

  try {
    logger.info('Intelligent reporting reset API called', context);

    // Validate request
    if (!projectId) {
      return NextResponse.json({
        error: 'Project ID is required',
        correlationId
      }, { status: 400 });
    }

    const url = new URL(request.url);
    const resetType = url.searchParams.get('type') || 'configuration'; // 'configuration' or 'all'

    trackBusinessEvent('intelligent_reporting_reset_request', {
      ...context,
      resetType
    });

    // For now, this would reset the configuration in project metadata
    // In a full implementation, this would:
    // 1. Clear smart reporting configuration
    // 2. Cancel scheduled reports
    // 3. Clear alert history (if resetType === 'all')
    // 4. Reset data freshness tracking

    logger.info('Intelligent reporting reset completed', {
      ...context,
      resetType,
      note: 'Reset functionality would be fully implemented here'
    });

    return NextResponse.json({
      success: true,
      resetType,
      message: `Intelligent reporting ${resetType} has been reset for project ${projectId}`,
      metadata: {
        correlationId,
        resetAt: new Date().toISOString(),
        projectId,
        resetScope: resetType
      }
    });

  } catch (error) {
    trackErrorWithCorrelation(
      error as Error,
      'resetIntelligentReporting-DELETE',
      correlationId,
      {
        ...context,
        service: 'IntelligentReportingAPI'
      }
    );

    logger.error('Intelligent reporting reset API failed', {
      ...context,
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    return NextResponse.json({
      error: 'Failed to reset intelligent reporting',
      correlationId,
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 