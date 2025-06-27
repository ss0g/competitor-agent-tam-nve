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
  reportType?: 'comparative' | 'individual' | 'unknown';
  competitorCount?: number;
  template?: string;
  focusArea?: string;
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
        include: {
          project: {
            include: {
              competitors: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      trackPerformance('database_reports_fetch', performance.now() - dbStartTime, {
        ...logContext,
        recordCount: dbReports.length,
      });

      for (const report of dbReports) {
        // Determine report type based on title and metadata
        let reportType: 'comparative' | 'individual' | 'unknown' = 'unknown';
        let competitorCount = 0;
        let template = 'standard';
        let focusArea = 'general';
        
        // Check if this is a comparative report
        if (report.name?.toLowerCase().includes('comparative') || 
            report.name?.toLowerCase().includes('consolidated')) {
          reportType = 'comparative';
          competitorCount = report.project?.competitors?.length || 0;
          template = 'comprehensive';
          focusArea = 'overall';
        } else {
          reportType = 'individual';
          competitorCount = 1;
        }

        reports.push({
          id: report.id,
          projectId: report.projectId || report.competitorId || 'unknown',
          projectName: report.project?.name || 'Unknown Project',
          title: report.name,
          generatedAt: report.createdAt,
          downloadUrl: `/api/reports/database/${report.id}`,
          source: 'database',
          status: 'COMPLETED',
          competitorName: reportType === 'individual' ? 'Unknown Competitor' : undefined,
          reportType,
          competitorCount,
          template,
          focusArea,
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
          
          // Determine report type from filename or content
          let reportType: 'comparative' | 'individual' | 'unknown' = 'unknown';
          if (filename.toLowerCase().includes('comparative') || 
              filename.toLowerCase().includes('consolidated')) {
            reportType = 'comparative';
          } else {
            reportType = 'individual';
          }
          
          reports.push({
            filename,
            projectId,
            title: reportType === 'comparative' 
              ? `Comparative Analysis: ${projectId}` 
              : `Report for ${projectId}`,
            generatedAt: stats.birthtime,
            size: stats.size,
            downloadUrl: `/api/reports/download?filename=${encodeURIComponent(filename)}`,
            source: 'file',
            reportType,
            competitorCount: reportType === 'comparative' ? 0 : 1,
            template: reportType === 'comparative' ? 'comprehensive' : 'standard',
            focusArea: reportType === 'comparative' ? 'overall' : 'individual',
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