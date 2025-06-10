import {
  CreateProductInput,
  UpdateProductInput,
  ProductNotFoundError,
  InvalidProductDataError,
  Product
} from '../../../types/product';

describe('Product Types and Validation', () => {
  const mockProductData: CreateProductInput = {
    name: 'Test Product',
    website: 'https://example.com',
    positioning: 'Market leader in AI solutions',
    customerData: 'Enterprise customers in tech sector',
    userProblem: 'Solving data analysis complexity',
    industry: 'Technology',
    projectId: 'project-1'
  };

  describe('Product Types', () => {
    it('should have correct CreateProductInput structure', () => {
      expect(mockProductData).toHaveProperty('name');
      expect(mockProductData).toHaveProperty('website');
      expect(mockProductData).toHaveProperty('positioning');
      expect(mockProductData).toHaveProperty('customerData');
      expect(mockProductData).toHaveProperty('userProblem');
      expect(mockProductData).toHaveProperty('industry');
      expect(mockProductData).toHaveProperty('projectId');
    });

    it('should create valid UpdateProductInput', () => {
      const updateData: UpdateProductInput = {
        name: 'Updated Product Name',
        positioning: 'Updated positioning'
      };

      expect(updateData).toHaveProperty('name');
      expect(updateData).toHaveProperty('positioning');
      expect(updateData).not.toHaveProperty('projectId'); // Should not be updatable
    });
  });

  describe('Error Classes', () => {
    it('should create ProductNotFoundError with correct message', () => {
      const error = new ProductNotFoundError('product-123');
      
      expect(error.message).toBe('Product with id product-123 not found');
      expect(error.name).toBe('ProductNotFoundError');
      expect(error).toBeInstanceOf(Error);
    });

    it('should create InvalidProductDataError with correct message', () => {
      const error = new InvalidProductDataError('Invalid website URL');
      
      expect(error.message).toBe('Invalid product data: Invalid website URL');
      expect(error.name).toBe('InvalidProductDataError');
      expect(error).toBeInstanceOf(Error);
    });
  });

  describe('URL Validation Logic', () => {
    const isValidUrl = (url: string): boolean => {
      try {
        new URL(url);
        return true;
      } catch {
        return false;
      }
    };

    it('should validate correct URLs', () => {
      const validUrls = [
        'https://example.com',
        'http://test.com',
        'https://subdomain.example.com/path',
        'https://example.com:8080',
        'https://example.com/path?query=value'
      ];

      validUrls.forEach(url => {
        expect(isValidUrl(url)).toBe(true);
      });
    });

    it('should reject invalid URLs', () => {
      const invalidUrls = [
        'not-a-url',
        'just-text',
        '',
        'http://',
        'https://'
      ];

      invalidUrls.forEach(url => {
        expect(isValidUrl(url)).toBe(false);
      });
    });
  });

  describe('Data Validation Logic', () => {
    const validateProductData = (data: CreateProductInput): string[] => {
      const errors: string[] = [];

      if (!data.name?.trim()) {
        errors.push('Product name is required');
      }

      if (!data.website?.trim()) {
        errors.push('Product website is required');
      } else {
        try {
          new URL(data.website);
        } catch {
          errors.push('Product website must be a valid URL');
        }
      }

      if (!data.positioning?.trim()) {
        errors.push('Product positioning is required');
      }

      if (!data.customerData?.trim()) {
        errors.push('Customer data is required');
      }

      if (!data.userProblem?.trim()) {
        errors.push('User problem is required');
      }

      if (!data.industry?.trim()) {
        errors.push('Industry is required');
      }

      if (!data.projectId?.trim()) {
        errors.push('Project ID is required');
      }

      return errors;
    };

    it('should pass validation for valid product data', () => {
      const errors = validateProductData(mockProductData);
      expect(errors).toHaveLength(0);
    });

    it('should fail validation for missing required fields', () => {
      const testCases = [
        { field: 'name', value: '', expectedError: 'Product name is required' },
        { field: 'website', value: '', expectedError: 'Product website is required' },
        { field: 'positioning', value: '', expectedError: 'Product positioning is required' },
        { field: 'customerData', value: '', expectedError: 'Customer data is required' },
        { field: 'userProblem', value: '', expectedError: 'User problem is required' },
        { field: 'industry', value: '', expectedError: 'Industry is required' },
        { field: 'projectId', value: '', expectedError: 'Project ID is required' }
      ];

      testCases.forEach(testCase => {
        const invalidData = { ...mockProductData, [testCase.field]: testCase.value };
        const errors = validateProductData(invalidData);
        
        expect(errors).toContain(testCase.expectedError);
      });
    });

    it('should fail validation for invalid website URL', () => {
      const invalidData = { ...mockProductData, website: 'invalid-url' };
      const errors = validateProductData(invalidData);
      
      expect(errors).toContain('Product website must be a valid URL');
    });
  });

  describe('Repository Interface Compliance', () => {
    it('should define all required repository methods', () => {
      // This test ensures our interface is properly defined
      const requiredMethods = [
        'create',
        'findById',
        'findByProjectId',
        'findWithProject',
        'findWithSnapshots',
        'findWithProjectAndSnapshots',
        'update',
        'delete',
        'list'
      ];

      // Import the repository class to check its methods
      const { PrismaProductRepository } = require('../../../lib/repositories/productRepository');
      const repository = new PrismaProductRepository();

      requiredMethods.forEach(method => {
        expect(typeof repository[method]).toBe('function');
      });
    });
  });
}); 