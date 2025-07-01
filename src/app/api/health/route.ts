import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { readdir, stat } from 'fs/promises';
import { join } from 'path';

interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version: string;
  environment: string;
  checks: {
    database: HealthCheck;
    filesystem: HealthCheck;
    memory: HealthCheck;
    reports: HealthCheck;
  };
  metrics: {
    totalReports: number;
    databaseReports: number;
    fileReports: number;
    responseTime: number;
  };
}

interface HealthCheck {
  status: 'pass' | 'fail' | 'warn';
  message: string;
  responseTime?: number;
  details?: Record<string, any>;
}

const startTime = Date.now();

export async function GET(request: NextRequest): Promise<NextResponse> {
  const checkStartTime = performance.now();
  
  const checks = {
    database: await checkDatabase(),
    filesystem: await checkFilesystem(),
    memory: checkMemory(),
    reports: await checkReports(),
  };
  
  // Determine overall health status
  const hasFailures = Object.values(checks).some(check => check.status === 'fail');
  const hasWarnings = Object.values(checks).some(check => check.status === 'warn');
  
  let overallStatus: 'healthy' | 'degraded' | 'unhealthy';
  if (hasFailures) {
    overallStatus = 'unhealthy';
  } else if (hasWarnings) {
    overallStatus = 'degraded';
  } else {
    overallStatus = 'healthy';
  }
  
  const responseTime = performance.now() - checkStartTime;
  
  const healthResult: HealthCheckResult = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    uptime: Date.now() - startTime,
    version: process.env.APP_VERSION || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    checks,
    metrics: {
      totalReports: (checks.reports.details?.total || 0) as number,
      databaseReports: (checks.reports.details?.database || 0) as number,
      fileReports: (checks.reports.details?.files || 0) as number,
      responseTime,
    },
  };
  
  // Set appropriate HTTP status code
  const httpStatus = overallStatus === 'unhealthy' ? 503 : 200;
  
  return NextResponse.json(healthResult, { 
    status: httpStatus,
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Content-Type': 'application/json',
    }
  });
}

async function checkDatabase(): Promise<HealthCheck> {
  const startTime = performance.now();
  
  try {
    // Test database connection with a simple query
    await prisma.$queryRaw`SELECT 1`;
    
    // Get basic database metrics
    const reportCount = await prisma.report.count();
    const projectCount = await prisma.project.count();
    const competitorCount = await prisma.competitor.count();
    
    const responseTime = performance.now() - startTime;
    
    return {
      status: 'pass',
      message: 'Database connection successful',
      responseTime,
      details: {
        reports: reportCount,
        projects: projectCount,
        competitors: competitorCount,
        connectionTime: responseTime,
      }
    };
  } catch (error) {
    const responseTime = performance.now() - startTime;
    
    return {
      status: 'fail',
      message: `Database connection failed: ${(error as Error).message}`,
      responseTime,
      details: {
        error: (error as Error).message,
        code: (error as any).code,
      }
    };
  }
}

async function checkFilesystem(): Promise<HealthCheck> {
  const startTime = performance.now();
  
  try {
    const reportsDir = './reports';
    
    // Check if reports directory exists and is readable
    const stats = await stat(reportsDir);
    if (!stats.isDirectory()) {
      throw new Error('Reports directory is not a directory');
    }
    
    // Check read permissions by listing files
    const files = await readdir(reportsDir);
    const mdFiles = files.filter(f => f.endsWith('.md'));
    
    const responseTime = performance.now() - startTime;
    
    // Warn if directory is getting too large
    let status: 'pass' | 'warn' = 'pass';
    let message = 'Filesystem check successful';
    
    if (files.length > 1000) {
      status = 'warn';
      message = 'Reports directory has many files, consider archiving old reports';
    }
    
    return {
      status,
      message,
      responseTime,
      details: {
        totalFiles: files.length,
        reportFiles: mdFiles.length,
        directorySize: stats.size,
        lastModified: stats.mtime.toISOString(),
      }
    };
  } catch (error) {
    const responseTime = performance.now() - startTime;
    
    return {
      status: 'fail',
      message: `Filesystem check failed: ${(error as Error).message}`,
      responseTime,
      details: {
        error: (error as Error).message,
      }
    };
  }
}

function checkMemory(): HealthCheck {
  try {
    const memUsage = process.memoryUsage();
    const totalMemory = memUsage.heapTotal;
    const usedMemory = memUsage.heapUsed;
    const memoryUsagePercent = (usedMemory / totalMemory) * 100;
    
    // Convert bytes to MB for readability
    const totalMemoryMB = Math.round(totalMemory / 1024 / 1024);
    const usedMemoryMB = Math.round(usedMemory / 1024 / 1024);
    const externalMemoryMB = Math.round(memUsage.external / 1024 / 1024);
    
    let status: 'pass' | 'warn' | 'fail' = 'pass';
    let message = 'Memory usage normal';
    
    if (memoryUsagePercent > 90) {
      status = 'fail';
      message = 'Critical memory usage detected';
    } else if (memoryUsagePercent > 75) {
      status = 'warn';
      message = 'High memory usage detected';
    }
    
    return {
      status,
      message,
      details: {
        totalMemoryMB,
        usedMemoryMB,
        externalMemoryMB,
        usagePercent: Math.round(memoryUsagePercent * 100) / 100,
        rss: Math.round(memUsage.rss / 1024 / 1024),
        arrayBuffers: Math.round(memUsage.arrayBuffers / 1024 / 1024),
      }
    };
  } catch (error) {
    return {
      status: 'fail',
      message: `Memory check failed: ${(error as Error).message}`,
      details: {
        error: (error as Error).message,
      }
    };
  }
}

async function checkReports(): Promise<HealthCheck> {
  const startTime = performance.now();
  
  try {
    // Quick check of reports functionality
    const [dbReports, fileReports] = await Promise.all([
      // Database reports count
      prisma.report.count(),
      // File reports count
      (async () => {
        try {
          const files = await readdir('./reports');
          return files.filter(f => f.endsWith('.md')).length;
        } catch {
          return 0;
        }
      })()
    ]);
    
    const totalReports = dbReports + fileReports;
    const responseTime = performance.now() - startTime;
    
    let status: 'pass' | 'warn' = 'pass';
    let message = 'Reports system operational';
    
    if (totalReports === 0) {
      status = 'warn';
      message = 'No reports found in system';
    }
    
    return {
      status,
      message,
      responseTime,
      details: {
        total: totalReports,
        database: dbReports,
        files: fileReports,
      }
    };
  } catch (error) {
    const responseTime = performance.now() - startTime;
    
    return {
      status: 'fail',
      message: `Reports check failed: ${(error as Error).message}`,
      responseTime,
      details: {
        error: (error as Error).message,
      }
    };
  }
} 