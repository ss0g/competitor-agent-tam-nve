import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { NextRequest } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { POST as createProduct, GET as getProducts } from '@/app/api/products/route';
import { POST as generateComparativeReport, GET as getComparativeStatus } from '@/app/api/reports/comparative/route';
import { POST as createSchedule, GET as getSchedules } from '@/app/api/reports/schedules/comparative/route';

describe('PRODUCT vs COMPETITOR API Integration Tests', () => {
  let prisma: PrismaClient;
  let testProjectId: string;
  let testProductId: string;
  let testCompetitorIds: string[] = [];

  beforeAll(async () => {
    prisma = new PrismaClient();
    
    // Create test project
    const testProject = await prisma.project.create({
      data: {
        name: 'API Integration Test Project',
        description: 'Test project for API integration',
        status: 'ACTIVE',
        priority: 'HIGH',
        userId: 'api-test-user',
        parameters: {},
        tags: ['api-integration-test'],
        userEmail: 'api-test@example.com'
      }
    });
    testProjectId = testProject.id;

    // Create test competitors
    const competitor1 = await prisma.competitor.create({
      data: {
        name: 'API Test Competitor 1',
        website: 'https://api-competitor1.example.com',
        description: 'First API test competitor',
        industry: 'Technology',
        projects: {
          connect: { id: testProjectId }
        }
      }
    });

    const competitor2 = await prisma.competitor.create({
      data: {
        name: 'API Test Competitor 2',
        website: 'https://api-competitor2.example.com',
        description: 'Second API test competitor',
        industry: 'Technology',
        projects: {
          connect: { id: testProjectId }
        }
      }
    });

    testCompetitorIds = [competitor1.id, competitor2.id];

    // Create competitor snapshots
    await prisma.snapshot.create({
      data: {
        competitorId: competitor1.id,
        metadata: {
          url: competitor1.website,
          title: 'API Test Competitor 1 - Solutions',
          description: 'Leading solutions provider',
          html: '<html><body><h1>API Test Competitor 1</h1><p>Leading solutions</p></body></html>',
          text: 'API Test Competitor 1 Leading solutions provider',
          statusCode: 200,
          contentLength: 100,
          scrapingTimestamp: new Date(),
          scrapingMethod: 'api-test'
        }
      }
    });

    await prisma.snapshot.create({
      data: {
        competitorId: competitor2.id,
        metadata: {
          url: competitor2.website,
          title: 'API Test Competitor 2 - Innovation',
          description: 'Innovation at scale',
          html: '<html><body><h1>API Test Competitor 2</h1><p>Innovation at scale</p></body></html>',
          text: 'API Test Competitor 2 Innovation at scale',
          statusCode: 200,
          contentLength: 90,
          scrapingTimestamp: new Date(),
          scrapingMethod: 'api-test'
        }
      }
    });
  });

  afterAll(async () => {
    // Cleanup test data
    if (testProductId) {
      await prisma.productSnapshot.deleteMany({
        where: { productId: testProductId }
      });
      await prisma.product.deleteMany({
        where: { id: testProductId }
      });
    }

    await prisma.snapshot.deleteMany({
      where: { competitorId: { in: testCompetitorIds } }
    });

    await prisma.competitor.deleteMany({
      where: { id: { in: testCompetitorIds } }
    });

    await prisma.project.deleteMany({
      where: { id: testProjectId }
    });

    await prisma.$disconnect();
  });

  describe('Product API Endpoints', () => {
    it('should create a product via API with observability tracking', async () => {
      const productData = {
        name: 'API Test Product',
        website: 'https://api-test-product.example.com',
        positioning: 'Leading API-driven platform',
        customerData: 'Developers and technical teams',
        userProblem: 'Complex API integrations',
        industry: 'Technology',
        projectId: testProjectId
      };

      const request = new NextRequest('http://localhost:3000/api/products', {
        method: 'POST',
        body: JSON.stringify(productData),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await createProduct(request);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.data).toBeDefined();
      expect(responseData.data.name).toBe(productData.name);
      expect(responseData.data.projectId).toBe(testProjectId);
      expect(responseData.correlationId).toBeDefined();

      testProductId = responseData.data.id;

      // Verify observability data
      expect(typeof responseData.correlationId).toBe('string');
      expect(responseData.correlationId.length).toBeGreaterThan(0);
    });

    it('should get products by project ID with performance tracking', async () => {
      const request = new NextRequest(`http://localhost:3000/api/products?projectId=${testProjectId}`, {
        method: 'GET'
      });

      const startTime = Date.now();
      const response = await getProducts(request);
      const endTime = Date.now();
      const responseTime = endTime - startTime;

      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.data).toBeDefined();
      expect(Array.isArray(responseData.data)).toBe(true);
      expect(responseData.data.length).toBe(1);
      expect(responseData.data[0].id).toBe(testProductId);
      expect(responseData.correlationId).toBeDefined();

      // Performance assertion
      expect(responseTime).toBeLessThan(5000); // Should complete within 5 seconds

      console.log(`Product retrieval API response time: ${responseTime}ms`);
    });

    it('should handle validation errors with proper error tracking', async () => {
      const invalidProductData = {
        name: '', // Invalid: empty name
        website: 'invalid-url', // Invalid: not a proper URL
        projectId: '' // Invalid: empty project ID
      };

      const request = new NextRequest('http://localhost:3000/api/products', {
        method: 'POST',
        body: JSON.stringify(invalidProductData),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await createProduct(request);
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData.error).toBeDefined();
      expect(responseData.code).toBe('MISSING_REQUIRED_FIELDS');
      expect(responseData.correlationId).toBeDefined();

      // Verify error tracking
      expect(typeof responseData.correlationId).toBe('string');
    });
  });

  describe('Comparative Report API Endpoints', () => {
    beforeAll(async () => {
      // Create a product snapshot for comparative analysis
      await prisma.productSnapshot.create({
        data: {
          productId: testProductId,
          content: {
            url: 'https://api-test-product.example.com',
            title: 'API Test Product - Platform',
            description: 'Leading API-driven platform for developers',
            html: '<html><body><h1>API Test Product</h1><p>API-driven platform</p></body></html>',
            text: 'API Test Product API-driven platform for developers',
            headers: { 'content-type': 'text/html' },
            statusCode: 200,
            contentLength: 120
          },
          metadata: {
            scrapingTimestamp: new Date(),
            scrapingMethod: 'api-test',
            contentLength: 120,
            statusCode: 200
          }
        }
      });
    });

    it('should get comparative report status with monitoring data', async () => {
      const request = new NextRequest(`http://localhost:3000/api/reports/comparative?projectId=${testProjectId}`, {
        method: 'GET'
      });

      const startTime = Date.now();
      const response = await getComparativeStatus(request);
      const endTime = Date.now();
      const responseTime = endTime - startTime;

      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.data).toBeDefined();
      expect(responseData.data.projectId).toBe(testProjectId);
      expect(responseData.data.scrapingStatus).toBeDefined();
      expect(responseData.correlationId).toBeDefined();

      // Performance validation
      expect(responseTime).toBeLessThan(5000); // Should complete within 5 seconds

      console.log(`Status retrieval API response time: ${responseTime}ms`);
    });

    it('should handle missing project ID with proper error tracking', async () => {
      const request = new NextRequest('http://localhost:3000/api/reports/comparative', {
        method: 'POST',
        body: JSON.stringify({
          reportName: 'Test Report'
          // Missing projectId
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await generateComparativeReport(request);
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData.error).toBe('Project ID is required');
      expect(responseData.code).toBe('MISSING_PROJECT_ID');
      expect(responseData.correlationId).toBeDefined();
    });
  });

  describe('Scheduling API Endpoints', () => {
    it('should create comparative report schedule with observability', async () => {
      const scheduleRequest = {
        projectId: testProjectId,
        frequency: 'WEEKLY',
        reportName: 'Scheduled API Test Report',
        enabled: true
      };

      const request = new NextRequest('http://localhost:3000/api/reports/schedules/comparative', {
        method: 'POST',
        body: JSON.stringify(scheduleRequest),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const startTime = Date.now();
      const response = await createSchedule(request);
      const endTime = Date.now();
      const responseTime = endTime - startTime;

      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.scheduleId).toBeDefined();
      expect(responseData.message).toBeDefined();

      // Performance validation
      expect(responseTime).toBeLessThan(10000); // Should complete within 10 seconds

      console.log(`Schedule creation API response time: ${responseTime}ms`);
      console.log(`Created schedule ID: ${responseData.scheduleId}`);
    });

    it('should list project schedules with performance monitoring', async () => {
      const request = new NextRequest(`http://localhost:3000/api/reports/schedules/comparative?projectId=${testProjectId}`, {
        method: 'GET'
      });

      const startTime = Date.now();
      const response = await getSchedules(request);
      const endTime = Date.now();
      const responseTime = endTime - startTime;

      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.schedules).toBeDefined();
      expect(Array.isArray(responseData.schedules)).toBe(true);
      expect(responseData.count).toBeDefined();

      // Performance validation
      expect(responseTime).toBeLessThan(5000); // Should complete within 5 seconds

      console.log(`Schedule listing API response time: ${responseTime}ms`);
      console.log(`Number of schedules: ${responseData.count}`);
    });
  });

  describe('End-to-End API Workflow', () => {
    it('should complete basic PRODUCT vs COMPETITOR workflow via APIs', async () => {
      const workflowStartTime = Date.now();
      const correlationId = `e2e-test-${Date.now()}`;

      console.log(`Starting E2E API workflow with correlation ID: ${correlationId}`);

      // Step 1: Verify product exists
      const getProductsRequest = new NextRequest(`http://localhost:3000/api/products?projectId=${testProjectId}`, {
        method: 'GET'
      });

      const productsResponse = await getProducts(getProductsRequest);
      const productsData = await productsResponse.json();

      expect(productsResponse.status).toBe(200);
      expect(productsData.data.length).toBeGreaterThan(0);

      // Step 2: Get comparative report status
      const statusRequest = new NextRequest(`http://localhost:3000/api/reports/comparative?projectId=${testProjectId}`, {
        method: 'GET'
      });

      const statusResponse = await getComparativeStatus(statusRequest);
      const statusData = await statusResponse.json();

      expect(statusResponse.status).toBe(200);
      expect(statusData.data.projectId).toBe(testProjectId);

      const workflowEndTime = Date.now();
      const totalWorkflowTime = workflowEndTime - workflowStartTime;

      console.log(`E2E API workflow completed in ${totalWorkflowTime}ms`);

      // Performance validation for entire workflow
      expect(totalWorkflowTime).toBeLessThan(30000); // Should complete within 30 seconds

      // Validate observability data across all steps
      expect(productsData.correlationId).toBeDefined();
      expect(statusData.correlationId).toBeDefined();

      // Validate data consistency
      expect(productsData.data[0].projectId).toBe(testProjectId);
      expect(statusData.data.projectId).toBe(testProjectId);
    });

    it('should demonstrate error handling and recovery across APIs', async () => {
      const correlationId = `error-test-${Date.now()}`;

      console.log(`Starting error handling test with correlation ID: ${correlationId}`);

      // Test 1: Invalid product creation
      const invalidProductRequest = new NextRequest('http://localhost:3000/api/products', {
        method: 'POST',
        body: JSON.stringify({
          name: '',
          projectId: 'non-existent-project'
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const invalidProductResponse = await createProduct(invalidProductRequest);
      const invalidProductData = await invalidProductResponse.json();

      expect(invalidProductResponse.status).toBe(400);
      expect(invalidProductData.error).toBeDefined();
      expect(invalidProductData.correlationId).toBeDefined();

      // Test 2: Report status for non-existent project
      const invalidStatusRequest = new NextRequest('http://localhost:3000/api/reports/comparative?projectId=non-existent-project-id', {
        method: 'GET'
      });

      const invalidStatusResponse = await getComparativeStatus(invalidStatusRequest);
      const invalidStatusData = await invalidStatusResponse.json();

      expect(invalidStatusResponse.status).toBeGreaterThanOrEqual(400);
      expect(invalidStatusData.correlationId).toBeDefined();

      // Test 3: Schedule creation with invalid data
      const invalidScheduleRequest = new NextRequest('http://localhost:3000/api/reports/schedules/comparative', {
        method: 'POST',
        body: JSON.stringify({
          frequency: 'INVALID_FREQUENCY'
          // Missing projectId
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const invalidScheduleResponse = await createSchedule(invalidScheduleRequest);
      const invalidScheduleData = await invalidScheduleResponse.json();

      expect(invalidScheduleResponse.status).toBe(400);
      expect(invalidScheduleData.error).toBeDefined();

      console.log('Error handling test completed - all errors properly tracked and handled');

      // Validate that all error responses include correlation IDs for tracking
      expect(invalidProductData.correlationId).toBeDefined();
      expect(invalidStatusData.correlationId).toBeDefined();
    });
  });

  describe('Performance and Observability Validation', () => {
    it('should track API performance metrics across all endpoints', async () => {
      const performanceMetrics = {
        productCreation: 0,
        productRetrieval: 0,
        statusCheck: 0,
        scheduleCreation: 0
      };

      // Test product creation performance
      const productStartTime = Date.now();
      const productRequest = new NextRequest('http://localhost:3000/api/products', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Performance Test Product',
          website: 'https://performance-test.example.com',
          positioning: 'Performance testing platform',
          customerData: 'Performance testers',
          userProblem: 'Slow APIs',
          industry: 'Technology',
          projectId: testProjectId
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const productResponse = await createProduct(productRequest);
      performanceMetrics.productCreation = Date.now() - productStartTime;

      expect(productResponse.status).toBe(200);

      // Test product retrieval performance
      const retrievalStartTime = Date.now();
      const retrievalRequest = new NextRequest(`http://localhost:3000/api/products?projectId=${testProjectId}`, {
        method: 'GET'
      });

      const retrievalResponse = await getProducts(retrievalRequest);
      performanceMetrics.productRetrieval = Date.now() - retrievalStartTime;

      expect(retrievalResponse.status).toBe(200);

      // Test status check performance
      const statusStartTime = Date.now();
      const statusRequest = new NextRequest(`http://localhost:3000/api/reports/comparative?projectId=${testProjectId}`, {
        method: 'GET'
      });

      const statusResponse = await getComparativeStatus(statusRequest);
      performanceMetrics.statusCheck = Date.now() - statusStartTime;

      expect(statusResponse.status).toBe(200);

      console.log('API Performance Metrics:');
      console.log(`Product Creation: ${performanceMetrics.productCreation}ms`);
      console.log(`Product Retrieval: ${performanceMetrics.productRetrieval}ms`);
      console.log(`Status Check: ${performanceMetrics.statusCheck}ms`);

      // Performance assertions
      expect(performanceMetrics.productCreation).toBeLessThan(10000);
      expect(performanceMetrics.productRetrieval).toBeLessThan(5000);
      expect(performanceMetrics.statusCheck).toBeLessThan(5000);

      // Validate that all responses include observability data
      const productData = await productResponse.json();
      const retrievalData = await retrievalResponse.json();
      const statusData = await statusResponse.json();

      expect(productData.correlationId).toBeDefined();
      expect(retrievalData.correlationId).toBeDefined();
      expect(statusData.correlationId).toBeDefined();
    });

    it('should validate correlation ID consistency and tracking', async () => {
      const correlationIds = [];

      // Make multiple API calls and collect correlation IDs
      for (let i = 0; i < 3; i++) {
        const request = new NextRequest(`http://localhost:3000/api/products?projectId=${testProjectId}`, {
          method: 'GET'
        });

        const response = await getProducts(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.correlationId).toBeDefined();
        correlationIds.push(data.correlationId);
      }

      // Validate that each call gets a unique correlation ID
      const uniqueIds = new Set(correlationIds);
      expect(uniqueIds.size).toBe(correlationIds.length);

      // Validate correlation ID format (should be strings with reasonable length)
      correlationIds.forEach(id => {
        expect(typeof id).toBe('string');
        expect(id.length).toBeGreaterThan(10);
      });

      console.log('Correlation ID tracking validated:', correlationIds);
    });
  });
}); 