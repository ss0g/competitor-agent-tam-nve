import { ProductScrapingService } from '@/services/productScrapingService';
import { productRepository, productSnapshotRepository } from '@/lib/repositories';
import { Product, CreateProductInput } from '@/types/product';

// Integration tests that use real scraping (run with longer timeout)
describe('ProductScrapingService - Integration Tests', () => {
  let productScrapingService: ProductScrapingService;
  let testProduct: Product;

  beforeAll(async () => {
    productScrapingService = new ProductScrapingService();
  });

  afterAll(async () => {
    // Cleanup any test products and snapshots
    if (testProduct) {
      try {
        await productRepository.delete(testProduct.id);
      } catch (error) {
        // Ignore cleanup errors
      }
    }
    await productScrapingService.cleanup();
  });

  beforeEach(async () => {
    // Create a test product for integration testing
    const productData: CreateProductInput = {
      name: 'Test Product for Scraping',
      website: 'https://example.com',
      positioning: 'Test product for integration testing',
      customerData: 'Test customers',
      userProblem: 'Test problem',
      industry: 'Testing',
      projectId: 'test-project-123'
    };

    testProduct = await productRepository.create(productData);
  });

  afterEach(async () => {
    // Clean up test product after each test
    if (testProduct) {
      try {
        await productRepository.delete(testProduct.id);
      } catch (error) {
        // Ignore cleanup errors
      }
    }
  });

  describe('Real URL Scraping', () => {
    it('should scrape a real website successfully', async () => {
      // Use a reliable test website
      const result = await productScrapingService.scrapeProduct('https://example.com');

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.productId).toBe(testProduct.id);
      expect(result.content).toBeDefined();
      expect(result.content.html).toBeDefined();
      expect(result.content.text).toBeDefined();
      expect(result.content.title).toBeDefined();
      expect(result.content.url).toBe('https://example.com');
      expect(result.metadata).toBeDefined();
      expect(result.metadata.statusCode).toBe(200);
      expect(result.metadata.scrapingMethod).toBe('automated');
      expect(result.createdAt).toBeInstanceOf(Date);

      // Verify the snapshot was stored in the database
      const storedSnapshots = await productSnapshotRepository.findByProductId(testProduct.id);
      expect(storedSnapshots).toHaveLength(1);
      expect(storedSnapshots[0].id).toBe(result.id);
    }, 30000); // 30 second timeout for real scraping

    it('should handle invalid URL gracefully', async () => {
      // Update test product with invalid URL
      await productRepository.update(testProduct.id, { website: 'not-a-valid-url' });

      await expect(
        productScrapingService.scrapeProduct('not-a-valid-url')
      ).rejects.toThrow();
    }, 10000);

    it('should handle unreachable URL gracefully', async () => {
      // Update test product with unreachable URL
      const unreachableUrl = 'https://nonexistent-domain-for-testing-12345.com';
      await productRepository.update(testProduct.id, { website: unreachableUrl });

      await expect(
        productScrapingService.scrapeProduct(unreachableUrl)
      ).rejects.toThrow();
    }, 10000);

    it('should scrape product by ID with real URL', async () => {
      const result = await productScrapingService.scrapeProductById(testProduct.id);

      expect(result).toBeDefined();
      expect(result.productId).toBe(testProduct.id);
      expect(result.content.url).toBe('https://example.com');
      expect(result.metadata.statusCode).toBe(200);
    }, 30000);
  });

  describe('Project-level Integration', () => {
    it('should scrape multiple products in a project', async () => {
      // Create additional test products
      const product2Data: CreateProductInput = {
        name: 'Test Product 2',
        website: 'https://httpbin.org/html', // Reliable test endpoint
        positioning: 'Second test product',
        customerData: 'Test customers 2',
        userProblem: 'Test problem 2',
        industry: 'Testing',
        projectId: 'test-project-123'
      };

      const testProduct2 = await productRepository.create(product2Data);

      try {
        const results = await productScrapingService.triggerManualProductScraping('test-project-123');

        expect(results).toHaveLength(2);
        expect(results[0].productId).toMatch(/^(prod_|cuid)/); // Should be one of our test products
        expect(results[1].productId).toMatch(/^(prod_|cuid)/); // Should be one of our test products

        // Verify both snapshots were stored
        const snapshots1 = await productSnapshotRepository.findByProductId(testProduct.id);
        const snapshots2 = await productSnapshotRepository.findByProductId(testProduct2.id);
        expect(snapshots1.length).toBeGreaterThan(0);
        expect(snapshots2.length).toBeGreaterThan(0);

        // Cleanup second product
        await productRepository.delete(testProduct2.id);
      } catch (error) {
        // Cleanup on error
        try {
          await productRepository.delete(testProduct2.id);
        } catch (cleanupError) {
          // Ignore cleanup errors
        }
        throw error;
      }
    }, 60000); // 60 second timeout for multiple scrapes

    it('should get accurate scraping status for project', async () => {
      // First, scrape the product to create a snapshot
      await productScrapingService.scrapeProductById(testProduct.id);

      const status = await productScrapingService.getProductScrapingStatus('test-project-123');

      expect(status.productCount).toBe(1);
      expect(status.totalSnapshots).toBe(1);
      expect(status.lastScraped).toBeInstanceOf(Date);
      expect(status.lastScraped!.getTime()).toBeLessThanOrEqual(Date.now());
      expect(status.lastScraped!.getTime()).toBeGreaterThan(Date.now() - 60000); // Within last minute
    }, 30000);
  });

  describe('Error Recovery', () => {
    it('should continue scraping when one product fails', async () => {
      // Create one product with valid URL and one with invalid URL
      const validProductData: CreateProductInput = {
        name: 'Valid Product',
        website: 'https://example.com',
        positioning: 'Valid product',
        customerData: 'Valid customers',
        userProblem: 'Valid problem',
        industry: 'Testing',
        projectId: 'test-project-123'
      };

      const invalidProductData: CreateProductInput = {
        name: 'Invalid Product',
        website: 'invalid-url',
        positioning: 'Invalid product',
        customerData: 'Invalid customers',
        userProblem: 'Invalid problem',
        industry: 'Testing',
        projectId: 'test-project-123'
      };

      const validProduct = await productRepository.create(validProductData);
      const invalidProduct = await productRepository.create(invalidProductData);

      try {
        const results = await productScrapingService.triggerManualProductScraping('test-project-123');

        // Should have at least one successful result (from the valid product and testProduct)
        expect(results.length).toBeGreaterThan(0);
        expect(results.length).toBeLessThanOrEqual(2); // May fail for invalid product

        // At least one should succeed
        const successfulSnapshots = results.filter(r => r.metadata.statusCode === 200);
        expect(successfulSnapshots.length).toBeGreaterThan(0);

        // Cleanup
        await productRepository.delete(validProduct.id);
        await productRepository.delete(invalidProduct.id);
      } catch (error) {
        // Cleanup on error
        try {
          await productRepository.delete(validProduct.id);
          await productRepository.delete(invalidProduct.id);
        } catch (cleanupError) {
          // Ignore cleanup errors
        }
        throw error;
      }
    }, 45000);
  });

  describe('Content Validation', () => {
    it('should extract meaningful content from scraped pages', async () => {
      const result = await productScrapingService.scrapeProduct('https://example.com');

      // Validate content structure
      expect(result.content.html).toContain('<html');
      expect(result.content.html).toContain('</html>');
      expect(result.content.text.length).toBeGreaterThan(0);
      expect(result.content.title.length).toBeGreaterThan(0);

      // Validate metadata
      expect(result.metadata.htmlLength).toBe(result.content.html.length);
      expect(result.metadata.textLength).toBe(result.content.text.length);
      expect(result.metadata.scrapingTimestamp).toBeInstanceOf(Date);
      expect(result.metadata.headers).toBeDefined();
      expect(result.metadata.headers['content-type']).toBeDefined();
    }, 30000);
  });
}); 