import { ProductService } from '@/services/productService';
import { productRepository } from '@/lib/repositories';
import { ChatState } from '@/types/chat';
import { Product } from '@/types/product';

// Mock the repository
jest.mock('@/lib/repositories', () => ({
  productRepository: {
    create: jest.fn(),
    findWithProject: jest.fn(),
    findByProjectId: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
}));

const mockProductRepository = productRepository as jest.Mocked<typeof productRepository>;

describe('ProductService', () => {
  let productService: ProductService;
  let mockChatState: ChatState;
  let mockProduct: Product;

  beforeEach(() => {
    productService = new ProductService();
    
    mockChatState = {
      currentStep: 1,
      stepDescription: 'Product Data Collection',
      expectedInputType: 'text',
      collectedData: {
        productName: 'HelloFresh',
        productUrl: 'https://hellofresh.com',
        positioning: 'Leading meal kit delivery service',
        customerData: '500k+ customers, urban professionals',
        userProblem: 'Time constraints and meal planning difficulties',
        industry: 'Food Technology and Meal Kit Delivery'
      }
    };

    mockProduct = {
      id: 'prod_123',
      name: 'HelloFresh',
      website: 'https://hellofresh.com',
      positioning: 'Leading meal kit delivery service',
      customerData: '500k+ customers, urban professionals',
      userProblem: 'Time constraints and meal planning difficulties',
      industry: 'Food Technology and Meal Kit Delivery',
      projectId: 'proj_456',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('createProductFromChat', () => {
    it('should create a product from valid chat data', async () => {
      mockProductRepository.create.mockResolvedValue(mockProduct);

      const result = await productService.createProductFromChat(mockChatState, 'proj_456');

      expect(mockProductRepository.create).toHaveBeenCalledWith({
        name: 'HelloFresh',
        website: 'https://hellofresh.com',
        positioning: 'Leading meal kit delivery service',
        customerData: '500k+ customers, urban professionals',
        userProblem: 'Time constraints and meal planning difficulties',
        industry: 'Food Technology and Meal Kit Delivery',
        projectId: 'proj_456'
      });

      expect(result).toEqual(mockProduct);
    });

    it('should throw error for incomplete chat data', async () => {
      const incompleteChatState: ChatState = {
        currentStep: 1,
        stepDescription: 'Product Data Collection',
        expectedInputType: 'text',
        collectedData: {
          productName: 'HelloFresh',
          // Missing other required fields
        }
      };

      await expect(
        productService.createProductFromChat(incompleteChatState, 'proj_456')
      ).rejects.toThrow('Incomplete product data in chat state');

      expect(mockProductRepository.create).not.toHaveBeenCalled();
    });

    it('should throw error for missing collected data', async () => {
      const emptyChatState: ChatState = {
        currentStep: 1,
        stepDescription: 'Product Data Collection',
        expectedInputType: 'text'
      };

      await expect(
        productService.createProductFromChat(emptyChatState, 'proj_456')
      ).rejects.toThrow('Incomplete product data in chat state');

      expect(mockProductRepository.create).not.toHaveBeenCalled();
    });

    it('should propagate repository errors', async () => {
      const repositoryError = new Error('Database connection failed');
      mockProductRepository.create.mockRejectedValue(repositoryError);

      await expect(
        productService.createProductFromChat(mockChatState, 'proj_456')
      ).rejects.toThrow('Database connection failed');
    });
  });

  describe('validateChatDataForProduct', () => {
    it('should return true for complete chat data', () => {
      const result = productService.validateChatDataForProduct(mockChatState);
      expect(result).toBe(true);
    });

    it('should return false for missing collected data', () => {
      const emptyChatState: ChatState = {
        currentStep: 1,
        stepDescription: 'Test',
        expectedInputType: 'text'
      };

      const result = productService.validateChatDataForProduct(emptyChatState);
      expect(result).toBe(false);
    });

    it('should return false for incomplete data', () => {
      const incompleteChatState: ChatState = {
        currentStep: 1,
        stepDescription: 'Test',
        expectedInputType: 'text',
        collectedData: {
          productName: 'HelloFresh',
          productUrl: 'https://hellofresh.com',
          // Missing positioning, customerData, userProblem, industry
        }
      };

      const result = productService.validateChatDataForProduct(incompleteChatState);
      expect(result).toBe(false);
    });

    it('should return false for each missing required field', () => {
      const requiredFields = ['productName', 'productUrl', 'positioning', 'customerData', 'userProblem', 'industry'];
      
      requiredFields.forEach(fieldToRemove => {
        const incompleteData = { ...mockChatState.collectedData };
        delete (incompleteData as any)[fieldToRemove];
        
        const incompleteChatState: ChatState = {
          ...mockChatState,
          collectedData: incompleteData
        };

        const result = productService.validateChatDataForProduct(incompleteChatState);
        expect(result).toBe(false);
      });
    });
  });

  describe('getProductWithProject', () => {
    it('should retrieve product with project', async () => {
      const mockProductWithProject = {
        ...mockProduct,
        project: {
          id: 'proj_456',
          name: 'Test Project',
          description: 'Test Description',
          status: 'DRAFT' as const,
          priority: 'MEDIUM' as const,
          userId: 'user_123',
          startDate: new Date(),
          endDate: null,
          parameters: {},
          tags: [],
          createdAt: new Date(),
          updatedAt: new Date(),
          scrapingFrequency: 'WEEKLY' as const,
          userEmail: 'test@example.com'
        }
      };

      mockProductRepository.findWithProject.mockResolvedValue(mockProductWithProject);

      const result = await productService.getProductWithProject('prod_123');

      expect(mockProductRepository.findWithProject).toHaveBeenCalledWith('prod_123');
      expect(result).toEqual(mockProductWithProject);
    });

    it('should return null when product not found', async () => {
      mockProductRepository.findWithProject.mockResolvedValue(null);

      const result = await productService.getProductWithProject('nonexistent');

      expect(mockProductRepository.findWithProject).toHaveBeenCalledWith('nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('updateProductFromChat', () => {
    it('should update product with new chat data', async () => {
      const updatedProduct = { ...mockProduct, name: 'Updated HelloFresh' };
      mockProductRepository.update.mockResolvedValue(updatedProduct);

      const updatedChatState = {
        ...mockChatState,
        collectedData: {
          ...mockChatState.collectedData!,
          productName: 'Updated HelloFresh'
        }
      };

      const result = await productService.updateProductFromChat('prod_123', updatedChatState);

      expect(mockProductRepository.update).toHaveBeenCalledWith('prod_123', {
        name: 'Updated HelloFresh',
        website: 'https://hellofresh.com',
        positioning: 'Leading meal kit delivery service',
        customerData: '500k+ customers, urban professionals',
        userProblem: 'Time constraints and meal planning difficulties',
        industry: 'Food Technology and Meal Kit Delivery'
      });

      expect(result).toEqual(updatedProduct);
    });

    it('should throw error for incomplete chat data during update', async () => {
      const incompleteChatState: ChatState = {
        currentStep: 1,
        stepDescription: 'Test',
        expectedInputType: 'text',
        collectedData: {
          productName: 'HelloFresh',
          // Missing other required fields
        }
      };

      await expect(
        productService.updateProductFromChat('prod_123', incompleteChatState)
      ).rejects.toThrow('Incomplete product data in chat state');

      expect(mockProductRepository.update).not.toHaveBeenCalled();
    });
  });

  describe('getProductByProjectId', () => {
    it('should retrieve product by project ID', async () => {
      mockProductRepository.findByProjectId.mockResolvedValue(mockProduct);

      const result = await productService.getProductByProjectId('proj_456');

      expect(mockProductRepository.findByProjectId).toHaveBeenCalledWith('proj_456');
      expect(result).toEqual(mockProduct);
    });

    it('should return null when no product found for project', async () => {
      mockProductRepository.findByProjectId.mockResolvedValue(null);

      const result = await productService.getProductByProjectId('proj_nonexistent');

      expect(mockProductRepository.findByProjectId).toHaveBeenCalledWith('proj_nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('deleteProduct', () => {
    it('should delete product successfully', async () => {
      mockProductRepository.delete.mockResolvedValue();

      await productService.deleteProduct('prod_123');

      expect(mockProductRepository.delete).toHaveBeenCalledWith('prod_123');
    });

    it('should propagate repository errors during deletion', async () => {
      const repositoryError = new Error('Failed to delete product');
      mockProductRepository.delete.mockRejectedValue(repositoryError);

      await expect(
        productService.deleteProduct('prod_123')
      ).rejects.toThrow('Failed to delete product');
    });
  });

  describe('Integration scenarios', () => {
    it('should handle complete product lifecycle', async () => {
      // Create product
      mockProductRepository.create.mockResolvedValue(mockProduct);
      const createdProduct = await productService.createProductFromChat(mockChatState, 'proj_456');
      expect(createdProduct).toEqual(mockProduct);

      // Update product
      const updatedProduct = { ...mockProduct, name: 'Updated HelloFresh' };
      mockProductRepository.update.mockResolvedValue(updatedProduct);
      const updatedChatState = {
        ...mockChatState,
        collectedData: { ...mockChatState.collectedData!, productName: 'Updated HelloFresh' }
      };
      const result = await productService.updateProductFromChat('prod_123', updatedChatState);
      expect(result).toEqual(updatedProduct);

      // Delete product
      mockProductRepository.delete.mockResolvedValue();
      await productService.deleteProduct('prod_123');
      expect(mockProductRepository.delete).toHaveBeenCalledWith('prod_123');
    });

    it('should validate data consistency across operations', () => {
      // Test that validation is consistent across create and update operations
      const invalidChatState: ChatState = {
        currentStep: 1,
        stepDescription: 'Test',
        expectedInputType: 'text',
        collectedData: {
          productName: 'Test',
          // Missing required fields
        }
      };

      expect(productService.validateChatDataForProduct(invalidChatState)).toBe(false);
      
      // Both create and update should fail with the same validation
      expect(
        productService.createProductFromChat(invalidChatState, 'proj_456')
      ).rejects.toThrow('Incomplete product data in chat state');
      
      expect(
        productService.updateProductFromChat('prod_123', invalidChatState)
      ).rejects.toThrow('Incomplete product data in chat state');
    });
  });
}); 