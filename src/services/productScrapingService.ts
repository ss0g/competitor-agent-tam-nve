import { Product, ProductSnapshot, CreateProductSnapshotInput } from '@/types/product';
import { productRepository, productSnapshotRepository } from '@/lib/repositories';
import { WebsiteScraper, WebsiteSnapshot } from '@/lib/scraper';
import { logger, generateCorrelationId, trackErrorWithCorrelation, trackPerformance } from '@/lib/logger';
import { ReportScheduleFrequency } from '@prisma/client';
import prisma from '@/lib/prisma';

export interface ProductScraper {
  scrapeProduct(productUrl: string): Promise<ProductSnapshot>;
  scrapeProductById(productId: string): Promise<ProductSnapshot>;
  triggerManualProductScraping(projectId: string): Promise<ProductSnapshot[]>;
}

export interface ProductScrapingStatus {
  productCount: number;
  lastScraped?: Date;
  totalSnapshots: number;
}

// Enhanced interfaces for Phase 1.1
export interface ScrapingResult {
  success: boolean;
  snapshot?: ProductSnapshot;
  error?: Error;
  attempts: number;
  duration: number;
}

export interface ScrapedContent {
  html: string;
  text: string;
  title: string;
  metadata: any;
  duration: number;
}

export class ProductScrapingService implements ProductScraper {
  private websiteScraper: WebsiteScraper;
  private readonly MAX_RETRIES = 3;
  private readonly MIN_CONTENT_LENGTH = 100;
  private readonly BASE_RETRY_DELAY = 1000; // 1 second

  constructor() {
    this.websiteScraper = new WebsiteScraper();
  }

  /**
   * Enhanced scraping with retry logic and content validation
   * Phase 1.1 implementation for 90%+ success rate
   */
  public async scrapeProductWebsite(productId: string): Promise<ProductSnapshot> {
    const correlationId = generateCorrelationId();
    const context = { productId, correlationId, operation: 'scrapeProductWebsite' };
    
    try {
      logger.info('Product scraping started', context);
      
      const product = await productRepository.findById(productId);
      
      if (!product) {
        throw new Error(`Product ${productId} not found`);
      }

      // Enhanced scraping with retry logic
      const scrapedData = await this.scrapeWithRetry(product.website, this.MAX_RETRIES, correlationId);
      
      // Validate scraped content
      if (!scrapedData.html || scrapedData.html.length < this.MIN_CONTENT_LENGTH) {
        throw new Error(`Insufficient content scraped from ${product.website}. Got ${scrapedData.html?.length || 0} characters, minimum required: ${this.MIN_CONTENT_LENGTH}`);
      }

      // Create enhanced snapshot with comprehensive metadata
      const productSnapshotData: CreateProductSnapshotInput = {
        productId,
        content: {
          html: scrapedData.html,
          text: scrapedData.text,
          title: scrapedData.title,
          description: '', // Add default description
          url: product.website,
          timestamp: new Date()
        },
        metadata: {
          scrapedAt: new Date().toISOString(),
          correlationId,
          url: product.website,
          contentLength: scrapedData.html.length,
          scrapingDuration: scrapedData.duration,
          textLength: scrapedData.text?.length || 0,
          titleLength: scrapedData.title?.length || 0,
          scrapingMethod: 'enhanced_retry',
          validationPassed: true,
          retryCount: 0, // Will be updated by retry logic
          headers: scrapedData.metadata?.headers || {},
          statusCode: scrapedData.metadata?.statusCode || 200,
          lastModified: scrapedData.metadata?.lastModified,
          scrapingTimestamp: new Date(),
          htmlLength: scrapedData.html.length
        }
      };

      const snapshot = await productSnapshotRepository.create(productSnapshotData);
      
      logger.info('Product scraping completed successfully', {
        ...context,
        snapshotId: snapshot.id,
        contentLength: scrapedData.html.length,
        textLength: scrapedData.text?.length || 0,
        scrapingDuration: scrapedData.duration
      });
      
      return snapshot;
    } catch (error) {
      trackErrorWithCorrelation(
        error as Error,
        'scrapeProductWebsite',
        correlationId,
        {
          ...context,
          service: 'ProductScrapingService',
          method: 'scrapeProductWebsite',
          isRecoverable: false,
          suggestedAction: 'Check product website URL and network connectivity'
        }
      );
      throw error;
    }
  }

  /**
   * Enhanced retry logic with exponential backoff
   * Phase 1.1 core enhancement for reliability
   */
  private async scrapeWithRetry(
    url: string, 
    maxRetries: number, 
    correlationId: string
  ): Promise<ScrapedContent> {
    const startTime = Date.now();
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const attemptContext = { 
        url, 
        attempt, 
        maxRetries, 
        correlationId,
        operation: 'scrapeWithRetry'
      };

      try {
        logger.info(`Scraping attempt ${attempt}/${maxRetries}`, attemptContext);
        
        const attemptStartTime = Date.now();
        const websiteSnapshot: WebsiteSnapshot = await this.websiteScraper.takeSnapshot(url);
        const attemptDuration = Date.now() - attemptStartTime;

        // Validate content immediately after scraping
        if (!websiteSnapshot.html || websiteSnapshot.html.length < this.MIN_CONTENT_LENGTH) {
          throw new Error(`Insufficient content from attempt ${attempt}. Got ${websiteSnapshot.html?.length || 0} characters`);
        }

        // Success - track performance and return
        trackPerformance('product_scraping_attempt_success', attemptDuration, {
          ...attemptContext,
          contentLength: websiteSnapshot.html.length
        });

        logger.info('Scraping attempt succeeded', {
          ...attemptContext,
          contentLength: websiteSnapshot.html.length,
          duration: attemptDuration
        });

        return {
          html: websiteSnapshot.html,
          text: websiteSnapshot.text,
          title: websiteSnapshot.title,
          metadata: websiteSnapshot.metadata,
          duration: Date.now() - startTime
        };

      } catch (error) {
        lastError = error as Error;
        
        trackErrorWithCorrelation(
          lastError,
          'scrapeWithRetry',
          correlationId,
          {
            ...attemptContext,
            service: 'ProductScrapingService',
            method: 'scrapeWithRetry',
            retryAttempt: attempt,
            maxRetries,
            isRecoverable: attempt < maxRetries,
            suggestedAction: attempt < maxRetries ? 'Will retry with exponential backoff' : 'All retries exhausted'
          }
        );

        if (attempt === maxRetries) {
          throw new Error(`All ${maxRetries} scraping attempts failed. Last error: ${lastError.message}`);
        }
        
        // Exponential backoff with jitter
        const delay = Math.pow(2, attempt) * this.BASE_RETRY_DELAY + Math.random() * 1000;
        logger.warn(`Scraping attempt ${attempt} failed, retrying in ${delay}ms`, { 
          ...attemptContext, 
          error: lastError.message, 
          nextRetryDelay: delay 
        });
        
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError;
  }

  /**
   * Scrapes a product website and stores the snapshot
   * Enhanced version with validation and error handling
   */
  public async scrapeProduct(productUrl: string): Promise<ProductSnapshot> {
    const correlationId = generateCorrelationId();
    const context = { productUrl, correlationId, operation: 'scrapeProduct' };
    logger.info('Starting product website scraping', context);

    try {
      // Find the product by URL to get the productId
      const product = await productRepository.findByWebsite(productUrl);
      if (!product) {
        throw new Error(`No product found with website URL: ${productUrl}`);
      }

      // Use the enhanced scraping method
      return await this.scrapeProductWebsite(product.id);
      
    } catch (error) {
      trackErrorWithCorrelation(
        error as Error,
        'scrapeProduct',
        correlationId,
        {
          ...context,
          service: 'ProductScrapingService',
          method: 'scrapeProduct',
          isRecoverable: false
        }
      );
      throw error;
    }
  }

  /**
   * Scrapes a product by its ID
   * Enhanced with correlation tracking
   */
  public async scrapeProductById(productId: string): Promise<ProductSnapshot> {
    const correlationId = generateCorrelationId();
    const context = { productId, correlationId, operation: 'scrapeProductById' };

    try {
      const product = await productRepository.findById(productId);
      if (!product) {
        throw new Error(`Product not found with ID: ${productId}`);
      }

      logger.info('Scraping product by ID', { 
        ...context,
        productName: product.name, 
        productUrl: product.website 
      });

      return await this.scrapeProductWebsite(productId);
      
    } catch (error) {
      trackErrorWithCorrelation(
        error as Error,
        'scrapeProductById',
        correlationId,
        context
      );
      throw error;
    }
  }

  /**
   * Gets the scraping status for products in a project
   */
  public async getProductScrapingStatus(projectId: string): Promise<ProductScrapingStatus> {
    try {
      // Get products for the project via product repository
      const allProducts = await productRepository.list();
      const projectProducts = allProducts.filter(p => p.projectId === projectId);

      // Get snapshot count
      let totalSnapshots = 0;
      let lastScraped: Date | undefined;

      for (const product of projectProducts) {
        const snapshots = await productSnapshotRepository.findByProductId(product.id);
        totalSnapshots += snapshots.length;
        
        if (snapshots.length > 0) {
          const latestSnapshot = snapshots[0]; // Already sorted by createdAt desc
          if (!lastScraped || latestSnapshot.createdAt > lastScraped) {
            lastScraped = latestSnapshot.createdAt;
          }
        }
      }

      return {
        productCount: projectProducts.length,
        lastScraped,
        totalSnapshots
      };
    } catch (error) {
      logger.error('Failed to get product scraping status', error as Error, { projectId });
      return { 
        productCount: 0,
        totalSnapshots: 0
      };
    }
  }

  /**
   * Manually triggers scraping for all products in a project
   */
  public async triggerManualProductScraping(projectId: string): Promise<ProductSnapshot[]> {
    const context = { projectId };
    logger.info('Triggering manual product scraping', context);

    try {
      // Get all products for the project via product repository
      const allProducts = await productRepository.list();
      const projectProducts = allProducts.filter(p => p.projectId === projectId);

      if (projectProducts.length === 0) {
        logger.warn('No products found for project', context);
        return [];
      }

      logger.info('Starting manual scraping for project products', {
        ...context,
        productCount: projectProducts.length
      });

      // Scrape all products
      const snapshots: ProductSnapshot[] = [];
      for (const product of projectProducts) {
        try {
          const snapshot = await this.scrapeProductById(product.id);
          snapshots.push(snapshot);
          logger.info('Product scraped successfully', {
            ...context,
            productId: product.id,
            productName: product.name,
            snapshotId: snapshot.id
          });
        } catch (error) {
          logger.error('Failed to scrape individual product', error as Error, {
            ...context,
            productId: product.id,
            productName: product.name
          });
          // Continue with other products even if one fails
        }
      }

      logger.info('Manual product scraping completed', {
        ...context,
        totalProducts: projectProducts.length,
        successfulSnapshots: snapshots.length,
        failedCount: projectProducts.length - snapshots.length
      });

      return snapshots;
    } catch (error) {
      logger.error('Failed to trigger manual product scraping', error as Error, context);
      throw error;
    }
  }

  /**
   * Cleanup method to close browser and resources
   */
  public async cleanup(): Promise<void> {
    await this.websiteScraper.close();
    logger.info('ProductScrapingService cleanup completed');
  }

  /**
   * Ensures product data is recent (within specified days) or triggers fresh scraping
   */
  public async ensureRecentProductData(
    productId: string, 
    maxAgeInDays: number = 7
  ): Promise<ProductSnapshot> {
    const context = { productId, maxAgeInDays };
    logger.info('Checking product data freshness', context);

    try {
      // Get the latest product snapshot
      const latestSnapshot = await productSnapshotRepository.findByProductId(productId);
      const mostRecentSnapshot = latestSnapshot.length > 0 ? latestSnapshot[0] : null;

      if (mostRecentSnapshot) {
        const ageInMs = Date.now() - mostRecentSnapshot.createdAt.getTime();
        const ageInDays = ageInMs / (24 * 60 * 60 * 1000);

        if (ageInDays <= maxAgeInDays) {
          logger.info('Product data is recent, using existing snapshot', {
            ...context,
            snapshotId: mostRecentSnapshot.id,
            ageInDays: ageInDays.toFixed(2),
            createdAt: mostRecentSnapshot.createdAt
          });
          return mostRecentSnapshot;
        }

        logger.info('Product data is stale, triggering fresh scraping', {
          ...context,
          snapshotId: mostRecentSnapshot.id,
          ageInDays: ageInDays.toFixed(2),
          threshold: maxAgeInDays
        });
      } else {
        logger.info('No existing product data found, triggering initial scraping', context);
      }

      // Data is stale or doesn't exist, trigger fresh scraping
      const freshSnapshot = await this.scrapeProductById(productId);

      logger.info('Fresh product data obtained', {
        ...context,
        snapshotId: freshSnapshot.id,
        contentLength: JSON.stringify(freshSnapshot.content).length
      });

      return freshSnapshot;

    } catch (error) {
      logger.error('Failed to ensure recent product data', error as Error, context);
      
      // If scraping fails but we have old data, return it with a warning
      if (error instanceof Error && error.message.includes('scraping failed')) {
        const latestSnapshot = await productSnapshotRepository.findByProductId(productId);
        if (latestSnapshot.length > 0) {
          logger.warn('Scraping failed, using stale data as fallback', {
            ...context,
            snapshotId: latestSnapshot[0].id,
            fallbackAge: Math.round((Date.now() - latestSnapshot[0].createdAt.getTime()) / (24 * 60 * 60 * 1000))
          });
          return latestSnapshot[0];
        }
      }
      
      throw error;
    }
  }
}

export const productScrapingService = new ProductScrapingService(); 