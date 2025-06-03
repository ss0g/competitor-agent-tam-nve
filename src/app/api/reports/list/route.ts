import { NextRequest, NextResponse } from 'next/server';
import { readdir, stat } from 'fs/promises';
import { join } from 'path';

interface ReportFile {
  filename: string;
  projectId: string;
  generatedAt: Date;
  size: number;
  downloadUrl: string;
}

export async function GET(request: NextRequest) {
  try {
    const reportsDir = './reports';
    
    try {
      const files = await readdir(reportsDir);
      const reports: ReportFile[] = [];

      for (const filename of files) {
        if (filename.endsWith('.md')) {
          const filePath = join(reportsDir, filename);
          const stats = await stat(filePath);
          
          // Extract project ID from filename (format: projectId_timestamp.md)
          const projectId = filename.split('_')[0];
          
          reports.push({
            filename,
            projectId,
            generatedAt: stats.birthtime,
            size: stats.size,
            downloadUrl: `/api/reports/download?filename=${encodeURIComponent(filename)}`,
          });
        }
      }

      // Sort by creation date (newest first)
      reports.sort((a, b) => b.generatedAt.getTime() - a.generatedAt.getTime());

      return NextResponse.json({
        reports,
        total: reports.length,
      });

    } catch (dirError) {
      // Reports directory doesn't exist yet
      return NextResponse.json({
        reports: [],
        total: 0,
      });
    }

  } catch (error) {
    console.error('Reports list error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 