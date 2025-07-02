/**
 * Phase 4.3: Intelligent Cache Management API
 * Cache status monitoring and configuration management endpoints
 */

import { NextRequest, NextResponse } from 'next/server';
import { intelligentCachingService } from '@/services/intelligentCachingService';
import { handleAPIError } from '@/lib/utils/errorHandler';
import { logger, generateCorrelationId, trackCorrelation } from '@/lib/logger';

// Request interface for cache configuration updates
interface CacheConfigUpdateRequest {
  competitorBasicDataTtl?: number;
  competitorSnapshotMetadataTtl?: number;
  analysisPatternsTtl?: number;
  commonInsightsTtl?: number;
  maxCacheSize?: number;
  compressionEnabled?: boolean;
  backgroundRefreshEnabled?: boolean;
  autoInvalidationEnabled?: boolean;
  maxDataAge?: number;
}

// Request interface for cache invalidation
interface CacheInvalidationRequest {
  tags?: string[];
  competitorId?: string;
  clearAll?: boolean;
  invalidateExpired?: boolean;
}

/**
 * GET /api/intelligent-cache/status
 * Returns comprehensive cache statistics and status
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const correlationId = generateCorrelationId();
  
  try {
    logger.info('Getting intelligent cache status', {
      correlationId,
      url: request.url
    });

    const statistics = intelligentCachingService.getCacheStatistics();
    
    const response = {
      status: 'active',
      statistics,
      configuration: {
        maxCacheSize: 1000, // This would come from the actual config
        compressionEnabled: true,
        backgroundRefreshEnabled: true,
        autoInvalidationEnabled: true
      },
      health: {
        isHealthy: statistics.totalEntries < 1000,
        performanceGrade: statistics.performanceMetrics.cacheEfficiency > 0.8 ? 'A' : 
                         statistics.performanceMetrics.cacheEfficiency > 0.6 ? 'B' : 
                         statistics.performanceMetrics.cacheEfficiency > 0.4 ? 'C' : 'D',
        recommendations: generateRecommendations(statistics)
      },
      metadata: {
        cacheTypes: [
          'competitor:basic',
          'snapshot:metadata',
          'analysis:patterns',
          'insights:common'
        ],
        averageEntrySize: statistics.totalEntries > 0 ? 
          Math.round(statistics.totalSize / statistics.totalEntries) : 0,
        memoryUsage: statistics.totalSize,
        lastMaintenance: new Date().toISOString()
      }
    };

    logger.info('Retrieved intelligent cache status', {
      correlationId,
      totalEntries: statistics.totalEntries,
      hitRate: statistics.hitRate,
      cacheEfficiency: statistics.performanceMetrics.cacheEfficiency
    });

    return NextResponse.json({
      success: true,
      data: response,
      correlationId
    });

  } catch (error) {
    return handleAPIError(error as Error, correlationId, { message: 'Failed to get cache status' });
  }
}

/**
 * POST /api/intelligent-cache/status
 * Updates cache configuration or performs cache operations
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const correlationId = generateCorrelationId();
  
  try {
    const body = await request.json();
    const { action, ...data } = body;

    logger.info('Processing intelligent cache operation', {
      correlationId,
      action,
      dataKeys: Object.keys(data)
    });

    let result: any = {};

    switch (action) {
      case 'updateConfiguration':
        const configUpdate = data as CacheConfigUpdateRequest;
        intelligentCachingService.updateConfiguration(configUpdate);
        result = {
          action: 'updateConfiguration',
          updatedFields: Object.keys(configUpdate),
          message: 'Cache configuration updated successfully'
        };
        break;

      case 'invalidateCache':
        const invalidationRequest = data as CacheInvalidationRequest;
        
        if (invalidationRequest.clearAll) {
          await intelligentCachingService.clearCache();
          result = {
            action: 'clearAll',
            message: 'Cache cleared successfully'
          };
        } else if (invalidationRequest.competitorId) {
          await intelligentCachingService.invalidateCompetitorData(invalidationRequest.competitorId);
          result = {
            action: 'invalidateCompetitor',
            competitorId: invalidationRequest.competitorId,
            message: 'Competitor cache data invalidated'
          };
        } else if (invalidationRequest.tags && invalidationRequest.tags.length > 0) {
          const invalidatedCount = await intelligentCachingService.invalidateByTags(invalidationRequest.tags);
          result = {
            action: 'invalidateByTags',
            tags: invalidationRequest.tags,
            invalidatedCount,
            message: `Invalidated ${invalidatedCount} cache entries`
          };
        } else if (invalidationRequest.invalidateExpired) {
          const expiredCount = await intelligentCachingService.invalidateExpiredEntries();
          result = {
            action: 'invalidateExpired',
            expiredCount,
            message: `Removed ${expiredCount} expired cache entries`
          };
        } else {
          throw new Error('Invalid invalidation request - specify clearAll, competitorId, tags, or invalidateExpired');
        }
        break;

      case 'getStatistics':
        const statistics = intelligentCachingService.getCacheStatistics();
        result = {
          action: 'getStatistics',
          statistics,
          message: 'Cache statistics retrieved'
        };
        break;

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    logger.info('Intelligent cache operation completed', {
      correlationId,
      action,
      result: result.message
    });

    return NextResponse.json({
      success: true,
      data: result,
      correlationId
    });

  } catch (error) {
    return handleAPIError(error as Error, correlationId, { message: 'Failed to perform cache operation' });
  }
}

/**
 * Generate cache performance recommendations
 */
function generateRecommendations(statistics: any): string[] {
  const recommendations: string[] = [];
  
  if (statistics.hitRate < 0.5) {
    recommendations.push('Consider increasing cache TTL values to improve hit rate');
  }
  
  if (statistics.totalEntries > 800) {
    recommendations.push('Cache is approaching capacity - consider increasing maxCacheSize');
  }
  
  if (statistics.performanceMetrics.averageRetrievalTime > 50) {
    recommendations.push('Consider enabling compression to improve retrieval performance');
  }
  
  if (statistics.evictionCount > 100) {
    recommendations.push('High eviction count - consider optimizing cache key strategies');
  }
  
  if (statistics.performanceMetrics.cacheEfficiency < 0.6) {
    recommendations.push('Low cache efficiency - review caching patterns and TTL settings');
  }
  
  if (recommendations.length === 0) {
    recommendations.push('Cache is performing optimally');
  }
  
  return recommendations;
} 