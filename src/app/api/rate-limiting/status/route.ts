/**
 * Phase 4.4: Rate Limiting Status and Management API
 * 
 * This endpoint provides comprehensive rate limiting monitoring and management capabilities:
 * - Real-time metrics and status
 * - Configuration updates
 * - Circuit breaker management
 * - Cost monitoring
 * - Administrative controls
 */

import { NextRequest, NextResponse } from 'next/server';
import { RateLimitingService } from '@/services/rateLimitingService';
import { logger } from '@/lib/logger';
import { handleAPIError } from '@/lib/utils/errorHandler';

// Initialize rate limiting service instance
const rateLimitingService = RateLimitingService.getInstance();

/**
 * GET /api/rate-limiting/status
 * 
 * Returns comprehensive rate limiting status, metrics, and health information
 */
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const format = url.searchParams.get('format') || 'detailed';
    const includeHistory = url.searchParams.get('history') === 'true';

    logger.info('Rate limiting status requested', { 
      format, 
      includeHistory,
      userAgent: request.headers.get('user-agent') 
    });

    // Get current metrics and status
    const metrics = rateLimitingService.getRateLimitingMetrics();
    const circuitBreakerInfo = rateLimitingService.getCircuitBreakerInfo();
    const usageStats = rateLimitingService.getUsageStatistics();

    // Build response based on format
    let response: any;
    
    if (format === 'summary') {
      response = {
        status: 'healthy',
        healthScore: metrics.healthScore,
        circuitBreakerState: circuitBreakerInfo.state,
        currentLoad: {
          concurrentRequests: metrics.currentConcurrentRequests,
          dailyRequests: metrics.dailyRequestCount,
          hourlyRequests: metrics.hourlyRequestCount
        },
        costs: {
          dailyUsd: metrics.dailyCostUsd,
          hourlyUsd: metrics.hourlyCostUsd
        },
        alerts: metrics.recommendedActions.length > 0 ? metrics.recommendedActions : []
      };
    } else {
      response = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        
        // Overall Health
        health: {
          score: metrics.healthScore,
          effectiveness: metrics.rateLimitingEffectiveness,
          recommendedActions: metrics.recommendedActions
        },
        
        // Circuit Breaker Status
        circuitBreaker: {
          state: circuitBreakerInfo.state,
          errorCount: circuitBreakerInfo.errorCount,
          successCount: circuitBreakerInfo.successCount,
          errorRate: circuitBreakerInfo.errorRate,
          totalRequests: circuitBreakerInfo.totalRequests,
          lastFailureTime: circuitBreakerInfo.lastFailureTime,
          nextRetryTime: circuitBreakerInfo.nextRetryTime,
          halfOpenTestRequests: circuitBreakerInfo.halfOpenTestRequests
        },
        
        // Request Metrics
        requests: {
          total: metrics.totalRequests,
          successful: metrics.successfulRequests,
          failed: metrics.failedRequests,
          throttled: metrics.throttledRequests,
          circuitBreakerRejects: metrics.circuitBreakerRejects,
          costLimitRejects: metrics.costLimitRejects,
          
          // Current State
          currentConcurrent: metrics.currentConcurrentRequests,
          activeDomainThrottles: metrics.activeDomainThrottles,
          activeProjectThrottles: metrics.activeProjectThrottles
        },
        
        // Performance Metrics
        performance: {
          averageRequestTime: metrics.averageRequestTime,
          p95RequestTime: metrics.p95RequestTime,
          p99RequestTime: metrics.p99RequestTime
        },
        
        // Cost and Usage
        usage: {
          daily: {
            requests: metrics.dailyRequestCount,
            costUsd: metrics.dailyCostUsd,
            date: usageStats.dailyStats.date
          },
          hourly: {
            requests: metrics.hourlyRequestCount,
            costUsd: metrics.hourlyCostUsd,
            hour: usageStats.hourlyStats.hour
          }
        },
        
        // Resource Usage
        resources: {
          memoryUsageMb: metrics.currentMemoryUsageMb,
          cpuUsagePercent: metrics.currentCpuUsagePercent
        },
        
        // Rate Limiting Effectiveness
        effectiveness: {
          score: metrics.rateLimitingEffectiveness,
          successRate: metrics.totalRequests > 0 ? (metrics.successfulRequests / metrics.totalRequests) * 100 : 100,
          throttleRate: metrics.totalRequests > 0 ? (metrics.throttledRequests / metrics.totalRequests) * 100 : 0,
          circuitBreakerActivations: circuitBreakerInfo.state === 'open' ? 1 : 0
        }
      };

      // Add historical data if requested
      if (includeHistory) {
        response.history = {
          dailyStats: usageStats.dailyStats,
          hourlyStats: usageStats.hourlyStats
        };
      }
    }

    // Add cache headers for appropriate caching
    const headers = new Headers({
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'X-Rate-Limiting-Service-Version': '4.4.0',
      'X-Health-Score': metrics.healthScore.toString(),
      'X-Circuit-Breaker-State': circuitBreakerInfo.state
    });

    return new NextResponse(JSON.stringify(response, null, 2), {
      status: 200,
      headers
    });

  } catch (error) {
    logger.error('Failed to get rate limiting status', error as Error);
    
    return handleAPIError(error as Error, 'rate_limiting_status');
  }
}

/**
 * POST /api/rate-limiting/status
 * 
 * Administrative operations for rate limiting management
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, ...params } = body;

    logger.info('Rate limiting administrative action requested', { 
      action, 
      params: Object.keys(params)
    });

    let result;

    switch (action) {
      case 'updateConfiguration':
        if (!params.config) {
          return new NextResponse(
            JSON.stringify({ error: 'Missing config parameter' }),
            { status: 400, headers: { 'Content-Type': 'application/json' } }
          );
        }
        
        rateLimitingService.updateConfiguration(params.config);
        result = {
          success: true,
          message: 'Rate limiting configuration updated',
          newConfig: params.config
        };
        break;

      case 'triggerCircuitBreaker':
        const reason = params.reason || 'Manual trigger via API';
        rateLimitingService.triggerCircuitBreaker(reason);
        result = {
          success: true,
          message: 'Circuit breaker manually triggered',
          reason
        };
        break;

      case 'resetCircuitBreaker':
        rateLimitingService.resetCircuitBreaker();
        result = {
          success: true,
          message: 'Circuit breaker reset',
          newState: 'closed'
        };
        break;

      case 'clearThrottling':
        rateLimitingService.clearThrottlingState();
        result = {
          success: true,
          message: 'All throttling state cleared'
        };
        break;

      case 'getMetrics':
        result = {
          success: true,
          metrics: rateLimitingService.getRateLimitingMetrics(),
          circuitBreaker: rateLimitingService.getCircuitBreakerInfo(),
          usage: rateLimitingService.getUsageStatistics()
        };
        break;

      case 'healthCheck':
        const metrics = rateLimitingService.getRateLimitingMetrics();
        const circuitBreaker = rateLimitingService.getCircuitBreakerInfo();
        
        result = {
          success: true,
          healthStatus: {
            overall: metrics.healthScore >= 70 ? 'healthy' : metrics.healthScore >= 40 ? 'degraded' : 'unhealthy',
            score: metrics.healthScore,
            circuitBreakerState: circuitBreaker.state,
            issues: metrics.recommendedActions,
            uptime: 'operational', // Would track actual uptime in production
            lastCheck: new Date().toISOString()
          }
        };
        break;

      case 'getCostProjection':
        const currentMetrics = rateLimitingService.getRateLimitingMetrics();
        const hoursRemaining = 24 - new Date().getHours();
        const projectedDailyCost = currentMetrics.dailyCostUsd + (currentMetrics.hourlyCostUsd * hoursRemaining);
        
        result = {
          success: true,
          costProjection: {
            currentDaily: currentMetrics.dailyCostUsd,
            currentHourly: currentMetrics.hourlyCostUsd,
            projectedDaily: projectedDailyCost,
            remainingDailyBudget: Math.max(0, 50 - projectedDailyCost), // Assuming $50 daily limit
            utilizationPercent: (projectedDailyCost / 50) * 100
          }
        };
        break;

      case 'getThrottlingStatus':
        const throttlingMetrics = rateLimitingService.getRateLimitingMetrics();
        result = {
          success: true,
          throttlingStatus: {
            activeDomainThrottles: throttlingMetrics.activeDomainThrottles,
            activeProjectThrottles: throttlingMetrics.activeProjectThrottles,
            throttledRequestsTotal: throttlingMetrics.throttledRequests,
            throttleRate: throttlingMetrics.totalRequests > 0 
              ? (throttlingMetrics.throttledRequests / throttlingMetrics.totalRequests) * 100 
              : 0
          }
        };
        break;

      default:
        return new NextResponse(
          JSON.stringify({ 
            error: 'Unknown action', 
            supportedActions: [
              'updateConfiguration',
              'triggerCircuitBreaker', 
              'resetCircuitBreaker',
              'clearThrottling',
              'getMetrics',
              'healthCheck',
              'getCostProjection',
              'getThrottlingStatus'
            ]
          }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
    }

    logger.info('Rate limiting administrative action completed', { 
      action, 
      success: result.success 
    });

    return new NextResponse(JSON.stringify(result, null, 2), {
      status: 200,
      headers: { 
        'Content-Type': 'application/json',
        'X-Rate-Limiting-Service-Version': '4.4.0'
      }
    });

  } catch (error) {
    logger.error('Failed to execute rate limiting administrative action', error as Error);
    
    return handleAPIError(error as Error, 'rate_limiting_admin');
  }
}

/**
 * PUT /api/rate-limiting/status
 * 
 * Update rate limiting configuration
 */
export async function PUT(request: NextRequest) {
  try {
    const newConfig = await request.json();

    logger.info('Rate limiting configuration update requested', { 
      configKeys: Object.keys(newConfig)
    });

    // Validate configuration
    const validConfigKeys = [
      'maxConcurrentPerProject',
      'maxGlobalConcurrent',
      'perDomainThrottleMs',
      'dailySnapshotLimit',
      'hourlySnapshotLimit',
      'circuitBreakerErrorThreshold',
      'circuitBreakerWindowMs',
      'circuitBreakerRecoveryMs',
      'maxDailyCostUsd',
      'maxHourlyCostUsd',
      'costPerSnapshotUsd'
    ];

    const invalidKeys = Object.keys(newConfig).filter(key => !validConfigKeys.includes(key));
    if (invalidKeys.length > 0) {
      return new NextResponse(
        JSON.stringify({ 
          error: 'Invalid configuration keys', 
          invalidKeys,
          validKeys: validConfigKeys
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Apply configuration update
    rateLimitingService.updateConfiguration(newConfig);

    // Get updated metrics to confirm changes
    const updatedMetrics = rateLimitingService.getRateLimitingMetrics();

    logger.info('Rate limiting configuration updated successfully', { newConfig });

    return new NextResponse(JSON.stringify({
      success: true,
      message: 'Rate limiting configuration updated',
      updatedConfig: newConfig,
      healthScore: updatedMetrics.healthScore,
      timestamp: new Date().toISOString()
    }, null, 2), {
      status: 200,
      headers: { 
        'Content-Type': 'application/json',
        'X-Rate-Limiting-Service-Version': '4.4.0'
      }
    });

  } catch (error) {
    logger.error('Failed to update rate limiting configuration', error as Error);
    
    return handleAPIError(error as Error, 'rate_limiting_config_update');
  }
} 