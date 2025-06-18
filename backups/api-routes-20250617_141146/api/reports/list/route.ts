import { NextRequest, NextResponse } from 'next/server';
import { readdir, stat } from 'fs/promises';
import { join } from 'path';
import { prisma } from '@/lib/prisma';
import { 
  generateCorrelationId, 
  trackEvent, 
  trackError, 
  trackPerformance,
  trackDatabaseOperation,
  trackFileSystemOperation,
  LogContext 
} from '@/lib/logger';

interface ReportFile {
  id?: string;
  filename?: string;
  projectId: string;
  projectName?: string;
  title?: string;
  generatedAt: Date;
  size?: number;
  downloadUrl: string;
  source: 'database' | 'file';
  status?: string;
  competitorName?: string;
}

export async function GET(request: NextRequest) {
  const correlationId = generateCorrelationId();
  const startTime = performance.now();
  
  const logContext: LogContext = {
    correlationId,
    operation: 'list_reports',
    requestUrl: request.url,
  };

  try {
    trackEvent({
      eventType: 'reports_list_request_started',
      category: 'system_event',
      metadata: { url: request.url }
    }, logContext);

    const reports: ReportFile[] = [];

    // 1. Get reports from database
    try {
      const dbStartTime = performance.now();
      
      trackDatabaseOperation('findMany', 'report', {
        ...logContext,
        operation: 'fetch_database_reports',
      });

      const dbReports = await prisma.report.findMany({
        orderBy: {
          createdAt: 'desc',
        },
      });

      trackPerformance('database_reports_fetch', performance.now() - dbStartTime, {
        ...logContext,
        recordCount: dbReports.length,
      });

      for (const report of dbReports) {
        reports.push({
          id: report.id,
          projectId: report.competitorId || 'unknown',
          projectName: 'Unknown Project',
          title: report.name,
          generatedAt: report.createdAt,
          downloadUrl: `/api/reports/database/${report.id}`,
          source: 'database',
          status: 'COMPLETED',
          competitorName: 'Unknown Competitor',
        });
      }

      trackEvent({
        eventType: 'database_reports_processed',
        category: 'system_event',
        metadata: { reportCount: dbReports.length }
      }, logContext);

    } catch (dbError) {
      trackError(dbError as Error, 'database_reports_fetch', {
        ...logContext,
        operation: 'fetch_database_reports',
      });
    }

    // 2. Get reports from file system
    const reportsDir = './reports';
    try {
      const fsStartTime = performance.now();
      
      trackFileSystemOperation('readdir', reportsDir, {
        ...logContext,
        operation: 'read_reports_directory',
      });

      const files = await readdir(reportsDir);

      trackPerformance('filesystem_directory_read', performance.now() - fsStartTime, {
        ...logContext,
        fileCount: files.length,
      });

      let processedFiles = 0;
      for (const filename of files) {
        if (filename.endsWith('.md')) {
          const filePath = join(reportsDir, filename);
          const statStartTime = performance.now();
          
          const stats = await stat(filePath);
          
          trackFileSystemOperation('stat', filePath, {
            ...logContext,
            fileSize: stats.size,
            success: true,
          });
          
          // Extract project ID from filename (format: projectId_timestamp.md)
          const projectId = filename.split('_')[0];
          
          reports.push({
            filename,
            projectId,
            title: `Report for ${projectId}`,
            generatedAt: stats.birthtime,
            size: stats.size,
            downloadUrl: `/api/reports/download?filename=${encodeURIComponent(filename)}`,
            source: 'file',
          });
          
          processedFiles++;
        }
      }

      trackEvent({
        eventType: 'file_reports_processed',
        category: 'system_event',
        metadata: { 
          totalFiles: files.length,
          processedFiles,
          reportsDir 
        }
      }, logContext);

    } catch (dirError) {
      trackError(dirError as Error, 'filesystem_reports_read', {
        ...logContext,
        operation: 'read_reports_directory',
        reportsDir,
      });
    }

    // 3. Sort by creation date (newest first) and remove duplicates
    const uniqueReports = new Map<string, ReportFile>();
    
    for (const report of reports) {
      const key = `${report.projectId}_${report.source}`;
      if (!uniqueReports.has(key) || 
          uniqueReports.get(key)!.generatedAt < report.generatedAt) {
        uniqueReports.set(key, report);
      }
    }

    const sortedReports = Array.from(uniqueReports.values())
      .sort((a, b) => b.generatedAt.getTime() - a.generatedAt.getTime());

    const totalDuration = trackPerformance('reports_list_total', startTime, {
      ...logContext,
      totalReports: sortedReports.length,
      databaseReports: sortedReports.filter(r => r.source === 'database').length,
      fileReports: sortedReports.filter(r => r.source === 'file').length,
    });

    trackEvent({
      eventType: 'reports_list_request_completed',
      category: 'system_event',
      metadata: {
        totalReports: sortedReports.length,
        duration: totalDuration,
        success: true,
      }
    }, logContext);

    return NextResponse.json({
      reports: sortedReports,
      total: sortedReports.length,
      sources: {
        database: sortedReports.filter(r => r.source === 'database').length,
        files: sortedReports.filter(r => r.source === 'file').length,
      },
    });

  } catch (error) {
    const errorDuration = performance.now() - startTime;
    
    trackError(error as Error, 'reports_list_request', {
      ...logContext,
      duration: errorDuration,
      success: false,
    });

    trackEvent({
      eventType: 'reports_list_request_failed',
      category: 'error',
      metadata: {
        error: (error as Error).message,
        duration: errorDuration,
      }
    }, logContext);

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 