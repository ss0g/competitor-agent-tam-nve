import { NextRequest, NextResponse } from 'next/server';
import { ComparativeReportSchedulerSimple } from '@/services/comparativeReportSchedulerSimple';
import { logger } from '@/lib/logger';

const scheduler = new ComparativeReportSchedulerSimple();

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const scheduleId = params.id;

    if (!scheduleId) {
      return NextResponse.json(
        { error: 'Schedule ID is required' },
        { status: 400 }
      );
    }

    const status = await scheduler.getScheduleStatus(scheduleId);

    return NextResponse.json({
      success: true,
      status
    });

  } catch (error) {
    logger.error('Failed to get schedule status', error as Error);
    
    return NextResponse.json(
      { 
        error: 'Failed to get schedule status',
        details: (error as Error).message 
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
    const scheduleId = params.id;
    const body = await request.json();
    const { action } = body;

    if (!scheduleId) {
      return NextResponse.json(
        { error: 'Schedule ID is required' },
        { status: 400 }
      );
    }

    if (!action) {
      return NextResponse.json(
        { error: 'Action is required (start, stop, or execute)' },
        { status: 400 }
      );
    }

    let result: boolean | any = false;
    let message = '';

    switch (action) {
      case 'start':
        result = scheduler.startSchedule(scheduleId);
        message = result ? 'Schedule started successfully' : 'Schedule not found or already running';
        break;
      
      case 'stop':
        result = scheduler.stopSchedule(scheduleId);
        message = result ? 'Schedule stopped successfully' : 'Schedule not found or already stopped';
        break;
      
      case 'execute':
        // Manual execution - get project ID from schedule first
        const status = await scheduler.getScheduleStatus(scheduleId);
        if (!status.schedule) {
          return NextResponse.json(
            { error: 'Schedule not found' },
            { status: 404 }
          );
        }
        
        result = await scheduler.generateScheduledReport(status.schedule.report.projectId);
        message = 'Manual execution completed successfully';
        break;
      
      default:
        return NextResponse.json(
          { error: 'Invalid action. Use start, stop, or execute' },
          { status: 400 }
        );
    }

    logger.info('Schedule action performed', {
      scheduleId,
      action,
      result: result ? 'success' : 'failed'
    });

    return NextResponse.json({
      success: !!result,
      message,
      result
    });

  } catch (error) {
    logger.error('Failed to perform schedule action', error as Error);
    
    return NextResponse.json(
      { 
        error: 'Failed to perform action',
        details: (error as Error).message 
      },
      { status: 500 }
    );
  }
} 