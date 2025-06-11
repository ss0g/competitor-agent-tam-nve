import { Product, ProductSnapshot, CreateProductSnapshotInput } from '@/types/product';
import { productRepository, productSnapshotRepository } from '@/lib/repositories';
import { WebsiteScraper, WebsiteSnapshot } from '@/lib/scraper';
import { logger } from '@/lib/logger';
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

export class ProductScrapingService implements ProductScraper {
  private websiteScraper: WebsiteScraper;

  constructor() {
    this.websiteScraper = new WebsiteScraper();
  }

  /**
   * Scrapes a product website and stores the snapshot
   */
  public async scrapeProduct(productUrl: string): Promise<ProductSnapshot> {
    const context = { productUrl };
    logger.info('Starting product website scraping', context);

    try {
      // Use the existing website scraper to get the content
      const websiteSnapshot: WebsiteSnapshot = await this.websiteScraper.takeSnapshot(productUrl);

      // Find the product by URL to get the productId
      const product = await productRepository.findByWebsite(productUrl);
      if (!product) {
        throw new Error(`No product found with website URL: ${productUrl}`);
      }

      // Convert website snapshot to product snapshot format
      const productSnapshotData: CreateProductSnapshotInput = {
        productId: product.id,
        content: {
          html: websiteSnapshot.html,
          text: websiteSnapshot.text,
          title: websiteSnapshot.title,
          description: websiteSnapshot.description,
          url: websiteSnapshot.url,
          timestamp: websiteSnapshot.timestamp
        },
        metadata: {
          headers: websiteSnapshot.metadata.headers,
          statusCode: websiteSnapshot.metadata.statusCode,
          contentLength: websiteSnapshot.metadata.contentLength,
          lastModified: websiteSnapshot.metadata.lastModified,
          scrapingTimestamp: new Date(),
          scrapingMethod: 'automated',
          textLength: websiteSnapshot.text.length,
          htmlLength: websiteSnapshot.html.length
        }
      };

      // Store the product snapshot
      const productSnapshot = await productSnapshotRepository.create(productSnapshotData);

      logger.info('Product website scraping completed successfully', {
        ...context,
        productId: product.id,
        productName: product.name,
        snapshotId: productSnapshot.id,
        contentLength: websiteSnapshot.html.length,
        statusCode: websiteSnapshot.metadata.statusCode
      });

      return productSnapshot;
    } catch (error) {
      logger.error('Failed to scrape product website', error as Error, context);
      throw error;
    }
  }

  /**
   * Scrapes a product by its ID
   */
  public async scrapeProductById(productId: string): Promise<ProductSnapshot> {
    const product = await productRepository.findById(productId);
    if (!product) {
      throw new Error(`Product not found with ID: ${productId}`);
    }

    logger.info('Scraping product by ID', { 
      productId, 
      productName: product.name, 
      productUrl: product.website 
    });

    return this.scrapeProduct(product.website);
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