/**
 * Production Load Testing for Task 4.1
 * Tests 20 concurrent project creations with immediate report generation
 */

import { logger } from '@/src/lib/logger';

const PRODUCTION_LOAD_CONFIG = {
  concurrentProjects: 20,
  maxResponseTime: 45000,
  averageResponseTarget: 40000,
  rateLimitTestConnections: 25,
  testTimeout: 300000,
  baseUrl: process.env.TEST_BASE_URL || 'http://localhost:3000',
  resourceMonitoringInterval: 2000,
};

const generateProjectTestData = (index: number) => ({
  name: `Production Load Test Project ${index} - ${Date.now()}`,
  description: `Production-scale load testing project ${index}`,
  productName: `Load Test Product ${index}`,
  productWebsite: `https://loadtest${index}-${Date.now()}.example.com`,
  positioning: `High-performance load testing platform ${index}`,
  customerData: `Enterprise customers requiring load testing ${index}`,
  userProblem: `Complex performance testing needs ${index}`,
  industry: 'Performance Testing',
  autoAssignCompetitors: true,
  generateInitialReport: true,
  requireFreshSnapshots: true,
  reportTemplate: 'comprehensive',
  enableAIAnalysis: false,
});

interface ResourceMetrics {
  timestamp: number;
  memoryUsage: {
    rss: number;
    heapUsed: number;
    heapTotal: number;
    external: number;
  };
  responseTime?: number;
}

class ProductionLoadMonitor {
  private metrics: ResourceMetrics[] = [];
  private monitoring = false;
  private monitoringInterval?: NodeJS.Timeout;

  startMonitoring() {
    this.monitoring = true;
    this.metrics = [];
    
    this.monitoringInterval = setInterval(() => {
      if (!this.monitoring) return;
      
      const memoryUsage = process.memoryUsage();
      this.metrics.push({
        timestamp: Date.now(),
        memoryUsage,
      });
    }, PRODUCTION_LOAD_CONFIG.resourceMonitoringInterval);

    logger.info('Production load monitoring started');
  }

  stopMonitoring() {
    this.monitoring = false;
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }
    logger.info('Production load monitoring stopped');
  }

  getResourceSummary() {
    if (this.metrics.length === 0) return null;

    const memoryPeaks = {
      rss: Math.max(...this.metrics.map(m => m.memoryUsage.rss)),
      heapUsed: Math.max(...this.metrics.map(m => m.memoryUsage.heapUsed)),
      heapTotal: Math.max(...this.metrics.map(m => m.memoryUsage.heapTotal)),
    };

    return {
      duration: this.metrics.length > 1 ? this.metrics[this.metrics.length - 1].timestamp - this.metrics[0].timestamp : 0,
      resourcePeaks: {
        rssMemoryMB: Math.round(memoryPeaks.rss / 1024 / 1024),
        heapUsedMB: Math.round(memoryPeaks.heapUsed / 1024 / 1024),
        heapTotalMB: Math.round(memoryPeaks.heapTotal / 1024 / 1024),
      },
      metricsCollected: this.metrics.length
    };
  }
}

async function callProductionAPI(path: string, options: any = {}) {
  const url = `${PRODUCTION_LOAD_CONFIG.baseUrl}${path}`;
  const startTime = Date.now();

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    const responseTime = Date.now() - startTime;
    const data = response.ok ? await response.json() : null;

    return {
      success: response.ok,
      status: response.status,
      responseTime,
      data,
      error: response.ok ? null : `HTTP ${response.status}`,
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    return {
      success: false,
      status: 0,
      responseTime,
      data: null,
      error: (error as Error).message,
    };
  }
}

async function createProjectWithReport(projectData: any) {
  const result = await callProductionAPI('/api/projects', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(projectData),
  });

  if (result.success && result.data) {
    return {
      success: true,
      responseTime: result.responseTime,
      projectId: result.data.id,
      reportGenerated: result.data.reportGeneration?.initialReportGenerated || false,
      status: result.status,
    };
  } else {
    return {
      success: false,
      responseTime: result.responseTime,
      error: result.error || 'Unknown error',
      status: result.status,
    };
  }
}

describe('Production Load Testing - Task 4.1', () => {
  let monitor: ProductionLoadMonitor;

  beforeEach(() => {
    monitor = new ProductionLoadMonitor();
  });

  afterEach(() => {
    if (monitor) {
      monitor.stopMonitoring();
    }
  });

  it('should handle 20 concurrent project creations with reports', async () => {
    monitor.startMonitoring();
    const startTime = Date.now();

    logger.info('Starting 20 concurrent project creation load test');

    const projectDataArray = Array.from(
      { length: PRODUCTION_LOAD_CONFIG.concurrentProjects },
      (_, index) => generateProjectTestData(index + 1)
    );

    const creationPromises = projectDataArray.map((projectData) => 
      createProjectWithReport(projectData).catch(error => ({
        success: false,
        responseTime: PRODUCTION_LOAD_CONFIG.maxResponseTime,
        error: error.message,
      }))
    );

    const results = await Promise.all(creationPromises);
    const totalTime = Date.now() - startTime;

    monitor.stopMonitoring();

    const successful = results.filter(r => r.success);
    const responseTimes = results.map(r => r.responseTime);
    const averageResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
    const maxResponseTime = Math.max(...responseTimes);
    const reportsGenerated = successful.filter(r => r.reportGenerated).length;

    const resourceSummary = monitor.getResourceSummary();

    logger.info('Load test completed', {
      successful: successful.length,
      averageResponseTime: Math.round(averageResponseTime),
      maxResponseTime,
      reportsGenerated,
      resourceSummary,
    });

    // Performance assertions
    expect(successful.length).toBeGreaterThanOrEqual(18); // Allow 2 failures
    expect(averageResponseTime).toBeLessThan(PRODUCTION_LOAD_CONFIG.averageResponseTarget);
    expect(maxResponseTime).toBeLessThan(PRODUCTION_LOAD_CONFIG.maxResponseTime);
    expect(reportsGenerated).toBeGreaterThanOrEqual(15); // At least 75% should generate reports

    // Resource assertions
    if (resourceSummary) {
      expect(resourceSummary.resourcePeaks.heapUsedMB).toBeLessThan(2048);
      expect(resourceSummary.resourcePeaks.rssMemoryMB).toBeLessThan(4096);
    }

  }, PRODUCTION_LOAD_CONFIG.testTimeout);

  it('should enforce rate limits under heavy load', async () => {
    monitor.startMonitoring();

    logger.info('Testing rate limiting effectiveness');

    const rateLimitTestData = Array.from(
      { length: PRODUCTION_LOAD_CONFIG.rateLimitTestConnections },
      (_, index) => generateProjectTestData(1000 + index)
    );

    const rateLimitPromises = rateLimitTestData.map((projectData) => 
      createProjectWithReport(projectData).catch(error => ({
        success: false,
        responseTime: 0,
        error: error.message,
        status: 429
      }))
    );

    const rateLimitResults = await Promise.all(rateLimitPromises);

    monitor.stopMonitoring();

    const rateLimited = rateLimitResults.filter(r => r.status === 429 || r.error?.includes('rate limit'));
    const rateLimitSuccessful = rateLimitResults.filter(r => r.success);

    logger.info('Rate limiting test completed', {
      rateLimited: rateLimited.length,
      successful: rateLimitSuccessful.length,
    });

    expect(rateLimited.length).toBeGreaterThan(0);
    expect(rateLimitSuccessful.length).toBeLessThan(PRODUCTION_LOAD_CONFIG.rateLimitTestConnections);

  }, 120000);
});
