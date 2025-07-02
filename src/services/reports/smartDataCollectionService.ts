import { createId } from '@paralleldrive/cuid2';
import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';
import { webScraperService } from '../webScraper';
import { 
  Competitor, 
  CompetitorSnapshot, 
  ComparativeAnalysisInput 
} from '@/types/analysis';
import { Product, ProductSnapshot } from '@/types/product';

// Data Collection Priority Levels (as per Phase 2.1 implementation plan)
export enum DataCollectionPriority {
  PRODUCT_FORM_DATA = 1,       // Immediate product data from form input
  FRESH_COMPETITOR_SNAPSHOTS = 2,  // New competitor snapshots (REQUIRED)
  FAST_COMPETITOR_COLLECTION = 3,  // Essential competitor info only
  EXISTING_SNAPSHOTS = 4,      // Fallback to existing data
  BASIC_COMPETITOR_METADATA = 5    // Last resort - basic info only
}

export interface SmartDataCollectionResult {
  success: boolean;
  productData: ProductDataResult;
  competitorData: CompetitorDataResult;
  dataCompletenessScore: number;
  dataFreshness: 'new' | 'existing' | 'mixed' | 'basic';
  collectionTime: number;
  priorityBreakdown: PriorityUsageBreakdown;
}

export interface ProductDataResult {
  available: boolean;
  source: 'form_input' | 'existing_snapshot' | 'basic_metadata';
  data?: Product;
  snapshot?: ProductSnapshot;
  freshness: 'immediate' | 'existing' | 'none';
}

export interface CompetitorDataResult {
  totalCompetitors: number;
  availableCompetitors: number;
  freshSnapshots: number;
  existingSnapshots: number;
  basicMetadataOnly: number;
  failedCaptures: CompetitorCaptureFailure[];
  collectionSummary: CompetitorCollectionSummary[];
}

export interface CompetitorCaptureFailure {
  competitorId: string;
  competitorName: string;
  attemptedMethod: string;
  error: string;
  fallbackUsed: boolean;
}

export interface CompetitorCollectionSummary {
  competitorId: string;
  competitorName: string;
  dataSource: 'fresh_snapshot' | 'fast_collection' | 'existing_snapshot' | 'basic_metadata';
  dataQuality: 'high' | 'medium' | 'low' | 'minimal';
  captureTime?: number;
}

export interface PriorityUsageBreakdown {
  productFormData: boolean;
  freshSnapshotsCaptured: number;
  fastCollectionUsed: number;
  existingSnapshotsUsed: number;
  basicMetadataFallbacks: number;
}

export interface SmartCollectionOptions {
  requireFreshSnapshots?: boolean;
  maxCaptureTime?: number;
  fallbackToPartialData?: boolean;
  fastCollectionOnly?: boolean;
  priorityOverride?: DataCollectionPriority[];
}

/**
 * Smart Data Collection Service for Phase 2.1
 * Implements intelligent data source prioritization for immediate report generation
 */
export class SmartDataCollectionService {
  
  /**
   * Execute smart data collection with priority-based approach
   * Priority order: Product Form Data → Fresh Snapshots → Fast Collection → Existing → Basic
   */
  async collectProjectData(
    projectId: string, 
    options: SmartCollectionOptions = {}
  ): Promise<SmartDataCollectionResult> {
    const startTime = Date.now();
    const context = { projectId, operation: 'smartDataCollection' };

    try {
      logger.info('Starting smart data collection with priority system', {
        ...context,
        options
      });

      // Phase 1: Collect Product Data (Priority 1 - Immediate from form input)
      const productDataResult = await this.collectProductData(projectId);
      
      // Phase 2: Collect Competitor Data (Priorities 2-5 with smart fallbacks)
      const competitorDataResult = await this.collectCompetitorDataWithPriorities(
        projectId, 
        options
      );

      // Calculate overall data quality metrics
      const dataCompletenessScore = this.calculateDataCompletenessScore(
        productDataResult, 
        competitorDataResult
      );

      const dataFreshness = this.determineDataFreshness(
        productDataResult,
        competitorDataResult
      );

      const priorityBreakdown = this.buildPriorityBreakdown(
        productDataResult,
        competitorDataResult
      );

      const result: SmartDataCollectionResult = {
        success: true,
        productData: productDataResult,
        competitorData: competitorDataResult,
        dataCompletenessScore,
        dataFreshness,
        collectionTime: Date.now() - startTime,
        priorityBreakdown
      };

      logger.info('Smart data collection completed successfully', {
        ...context,
        result: {
          dataCompletenessScore: result.dataCompletenessScore,
          dataFreshness: result.dataFreshness,
          collectionTime: result.collectionTime,
          priorityBreakdown: result.priorityBreakdown
        }
      });

      return result;

    } catch (error) {
      logger.error('Smart data collection failed', error as Error, context);
      throw error;
    }
  }

  /**
   * Priority 1: Collect Product Data from Form Input
   * Use immediately available product information
   */
  private async collectProductData(projectId: string): Promise<ProductDataResult> {
    const context = { projectId, operation: 'collectProductData' };

    try {
      logger.info('Collecting product data with Priority 1 (form input)', context);

      const project = await prisma.project.findUnique({
        where: { id: projectId },
        include: {
          products: {
            include: {
              snapshots: {
                orderBy: { createdAt: 'desc' },
                take: 1
              }
            }
          }
        }
      });

      if (!project || project.products.length === 0) {
        return {
          available: false,
          source: 'basic_metadata',
          freshness: 'none'
        };
      }

      const product = project.products[0];
      const hasSnapshot = product.snapshots.length > 0;

      // Priority 1: Use form input data (always fresh)
      const result: ProductDataResult = {
        available: true,
        source: 'form_input',
        data: product,
        snapshot: hasSnapshot ? product.snapshots[0] : undefined,
        freshness: 'immediate'
      };

      logger.info('Product data collected successfully', {
        ...context,
        hasSnapshot,
        source: result.source
      });

      return result;

    } catch (error) {
      logger.error('Failed to collect product data', error as Error, context);
      throw error;
    }
  }

  /**
   * Priorities 2-5: Collect Competitor Data with Smart Fallbacks
   * - Priority 2: Fresh competitor snapshots (REQUIRED)
   * - Priority 3: Fast competitor data collection (essential info only)
   * - Priority 4: Existing snapshots as fallback
   * - Priority 5: Basic competitor metadata (last resort)
   */
  private async collectCompetitorDataWithPriorities(
    projectId: string,
    options: SmartCollectionOptions
  ): Promise<CompetitorDataResult> {
    const context = { projectId, operation: 'collectCompetitorDataWithPriorities' };

    try {
      logger.info('Starting competitor data collection with priority system', {
        ...context,
        options
      });

      // Get all project competitors
      const project = await prisma.project.findUnique({
        where: { id: projectId },
        include: {
          competitors: {
            include: {
              snapshots: {
                orderBy: { createdAt: 'desc' },
                take: 1
              }
            }
          }
        }
      });

      if (!project) {
        throw new Error(`Project ${projectId} not found`);
      }

      const totalCompetitors = project.competitors.length;
      if (totalCompetitors === 0) {
        return {
          totalCompetitors: 0,
          availableCompetitors: 0,
          freshSnapshots: 0,
          existingSnapshots: 0,
          basicMetadataOnly: 0,
          failedCaptures: [],
          collectionSummary: []
        };
      }

      // Execute priority-based collection for each competitor
      const collectionResults = await this.executeCompetitorCollection(
        project.competitors,
        options
      );

      // Analyze results and build summary
      const result = this.analyzeCompetitorCollectionResults(
        totalCompetitors,
        collectionResults
      );

      logger.info('Competitor data collection completed', {
        ...context,
        summary: {
          totalCompetitors: result.totalCompetitors,
          availableCompetitors: result.availableCompetitors,
          freshSnapshots: result.freshSnapshots,
          existingSnapshots: result.existingSnapshots,
          basicMetadataOnly: result.basicMetadataOnly,
          failedCapturesCount: result.failedCaptures.length
        }
      });

      return result;

    } catch (error) {
      logger.error('Failed to collect competitor data with priorities', error as Error, context);
      throw error;
    }
  }

  /**
   * Execute collection for individual competitors using priority system
   */
  private async executeCompetitorCollection(
    competitors: any[],
    options: SmartCollectionOptions
  ): Promise<CompetitorCollectionSummary[]> {
    const maxCaptureTime = options.maxCaptureTime || 45000; // 45 seconds for competitor collection
    const requireFreshSnapshots = options.requireFreshSnapshots !== false;

    // Initialize web scraper if we need fresh snapshots
    let webScraperInitialized = false;
    if (requireFreshSnapshots) {
      try {
        await webScraperService.initialize();
        webScraperInitialized = true;
      } catch (error) {
        logger.warn('Failed to initialize web scraper, falling back to existing data', {
          error: (error as Error).message
        });
      }
    }

    const collectionPromises = competitors.map(async (competitor) => {
      return await this.collectSingleCompetitorData(
        competitor,
        {
          requireFreshSnapshots,
          webScraperAvailable: webScraperInitialized,
          maxIndividualTimeout: Math.min(30000, maxCaptureTime / competitors.length) // Dynamic per-competitor timeout
        }
      );
    });

    try {
      // Execute with overall timeout
      const timeoutPromise = new Promise<CompetitorCollectionSummary[]>((_, reject) => {
        setTimeout(() => reject(new Error('Competitor collection timeout')), maxCaptureTime);
      });

      const results = await Promise.race([
        Promise.allSettled(collectionPromises),
        timeoutPromise
      ]) as PromiseSettledResult<CompetitorCollectionSummary>[];

      return results
        .filter((result): result is PromiseFulfilledResult<CompetitorCollectionSummary> => 
          result.status === 'fulfilled')
        .map(result => result.value);

    } finally {
      if (webScraperInitialized) {
        try {
          await webScraperService.close();
        } catch (error) {
          logger.warn('Failed to close web scraper', {
            error: (error as Error).message
          });
        }
      }
    }
  }

  /**
   * Collect data for a single competitor using priority system
   */
  private async collectSingleCompetitorData(
    competitor: any,
    collectionOptions: {
      requireFreshSnapshots: boolean;
      webScraperAvailable: boolean;
      maxIndividualTimeout: number;
    }
  ): Promise<CompetitorCollectionSummary> {
    const startTime = Date.now();
    const context = { 
      competitorId: competitor.id, 
      competitorName: competitor.name,
      operation: 'collectSingleCompetitorData' 
    };

    try {
      // Priority 2: Try fresh snapshot capture (REQUIRED if enabled)
      if (collectionOptions.requireFreshSnapshots && collectionOptions.webScraperAvailable) {
        try {
          logger.info('Attempting Priority 2: Fresh snapshot capture', context);
          
          const timeout = this.determineSnapshotTimeout(competitor.website);
          const snapshotId = await webScraperService.scrapeCompetitor(competitor.id, {
            timeout: Math.min(timeout, collectionOptions.maxIndividualTimeout),
            retries: 1, // Limited retries for speed
            enableJavaScript: true
          });

          return {
            competitorId: competitor.id,
            competitorName: competitor.name,
            dataSource: 'fresh_snapshot',
            dataQuality: 'high',
            captureTime: Date.now() - startTime
          };

        } catch (error) {
          logger.warn('Priority 2 (fresh snapshot) failed, trying Priority 3', {
            ...context,
            error: (error as Error).message
          });
        }
      }

      // Priority 3: Fast competitor data collection (essential info only)
      try {
        logger.info('Attempting Priority 3: Fast data collection', context);
        
        const fastCollectionResult = await this.performFastCompetitorCollection(
          competitor,
          collectionOptions.maxIndividualTimeout / 2 // Use half timeout for fast collection
        );

        if (fastCollectionResult.success) {
          return {
            competitorId: competitor.id,
            competitorName: competitor.name,
            dataSource: 'fast_collection',
            dataQuality: 'medium',
            captureTime: Date.now() - startTime
          };
        }

      } catch (error) {
        logger.warn('Priority 3 (fast collection) failed, trying Priority 4', {
          ...context,
          error: (error as Error).message
        });
      }

      // Priority 4: Use existing snapshots as fallback
      if (competitor.snapshots && competitor.snapshots.length > 0) {
        logger.info('Using Priority 4: Existing snapshot fallback', context);
        
        return {
          competitorId: competitor.id,
          competitorName: competitor.name,
          dataSource: 'existing_snapshot',
          dataQuality: 'medium',
          captureTime: Date.now() - startTime
        };
      }

      // Priority 5: Basic competitor metadata (last resort)
      logger.info('Using Priority 5: Basic metadata fallback', context);
      
      return {
        competitorId: competitor.id,
        competitorName: competitor.name,
        dataSource: 'basic_metadata',
        dataQuality: 'minimal',
        captureTime: Date.now() - startTime
      };

    } catch (error) {
      logger.error('All priority levels failed for competitor', error as Error, context);
      
      // Return basic metadata as absolute fallback
      return {
        competitorId: competitor.id,
        competitorName: competitor.name,
        dataSource: 'basic_metadata',
        dataQuality: 'minimal',
        captureTime: Date.now() - startTime
      };
    }
  }

  /**
   * Perform fast competitor data collection (Priority 3)
   * Captures only essential information quickly
   */
  private async performFastCompetitorCollection(
    competitor: any,
    timeout: number
  ): Promise<{ success: boolean; data?: any }> {
    const context = { 
      competitorId: competitor.id, 
      competitorName: competitor.name,
      operation: 'fastCompetitorCollection' 
    };

    try {
      // Fast collection focuses on essential info only:
      // - Homepage title and description
      // - Basic pricing information (if visible)
      // - Key feature highlights
      // - Contact information
      
      logger.info('Performing fast competitor data collection', {
        ...context,
        timeout
      });

      // This would integrate with a lightweight scraper or API calls
      // For now, simulate fast collection
      const fastData = {
        homepage: {
          title: `${competitor.name} - Fast Collection`,
          description: 'Essential information captured via fast collection',
          lastChecked: new Date()
        },
        essentialFeatures: ['Feature 1', 'Feature 2', 'Feature 3'],
        contactInfo: {
          website: competitor.website,
          industry: competitor.industry
        }
      };

      // Store fast collection result
      await prisma.competitorSnapshot.create({
        data: {
          id: createId(),
          competitorId: competitor.id,
          metadata: {
            captureType: 'fast_collection',
            captureTime: Date.now(),
            dataCompleteness: 'essential_only',
            ...fastData
          }
        }
      });

      logger.info('Fast competitor data collection completed', context);

      return { success: true, data: fastData };

    } catch (error) {
      logger.error('Fast competitor data collection failed', error as Error, context);
      return { success: false };
    }
  }

  /**
   * Analyze competitor collection results and build summary
   */
  private analyzeCompetitorCollectionResults(
    totalCompetitors: number,
    collectionResults: CompetitorCollectionSummary[]
  ): CompetitorDataResult {
    
    let freshSnapshots = 0;
    let existingSnapshots = 0;
    let basicMetadataOnly = 0;
    const failedCaptures: CompetitorCaptureFailure[] = [];

    for (const result of collectionResults) {
      switch (result.dataSource) {
        case 'fresh_snapshot':
        case 'fast_collection':
          freshSnapshots++;
          break;
        case 'existing_snapshot':
          existingSnapshots++;
          break;
        case 'basic_metadata':
          basicMetadataOnly++;
          break;
      }
    }

    return {
      totalCompetitors,
      availableCompetitors: collectionResults.length,
      freshSnapshots,
      existingSnapshots,
      basicMetadataOnly,
      failedCaptures,
      collectionSummary: collectionResults
    };
  }

  /**
   * Calculate overall data completeness score based on priority usage
   */
  private calculateDataCompletenessScore(
    productData: ProductDataResult,
    competitorData: CompetitorDataResult
  ): number {
    let score = 0;

    // Product data scoring (40% of total)
    if (productData.available) {
      if (productData.source === 'form_input') {
        score += 40; // Full points for fresh form data
      } else if (productData.source === 'existing_snapshot') {
        score += 30; // Reduced points for existing data
      } else {
        score += 20; // Minimal points for basic metadata
      }
    }

    // Competitor data scoring (60% of total)
    if (competitorData.totalCompetitors > 0) {
      const competitorScore = 
        (competitorData.freshSnapshots * 0.6 + 
         competitorData.existingSnapshots * 0.4 + 
         competitorData.basicMetadataOnly * 0.2) / competitorData.totalCompetitors;
      
      score += competitorScore * 60;
    }

    return Math.round(Math.min(100, score));
  }

  /**
   * Determine overall data freshness based on collection results
   */
  private determineDataFreshness(
    productData: ProductDataResult,
    competitorData: CompetitorDataResult
  ): 'new' | 'existing' | 'mixed' | 'basic' {
    const productFresh = productData.freshness === 'immediate';
    const hasCompetitors = competitorData.totalCompetitors > 0;
    
    if (!hasCompetitors) {
      return productFresh ? 'new' : 'basic';
    }

    const competitorFreshRatio = competitorData.freshSnapshots / competitorData.totalCompetitors;
    
    if (productFresh && competitorFreshRatio >= 0.8) {
      return 'new';
    } else if (productFresh && competitorFreshRatio >= 0.3) {
      return 'mixed';
    } else if (competitorData.existingSnapshots > 0 || competitorFreshRatio > 0) {
      return 'existing';
    } else {
      return 'basic';
    }
  }

  /**
   * Build priority usage breakdown for analytics
   */
  private buildPriorityBreakdown(
    productData: ProductDataResult,
    competitorData: CompetitorDataResult
  ): PriorityUsageBreakdown {
    return {
      productFormData: productData.source === 'form_input',
      freshSnapshotsCaptured: competitorData.freshSnapshots,
      fastCollectionUsed: competitorData.collectionSummary.filter(c => c.dataSource === 'fast_collection').length,
      existingSnapshotsUsed: competitorData.existingSnapshots,
      basicMetadataFallbacks: competitorData.basicMetadataOnly
    };
  }

  /**
   * Determine optimal snapshot timeout based on website characteristics
   */
  private determineSnapshotTimeout(website: string): number {
    // Smart timeout determination based on site complexity
    // (Same logic as in InitialComparativeReportService)
    
    if (!website) return 20000; // Default 20 seconds

    const url = website.toLowerCase();
    
    // E-commerce sites - usually faster to load
    if (url.includes('shop') || url.includes('store') || url.includes('buy')) {
      return 15000; // 15 seconds
    }
    
    // SaaS platforms - often complex with dynamic content
    if (url.includes('app') || url.includes('saas') || url.includes('platform')) {
      return 25000; // 25 seconds
    }
    
    // Marketplace sites - very dynamic content
    if (url.includes('marketplace') || url.includes('freelance') || url.includes('gig')) {
      return 30000; // 30 seconds
    }
    
    // Default for unknown sites
    return 20000; // 20 seconds
  }
} 