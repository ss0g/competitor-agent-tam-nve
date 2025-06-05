import { NextRequest, NextResponse } from 'next/server';
import { readdir, stat } from 'fs/promises';
import { join } from 'path';
import { prisma } from '@/lib/prisma';

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
  try {
    const reports: ReportFile[] = [];

    // 1. Get reports from database
    try {
      const dbReports = await prisma.report.findMany({
        include: {
          project: true,
          competitor: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      for (const report of dbReports) {
        reports.push({
          id: report.id,
          projectId: report.projectId || 'unknown',
          projectName: report.project?.name || 'Unknown Project',
          title: report.title || report.name,
          generatedAt: report.createdAt,
          downloadUrl: `/api/reports/database/${report.id}`,
          source: 'database',
          status: report.status || 'COMPLETED',
          competitorName: report.competitor.name,
        });
      }
    } catch (dbError) {
      console.error('Error fetching database reports:', dbError);
    }

    // 2. Get reports from file system
    const reportsDir = './reports';
    try {
      const files = await readdir(reportsDir);

      for (const filename of files) {
        if (filename.endsWith('.md')) {
          const filePath = join(reportsDir, filename);
          const stats = await stat(filePath);
          
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
        }
      }
    } catch (dirError) {
      console.log('Reports directory not found or empty');
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

    return NextResponse.json({
      reports: sortedReports,
      total: sortedReports.length,
      sources: {
        database: sortedReports.filter(r => r.source === 'database').length,
        files: sortedReports.filter(r => r.source === 'file').length,
      },
    });

  } catch (error) {
    console.error('Reports list error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 