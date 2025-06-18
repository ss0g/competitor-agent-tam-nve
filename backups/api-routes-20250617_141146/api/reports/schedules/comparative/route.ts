import { NextRequest, NextResponse } from 'next/server';
import { ComparativeReportSchedulerSimple, SimpleSchedulerConfig } from '@/services/comparativeReportSchedulerSimple';
import { logger } from '@/lib/logger';

const scheduler = new ComparativeReportSchedulerSimple();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectId, frequency, reportName, enabled = true } = body;

    if (!projectId) {
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      );
    }

    if (!frequency) {
      return NextResponse.json(
        { error: 'Frequency is required' },
        { status: 400 }
      );
    }

    const config: SimpleSchedulerConfig = {
      enabled,
      frequency,
      projectId,
      reportName: reportName || `Comparative Report - ${new Date().toISOString()}`,
      notifyOnCompletion: true,
      notifyOnErrors: true,
      maxConcurrentJobs: 1
    };

    const scheduleId = await scheduler.scheduleComparativeReports(config);

    logger.info('Comparative report schedule created via API', {
      scheduleId,
      projectId,
      frequency
    });

    return NextResponse.json({
      success: true,
      scheduleId,
      message: 'Comparative report schedule created successfully'
    });

  } catch (error) {
    logger.error('Failed to create comparative report schedule', error as Error);
    
    return NextResponse.json(
      { 
        error: 'Failed to create schedule',
        details: (error as Error).message 
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      );
    }

    const schedules = await scheduler.listProjectSchedules(projectId);

    return NextResponse.json({
      success: true,
      schedules,
      count: schedules.length
    });

  } catch (error) {
    logger.error('Failed to list comparative report schedules', error as Error);
    
    return NextResponse.json(
      { 
        error: 'Failed to list schedules',
        details: (error as Error).message 
      },
      { status: 500 }
    );
  }
} 