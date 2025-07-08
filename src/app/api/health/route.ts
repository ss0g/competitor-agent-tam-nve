import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { promises as fs } from 'fs';
import { join } from 'path';
import { withRedisCache } from '@/lib/redis-cache';

// Define TTL for health check cache (in seconds)
const HEALTH_CHECK_CACHE_TTL = 30; // 30 seconds - short cache to still detect issues quickly

// Types for health check result
interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version: string;
  environment: string;
  checks: {
    database: HealthCheckItem;
    filesystem: HealthCheckItem;
    memory: HealthCheckItem;
    reports: HealthCheckItem;
  };
  metrics: {
    totalReports: number;
    databaseReports: number;
    fileReports: number;
    responseTime: number;
  };
}

interface HealthCheckItem {
  status: 'pass' | 'warn' | 'fail';
  details?: Record<string, any>;
}

interface LogContext {
  operation: string;
  correlationId?: string;
}

const startTime = Date.now();

export async function GET(request: NextRequest): Promise<NextResponse> {
  const checkStartTime = performance.now();
  
  // Only cache in production to ensure development environment always gets fresh data
  const isProduction = process.env.NODE_ENV === 'production';
  const shouldUseCache = isProduction && !request.nextUrl.searchParams.has('no_cache');
  
  // Define the health check function
  const performHealthCheck = async () => {
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
      overallStatus = 'degraded'; // Still return 200, not 503
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
    
    return healthResult;
  };
  
  // Use caching if applicable, otherwise perform check directly
  let healthResult: HealthCheckResult;
  
  if (shouldUseCache) {
    healthResult = await withRedisCache(
      performHealthCheck,
      'health_check',
      {},
      HEALTH_CHECK_CACHE_TTL
    );
  } else {
    healthResult = await performHealthCheck();
  }
  
  // Set appropriate HTTP status code - only 503 for critical failures
  const httpStatus = healthResult.status === 'unhealthy' ? 503 : 200;
  
  return NextResponse.json(healthResult, { 
    status: httpStatus,
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Content-Type': 'application/json',
    }
  });
}

// Check database connection
async function checkDatabase(): Promise<HealthCheckItem> {
  try {
    // Simple query to verify database connection
    await prisma.$queryRaw`SELECT 1 AS health`;
    return { status: 'pass' };
  } catch (error) {
    return { 
      status: 'fail',
      details: { 
        error: error instanceof Error ? error.message : 'Unknown database error',
        timestamp: new Date().toISOString()
      }
    };
  }
}

// Check filesystem access
async function checkFilesystem(): Promise<HealthCheckItem> {
  try {
    const testDir = join(process.cwd(), 'reports');
    await fs.access(testDir);
    return { status: 'pass' };
  } catch (error) {
    return { 
      status: 'fail',
      details: { 
        error: error instanceof Error ? error.message : 'Unknown filesystem error',
        timestamp: new Date().toISOString()
      }
    };
  }
}

// Check memory usage
function checkMemory(): HealthCheckItem {
  const memoryUsage = process.memoryUsage();
  const heapUsedPercentage = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;
  
  let status: 'pass' | 'warn' | 'fail' = 'pass';
  if (heapUsedPercentage > 90) {
    status = 'fail';
  } else if (heapUsedPercentage > 75) {
    status = 'warn';
  }
  
  return {
    status,
    details: {
      heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024) + 'MB',
      heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024) + 'MB',
      heapUsedPercentage: Math.round(heapUsedPercentage) + '%'
    }
  };
}

// Check reports - database and filesystem
async function checkReports(): Promise<HealthCheckItem> {
  try {
    // Count reports in database
    const dbCount = await prisma.report.count();
    
    // Count report files
    let filesCount = 0;
    try {
      const files = await fs.readdir(join(process.cwd(), 'reports'));
      filesCount = files.filter(file => file.endsWith('.md')).length;
    } catch (error) {
      return {
        status: 'warn',
        details: {
          error: 'Could not read report files',
          database: dbCount,
          total: dbCount
        }
      };
    }
    
    // Check if numbers match approximately (some may be processing)
    const diff = Math.abs(dbCount - filesCount);
    const diffPercentage = dbCount > 0 ? (diff / dbCount) * 100 : 0;
    
    let status: 'pass' | 'warn' | 'fail' = 'pass';
    if (diffPercentage > 20 && diff > 10) {
      status = 'warn';
    }
    
    return {
      status,
      details: {
        database: dbCount,
        files: filesCount,
        total: Math.max(dbCount, filesCount),
        difference: diff,
        differencePercentage: Math.round(diffPercentage) + '%'
      }
    };
  } catch (error) {
    return {
      status: 'fail',
      details: {
        error: error instanceof Error ? error.message : 'Unknown error checking reports',
        timestamp: new Date().toISOString()
      }
    };
  }
} 