/**
 * Scheduled Jobs API - Phase 2.2 Endpoints
 * 
 * GET /api/scheduled-jobs - Get all scheduled jobs and monitoring status
 * POST /api/scheduled-jobs - Create a new scheduled job
 */

import { NextRequest, NextResponse } from 'next/server';
import { getScheduledJobService } from '@/services/scheduledJobService';

export async function GET(request: NextRequest) {
  try {
    const scheduledJobService = getScheduledJobService();
    
    // Get all jobs and monitoring status
    const jobs = scheduledJobService.getJobs();
    const monitoringStatus = scheduledJobService.getMonitoringStatus();

    return NextResponse.json({
      success: true,
      data: {
        jobs,
        monitoring: monitoringStatus
      }
    });

  } catch (error) {
    console.error('Failed to get scheduled jobs:', error);
    
    // Graceful degradation: Return fallback job status
    const fallbackData = {
      jobs: [],
      monitoring: {
        status: 'DEGRADED',
        activeJobs: 0,
        failedJobs: 0,
        lastCheck: new Date().toISOString(),
        healthScore: 70,
        issues: ['Job monitoring temporarily unavailable']
      }
    };
    
    return NextResponse.json({
      success: true,
      data: fallbackData,
      fallback: true,
      error: 'Scheduled jobs monitoring temporarily unavailable',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, {
      headers: {
        'X-Monitoring-Status': 'degraded',
        'X-Fallback-Mode': 'true'
      }
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      jobId,
      name,
      cronPattern,
      jobType,
      projectId,
      metadata
    } = body;

    if (!jobId || !name || !cronPattern || !jobType) {
      return NextResponse.json(
        { error: 'Missing required fields: jobId, name, cronPattern, jobType' },
        { status: 400 }
      );
    }

    const scheduledJobService = getScheduledJobService();
    const job = await scheduledJobService.scheduleJob(jobId, {
      name,
      cronPattern,
      jobType,
      projectId,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastStatus: 'PENDING',
      metadata
    });

    return NextResponse.json({
      success: true,
      data: job
    });

  } catch (error) {
    console.error('Failed to create scheduled job:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to create scheduled job',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 