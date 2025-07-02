/**
 * Phase 4.3: Intelligent Caching Service
 * Advanced caching strategy for competitor data, analysis patterns, and snapshot metadata
 */

import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';
import { createHash } from 'crypto';

// Cache configuration and types
export interface CacheConfiguration {
  // Competitor data caching
  competitorBasicDataTtl: number; // 7 days default
  competitorSnapshotMetadataTtl: number; // 24 hours default
  
  // Analysis pattern caching
  analysisPatternsTtl: number; // 6 hours default
  commonInsightsTtl: number; // 12 hours default
  
  // Performance settings
  maxCacheSize: number; // 1000 entries default
  compressionEnabled: boolean; // true default
  backgroundRefreshEnabled: boolean; // true default
  
  // Invalidation settings
  autoInvalidationEnabled: boolean; // true default
  maxDataAge: number; // 30 days default
}

export interface CompetitorBasicData {
  id: string;
  name: string;
  website: string;
  industry?: string;
  description?: string;
  lastUpdated: Date;
  dataFreshness: 'fresh' | 'stale' | 'expired';
  priority: 'high' | 'normal' | 'low';
}

export interface SnapshotMetadata {
  competitorId: string;
  snapshotId: string;
  capturedAt: Date;
  isSuccessful: boolean;
  dataSize: number;
  contentHash: string;
  captureMethod: 'full' | 'partial' | 'basic';
  websiteComplexity: 'basic' | 'ecommerce' | 'saas' | 'marketplace';
  captureTime: number; // milliseconds
  error?: string;
}

export interface AnalysisPattern {
  patternId: string;
  industry: string;
  analysisType: 'competitive' | 'market' | 'pricing' | 'features';
  competitorDomains: string[];
  insights: any;
  confidence: number;
  generatedAt: Date;
  usageCount: number;
  lastUsed: Date;
}

export interface CacheEntry<T> {
  key: string;
  data: T;
  createdAt: Date;
  lastAccessed: Date;
  ttl: number;
  hitCount: number;
  compressed: boolean;
  tags: string[];
}

export interface CacheStatistics {
  totalEntries: number;
  totalSize: number; // bytes
  hitRate: number;
  missRate: number;
  evictionCount: number;
  compressionRatio: number;
  backgroundRefreshCount: number;
  invalidationCount: number;
  topPatterns: string[];
  performanceMetrics: {
    averageRetrievalTime: number;
    averageStorageTime: number;
    cacheEfficiency: number;
  };
}

/**
 * IntelligentCachingService - Phase 4.3 Implementation
 * Provides sophisticated caching for competitor data, analysis patterns, and snapshot metadata
 */
export class IntelligentCachingService {
  private static instance: IntelligentCachingService;
  private config: CacheConfiguration;
  private cache: Map<string, CacheEntry<any>>;
  private statistics: CacheStatistics;
  private backgroundRefreshInterval: NodeJS.Timeout | null;

  private constructor() {
    this.config = {
      competitorBasicDataTtl: 7 * 24 * 60 * 60 * 1000, // 7 days
      competitorSnapshotMetadataTtl: 24 * 60 * 60 * 1000, // 24 hours
      analysisPatternsTtl: 6 * 60 * 60 * 1000, // 6 hours
      commonInsightsTtl: 12 * 60 * 60 * 1000, // 12 hours
      maxCacheSize: 1000,
      compressionEnabled: true,
      backgroundRefreshEnabled: true,
      autoInvalidationEnabled: true,
      maxDataAge: 30 * 24 * 60 * 60 * 1000 // 30 days
    };

    this.cache = new Map();
    this.statistics = {
      totalEntries: 0,
      totalSize: 0,
      hitRate: 0,
      missRate: 0,
      evictionCount: 0,
      compressionRatio: 0,
      backgroundRefreshCount: 0,
      invalidationCount: 0,
      topPatterns: [],
      performanceMetrics: {
        averageRetrievalTime: 0,
        averageStorageTime: 0,
        cacheEfficiency: 0
      }
    };

    this.backgroundRefreshInterval = null;
    this.initializeBackgroundTasks();
  }

  public static getInstance(): IntelligentCachingService {
    if (!IntelligentCachingService.instance) {
      IntelligentCachingService.instance = new IntelligentCachingService();
    }
    return IntelligentCachingService.instance;
  }

  /**
   * Competitor Basic Data Caching
   */
  public async cacheCompetitorBasicData(
    competitorId: string, 
    data: CompetitorBasicData
  ): Promise<void> {
    const startTime = Date.now();
    
    try {
      const key = `competitor:basic:${competitorId}`;
      const tags = ['competitor', 'basic', data.industry || 'unknown'];
      
      await this.setCache(key, data, this.config.competitorBasicDataTtl, tags);
      
      logger.info('Cached competitor basic data', {
        competitorId,
        dataFreshness: data.dataFreshness,
        storageTime: Date.now() - startTime
      });

    } catch (error) {
      logger.error('Failed to cache competitor basic data', error as Error, {
        competitorId
      });
      throw error;
    }
  }

  public async getCompetitorBasicData(competitorId: string): Promise<CompetitorBasicData | null> {
    const startTime = Date.now();
    
    try {
      const key = `competitor:basic:${competitorId}`;
      const cachedData = await this.getCache<CompetitorBasicData>(key);
      
      if (cachedData) {
        logger.debug('Retrieved competitor basic data from cache', {
          competitorId,
          dataAge: Date.now() - cachedData.lastUpdated.getTime(),
          retrievalTime: Date.now() - startTime
        });
        
        return cachedData;
      }

      // Cache miss - try to load from database
      const competitor = await prisma.competitor.findUnique({
        where: { id: competitorId },
        select: {
          id: true,
          name: true,
          website: true,
          industry: true,
          description: true,
          updatedAt: true
        }
      });

      if (competitor) {
        const basicData: CompetitorBasicData = {
          id: competitor.id,
          name: competitor.name,
          website: competitor.website,
          industry: competitor.industry || undefined,
          description: competitor.description || undefined,
          lastUpdated: competitor.updatedAt,
          dataFreshness: this.determineFreshness(competitor.updatedAt),
          priority: 'normal'
        };

        await this.cacheCompetitorBasicData(competitorId, basicData);
        return basicData;
      }

      return null;

    } catch (error) {
      logger.error('Failed to get competitor basic data', error as Error, {
        competitorId
      });
      return null;
    }
  }

  /**
   * Snapshot Metadata Caching
   */
  public async cacheSnapshotMetadata(
    competitorId: string, 
    metadata: SnapshotMetadata
  ): Promise<void> {
    const startTime = Date.now();
    
    try {
      const key = `snapshot:meta:${competitorId}:${metadata.snapshotId}`;
      const tags = ['snapshot', 'metadata', metadata.websiteComplexity];
      
      await this.setCache(key, metadata, this.config.competitorSnapshotMetadataTtl, tags);
      
      // Also cache the latest snapshot reference for quick lookup
      const latestKey = `snapshot:latest:${competitorId}`;
      await this.setCache(latestKey, {
        snapshotId: metadata.snapshotId,
        capturedAt: metadata.capturedAt,
        isSuccessful: metadata.isSuccessful,
        competitorId
      }, this.config.competitorSnapshotMetadataTtl, ['snapshot', 'latest']);
      
      logger.info('Cached snapshot metadata', {
        competitorId,
        snapshotId: metadata.snapshotId,
        isSuccessful: metadata.isSuccessful,
        captureTime: metadata.captureTime,
        storageTime: Date.now() - startTime
      });

    } catch (error) {
      logger.error('Failed to cache snapshot metadata', error as Error, {
        competitorId,
        snapshotId: metadata.snapshotId
      });
      throw error;
    }
  }

  public async getLatestSnapshotMetadata(competitorId: string): Promise<SnapshotMetadata | null> {
    const startTime = Date.now();
    
    try {
      const latestKey = `snapshot:latest:${competitorId}`;
      const latestRef = await this.getCache<{
        snapshotId: string;
        capturedAt: Date;
        isSuccessful: boolean;
        competitorId: string;
      }>(latestKey);

      if (latestRef) {
        const metadataKey = `snapshot:meta:${competitorId}:${latestRef.snapshotId}`;
        const metadata = await this.getCache<SnapshotMetadata>(metadataKey);
        
        if (metadata) {
          logger.debug('Retrieved latest snapshot metadata from cache', {
            competitorId,
            snapshotId: latestRef.snapshotId,
            dataAge: Date.now() - latestRef.capturedAt.getTime(),
            retrievalTime: Date.now() - startTime
          });
          
          return metadata;
        }
      }

      return null;

    } catch (error) {
      logger.error('Failed to get latest snapshot metadata', error as Error, {
        competitorId
      });
      return null;
    }
  }

  /**
   * Analysis Pattern Caching
   */
  public async cacheAnalysisPattern(pattern: AnalysisPattern): Promise<void> {
    const startTime = Date.now();
    
    try {
      const key = `analysis:pattern:${pattern.patternId}`;
      const tags = ['analysis', pattern.analysisType, pattern.industry];
      
      await this.setCache(key, pattern, this.config.analysisPatternsTtl, tags);
      
      // Cache by industry + analysis type for quick lookup
      const industryKey = `analysis:industry:${pattern.industry}:${pattern.analysisType}`;
      const industryPatterns = await this.getCache<string[]>(industryKey) || [];
      if (!industryPatterns.includes(pattern.patternId)) {
        industryPatterns.push(pattern.patternId);
        await this.setCache(industryKey, industryPatterns, this.config.analysisPatternsTtl, tags);
      }
      
      logger.info('Cached analysis pattern', {
        patternId: pattern.patternId,
        industry: pattern.industry,
        analysisType: pattern.analysisType,
        confidence: pattern.confidence,
        storageTime: Date.now() - startTime
      });

    } catch (error) {
      logger.error('Failed to cache analysis pattern', error as Error, {
        patternId: pattern.patternId
      });
      throw error;
    }
  }

  public async getAnalysisPatterns(
    industry: string, 
    analysisType: string
  ): Promise<AnalysisPattern[]> {
    const startTime = Date.now();
    
    try {
      const industryKey = `analysis:industry:${industry}:${analysisType}`;
      const patternIds = await this.getCache<string[]>(industryKey);
      
      if (patternIds && patternIds.length > 0) {
        const patterns: AnalysisPattern[] = [];
        
        for (const patternId of patternIds) {
          const patternKey = `analysis:pattern:${patternId}`;
          const pattern = await this.getCache<AnalysisPattern>(patternKey);
          if (pattern) {
            patterns.push(pattern);
          }
        }
        
        if (patterns.length > 0) {
          logger.debug('Retrieved analysis patterns from cache', {
            industry,
            analysisType,
            patternCount: patterns.length,
            retrievalTime: Date.now() - startTime
          });
          
          return patterns;
        }
      }

      return [];

    } catch (error) {
      logger.error('Failed to get analysis patterns', error as Error, {
        industry,
        analysisType
      });
      return [];
    }
  }

  /**
   * Common Insights Caching
   */
  public async cacheCommonInsights(
    competitorDomains: string[],
    insights: any
  ): Promise<void> {
    const startTime = Date.now();
    
    try {
      const domainsHash = this.generateDomainHash(competitorDomains);
      const key = `insights:common:${domainsHash}`;
      const tags = ['insights', 'common'];
      
      const insightData = {
        competitorDomains,
        insights,
        generatedAt: new Date(),
        domainHash: domainsHash
      };
      
      await this.setCache(key, insightData, this.config.commonInsightsTtl, tags);
      
      logger.info('Cached common insights', {
        domainCount: competitorDomains.length,
        domainsHash,
        storageTime: Date.now() - startTime
      });

    } catch (error) {
      logger.error('Failed to cache common insights', error as Error, {
        competitorDomains
      });
      throw error;
    }
  }

  public async getCommonInsights(competitorDomains: string[]): Promise<any | null> {
    const startTime = Date.now();
    
    try {
      const domainsHash = this.generateDomainHash(competitorDomains);
      const key = `insights:common:${domainsHash}`;
      
      const cachedData = await this.getCache<{
        competitorDomains: string[];
        insights: any;
        generatedAt: Date;
        domainHash: string;
      }>(key);
      
      if (cachedData) {
        logger.debug('Retrieved common insights from cache', {
          domainCount: competitorDomains.length,
          domainsHash,
          dataAge: Date.now() - cachedData.generatedAt.getTime(),
          retrievalTime: Date.now() - startTime
        });
        
        return cachedData.insights;
      }

      return null;

    } catch (error) {
      logger.error('Failed to get common insights', error as Error, {
        competitorDomains
      });
      return null;
    }
  }

  /**
   * Cache Management and Operations
   */
  private async setCache<T>(
    key: string, 
    data: T, 
    ttl: number, 
    tags: string[] = []
  ): Promise<void> {
    const startTime = Date.now();
    
    try {
      // Check if cache is at capacity
      if (this.cache.size >= this.config.maxCacheSize) {
        await this.evictLeastUsed();
      }

      // Compress data if enabled
      let processedData = data;
      let compressed = false;
      
      if (this.config.compressionEnabled && this.shouldCompress(data)) {
        processedData = this.compressData(data);
        compressed = true;
      }

      const entry: CacheEntry<T> = {
        key,
        data: processedData,
        createdAt: new Date(),
        lastAccessed: new Date(),
        ttl,
        hitCount: 0,
        compressed,
        tags
      };

      this.cache.set(key, entry);
      this.updateStatistics('set', Date.now() - startTime);

    } catch (error) {
      logger.error('Failed to set cache entry', error as Error, { key });
      throw error;
    }
  }

  private async getCache<T>(key: string): Promise<T | null> {
    const startTime = Date.now();
    
    try {
      const entry = this.cache.get(key) as CacheEntry<T> | undefined;
      
      if (!entry) {
        this.updateStatistics('miss', Date.now() - startTime);
        return null;
      }

      // Check if entry has expired
      const now = Date.now();
      if (now - entry.createdAt.getTime() > entry.ttl) {
        this.cache.delete(key);
        this.updateStatistics('miss', Date.now() - startTime);
        this.statistics.invalidationCount++;
        return null;
      }

      // Update access statistics
      entry.lastAccessed = new Date();
      entry.hitCount++;

      // Decompress data if needed
      let data = entry.data;
      if (entry.compressed) {
        data = this.decompressData(entry.data);
      }

      this.updateStatistics('hit', Date.now() - startTime);
      return data;

    } catch (error) {
      logger.error('Failed to get cache entry', error as Error, { key });
      this.updateStatistics('miss', Date.now() - startTime);
      return null;
    }
  }

  /**
   * Smart Cache Invalidation
   */
  public async invalidateByTags(tags: string[]): Promise<number> {
    let invalidatedCount = 0;
    
    try {
      for (const [key, entry] of Array.from(this.cache.entries())) {
        if (tags.some(tag => entry.tags.includes(tag))) {
          this.cache.delete(key);
          invalidatedCount++;
        }
      }
      
      this.statistics.invalidationCount += invalidatedCount;
      
      logger.info('Invalidated cache entries by tags', {
        tags,
        invalidatedCount
      });

    } catch (error) {
      logger.error('Failed to invalidate cache by tags', error as Error, { tags });
    }
    
    return invalidatedCount;
  }

  public async invalidateCompetitorData(competitorId: string): Promise<void> {
    try {
      const patterns = [
        `competitor:basic:${competitorId}`,
        `snapshot:meta:${competitorId}:*`,
        `snapshot:latest:${competitorId}`
      ];
      
      let invalidatedCount = 0;
      for (const [key] of Array.from(this.cache.entries())) {
        for (const pattern of patterns) {
          if (this.matchesPattern(key, pattern)) {
            this.cache.delete(key);
            invalidatedCount++;
            break;
          }
        }
      }
      
      this.statistics.invalidationCount += invalidatedCount;
      
      logger.info('Invalidated competitor cache entries', {
        competitorId,
        invalidatedCount
      });

    } catch (error) {
      logger.error('Failed to invalidate competitor data', error as Error, {
        competitorId
      });
    }
  }

  public async invalidateExpiredEntries(): Promise<number> {
    let invalidatedCount = 0;
    const now = Date.now();
    
    try {
      for (const [key, entry] of Array.from(this.cache.entries())) {
        if (now - entry.createdAt.getTime() > entry.ttl) {
          this.cache.delete(key);
          invalidatedCount++;
        }
      }
      
      this.statistics.invalidationCount += invalidatedCount;
      
      if (invalidatedCount > 0) {
        logger.info('Invalidated expired cache entries', { invalidatedCount });
      }

    } catch (error) {
      logger.error('Failed to invalidate expired entries', error as Error);
    }
    
    return invalidatedCount;
  }

  /**
   * Background Tasks
   */
  private initializeBackgroundTasks(): void {
    if (this.config.backgroundRefreshEnabled) {
      // Run background maintenance every 5 minutes
      this.backgroundRefreshInterval = setInterval(async () => {
        try {
          await this.runBackgroundMaintenance();
        } catch (error) {
          logger.error('Background maintenance failed', error as Error);
        }
      }, 5 * 60 * 1000); // 5 minutes
    }
  }

  private async runBackgroundMaintenance(): Promise<void> {
    try {
      // Clean up expired entries
      const expiredCount = await this.invalidateExpiredEntries();
      
      // Update cache statistics
      this.updateCacheStatistics();
      
      // Log maintenance results
      if (expiredCount > 0) {
        logger.debug('Background maintenance completed', {
          expiredEntriesRemoved: expiredCount,
          totalEntries: this.cache.size,
          hitRate: this.statistics.hitRate
        });
      }
      
      this.statistics.backgroundRefreshCount++;

    } catch (error) {
      logger.error('Background maintenance error', error as Error);
    }
  }

  /**
   * Utility Methods
   */
  private determineFreshness(lastUpdated: Date): 'fresh' | 'stale' | 'expired' {
    const now = Date.now();
    const age = now - lastUpdated.getTime();
    
    if (age < 24 * 60 * 60 * 1000) { // 24 hours
      return 'fresh';
    } else if (age < 7 * 24 * 60 * 60 * 1000) { // 7 days
      return 'stale';
    } else {
      return 'expired';
    }
  }

  private generateDomainHash(domains: string[]): string {
    const sortedDomains = domains.sort();
    return createHash('sha256')
      .update(sortedDomains.join(','))
      .digest('hex')
      .substring(0, 16);
  }

  private shouldCompress(data: any): boolean {
    // Compress if data size is larger than 1KB
    const dataString = JSON.stringify(data);
    return dataString.length > 1024;
  }

  private compressData(data: any): any {
    // Simple compression simulation - in production use actual compression
    return { compressed: true, data: JSON.stringify(data) };
  }

  private decompressData(data: any): any {
    // Simple decompression simulation
    if (data.compressed) {
      return JSON.parse(data.data);
    }
    return data;
  }

  private matchesPattern(key: string, pattern: string): boolean {
    if (pattern.endsWith('*')) {
      return key.startsWith(pattern.slice(0, -1));
    }
    return key === pattern;
  }

  private async evictLeastUsed(): Promise<void> {
    let leastUsedKey = '';
    let leastUsedEntry: CacheEntry<any> | null = null;
    
    for (const [key, entry] of Array.from(this.cache.entries())) {
      if (!leastUsedEntry || entry.hitCount < leastUsedEntry.hitCount) {
        leastUsedKey = key;
        leastUsedEntry = entry;
      }
    }
    
    if (leastUsedKey) {
      this.cache.delete(leastUsedKey);
      this.statistics.evictionCount++;
    }
  }

  private updateStatistics(operation: 'hit' | 'miss' | 'set', operationTime: number): void {
    if (operation === 'hit') {
      this.statistics.hitRate = (this.statistics.hitRate + 1) / 2; // Simple moving average
    } else if (operation === 'miss') {
      this.statistics.missRate = (this.statistics.missRate + 1) / 2;
    }
    
    if (operation === 'hit' || operation === 'miss') {
      this.statistics.performanceMetrics.averageRetrievalTime = 
        (this.statistics.performanceMetrics.averageRetrievalTime + operationTime) / 2;
    } else if (operation === 'set') {
      this.statistics.performanceMetrics.averageStorageTime = 
        (this.statistics.performanceMetrics.averageStorageTime + operationTime) / 2;
    }
  }

  private updateCacheStatistics(): void {
    this.statistics.totalEntries = this.cache.size;
    this.statistics.totalSize = this.calculateTotalSize();
    this.statistics.performanceMetrics.cacheEfficiency = 
      this.statistics.hitRate / (this.statistics.hitRate + this.statistics.missRate) || 0;
  }

  private calculateTotalSize(): number {
    let totalSize = 0;
    for (const entry of Array.from(this.cache.values())) {
      totalSize += JSON.stringify(entry).length;
    }
    return totalSize;
  }

  /**
   * Public API Methods
   */
  public getCacheStatistics(): CacheStatistics {
    this.updateCacheStatistics();
    return { ...this.statistics };
  }

  public updateConfiguration(newConfig: Partial<CacheConfiguration>): void {
    this.config = { ...this.config, ...newConfig };
    logger.info('Cache configuration updated', { newConfig });
  }

  public async clearCache(): Promise<void> {
    this.cache.clear();
    this.statistics.invalidationCount += this.statistics.totalEntries;
    this.updateCacheStatistics();
    logger.info('Cache cleared');
  }

  public async cleanup(): Promise<void> {
    if (this.backgroundRefreshInterval) {
      clearInterval(this.backgroundRefreshInterval);
      this.backgroundRefreshInterval = null;
    }
    
    this.cache.clear();
    logger.info('Intelligent caching service cleaned up');
  }
}

// Export singleton instance
export const intelligentCachingService = IntelligentCachingService.getInstance();
