import { ProductScrapingService } from '@/services/productScrapingService';
import { productRepository, productSnapshotRepository } from '@/lib/repositories';
import { Product, ProductSnapshot } from '@/types/product';

// Mock the dependencies
jest.mock('@/lib/repositories');
jest.mock('@/lib/scraper');

const mockProductRepository = productRepository as jest.Mocked<typeof productRepository>;
const mockProductSnapshotRepository = productSnapshotRepository as jest.Mocked<typeof productSnapshotRepository>;

describe('ProductScrapingService - Basic Tests', () => {
  let productScrapingService: ProductScrapingService;
  let mockProduct: Product;
  let mockProductSnapshot: ProductSnapshot;

  beforeEach(() => {
    productScrapingService = new ProductScrapingService();
    
    mockProduct = {
      id: 'prod_123',
      name: 'HelloFresh',
      website: 'https://hellofresh.com',
      positioning: 'Leading meal kit delivery service',
      customerData: '500k+ customers',
      userProblem: 'Time constraints',
      industry: 'Food Technology',
      projectId: 'proj_456',
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01')
    };

    mockProductSnapshot = {
      id: 'snap_789',
      productId: 'prod_123',
      content: {
        html: '<html><body>HelloFresh content</body></html>',
        text: 'HelloFresh content',
        title: 'HelloFresh - Fresh Ingredients',
        description: 'Get fresh ingredients delivered',
        url: 'https://hellofresh.com',
        timestamp: new Date('2024-01-01')
      },
      metadata: {
        headers: { 'content-type': 'text/html' },
        statusCode: 200,
        contentLength: 1000,
        scrapingTimestamp: new Date('2024-01-01'),
        scrapingMethod: 'automated',
        textLength: 100,
        htmlLength: 1000
      },
      createdAt: new Date('2024-01-01')
    };

    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('scrapeProductById', () => {
    it('should throw error when product not found by ID', async () => {
      mockProductRepository.findById.mockResolvedValue(null);

      await expect(
        productScrapingService.scrapeProductById('nonexistent')
      ).rejects.toThrow('Product not found with ID: nonexistent');

      expect(mockProductRepository.findById).toHaveBeenCalledWith('nonexistent');
    });

    it('should find product by ID successfully', async () => {
      mockProductRepository.findById.mockResolvedValue(mockProduct);
      mockProductRepository.findByWebsite.mockResolvedValue(null); // This will cause an error in scrapeProduct

      await expect(
        productScrapingService.scrapeProductById('prod_123')
      ).rejects.toThrow('No product found with website URL: https://hellofresh.com');

      expect(mockProductRepository.findById).toHaveBeenCalledWith('prod_123');
    });
  });

  describe('triggerManualProductScraping', () => {
    it('should handle empty project with no products', async () => {
      mockProductRepository.list.mockResolvedValue([]);

      const result = await productScrapingService.triggerManualProductScraping('proj_empty');

      expect(mockProductRepository.list).toHaveBeenCalled();
      expect(result).toEqual([]);
    });

    it('should filter products by project ID', async () => {
      const products = [
        { ...mockProduct, id: 'prod_1', projectId: 'proj_456' },
        { ...mockProduct, id: 'prod_2', projectId: 'proj_789' }, // Different project
        { ...mockProduct, id: 'prod_3', projectId: 'proj_456' },
      ];

      mockProductRepository.list.mockResolvedValue(products);
      mockProductRepository.findById.mockResolvedValue(null); // Will cause scraping to fail

      const result = await productScrapingService.triggerManualProductScraping('proj_456');

      expect(mockProductRepository.list).toHaveBeenCalled();
      expect(mockProductRepository.findById).toHaveBeenCalledTimes(2); // Only for prod_1 and prod_3
      expect(result).toEqual([]); // All fail due to mock setup
    });
  });

  describe('getProductScrapingStatus', () => {
    it('should return correct status for project with products and snapshots', async () => {
      const products = [
        { ...mockProduct, id: 'prod_1', projectId: 'proj_456' },
        { ...mockProduct, id: 'prod_2', projectId: 'proj_456' },
      ];

      const snapshots1 = [
        { ...mockProductSnapshot, id: 'snap_1', createdAt: new Date('2024-01-01') },
        { ...mockProductSnapshot, id: 'snap_2', createdAt: new Date('2024-01-02') },
      ];

      const snapshots2 = [
        { ...mockProductSnapshot, id: 'snap_3', createdAt: new Date('2024-01-03') },
      ];

      mockProductRepository.list.mockResolvedValue(products);
      mockProductSnapshotRepository.findByProductId
        .mockResolvedValueOnce(snapshots1)
        .mockResolvedValueOnce(snapshots2);

      const result = await productScrapingService.getProductScrapingStatus('proj_456');

      expect(result).toEqual({
        productCount: 2,
        lastScraped: new Date('2024-01-03'),
        totalSnapshots: 3
      });
    });

    it('should return status for project with no snapshots', async () => {
      const products = [{ ...mockProduct, id: 'prod_1', projectId: 'proj_456' }];

      mockProductRepository.list.mockResolvedValue(products);
      mockProductSnapshotRepository.findByProductId.mockResolvedValue([]);

      const result = await productScrapingService.getProductScrapingStatus('proj_456');

      expect(result).toEqual({
        productCount: 1,
        lastScraped: undefined,
        totalSnapshots: 0
      });
    });

    it('should handle errors gracefully', async () => {
      mockProductRepository.list.mockRejectedValue(new Error('Database error'));

      const result = await productScrapingService.getProductScrapingStatus('proj_456');

      expect(result).toEqual({
        productCount: 0,
        totalSnapshots: 0
      });
    });

    it('should filter products by project ID correctly', async () => {
      const products = [
        { ...mockProduct, id: 'prod_1', projectId: 'proj_456' },
        { ...mockProduct, id: 'prod_2', projectId: 'proj_789' }, // Different project
        { ...mockProduct, id: 'prod_3', projectId: 'proj_456' },
      ];

      mockProductRepository.list.mockResolvedValue(products);
      mockProductSnapshotRepository.findByProductId.mockResolvedValue([]);

      const result = await productScrapingService.getProductScrapingStatus('proj_456');

      expect(result.productCount).toBe(2); // Only prod_1 and prod_3
      expect(mockProductSnapshotRepository.findByProductId).toHaveBeenCalledTimes(2);
    });
  });

  describe('error handling', () => {
    it('should handle repository errors in scrapeProduct', async () => {
      mockProductRepository.findByWebsite.mockRejectedValue(new Error('Database error'));

      await expect(
        productScrapingService.scrapeProduct('https://hellofresh.com')
      ).rejects.toThrow('Database error');
    });

    it('should continue with other products when individual scraping fails', async () => {
      const products = [
        { ...mockProduct, id: 'prod_1', projectId: 'proj_456' },
        { ...mockProduct, id: 'prod_2', projectId: 'proj_456' },
      ];

      mockProductRepository.list.mockResolvedValue(products);
      
      // First product fails to find
      mockProductRepository.findById
        .mockResolvedValueOnce(null) // Fails
        .mockResolvedValueOnce(products[1]); // Succeeds but will fail later
      
      mockProductRepository.findByWebsite.mockResolvedValue(null); // Makes scraping fail

      const result = await productScrapingService.triggerManualProductScraping('proj_456');

      expect(result).toEqual([]); // Both fail
      expect(mockProductRepository.findById).toHaveBeenCalledTimes(2);
    });
  });

  describe('service lifecycle', () => {
    it('should clean up resources', async () => {
      // This test verifies the cleanup method exists and can be called
      await expect(productScrapingService.cleanup()).resolves.not.toThrow();
    });
  });
}); 