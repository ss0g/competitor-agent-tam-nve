// Enhanced Mock Workflow Factory for Integration Tests
export interface MockWorkflowExecution {
  scrapingServiceCalled: boolean;
  errorHandlingCalled: boolean;
  retryAttemptsMade: boolean;
}

export interface MockDataFlow {
  dataFlowValid: boolean;
  scrapingDataValid: boolean;
}

export class MockWorkflow {
  private executionHistory: MockWorkflowExecution = {
    scrapingServiceCalled: false,
    errorHandlingCalled: false,
    retryAttemptsMade: false
  };

  public scrapingService = {
    scrapeProduct: jest.fn().mockImplementation(async (url: string) => {
      this.executionHistory.scrapingServiceCalled = true;
      
      if (url === 'not-a-valid-url') {
        this.executionHistory.errorHandlingCalled = true;
        throw new Error('Invalid URL format for scraping workflow');
      }
      
      if (url === 'https://nonexistent-domain-for-testing-12345.com') {
        this.executionHistory.errorHandlingCalled = true;
        throw new Error('URL not reachable for scraping workflow');
      }
      
      if (url === 'https://timeout-simulation.com') {
        this.executionHistory.retryAttemptsMade = true;
        this.executionHistory.errorHandlingCalled = true;
        throw new Error('Scraping timeout after retry attempts');
      }

      return {
        id: `snapshot-${Date.now()}`,
        productId: 'test-product-id',
        content: {
          html: '<html><body>Mock Content</body></html>',
          text: 'Mock text content',
          title: 'Mock Scraped Content',
          url: url
        },
        metadata: {
          statusCode: 200,
          scrapingMethod: 'automated',
          processingTime: 800,
          correlationId: `corr-${Date.now()}`,
          inputProductId: 'test-product-id'
        },
        createdAt: new Date()
      };
    }),

    scrapeProductById: jest.fn().mockImplementation(async (productId: string) => {
      this.executionHistory.scrapingServiceCalled = true;
      
      return {
        id: `snapshot-${Date.now()}`,
        productId: productId,
        content: {
          html: '<html><body>Mock Content</body></html>',
          text: 'Mock text content',
          title: 'Mock Scraped Content',
          url: 'https://example.com'
        },
        metadata: {
          statusCode: 200,
          scrapingMethod: 'automated',
          processingTime: 800,
          correlationId: `corr-${Date.now()}`,
          inputProductId: productId
        },
        createdAt: new Date()
      };
    }),

    triggerManualProductScraping: jest.fn().mockImplementation(async (projectId: string) => {
      this.executionHistory.scrapingServiceCalled = true;
      
      const batchId = `batch-${Date.now()}`;
      return [
        {
          id: `snapshot-1-${Date.now()}`,
          productId: 'test-product-id',
          content: {
            html: '<html><body>Product 1</body></html>',
            text: 'Product 1 content',
            title: 'Product 1',
            url: 'https://example.com'
          },
          metadata: {
            statusCode: 200,
            scrapingMethod: 'automated',
            processingTime: 800,
            correlationId: `corr-1-${Date.now()}`,
            batchId: batchId,
            batchSize: 2
          },
          createdAt: new Date()
        },
        {
          id: `snapshot-2-${Date.now()}`,
          productId: 'prod_2',
          content: {
            html: '<html><body>Product 2</body></html>',
            text: 'Product 2 content',
            title: 'Product 2',
            url: 'https://httpbin.org/html'
          },
          metadata: {
            statusCode: 200,
            scrapingMethod: 'automated',
            processingTime: 850,
            correlationId: `corr-2-${Date.now()}`,
            batchId: batchId,
            batchSize: 2
          },
          createdAt: new Date()
        }
      ];
    }),

    getProductScrapingStatus: jest.fn().mockImplementation(async (projectId: string) => {
      return {
        productCount: 2,
        totalSnapshots: 2,
        lastScraped: new Date(),
        correlationId: `status-corr-${Date.now()}`
      };
    })
  };

  public verifyWorkflowExecution(): MockWorkflowExecution {
    return { ...this.executionHistory };
  }

  public verifyDataFlow(): MockDataFlow {
    return {
      dataFlowValid: this.executionHistory.scrapingServiceCalled,
      scrapingDataValid: true
    };
  }

  public reset(): void {
    this.executionHistory = {
      scrapingServiceCalled: false,
      errorHandlingCalled: false,
      retryAttemptsMade: false
    };
    jest.clearAllMocks();
  }
}

export const createMockWorkflow = (): MockWorkflow => {
  return new MockWorkflow();
};
