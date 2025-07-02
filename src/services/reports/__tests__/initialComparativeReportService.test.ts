import { 
  InitialComparativeReportService,
  InitialReportOptions,
  ProjectReadinessResult,
  SnapshotCaptureResult,
  DataAvailabilityResult
} from '../initialComparativeReportService';

// Mock dependencies
jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    project: {
      findUnique: jest.fn()
    }
  }
}));

jest.mock('../../webScraper', () => ({
  webScraperService: {
    initialize: jest.fn(),
    close: jest.fn(),
    scrapeCompetitor: jest.fn()
  }
}));

jest.mock('../comparativeReportService');
jest.mock('../../analysis/comparativeAnalysisService');

describe('InitialComparativeReportService', () => {
  let service: InitialComparativeReportService;

  beforeEach(() => {
    service = new InitialComparativeReportService();
    jest.clearAllMocks();
  });

  describe('Service Structure', () => {
    it('should be instantiable', () => {
      expect(service).toBeInstanceOf(InitialComparativeReportService);
    });

    it('should have all required methods as per implementation plan', () => {
      // Main method
      expect(typeof service.generateInitialComparativeReport).toBe('function');
      
      // Supporting methods
      expect(typeof service.validateProjectReadiness).toBe('function');
      expect(typeof service.captureCompetitorSnapshots).toBe('function');
      expect(typeof service.ensureBasicCompetitorData).toBe('function');
    });
  });

  describe('Interface Types', () => {
    it('should export all required interfaces', () => {
      // These should be importable without errors
      const mockOptions: InitialReportOptions = {
        template: 'comprehensive',
        priority: 'high',
        timeout: 60000,
        fallbackToPartialData: true,
        requireFreshSnapshots: true
      };
      
      const mockReadinessResult: ProjectReadinessResult = {
        isReady: true,
        hasProduct: true,
        hasCompetitors: true,
        hasProductData: true,
        missingData: [],
        readinessScore: 100
      };

      const mockSnapshotResult: SnapshotCaptureResult = {
        success: true,
        capturedCount: 2,
        totalCompetitors: 2,
        failures: [],
        captureTime: 5000
      };

      const mockDataResult: DataAvailabilityResult = {
        hasMinimumData: true,
        dataCompletenessScore: 85,
        availableCompetitors: 2,
        totalCompetitors: 2,
        dataFreshness: 'new'
      };

      // If we can create these objects, the interfaces are properly exported
      expect(mockOptions).toBeDefined();
      expect(mockReadinessResult).toBeDefined();
      expect(mockSnapshotResult).toBeDefined();
      expect(mockDataResult).toBeDefined();
    });
  });

  describe('Method Signatures', () => {
    it('generateInitialComparativeReport should have correct signature', () => {
      const method = service.generateInitialComparativeReport;
      expect(method).toBeDefined();
      expect(method.length).toBe(2); // projectId and options parameters
    });

    it('validateProjectReadiness should have correct signature', () => {
      const method = service.validateProjectReadiness;
      expect(method).toBeDefined();
      expect(method.length).toBe(1); // projectId parameter
    });

    it('captureCompetitorSnapshots should have correct signature', () => {
      const method = service.captureCompetitorSnapshots;
      expect(method).toBeDefined();
      expect(method.length).toBe(1); // projectId parameter
    });

    it('ensureBasicCompetitorData should have correct signature', () => {
      const method = service.ensureBasicCompetitorData;
      expect(method).toBeDefined();
      expect(method.length).toBe(1); // projectId parameter
    });
  });
}); 