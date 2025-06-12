import { ProductScrapingService } from '@/services/productScrapingService';
import { productRepository, productSnapshotRepository } from '@/lib/repositories';
import { WebsiteScraper } from '@/lib/scraper';
import { Product, ProductSnapshot } from '@/types/product';

// Mock the dependencies
jest.mock('@/lib/repositories', () => ({
  productRepository: {
    findByWebsite: jest.fn(),
    findById: jest.fn(),
    list: jest.fn(),
  },
  productSnapshotRepository: {
    create: jest.fn(),
    findByProductId: jest.fn(),
  },
}));

// Mock the scraper functions
jest.mock('@/lib/scraper', () => ({
  WebsiteScraper: jest.fn().mockImplementation(() => ({
    takeSnapshot: jest.fn(),
    close: jest.fn(),
  })),
}));

const mockTakeSnapshot = jest.fn();
const mockClose = jest.fn();

const mockWebsiteScraper = WebsiteScraper as jest.MockedClass<typeof WebsiteScraper>;

const mockProductRepository = productRepository as jest.Mocked<typeof productRepository>;
const mockProductSnapshotRepository = productSnapshotRepository as jest.Mocked<typeof productSnapshotRepository>;

describe('ProductScrapingService', () => {
  let productScrapingService: ProductScrapingService;
  let mockProduct: Product;
  let mockProductSnapshot: ProductSnapshot;
  let mockWebsiteSnapshot: any;

      beforeEach(() => {
    // Set up mock implementations before creating the service
    (WebsiteScraper as jest.MockedClass<typeof WebsiteScraper>).mockImplementation(() => ({
      takeSnapshot: mockTakeSnapshot,
      close: mockClose,
    } as any));
    
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
      createdAt: new Date(),
      updatedAt: new Date()
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
        timestamp: new Date()
      },
      metadata: {
        headers: { 'content-type': 'text/html' },
        statusCode: 200,
        contentLength: 1000,
        scrapingTimestamp: new Date(),
        scrapingMethod: 'automated',
        textLength: 100,
        htmlLength: 1000
      },
      createdAt: new Date()
    };

    mockWebsiteSnapshot = {
      url: 'https://hellofresh.com',
      title: 'HelloFresh - Fresh Ingredients',
      description: 'Get fresh ingredients delivered',
      html: '<html><body>HelloFresh content</body></html>',
      text: 'HelloFresh content',
      timestamp: new Date(),
      metadata: {
        headers: { 'content-type': 'text/html' },
        statusCode: 200,
        contentLength: 1000,
        lastModified: 'Mon, 01 Jan 2024 00:00:00 GMT'
      }
    };

    // Reset all mocks
    jest.clearAllMocks();
    mockTakeSnapshot.mockClear();
    mockClose.mockClear();
  });

  describe('scrapeProduct', () => {
    it('should successfully scrape a product website and store snapshot', async () => {
      // Setup mocks
      mockProductRepository.findByWebsite.mockResolvedValue(mockProduct);
      mockTakeSnapshot.mockResolvedValue(mockWebsiteSnapshot);
      mockProductSnapshotRepository.create.mockResolvedValue(mockProductSnapshot);

      // Execute
      const result = await productScrapingService.scrapeProduct('https://hellofresh.com');

      // Verify
      expect(mockProductRepository.findByWebsite).toHaveBeenCalledWith('https://hellofresh.com');
      expect(mockTakeSnapshot).toHaveBeenCalledWith('https://hellofresh.com');
      expect(mockProductSnapshotRepository.create).toHaveBeenCalledWith({
        productId: 'prod_123',
        content: {
          html: mockWebsiteSnapshot.html,
          text: mockWebsiteSnapshot.text,
          title: mockWebsiteSnapshot.title,
          description: mockWebsiteSnapshot.description,
          url: mockWebsiteSnapshot.url,
          timestamp: mockWebsiteSnapshot.timestamp
        },
        metadata: {
          headers: mockWebsiteSnapshot.metadata.headers,
          statusCode: mockWebsiteSnapshot.metadata.statusCode,
          contentLength: mockWebsiteSnapshot.metadata.contentLength,
          lastModified: mockWebsiteSnapshot.metadata.lastModified,
          scrapingTimestamp: expect.any(Date),
          scrapingMethod: 'automated',
          textLength: mockWebsiteSnapshot.text.length,
          htmlLength: mockWebsiteSnapshot.html.length
        }
      });
      expect(result).toEqual(mockProductSnapshot);
    });

    it('should throw error when product not found for URL', async () => {
      mockProductRepository.findByWebsite.mockResolvedValue(null);

      await expect(
        productScrapingService.scrapeProduct('https://nonexistent.com')
      ).rejects.toThrow('No product found with website URL: https://nonexistent.com');

      expect(mockProductRepository.findByWebsite).toHaveBeenCalledWith('https://nonexistent.com');
      expect(mockTakeSnapshot).not.toHaveBeenCalled();
      expect(mockProductSnapshotRepository.create).not.toHaveBeenCalled();
    });

    it('should propagate website scraper errors', async () => {
      const scrapingError = new Error('Failed to load page');
      mockProductRepository.findByWebsite.mockResolvedValue(mockProduct);
      mockTakeSnapshot.mockRejectedValue(scrapingError);

      await expect(
        productScrapingService.scrapeProduct('https://hellofresh.com')
      ).rejects.toThrow('Failed to load page');

      expect(mockProductRepository.findByWebsite).toHaveBeenCalledWith('https://hellofresh.com');
      expect(mockTakeSnapshot).toHaveBeenCalledWith('https://hellofresh.com');
      expect(mockProductSnapshotRepository.create).not.toHaveBeenCalled();
    });

    it('should propagate snapshot storage errors', async () => {
      const storageError = new Error('Database connection failed');
      mockProductRepository.findByWebsite.mockResolvedValue(mockProduct);
      mockTakeSnapshot.mockResolvedValue(mockWebsiteSnapshot);
      mockProductSnapshotRepository.create.mockRejectedValue(storageError);

      await expect(
        productScrapingService.scrapeProduct('https://hellofresh.com')
      ).rejects.toThrow('Database connection failed');

      expect(mockProductSnapshotRepository.create).toHaveBeenCalled();
    });
  });

  describe('scrapeProductById', () => {
    it('should successfully scrape product by ID', async () => {
      mockProductRepository.findById.mockResolvedValue(mockProduct);
      mockProductRepository.findByWebsite.mockResolvedValue(mockProduct);
      mockTakeSnapshot.mockResolvedValue(mockWebsiteSnapshot);
      mockProductSnapshotRepository.create.mockResolvedValue(mockProductSnapshot);

      const result = await productScrapingService.scrapeProductById('prod_123');

      expect(mockProductRepository.findById).toHaveBeenCalledWith('prod_123');
      expect(mockTakeSnapshot).toHaveBeenCalledWith('https://hellofresh.com');
      expect(result).toEqual(mockProductSnapshot);
    });

    it('should throw error when product not found by ID', async () => {
      mockProductRepository.findById.mockResolvedValue(null);

      await expect(
        productScrapingService.scrapeProductById('nonexistent')
      ).rejects.toThrow('Product not found with ID: nonexistent');

      expect(mockProductRepository.findById).toHaveBeenCalledWith('nonexistent');
      expect(mockTakeSnapshot).not.toHaveBeenCalled();
    });
  });

  describe('triggerManualProductScraping', () => {
    it('should scrape all products in a project', async () => {
      const products = [
        { ...mockProduct, id: 'prod_1', name: 'Product 1', website: 'https://product1.com' },
        { ...mockProduct, id: 'prod_2', name: 'Product 2', website: 'https://product2.com' },
      ];

      const snapshots = [
        { ...mockProductSnapshot, id: 'snap_1', productId: 'prod_1' },
        { ...mockProductSnapshot, id: 'snap_2', productId: 'prod_2' },
      ];

      mockProductRepository.list.mockResolvedValue(products);
      mockProductRepository.findById
        .mockResolvedValueOnce(products[0])
        .mockResolvedValueOnce(products[1]);
      mockProductRepository.findByWebsite
        .mockResolvedValueOnce(products[0])
        .mockResolvedValueOnce(products[1]);
      mockTakeSnapshot
        .mockResolvedValueOnce({ ...mockWebsiteSnapshot, url: 'https://product1.com' })
        .mockResolvedValueOnce({ ...mockWebsiteSnapshot, url: 'https://product2.com' });
      mockProductSnapshotRepository.create
        .mockResolvedValueOnce(snapshots[0])
        .mockResolvedValueOnce(snapshots[1]);

      const result = await productScrapingService.triggerManualProductScraping('proj_456');

      expect(mockProductRepository.list).toHaveBeenCalled();
      expect(result).toHaveLength(2);
      expect(result).toEqual(snapshots);
      expect(mockTakeSnapshot).toHaveBeenCalledTimes(2);
    });

    it('should handle empty project with no products', async () => {
      mockProductRepository.list.mockResolvedValue([]);

      const result = await productScrapingService.triggerManualProductScraping('proj_empty');

      expect(mockProductRepository.list).toHaveBeenCalled();
      expect(result).toEqual([]);
      expect(mockTakeSnapshot).not.toHaveBeenCalled();
    });

    it('should continue scraping other products when one fails', async () => {
      const products = [
        { ...mockProduct, id: 'prod_1', name: 'Product 1', website: 'https://product1.com' },
        { ...mockProduct, id: 'prod_2', name: 'Product 2', website: 'https://product2.com' },
      ];

      const successfulSnapshot = { ...mockProductSnapshot, id: 'snap_2', productId: 'prod_2' };

      mockProductRepository.list.mockResolvedValue(products);
      mockProductRepository.findById
        .mockResolvedValueOnce(products[0])
        .mockResolvedValueOnce(products[1]);
      mockProductRepository.findByWebsite
        .mockRejectedValueOnce(new Error('Scraping failed for product 1'))
        .mockResolvedValueOnce(products[1]);
      mockTakeSnapshot
        .mockResolvedValueOnce({ ...mockWebsiteSnapshot, url: 'https://product2.com' });
      mockProductSnapshotRepository.create
        .mockResolvedValueOnce(successfulSnapshot);

      const result = await productScrapingService.triggerManualProductScraping('proj_456');

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(successfulSnapshot);
    });
  });

  describe('getProductScrapingStatus', () => {
    it('should return correct status for project with products and snapshots', async () => {
      const products = [
        { ...mockProduct, id: 'prod_1' },
        { ...mockProduct, id: 'prod_2' },
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
      const products = [{ ...mockProduct, id: 'prod_1' }];

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
  });

  describe('cleanup', () => {
    it('should close the website scraper', async () => {
      await productScrapingService.cleanup();

      expect(mockClose).toHaveBeenCalled();
    });
  });

  describe('integration scenarios', () => {
    it('should handle complete product scraping workflow', async () => {
      // Test the full workflow: scrape product → get status
      mockProductRepository.findByWebsite.mockResolvedValue(mockProduct);
      mockTakeSnapshot.mockResolvedValue(mockWebsiteSnapshot);
      mockProductSnapshotRepository.create.mockResolvedValue(mockProductSnapshot);

      // Step 1: Scrape a product
      const snapshot = await productScrapingService.scrapeProduct('https://hellofresh.com');
      expect(snapshot).toEqual(mockProductSnapshot);

      // Step 2: Check status
      mockProductRepository.list.mockResolvedValue([mockProduct]);
      mockProductSnapshotRepository.findByProductId.mockResolvedValue([mockProductSnapshot]);

      const status = await productScrapingService.getProductScrapingStatus('proj_456');
      expect(status.productCount).toBe(1);
      expect(status.totalSnapshots).toBe(1);
    });

    it('should handle error recovery in manual scraping', async () => {
      const products = [
        { ...mockProduct, id: 'prod_1', website: 'https://working.com' },
        { ...mockProduct, id: 'prod_2', website: 'https://broken.com' },
        { ...mockProduct, id: 'prod_3', website: 'https://another.com' },
      ];

      mockProductRepository.list.mockResolvedValue(products);
      
      // First product succeeds
      mockProductRepository.findById.mockResolvedValueOnce(products[0]);
      mockProductRepository.findByWebsite.mockResolvedValueOnce(products[0]);
      mockTakeSnapshot.mockResolvedValueOnce(mockWebsiteSnapshot);
      mockProductSnapshotRepository.create.mockResolvedValueOnce(mockProductSnapshot);

      // Second product fails
      mockProductRepository.findById.mockResolvedValueOnce(products[1]);
      mockProductRepository.findByWebsite.mockRejectedValueOnce(new Error('Network error'));

      // Third product succeeds
      mockProductRepository.findById.mockResolvedValueOnce(products[2]);
      mockProductRepository.findByWebsite.mockResolvedValueOnce(products[2]);
      mockTakeSnapshot.mockResolvedValueOnce(mockWebsiteSnapshot);
      mockProductSnapshotRepository.create.mockResolvedValueOnce({ ...mockProductSnapshot, id: 'snap_3' });

      const result = await productScrapingService.triggerManualProductScraping('proj_456');

      // Should have 2 successful snapshots despite 1 failure
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('snap_789');
      expect(result[1].id).toBe('snap_3');
    });
  });
}); 