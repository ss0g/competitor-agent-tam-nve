import { EnhancedProductChatProcessor } from '@/lib/chat/productChatProcessor';
import { ChatState } from '@/types/chat';

describe('EnhancedProductChatProcessor', () => {
  let processor: EnhancedProductChatProcessor;
  let mockChatState: ChatState;

  beforeEach(() => {
    processor = new EnhancedProductChatProcessor();
    mockChatState = {
      currentStep: 1,
      stepDescription: 'Product Data Collection',
      expectedInputType: 'text',
      collectedData: {}
    };
  });

  describe('collectProductData', () => {
    describe('Product Name Collection', () => {
      it('should collect product name when none exists', async () => {
        const response = await processor.collectProductData('HelloFresh', mockChatState);

        expect(mockChatState.collectedData?.productName).toBe('HelloFresh');
        expect(response.message).toContain('Great! Now I need the URL');
        expect(response.message).toContain('HelloFresh');
        expect(response.expectedInputType).toBe('url');
        expect(response.stepDescription).toBe('Product URL Collection');
      });

      it('should handle empty product name', async () => {
        const response = await processor.collectProductData('', mockChatState);

        expect(mockChatState.collectedData?.productName).toBeUndefined();
        expect(response.message).toContain('Please provide a valid product name');
        expect(response.expectedInputType).toBe('text');
      });

      it('should handle product name with quotes', async () => {
        const response = await processor.collectProductData('"My Product"', mockChatState);

        expect(mockChatState.collectedData?.productName).toBe('My Product');
        expect(response.message).toContain('Great! Now I need the URL');
      });

      it('should reject extremely long product names', async () => {
        const longName = 'a'.repeat(201);
        const response = await processor.collectProductData(longName, mockChatState);

        expect(mockChatState.collectedData?.productName).toBeUndefined();
        expect(response.message).toContain('Please provide a valid product name');
      });
    });

    describe('Product URL Collection', () => {
      beforeEach(() => {
        mockChatState.collectedData!.productName = 'TestProduct';
      });

      it('should collect valid URL with https', async () => {
        const response = await processor.collectProductData('https://example.com', mockChatState);

        expect(mockChatState.collectedData?.productUrl).toBe('https://example.com/');
        expect(response.message).toContain('Perfect! I\'ll analyze');
        expect(response.message).toContain('TestProduct');
        expect(response.stepDescription).toBe('Product Positioning');
      });

      it('should collect valid URL without protocol and add https', async () => {
        const response = await processor.collectProductData('example.com', mockChatState);

        expect(mockChatState.collectedData?.productUrl).toBe('https://example.com/');
        expect(response.message).toContain('Perfect! I\'ll analyze');
      });

      it('should handle URL with http protocol', async () => {
        const response = await processor.collectProductData('http://example.com', mockChatState);

        expect(mockChatState.collectedData?.productUrl).toBe('http://example.com/');
        expect(response.message).toContain('Perfect! I\'ll analyze');
      });

      it('should reject invalid URLs', async () => {
        const response = await processor.collectProductData('not-a-url', mockChatState);

        expect(mockChatState.collectedData?.productUrl).toBeUndefined();
        expect(response.message).toContain('Please provide a valid URL');
        expect(response.expectedInputType).toBe('url');
      });

      it('should reject URLs with invalid protocols', async () => {
        const response = await processor.collectProductData('ftp://example.com', mockChatState);

        expect(mockChatState.collectedData?.productUrl).toBeUndefined();
        expect(response.message).toContain('Please provide a valid URL');
      });
    });

    describe('Positioning Collection', () => {
      beforeEach(() => {
        mockChatState.collectedData!.productName = 'TestProduct';
        mockChatState.collectedData!.productUrl = 'https://example.com';
      });

      it('should collect positioning information', async () => {
        const positioning = 'We are the leading meal kit provider with focus on sustainability';
        const response = await processor.collectProductData(positioning, mockChatState);

        expect(mockChatState.collectedData?.positioning).toBe(positioning);
        expect(response.message).toContain('Excellent positioning information');
        expect(response.message).toContain('understand your customers');
        expect(response.stepDescription).toBe('Customer Data Collection');
      });

      it('should trim whitespace from positioning', async () => {
        const positioning = '   Leading meal kit provider   ';
        const response = await processor.collectProductData(positioning, mockChatState);

        expect(mockChatState.collectedData?.positioning).toBe('Leading meal kit provider');
        expect(response.message).toContain('Excellent positioning information');
      });
    });

    describe('Customer Data Collection', () => {
      beforeEach(() => {
        mockChatState.collectedData!.productName = 'TestProduct';
        mockChatState.collectedData!.productUrl = 'https://example.com';
        mockChatState.collectedData!.positioning = 'Leading provider';
      });

      it('should collect customer data', async () => {
        const customerData = 'We serve 500k customers, mostly urban professionals aged 25-45';
        const response = await processor.collectProductData(customerData, mockChatState);

        expect(mockChatState.collectedData?.customerData).toBe(customerData);
        expect(response.message).toContain('Great customer insights');
        expect(response.message).toContain('core user problems');
        expect(response.stepDescription).toBe('User Problem Collection');
      });
    });

    describe('User Problem Collection', () => {
      beforeEach(() => {
        mockChatState.collectedData!.productName = 'TestProduct';
        mockChatState.collectedData!.productUrl = 'https://example.com';
        mockChatState.collectedData!.positioning = 'Leading provider';
        mockChatState.collectedData!.customerData = 'Urban professionals';
      });

      it('should collect user problems', async () => {
        const userProblem = 'Time-poor professionals struggle with meal planning and grocery shopping';
        const response = await processor.collectProductData(userProblem, mockChatState);

        expect(mockChatState.collectedData?.userProblem).toBe(userProblem);
        expect(response.message).toContain('Perfect! Last question');
        expect(response.message).toContain('industry');
        expect(response.stepDescription).toBe('Industry Classification');
      });
    });

    describe('Industry Collection', () => {
      beforeEach(() => {
        mockChatState.collectedData!.productName = 'TestProduct';
        mockChatState.collectedData!.productUrl = 'https://example.com';
        mockChatState.collectedData!.positioning = 'Leading provider';
        mockChatState.collectedData!.customerData = 'Urban professionals';
        mockChatState.collectedData!.userProblem = 'Meal planning struggles';
      });

      it('should collect industry and complete the flow', async () => {
        const industry = 'Food Technology / Meal Kit Delivery';
        const response = await processor.collectProductData(industry, mockChatState);

        expect(mockChatState.collectedData?.industry).toBe(industry);
        expect(response.message).toContain('Product Information Complete');
        expect(response.message).toContain('TestProduct');
        expect(response.message).toContain('https://example.com');
        expect(response.stepDescription).toBe('Product Creation Ready');
        expect(response.nextStep).toBeDefined();
      });
    });
  });

  describe('validateProductData', () => {
    it('should return false for empty chat state', () => {
      const emptyChatState: ChatState = {
        currentStep: 1,
        stepDescription: 'Test',
        expectedInputType: 'text'
      };

      expect(processor.validateProductData(emptyChatState)).toBe(false);
    });

    it('should return false for incomplete data', () => {
      mockChatState.collectedData = {
        productName: 'TestProduct',
        productUrl: 'https://example.com'
        // Missing positioning, customerData, userProblem, industry
      };

      expect(processor.validateProductData(mockChatState)).toBe(false);
    });

    it('should return true for complete data', () => {
      mockChatState.collectedData = {
        productName: 'TestProduct',
        productUrl: 'https://example.com',
        positioning: 'Leading provider',
        customerData: 'Urban professionals',
        userProblem: 'Meal planning',
        industry: 'Food Tech'
      };

      expect(processor.validateProductData(mockChatState)).toBe(true);
    });
  });

  describe('getNextProductStep', () => {
    it('should return step 1 for no collected data', () => {
      const emptyChatState: ChatState = {
        currentStep: 1,
        stepDescription: 'Test',
        expectedInputType: 'text'
      };

      expect(processor.getNextProductStep(emptyChatState)).toBe(1);
    });

    it('should return correct step numbers for partial data', () => {
      // No product name
      mockChatState.collectedData = {};
      expect(processor.getNextProductStep(mockChatState)).toBe(1);

      // Has product name, needs URL
      mockChatState.collectedData.productName = 'Test';
      expect(processor.getNextProductStep(mockChatState)).toBe(2);

      // Has name and URL, needs positioning
      mockChatState.collectedData.productUrl = 'https://example.com';
      expect(processor.getNextProductStep(mockChatState)).toBe(3);

      // Has name, URL, positioning, needs customer data
      mockChatState.collectedData.positioning = 'Leading';
      expect(processor.getNextProductStep(mockChatState)).toBe(4);

      // Has name, URL, positioning, customer data, needs user problem
      mockChatState.collectedData.customerData = 'Professionals';
      expect(processor.getNextProductStep(mockChatState)).toBe(5);

      // Has most data, needs industry
      mockChatState.collectedData.userProblem = 'Time constraints';
      expect(processor.getNextProductStep(mockChatState)).toBe(6);
    });

    it('should return null for complete data', () => {
      mockChatState.collectedData = {
        productName: 'TestProduct',
        productUrl: 'https://example.com',
        positioning: 'Leading provider',
        customerData: 'Urban professionals',
        userProblem: 'Meal planning',
        industry: 'Food Tech'
      };

      expect(processor.getNextProductStep(mockChatState)).toBe(null);
    });
  });

  describe('URL parsing edge cases', () => {
    beforeEach(() => {
      mockChatState.collectedData!.productName = 'TestProduct';
    });

    it('should handle URLs with paths and parameters', async () => {
      const response = await processor.collectProductData('example.com/products?utm_source=test', mockChatState);

      expect(mockChatState.collectedData?.productUrl).toBe('https://example.com/products?utm_source=test');
      expect(response.message).toContain('Perfect! I\'ll analyze');
    });

    it('should handle URLs with ports', async () => {
      const response = await processor.collectProductData('localhost:3000', mockChatState);

      expect(mockChatState.collectedData?.productUrl).toBe('https://localhost:3000/');
      expect(response.message).toContain('Perfect! I\'ll analyze');
    });

    it('should reject URLs with very short hostnames', async () => {
      const response = await processor.collectProductData('ab', mockChatState);

      expect(mockChatState.collectedData?.productUrl).toBeUndefined();
      expect(response.message).toContain('Please provide a valid URL');
    });
  });

  describe('Integration flow test', () => {
    it('should complete full product data collection flow', async () => {
      // Step 1: Product name
      let response = await processor.collectProductData('HelloFresh', mockChatState);
      expect(response.stepDescription).toBe('Product URL Collection');

      // Step 2: Product URL
      response = await processor.collectProductData('hellofresh.com', mockChatState);
      expect(response.stepDescription).toBe('Product Positioning');

      // Step 3: Positioning
      response = await processor.collectProductData('Leading meal kit delivery service', mockChatState);
      expect(response.stepDescription).toBe('Customer Data Collection');

      // Step 4: Customer data
      response = await processor.collectProductData('500k+ customers, urban professionals', mockChatState);
      expect(response.stepDescription).toBe('User Problem Collection');

      // Step 5: User problems
      response = await processor.collectProductData('Time constraints and meal planning difficulties', mockChatState);
      expect(response.stepDescription).toBe('Industry Classification');

      // Step 6: Industry
      response = await processor.collectProductData('Food Technology and Meal Kit Delivery', mockChatState);
      expect(response.stepDescription).toBe('Product Creation Ready');

      // Verify all data collected
      expect(processor.validateProductData(mockChatState)).toBe(true);
      expect(mockChatState.collectedData?.productName).toBe('HelloFresh');
      expect(mockChatState.collectedData?.productUrl).toBe('https://hellofresh.com/');
      expect(mockChatState.collectedData?.positioning).toBe('Leading meal kit delivery service');
      expect(mockChatState.collectedData?.customerData).toBe('500k+ customers, urban professionals');
      expect(mockChatState.collectedData?.userProblem).toBe('Time constraints and meal planning difficulties');
      expect(mockChatState.collectedData?.industry).toBe('Food Technology and Meal Kit Delivery');
    });
  });
}); 