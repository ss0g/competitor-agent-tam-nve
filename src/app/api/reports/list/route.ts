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

// Simple in-memory cache with TTL
const reportCache = new Map<string, { data: ReportFile[]; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getCachedReports(key: string): ReportFile[] | null {
  const cached = reportCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  return null;
}

function setCachedReports(key: string, data: ReportFile[]): void {
  reportCache.set(key, { data, timestamp: Date.now() });
}

export async function GET(request: NextRequest) {
  const correlationId = generateCorrelationId();
  const startTime = performance.now();
  
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get('limit') || '10');
  const offset = parseInt(searchParams.get('offset') || '0');
  
  const logContext: LogContext = {
    correlationId,
    operation: 'list_reports',
    requestUrl: request.url,
  };

  try {
    trackEvent({
      eventType: 'reports_list_request_started',
      category: 'system_event',
      metadata: { url: request.url, limit, offset }
    }, logContext);

    // Check cache first
    const cacheKey = `reports_${limit}_${offset}`;
    const cachedReports = getCachedReports(cacheKey);
    if (cachedReports) {
      const totalTime = performance.now() - startTime;
      trackPerformance('reports_list_total', totalTime, {
        ...logContext,
        totalReports: cachedReports.length,
        cached: true
      });
      
      return NextResponse.json({
        reports: cachedReports,
        total: cachedReports.length,
        limit,
        offset,
        cached: true
      });
    }

    const reports: ReportFile[] = [];

    // 1. Get reports from database (optimized query)
    try {
      const dbStartTime = performance.now();
      
      trackDatabaseOperation('findMany', 'report', {
        ...logContext,
        operation: 'fetch_database_reports',
      });

      const dbReports = await prisma.report.findMany({
        select: {
          id: true,
          name: true,
          projectId: true,
          competitorId: true,
          createdAt: true,
          project: {
            select: {
              name: true,
              competitors: {
                select: { id: true }
              }
            }
          }
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: limit * 2, // Get more than needed to account for file reports
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
            report.name?.toLowerCase().includes('consolidated') ||
            report.name?.toLowerCase().includes('competitive analysis') ||
            report.name?.toLowerCase().includes(' vs ') ||
            report.name?.toLowerCase().includes('comparison')) {
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
          competitorName: reportType === 'individual' ? 'Unknown Competitor' : 'Multiple Competitors',
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

    // 2. Get reports from file system (OPTIMIZED - parallel processing with early termination)
    const reportsDir = './reports';
    try {
      const fsStartTime = performance.now();
      
      const files = await readdir(reportsDir);
      
      // Filter .md files and sort by name (newest first based on timestamp in filename)
      const mdFiles = files
        .filter(f => f.endsWith('.md'))
        .sort((a, b) => b.localeCompare(a)) // Sort descending (newest first)
        .slice(0, Math.min(100, limit * 3)); // Only process a reasonable subset

      trackPerformance('filesystem_directory_read', performance.now() - fsStartTime, {
        ...logContext,
        totalFiles: files.length,
        mdFiles: mdFiles.length,
      });

      // CRITICAL FIX: Parallel processing instead of sequential
      const fileProcessingStartTime = performance.now();
      const filePromises = mdFiles.slice(0, limit * 2).map(async (filename) => {
        try {
          const filePath = join(reportsDir, filename);
          const stats = await stat(filePath);
          
          // Extract project ID from filename
          const projectId = filename.split('_')[0];
          
          // Determine report type from filename
          let reportType: 'comparative' | 'individual' | 'unknown' = 'unknown';
          if (filename.toLowerCase().includes('comparative') || 
              filename.toLowerCase().includes('consolidated') ||
              filename.toLowerCase().includes('competitive') ||
              filename.toLowerCase().includes('vs') ||
              filename.toLowerCase().includes('comparison')) {
            reportType = 'comparative';
          } else {
            reportType = 'individual';
          }
          
          return {
            filename,
            projectId,
            title: reportType === 'comparative' 
              ? `Comparative Analysis: ${projectId}` 
              : `Report for ${projectId}`,
            generatedAt: stats.birthtime,
            size: stats.size,
            downloadUrl: `/api/reports/download?filename=${encodeURIComponent(filename)}`,
            source: 'file' as const,
            reportType,
            competitorCount: reportType === 'comparative' ? 0 : 1,
            template: reportType === 'comparative' ? 'comprehensive' : 'standard',
            focusArea: reportType === 'comparative' ? 'overall' : 'individual',
          };
        } catch (error) {
          // Skip files that can't be processed
          return null;
        }
      });

      const fileResults = await Promise.all(filePromises);
      const validFileReports = fileResults.filter((report) => report !== null) as ReportFile[];
      
      reports.push(...validFileReports);

      trackPerformance('filesystem_files_processed', performance.now() - fileProcessingStartTime, {
        ...logContext,
        processedFiles: validFileReports.length,
        totalFiles: mdFiles.length,
      });

      trackEvent({
        eventType: 'file_reports_processed',
        category: 'system_event',
        metadata: { 
          totalFiles: files.length,
          processedFiles: validFileReports.length,
          reportsDir 
        }
      }, logContext);

    } catch (fsError) {
      trackError(fsError as Error, 'filesystem_reports_fetch', {
        ...logContext,
        operation: 'fetch_file_reports',
      });
    }

    // 3. Sort all reports by date and apply pagination
    const sortedReports = reports
      .sort((a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime())
      .slice(offset, offset + limit);

    // Cache the results
    setCachedReports(cacheKey, sortedReports);

    const totalTime = performance.now() - startTime;
    
    const responseData = {
      reports: sortedReports,
      total: sortedReports.length,
      databaseReports: reports.filter(r => r.source === 'database').length,
      fileReports: reports.filter(r => r.source === 'file').length,
      limit,
      offset,
      cached: false
    };

    // Update log context with final metrics
    const finalLogContext = {
      ...logContext,
      totalReports: sortedReports.length,
      databaseReports: responseData.databaseReports,
      fileReports: responseData.fileReports,
    };

    trackPerformance('reports_list_total', totalTime, finalLogContext);
    
    trackEvent({
      eventType: 'reports_list_request_completed',
      category: 'system_event',
      metadata: { totalReports: sortedReports.length, success: true }
    }, finalLogContext);

    return NextResponse.json(responseData);

  } catch (error) {
    const totalTime = performance.now() - startTime;
    
    trackError(error as Error, 'reports_list_request', {
      ...logContext,
      totalTime,
    });
    
    trackEvent({
      eventType: 'reports_list_request_failed',
      category: 'error',
      metadata: { 
        error: (error as Error).message,
        totalTime 
      }
    }, logContext);

    return NextResponse.json(
      { 
        error: 'Failed to fetch reports',
        details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
      },
      { status: 500 }
    );
  }
} 