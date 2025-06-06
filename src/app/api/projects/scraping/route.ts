import { NextRequest, NextResponse } from 'next/server';
import { projectScrapingService } from '@/services/projectScrapingService';
import { parseFrequency, frequencyToString } from '@/utils/frequencyParser';
import { ReportScheduleFrequency } from '@prisma/client';

/**
 * GET /api/projects/scraping?projectId=xxx
 * Get scraping status for a project
 */
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

    const status = await projectScrapingService.getProjectScrapingStatus(projectId);

    return NextResponse.json({
      success: true,
      data: {
        ...status,
        frequencyDisplay: status.frequency ? frequencyToString(status.frequency) : undefined
      }
    });

  } catch (error) {
    console.error('Error getting project scraping status:', error);
    return NextResponse.json(
      { error: 'Failed to get scraping status' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/projects/scraping
 * Start or update scraping schedule for a project
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectId, frequency, action } = body;

    if (!projectId) {
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      );
    }

    let result;
    let message;

    switch (action) {
      case 'start':
        result = await projectScrapingService.scheduleProjectScraping(projectId);
        message = result ? 'Scraping schedule started successfully' : 'Failed to start scraping schedule';
        break;

      case 'stop':
        result = await projectScrapingService.stopProjectScraping(projectId);
        message = result ? 'Scraping schedule stopped successfully' : 'Failed to stop scraping schedule';
        break;

      case 'updateFrequency':
        if (!frequency) {
          return NextResponse.json(
            { error: 'Frequency is required for updateFrequency action' },
            { status: 400 }
          );
        }

        // Parse frequency input
        let parsedFrequency: ReportScheduleFrequency;
        if (typeof frequency === 'string') {
          const parsed = parseFrequency(frequency);
          parsedFrequency = parsed.frequency;
        } else {
          parsedFrequency = frequency;
        }

        result = await projectScrapingService.updateProjectFrequency(projectId, parsedFrequency);
        message = result 
          ? `Frequency updated to ${frequencyToString(parsedFrequency)} successfully`
          : 'Failed to update frequency';
        break;

      case 'triggerManual':
        result = await projectScrapingService.triggerManualProjectScraping(projectId);
        message = result ? 'Manual scraping triggered successfully' : 'Failed to trigger manual scraping';
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: start, stop, updateFrequency, or triggerManual' },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: !!result,
      message,
      data: { projectId, action, result }
    });

  } catch (error) {
    console.error('Error managing project scraping:', error);
    return NextResponse.json(
      { error: 'Failed to manage project scraping' },
      { status: 500 }
    );
  }
} 