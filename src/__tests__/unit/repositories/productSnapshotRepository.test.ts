import { PrismaClient } from '@prisma/client';
import { PrismaProductSnapshotRepository } from '../../../lib/repositories/productSnapshotRepository';
import {
  CreateProductSnapshotInput,
  ProductSnapshot,
  ProductSnapshotNotFoundError,
  InvalidProductDataError,
  Product
} from '../../../types/product';

// Mock PrismaClient
const mockPrisma = {
  product: {
    findUnique: jest.fn(),
  },
  productSnapshot: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    delete: jest.fn(),
  },
} as unknown as PrismaClient;

const productSnapshotRepository = new PrismaProductSnapshotRepository(mockPrisma);

beforeEach(() => {
  jest.clearAllMocks();
});

describe('ProductSnapshotRepository', () => {
  const mockProduct: Product = {
    id: 'product-1',
    name: 'Test Product',
    website: 'https://example.com',
    positioning: 'Market leader',
    customerData: 'Enterprise customers',
    userProblem: 'Data complexity',
    industry: 'Technology',
    projectId: 'project-1',
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const mockSnapshotData: CreateProductSnapshotInput = {
    productId: 'product-1',
    content: {
      title: 'Product Title',
      description: 'Product description',
      features: ['Feature 1', 'Feature 2']
    },
    metadata: {
      scraped: true,
      timestamp: new Date().toISOString(),
      url: 'https://example.com'
    }
  };

  const mockSnapshot: ProductSnapshot = {
    id: 'snapshot-1',
    ...mockSnapshotData,
    createdAt: new Date()
  };

  describe('create', () => {
    it('should create a product snapshot with valid data', async () => {
      (mockPrisma.product.findUnique as jest.Mock).mockResolvedValue(mockProduct);
      (mockPrisma.productSnapshot.create as jest.Mock).mockResolvedValue(mockSnapshot);

      const result = await productSnapshotRepository.create(mockSnapshotData);

      expect(result).toEqual(mockSnapshot);
      expect(mockPrisma.product.findUnique).toHaveBeenCalledWith({
        where: { id: mockSnapshotData.productId }
      });
      expect(mockPrisma.productSnapshot.create).toHaveBeenCalledWith({
        data: mockSnapshotData
      });
    });

    it('should throw error if product does not exist', async () => {
      (mockPrisma.product.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(productSnapshotRepository.create(mockSnapshotData))
        .rejects
        .toThrow(InvalidProductDataError);
    });

    it('should validate required fields', async () => {
      const testCases = [
        { field: 'productId', value: '', expectedError: 'Product ID is required' },
        { field: 'content', value: null, expectedError: 'Snapshot content is required' },
        { field: 'metadata', value: null, expectedError: 'Snapshot metadata is required' }
      ];

      for (const testCase of testCases) {
        const invalidData = { ...mockSnapshotData, [testCase.field]: testCase.value };
        
        await expect(productSnapshotRepository.create(invalidData))
          .rejects
          .toThrow(testCase.expectedError);
      }
    });
  });

  describe('findById', () => {
    it('should return snapshot when found', async () => {
      (mockPrisma.productSnapshot.findUnique as jest.Mock).mockResolvedValue(mockSnapshot);

      const result = await productSnapshotRepository.findById('snapshot-1');

      expect(result).toEqual(mockSnapshot);
      expect(mockPrisma.productSnapshot.findUnique).toHaveBeenCalledWith({
        where: { id: 'snapshot-1' }
      });
    });

    it('should return null when snapshot not found', async () => {
      (mockPrisma.productSnapshot.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await productSnapshotRepository.findById('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('findLatestByProductId', () => {
    it('should return latest snapshot for product', async () => {
      (mockPrisma.productSnapshot.findFirst as jest.Mock).mockResolvedValue(mockSnapshot);

      const result = await productSnapshotRepository.findLatestByProductId('product-1');

      expect(result).toEqual(mockSnapshot);
      expect(mockPrisma.productSnapshot.findFirst).toHaveBeenCalledWith({
        where: { productId: 'product-1' },
        orderBy: { createdAt: 'desc' }
      });
    });

    it('should return null when no snapshots exist for product', async () => {
      (mockPrisma.productSnapshot.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await productSnapshotRepository.findLatestByProductId('product-1');

      expect(result).toBeNull();
    });
  });

  describe('findByProductId', () => {
    it('should return all snapshots for product ordered by creation date', async () => {
      const mockSnapshots = [mockSnapshot];
      (mockPrisma.productSnapshot.findMany as jest.Mock).mockResolvedValue(mockSnapshots);

      const result = await productSnapshotRepository.findByProductId('product-1');

      expect(result).toEqual(mockSnapshots);
      expect(mockPrisma.productSnapshot.findMany).toHaveBeenCalledWith({
        where: { productId: 'product-1' },
        orderBy: { createdAt: 'desc' }
      });
    });

    it('should return limited snapshots when limit is specified', async () => {
      const mockSnapshots = [mockSnapshot];
      (mockPrisma.productSnapshot.findMany as jest.Mock).mockResolvedValue(mockSnapshots);

      const result = await productSnapshotRepository.findByProductId('product-1', 5);

      expect(result).toEqual(mockSnapshots);
      expect(mockPrisma.productSnapshot.findMany).toHaveBeenCalledWith({
        where: { productId: 'product-1' },
        orderBy: { createdAt: 'desc' },
        take: 5
      });
    });

    it('should return empty array when no snapshots exist', async () => {
      (mockPrisma.productSnapshot.findMany as jest.Mock).mockResolvedValue([]);

      const result = await productSnapshotRepository.findByProductId('product-1');

      expect(result).toEqual([]);
    });
  });

  describe('delete', () => {
    it('should delete snapshot when it exists', async () => {
      (mockPrisma.productSnapshot.findUnique as jest.Mock).mockResolvedValue(mockSnapshot);
      (mockPrisma.productSnapshot.delete as jest.Mock).mockResolvedValue(mockSnapshot);

      await productSnapshotRepository.delete('snapshot-1');

      expect(mockPrisma.productSnapshot.delete).toHaveBeenCalledWith({
        where: { id: 'snapshot-1' }
      });
    });

    it('should throw error if snapshot not found', async () => {
      (mockPrisma.productSnapshot.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(productSnapshotRepository.delete('snapshot-1'))
        .rejects
        .toThrow(ProductSnapshotNotFoundError);
    });
  });

  describe('list', () => {
    it('should return all snapshots ordered by creation date', async () => {
      const mockSnapshots = [mockSnapshot];
      (mockPrisma.productSnapshot.findMany as jest.Mock).mockResolvedValue(mockSnapshots);

      const result = await productSnapshotRepository.list();

      expect(result).toEqual(mockSnapshots);
      expect(mockPrisma.productSnapshot.findMany).toHaveBeenCalledWith({
        orderBy: { createdAt: 'desc' }
      });
    });

    it('should return empty array when no snapshots exist', async () => {
      (mockPrisma.productSnapshot.findMany as jest.Mock).mockResolvedValue([]);

      const result = await productSnapshotRepository.list();

      expect(result).toEqual([]);
    });
  });

  describe('error handling', () => {
    it('should handle database errors gracefully in create', async () => {
      (mockPrisma.product.findUnique as jest.Mock).mockResolvedValue(mockProduct);
      (mockPrisma.productSnapshot.create as jest.Mock).mockRejectedValue(new Error('Database error'));

      await expect(productSnapshotRepository.create(mockSnapshotData))
        .rejects
        .toThrow('Failed to create product snapshot');
    });

    it('should handle database errors gracefully in findById', async () => {
      (mockPrisma.productSnapshot.findUnique as jest.Mock).mockRejectedValue(new Error('Database error'));

      await expect(productSnapshotRepository.findById('snapshot-1'))
        .rejects
        .toThrow('Failed to find product snapshot by id');
    });

    it('should handle database errors gracefully in delete', async () => {
      (mockPrisma.productSnapshot.findUnique as jest.Mock).mockResolvedValue(mockSnapshot);
      (mockPrisma.productSnapshot.delete as jest.Mock).mockRejectedValue(new Error('Database error'));

      await expect(productSnapshotRepository.delete('snapshot-1'))
        .rejects
        .toThrow('Failed to delete product snapshot');
    });
  });
}); 