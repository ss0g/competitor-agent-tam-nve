import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger, generateCorrelationId, trackCorrelation } from '@/lib/logger';
import { handleAPIError } from '@/lib/utils/errorHandler';
import { reportQualityService, ReportQualityAssessment } from '@/services/reports/reportQualityService';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const correlationId = generateCorrelationId();
  const { id: reportId } = await context.params;
  
  const logContext = {
    operation: 'getReportQuality',
    reportId,
    correlationId
  };

  try {
    logger.info('Fetching report quality assessment', logContext);

    // 1. Fetch report from database
    const report = await prisma.report.findUnique({
      where: { id: reportId },
      include: {
        versions: {
          select: {
            content: true,
            createdAt: true
          },
          orderBy: {
            createdAt: 'desc'
          },
          take: 1
        },
        project: {
          include: {
            products: {
              include: {
                snapshots: {
                  orderBy: { createdAt: 'desc' },
                  take: 1
                }
              }
            },
            competitors: true
          }
        }
      }
    });

    if (!report) {
      return NextResponse.json(
        { error: 'Report not found', correlationId },
        { status: 404 }
      );
    }

    // 2. Extract report content from latest version
    const latestVersion = report.versions[0];
    if (!latestVersion) {
      return NextResponse.json(
        { error: 'No report content found', correlationId },
        { status: 404 }
      );
    }

    const reportContent = latestVersion.content as any;

    // 3. Build comparative report structure from stored content
    const comparativeReport = {
      id: report.id,
      title: report.name,
      description: report.description || '',
      sections: reportContent.sections || [],
      keyFindings: reportContent.keyFindings || [],
      strategicRecommendations: reportContent.strategicRecommendations || {},
      metadata: {
        productName: report.project?.products?.[0]?.name || '',
        productUrl: report.project?.products?.[0]?.website || '',
        competitorCount: report.project?.competitors?.length || 0,
        analysisDate: new Date(reportContent.metadata?.analysisDate || report.createdAt),
        reportGeneratedAt: report.createdAt,
        analysisId: reportContent.metadata?.analysisId || report.id,
        analysisMethod: reportContent.metadata?.analysisMethod || 'standard',
        confidenceScore: reportContent.metadata?.confidenceScore || 70,
        dataQuality: reportContent.metadata?.dataQuality || 'medium',
        reportVersion: '1.0',
        focusAreas: reportContent.metadata?.focusAreas || [],
        analysisDepth: reportContent.metadata?.analysisDepth || 'standard',
        dataCompletenessScore: reportContent.metadata?.dataCompletenessScore,
        dataFreshness: reportContent.metadata?.dataFreshness,
        hasDataLimitations: reportContent.metadata?.hasDataLimitations || false
      }
    };

    // 4. Build analysis structure
    const analysis = {
      id: reportContent.metadata?.analysisId || report.id,
      analysisDate: new Date(reportContent.metadata?.analysisDate || report.createdAt),
      summary: {
        overallPosition: reportContent.analysis?.summary?.overallPosition || 'unknown',
        opportunityScore: reportContent.analysis?.summary?.opportunityScore || 50,
        threatLevel: reportContent.analysis?.summary?.threatLevel || 'medium',
        confidenceScore: reportContent.metadata?.confidenceScore || 70,
        keyStrengths: reportContent.analysis?.summary?.keyStrengths || [],
        keyWeaknesses: reportContent.analysis?.summary?.keyWeaknesses || []
      },
      metadata: {
        analysisMethod: reportContent.metadata?.analysisMethod || 'standard',
        confidenceScore: reportContent.metadata?.confidenceScore || 70,
        dataQuality: reportContent.metadata?.dataQuality || 'medium',
        generatedBy: 'quality-assessment-api',
        processingTime: 0,
        tokensUsed: 0,
        cost: 0,
        competitorCount: report.project?.competitors?.length || 0
      }
    };

    // 5. Build competitor data context
    const competitorData = {
      totalCompetitors: report.project?.competitors?.length || 0,
      availableCompetitors: report.project?.competitors?.length || 0,
      freshSnapshots: reportContent.metadata?.partialDataInfo?.freshSnapshotCount || 0,
      existingSnapshots: Math.max(0, (report.project?.competitors?.length || 0) - (reportContent.metadata?.partialDataInfo?.freshSnapshotCount || 0))
    };

    // 6. Get product and snapshot
    const product = report.project?.products?.[0];
    const productSnapshot = product?.snapshots?.[0];

    if (!product) {
      return NextResponse.json(
        { error: 'Product information not found for quality assessment', correlationId },
        { status: 400 }
      );
    }

    // 7. Assess report quality
    const qualityAssessment = await reportQualityService.assessReportQuality(
      comparativeReport as any,
      analysis as any,
      product as any,
      productSnapshot as any,
      competitorData
    );

    // 8. Build response
    const response = {
      success: true,
      reportId,
      qualityAssessment,
      timestamp: new Date().toISOString(),
      correlationId
    };

    trackCorrelation(correlationId, 'report_quality_assessment_completed', {
      ...logContext,
      overallScore: qualityAssessment.qualityScore.overall,
      qualityTier: qualityAssessment.qualityTier,
      recommendationCount: qualityAssessment.recommendations.length
    });

    logger.info('Report quality assessment completed', {
      ...logContext,
      overallScore: qualityAssessment.qualityScore.overall,
      qualityTier: qualityAssessment.qualityTier,
      recommendationCount: qualityAssessment.recommendations.length
    });

    return NextResponse.json(response);

  } catch (error) {
    logger.error('Failed to assess report quality', error as Error, logContext);
    return handleAPIError(error as Error, correlationId);
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const correlationId = generateCorrelationId();
  const { id: reportId } = await context.params;
  
  const logContext = {
    operation: 'updateReportQuality',
    reportId,
    correlationId
  };

  try {
    const body = await request.json();
    const { action, parameters } = body;

    logger.info('Updating report quality assessment', { ...logContext, action });

    switch (action) {
      case 'recalculate':
        // Trigger fresh quality assessment
        return NextResponse.json({
          success: true,
          message: 'Quality recalculation triggered',
          correlationId
        });

      case 'compare':
        // Compare with another report
        const { compareReportId } = parameters;
        if (!compareReportId) {
          return NextResponse.json(
            { error: 'compareReportId required for comparison', correlationId },
            { status: 400 }
          );
        }

        const comparison = await reportQualityService.compareReportQuality(
          reportId,
          compareReportId
        );

        return NextResponse.json({
          success: true,
          comparison,
          correlationId
        });

      default:
        return NextResponse.json(
          { error: 'Invalid action', correlationId },
          { status: 400 }
        );
    }

  } catch (error) {
    logger.error('Failed to update report quality assessment', error as Error, logContext);
    return handleAPIError(error as Error, correlationId);
  }
} 