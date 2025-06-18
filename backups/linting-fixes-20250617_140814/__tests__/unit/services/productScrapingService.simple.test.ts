import { ProductScrapingService } from '@/services/productScrapingService';

// Bypass the global mock for this specific test
jest.unmock('@/services/productScrapingService');

// Mock the dependencies with factory functions to avoid hoisting issues
jest.mock('@/lib/repositories', () => ({
  productRepository: {
    findById: jest.fn(),
    findByWebsite: jest.fn(),
    list: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  productSnapshotRepository: {
    create: jest.fn(),
    findById: jest.fn(),
    findByProductId: jest.fn(),
    list: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
}));

jest.mock('@/lib/scraper', () => ({
  WebsiteScraper: jest.fn().mockImplementation(() => ({
    takeSnapshot: jest.fn(),
    close: jest.fn()
  }))
}));

const { productRepository, productSnapshotRepository } = require('@/lib/repositories');
const { WebsiteScraper } = require('@/lib/scraper');

describe('ProductScrapingService - Unit Tests', () => {
  let productScrapingService: ProductScrapingService;
  let mockWebsiteScraper: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create a fresh instance and capture the mock
    mockWebsiteScraper = {
      takeSnapshot: jest.fn(),
      close: jest.fn()
    };
    
    // Make WebsiteScraper constructor return our controlled mock
    (WebsiteScraper as jest.Mock).mockImplementation(() => mockWebsiteScraper);
    
    productScrapingService = new ProductScrapingService();
  });

  describe('scrapeProductById', () => {
    it('should throw error when product not found by ID', async () => {
      productRepository.findById.mockResolvedValue(null);

      await expect(
        productScrapingService.scrapeProductById('nonexistent')
      ).rejects.toThrow('Product not found with ID: nonexistent');

      expect(productRepository.findById).toHaveBeenCalledWith('nonexistent');
    });

    it('should successfully scrape product by ID', async () => {
      const mockProduct = {
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

      const mockWebsiteSnapshot = {
        html: '<html><head><title>HelloFresh</title></head><body>Content with sufficient length to pass validation test minimum requirements for scraping success</body></html>',
        text: 'HelloFresh Content with sufficient length to pass validation test minimum requirements for scraping success',
        title: 'HelloFresh - Fresh Ingredients',
        metadata: {
          headers: { 'content-type': 'text/html' },
          statusCode: 200,
        }
      };

      const mockProductSnapshot = {
        id: 'snap_789',
        productId: 'prod_123',
        content: {
          html: mockWebsiteSnapshot.html,
          text: mockWebsiteSnapshot.text,
          title: mockWebsiteSnapshot.title,
          description: '',
          url: 'https://hellofresh.com',
          timestamp: expect.any(Date)
        },
        metadata: expect.objectContaining({
          scrapedAt: expect.any(String),
          contentLength: expect.any(Number),
          headers: mockWebsiteSnapshot.metadata.headers,
          statusCode: 200
        }),
        createdAt: expect.any(Date)
      };

      productRepository.findById.mockResolvedValue(mockProduct);
      mockWebsiteScraper.takeSnapshot.mockResolvedValue(mockWebsiteSnapshot);
      productSnapshotRepository.create.mockResolvedValue(mockProductSnapshot);

      const result = await productScrapingService.scrapeProductById('prod_123');

      expect(productRepository.findById).toHaveBeenCalledWith('prod_123');
      expect(mockWebsiteScraper.takeSnapshot).toHaveBeenCalledWith('https://hellofresh.com');
      expect(productSnapshotRepository.create).toHaveBeenCalled();
      expect(result).toEqual(mockProductSnapshot);
    });
  });

  describe('triggerManualProductScraping', () => {
    it('should handle empty project with no products', async () => {
      productRepository.list.mockResolvedValue([]);

      const result = await productScrapingService.triggerManualProductScraping('proj_empty');

      expect(productRepository.list).toHaveBeenCalled();
      expect(result).toEqual([]);
    });

    it('should scrape multiple products successfully', async () => {
      const mockProducts = [
        {
          id: 'prod_1',
          name: 'Product 1',
          website: 'https://product1.com',
          positioning: 'Test positioning',
          customerData: 'Test data',
          userProblem: 'Test problem',
          industry: 'Test industry',
          projectId: 'proj_456',
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 'prod_2',
          name: 'Product 2',
          website: 'https://product2.com',
          positioning: 'Test positioning',
          customerData: 'Test data',
          userProblem: 'Test problem',
          industry: 'Test industry',
          projectId: 'proj_456',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      const mockWebsiteSnapshot = {
        html: '<html><head><title>Product</title></head><body>Content with sufficient length to pass validation test minimum requirements for scraping success</body></html>',
        text: 'Product Content with sufficient length to pass validation test minimum requirements for scraping success',
        title: 'Product Title',
        metadata: {
          headers: { 'content-type': 'text/html' },
          statusCode: 200,
        }
      };

      const mockSnapshots = [
        {
          id: 'snap_1',
          productId: 'prod_1',
          content: { 
            html: mockWebsiteSnapshot.html,
            text: mockWebsiteSnapshot.text,
            title: mockWebsiteSnapshot.title,
            description: '',
            url: 'https://product1.com',
            timestamp: expect.any(Date)
          },
          metadata: expect.objectContaining({
            scrapedAt: expect.any(String),
            contentLength: expect.any(Number)
          }),
          createdAt: expect.any(Date)
        },
        {
          id: 'snap_2',
          productId: 'prod_2',
          content: { 
            html: mockWebsiteSnapshot.html,
            text: mockWebsiteSnapshot.text,
            title: mockWebsiteSnapshot.title,
            description: '',
            url: 'https://product2.com',
            timestamp: expect.any(Date)
          },
          metadata: expect.objectContaining({
            scrapedAt: expect.any(String),
            contentLength: expect.any(Number)
          }),
          createdAt: expect.any(Date)
        }
      ];

      productRepository.list.mockResolvedValue(mockProducts);
      productRepository.findById
        .mockResolvedValueOnce(mockProducts[0])
        .mockResolvedValueOnce(mockProducts[1]);
      mockWebsiteScraper.takeSnapshot.mockResolvedValue(mockWebsiteSnapshot);
      productSnapshotRepository.create
        .mockResolvedValueOnce(mockSnapshots[0])
        .mockResolvedValueOnce(mockSnapshots[1]);

      const result = await productScrapingService.triggerManualProductScraping('proj_456');

      expect(productRepository.list).toHaveBeenCalled();
      expect(result).toHaveLength(2);
      expect(result[0].productId).toBe('prod_1');
      expect(result[1].productId).toBe('prod_2');
    }, 15000); // Increase timeout for multiple product scraping
  });

  describe('getProductScrapingStatus', () => {
    it('should return correct status for project with products and snapshots', async () => {
      const mockProducts = [
        { id: 'prod_1', projectId: 'proj_456' },
        { id: 'prod_2', projectId: 'proj_456' }
      ];

      const mockSnapshots = [
        { id: 'snap_1', createdAt: new Date('2024-01-01') },
        { id: 'snap_2', createdAt: new Date('2024-01-02') },
        { id: 'snap_3', createdAt: new Date('2024-01-03') }
      ];

      productRepository.list.mockResolvedValue(mockProducts);
      productSnapshotRepository.findByProductId
        .mockResolvedValueOnce([mockSnapshots[0], mockSnapshots[1]])
        .mockResolvedValueOnce([mockSnapshots[2]]);

      const result = await productScrapingService.getProductScrapingStatus('proj_456');

      expect(result).toEqual({
        productCount: 2,
        lastScraped: new Date('2024-01-03'),
        totalSnapshots: 3
      });
    });

    it('should return status for project with no snapshots', async () => {
      const mockProducts = [{ id: 'prod_1', projectId: 'proj_456' }];

      productRepository.list.mockResolvedValue(mockProducts);
      productSnapshotRepository.findByProductId.mockResolvedValue([]);

      const result = await productScrapingService.getProductScrapingStatus('proj_456');

      expect(result).toEqual({
        productCount: 1,
        lastScraped: undefined,
        totalSnapshots: 0
      });
    });

    it('should handle errors gracefully', async () => {
      productRepository.list.mockRejectedValue(new Error('Database error'));

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
      expect(mockWebsiteScraper.close).toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should handle scraping failures gracefully', async () => {
      const mockProduct = {
        id: 'prod_123',
        website: 'https://invalid-site.com',
        name: 'Test Product',
      };

      productRepository.findById.mockResolvedValue(mockProduct);
      mockWebsiteScraper.takeSnapshot.mockRejectedValue(new Error('Scraping failed'));

      await expect(
        productScrapingService.scrapeProductById('prod_123')
      ).rejects.toThrow('All 3 scraping attempts failed');

      expect(mockWebsiteScraper.takeSnapshot).toHaveBeenCalledWith('https://invalid-site.com');
    });
  });
}); 