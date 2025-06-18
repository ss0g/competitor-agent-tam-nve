/**
 * Automated Analysis API - Phase 2.1 Endpoints
 * 
 * GET /api/projects/[id]/automated-analysis - Get analysis status for a project
 * POST /api/projects/[id]/automated-analysis - Trigger automated analysis
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAutomatedAnalysisService } from '@/services/automatedAnalysisService';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const projectId = params.id;
    
    if (!projectId) {
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      );
    }

    const automatedAnalysisService = getAutomatedAnalysisService();
    const analysisStatus = await automatedAnalysisService.getAnalysisStatus(projectId);

    return NextResponse.json({
      success: true,
      projectId,
      data: analysisStatus
    });

  } catch (error) {
    console.error('Failed to get automated analysis status:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to get analysis status',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const projectId = params.id;
    
    if (!projectId) {
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { 
      triggeredBy = 'MANUAL_TRIGGER',
      priority = 'MEDIUM'
    } = body;

    const automatedAnalysisService = getAutomatedAnalysisService();
    const result = await automatedAnalysisService.triggerAutomatedAnalysis(projectId, {
      triggeredBy,
      priority
    });

    return NextResponse.json({
      success: true,
      projectId,
      data: result
    });

  } catch (error) {
    console.error('Failed to trigger automated analysis:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to trigger automated analysis',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 