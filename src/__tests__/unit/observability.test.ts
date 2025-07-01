import { 
  ObservabilityCollector, 
  observabilityUtils, 
  createObservabilityCollector,
  ReportViewerMetrics,
  UserJourneyStep,
  SessionSummary 
} from '@/lib/observability';
import * as logger from '@/lib/logger';

// Mock the logger module
jest.mock('@/lib/logger', () => ({
  trackEvent: jest.fn(),
  trackError: jest.fn(),
  trackPerformance: jest.fn(),
  trackUserAction: jest.fn(),
  generateCorrelationId: jest.fn(() => 'test-correlation-id'),
}));

describe('ObservabilityCollector', () => {
  let collector: ObservabilityCollector;
  const mockTrackEvent = logger.trackEvent as jest.MockedFunction<typeof logger.trackEvent>;
  const mockTrackError = logger.trackError as jest.MockedFunction<typeof logger.trackError>;
  const mockTrackPerformance = logger.trackPerformance as jest.MockedFunction<typeof logger.trackPerformance>;
  const mockTrackUserAction = logger.trackUserAction as jest.MockedFunction<typeof logger.trackUserAction>;

  beforeEach(() => {
    jest.useFakeTimers();
    collector = new ObservabilityCollector('test_feature', 'test_session');
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('constructor', () => {
    it('should initialize with correct properties', () => {
      expect(collector).toBeDefined();
      expect(logger.generateCorrelationId).toHaveBeenCalled();
    });

    it('should generate session ID if not provided', () => {
      const collectorWithoutSession = new ObservabilityCollector('test_feature');
      expect(collectorWithoutSession).toBeDefined();
    });
  });

  describe('trackJourneyStep', () => {
    it('should track successful journey step', () => {
      collector.trackJourneyStep('page_load', true, { page: 'reports' });

      expect(mockTrackEvent).toHaveBeenCalledWith(
        {
          eventType: 'user_journey_step',
          category: 'user_action',
          metadata: expect.objectContaining({
            step: 'page_load',
            success: true,
            journeyLength: 1,
            page: 'reports',
          }),
        },
        expect.objectContaining({
          correlationId: 'test-correlation-id',
          sessionId: 'test_session',
          feature: 'test_feature',
        })
      );
    });

    it('should track failed journey step', () => {
      collector.trackJourneyStep('api_call', false, { error: 'Network error' });

      expect(mockTrackEvent).toHaveBeenCalledWith(
        {
          eventType: 'user_journey_step',
          category: 'user_action',
          metadata: expect.objectContaining({
            step: 'api_call',
            success: false,
            error: 'Network error',
          }),
        },
        expect.any(Object)
      );
    });

    it('should calculate duration between steps', () => {
      collector.trackJourneyStep('step1', true);
      
      // Simulate time passing
      jest.advanceTimersByTime(100);
      
      collector.trackJourneyStep('step2', true);

      expect(mockTrackEvent).toHaveBeenCalledTimes(2);
      const secondCall = mockTrackEvent.mock.calls[1];
      expect(secondCall[0].metadata).toHaveProperty('duration');
    });
  });

  describe('trackMetric', () => {
    it('should track performance metric', () => {
      collector.trackMetric('pageLoadTime', 1500, { page: 'reports' });

      expect(mockTrackPerformance).toHaveBeenCalledWith(
        'test_feature_pageLoadTime',
        1500,
        expect.objectContaining({
          correlationId: 'test-correlation-id',
          metricName: 'pageLoadTime',
          metricValue: 1500,
          page: 'reports',
        })
      );
    });

    it('should store metric in internal state', () => {
      collector.trackMetric('reportFetchTime', 800);
      
      const summary = collector.generateSessionSummary();
      expect(summary.metrics.reportFetchTime).toBe(800);
    });
  });

  describe('trackError', () => {
    it('should track error with context', () => {
      const error = new Error('Test error');
      collector.trackError(error, 'api_call', { endpoint: '/api/reports' });

      expect(mockTrackError).toHaveBeenCalledWith(
        error,
        'api_call',
        expect.objectContaining({
          correlationId: 'test-correlation-id',
          errorCount: 1,
          endpoint: '/api/reports',
        })
      );
    });

    it('should increment error count', () => {
      const error1 = new Error('Error 1');
      const error2 = new Error('Error 2');
      
      collector.trackError(error1, 'operation1');
      collector.trackError(error2, 'operation2');

      const summary = collector.generateSessionSummary();
      expect(summary.metrics.errorCount).toBe(2);
    });
  });

  describe('trackInteraction', () => {
    it('should track user interaction', () => {
      collector.trackInteraction('click', 'button', { buttonId: 'download' });

      expect(mockTrackUserAction).toHaveBeenCalledWith(
        'click_button',
        expect.objectContaining({
          correlationId: 'test-correlation-id',
          action: 'click',
          target: 'button',
          interactionCount: 1,
          buttonId: 'download',
        })
      );
    });

    it('should increment interaction count', () => {
      collector.trackInteraction('click', 'button1');
      collector.trackInteraction('hover', 'button2');

      const summary = collector.generateSessionSummary();
      expect(summary.metrics.userInteractions).toBe(2);
    });
  });

  describe('generateSessionSummary', () => {
    it('should generate comprehensive session summary', () => {
      // Add some journey steps
      collector.trackJourneyStep('page_load', true);
      collector.trackJourneyStep('api_call', true);
      collector.trackJourneyStep('render', false);

      // Add some metrics
      collector.trackMetric('pageLoadTime', 1200);
      collector.trackMetric('reportFetchTime', 800);

      // Add interactions and errors
      collector.trackInteraction('click', 'button');
      collector.trackError(new Error('Test error'), 'operation');

      const summary = collector.generateSessionSummary();

      expect(summary).toEqual({
        correlationId: 'test-correlation-id',
        sessionId: 'test_session',
        feature: 'test_feature',
        totalDuration: expect.any(Number),
        metrics: {
          pageLoadTime: 1200,
          reportFetchTime: 800,
          userInteractions: 1,
          errorCount: 1,
        },
        userJourney: expect.arrayContaining([
          expect.objectContaining({ step: 'page_load', success: true }),
          expect.objectContaining({ step: 'api_call', success: true }),
          expect.objectContaining({ step: 'render', success: false }),
        ]),
        summary: {
          totalSteps: 3,
          successfulSteps: 2,
          failedSteps: 1,
          successRate: 2/3,
          averageStepDuration: expect.any(Number),
        },
      });
    });

    it('should handle empty journey', () => {
      const summary = collector.generateSessionSummary();

      expect(summary.summary).toEqual({
        totalSteps: 0,
        successfulSteps: 0,
        failedSteps: 0,
        successRate: 0,
        averageStepDuration: 0,
      });
    });
  });

  describe('sendSessionSummary', () => {
    it('should send session summary to logger', () => {
      collector.trackJourneyStep('test_step', true);
      
      const summary = collector.sendSessionSummary();

      expect(mockTrackEvent).toHaveBeenCalledWith(
        {
          eventType: 'session_summary',
          category: 'business',
          metadata: summary,
        },
        expect.objectContaining({
          correlationId: 'test-correlation-id',
          sessionId: 'test_session',
          feature: 'test_feature',
        })
      );
    });
  });
});

describe('observabilityUtils', () => {
  let collector: ObservabilityCollector;

  beforeEach(() => {
    jest.clearAllMocks();
    collector = new ObservabilityCollector('test_feature');
  });

  describe('trackApiCall', () => {
    it('should track successful API call', async () => {
      const mockApiCall = jest.fn().mockResolvedValue({ data: 'test' });
      
      const result = await observabilityUtils.trackApiCall(
        collector,
        'fetch_reports',
        mockApiCall,
        { endpoint: '/api/reports' }
      );

      expect(result).toEqual({ data: 'test' });
      expect(mockApiCall).toHaveBeenCalled();
    });

    it('should track failed API call', async () => {
      const mockApiCall = jest.fn().mockRejectedValue(new Error('API Error'));
      
      await expect(
        observabilityUtils.trackApiCall(collector, 'fetch_reports', mockApiCall)
      ).rejects.toThrow('API Error');
    });
  });

  describe('trackComponentRender', () => {
    it('should track component render performance', () => {
      const renderTracker = observabilityUtils.trackComponentRender(
        collector,
        'ReportViewer',
        { reportId: 'test-123' }
      );

      renderTracker.complete(true, { renderTime: 50 });

      // Verify that performance tracking was called
      expect(logger.trackPerformance).toHaveBeenCalled();
    });

    it('should track failed component render', () => {
      const renderTracker = observabilityUtils.trackComponentRender(
        collector,
        'ReportViewer'
      );

      renderTracker.complete(false, { error: 'Render failed' });

      // Verify that the journey step was tracked as failed
      const summary = collector.generateSessionSummary();
      const renderStep = summary.userJourney.find(step => 
        step.step.includes('component_ReportViewer_rendered')
      );
      expect(renderStep?.success).toBe(false);
    });
  });

  describe('trackNavigation', () => {
    it('should track navigation event', () => {
      observabilityUtils.trackNavigation(
        collector,
        '/reports',
        '/reports/123',
        'click'
      );

      expect(logger.trackUserAction).toHaveBeenCalledWith(
        'navigation_/reports/123',
        expect.objectContaining({
          action: 'navigation',
          target: '/reports/123',
          from: '/reports',
          to: '/reports/123',
          method: 'click',
        })
      );
    });
  });

  describe('trackPageLoad', () => {
    it('should track page load performance', () => {
      const pageLoadTracker = observabilityUtils.trackPageLoad(
        collector,
        'reports_list',
        { reportCount: 5 }
      );

      pageLoadTracker.complete(true, { loadTime: 1200 });

      expect(logger.trackPerformance).toHaveBeenCalled();
    });
  });
});

describe('createObservabilityCollector', () => {
  it('should create new collector instance', () => {
    const collector = createObservabilityCollector('test_feature', 'test_session');
    
    expect(collector).toBeInstanceOf(ObservabilityCollector);
  });

  it('should create collector without session ID', () => {
    const collector = createObservabilityCollector('test_feature');
    
    expect(collector).toBeInstanceOf(ObservabilityCollector);
  });
});

describe('Integration Tests', () => {
  let collector: ObservabilityCollector;

  beforeEach(() => {
    jest.clearAllMocks();
    collector = new ObservabilityCollector('report_viewer');
  });

  it('should track complete user journey for report viewing', async () => {
    // Simulate complete user journey
    const pageLoadTracker = observabilityUtils.trackPageLoad(
      collector,
      'report_viewer',
      { reportId: 'test-123' }
    );

    // Track API call
    const mockApiCall = jest.fn().mockResolvedValue({ 
      title: 'Test Report',
      content: 'Report content' 
    });
    
    await observabilityUtils.trackApiCall(
      collector,
      'fetch_report',
      mockApiCall,
      { reportId: 'test-123' }
    );

    // Track component render
    const renderTracker = observabilityUtils.trackComponentRender(
      collector,
      'ReportViewer',
      { reportId: 'test-123' }
    );

    // Track user interactions
    collector.trackInteraction('click', 'print_button', { reportId: 'test-123' });
    collector.trackInteraction('click', 'download_button', { reportId: 'test-123' });

    // Complete tracking
    pageLoadTracker.complete(true, { totalLoadTime: 1500 });
    renderTracker.complete(true, { renderTime: 200 });

    // Generate summary
    const summary = collector.generateSessionSummary();

    // Verify comprehensive tracking
    expect(summary.userJourney.length).toBeGreaterThan(0);
    expect(summary.metrics.userInteractions).toBe(2);
    expect(summary.summary.successRate).toBeGreaterThan(0);
    expect(logger.trackEvent).toHaveBeenCalledTimes(summary.userJourney.length);
    expect(logger.trackUserAction).toHaveBeenCalledTimes(2);
    expect(logger.trackPerformance).toHaveBeenCalled();
  });

  it('should handle error scenarios in user journey', async () => {
    // Start page load
    const pageLoadTracker = observabilityUtils.trackPageLoad(
      collector,
      'report_viewer',
      { reportId: 'invalid-123' }
    );

    // Simulate API failure
    const mockFailedApiCall = jest.fn().mockRejectedValue(new Error('Report not found'));
    
    try {
      await observabilityUtils.trackApiCall(
        collector,
        'fetch_report',
        mockFailedApiCall,
        { reportId: 'invalid-123' }
      );
    } catch (error) {
      // Expected error
    }

    // Complete page load as failed
    pageLoadTracker.complete(false, { error: 'Report not found' });

    const summary = collector.generateSessionSummary();

    // Verify error tracking
    expect(summary.metrics.errorCount).toBe(1);
    expect(summary.summary.failedSteps).toBeGreaterThan(0);
    expect(summary.summary.successRate).toBeLessThan(1);
    expect(logger.trackError).toHaveBeenCalled();
  });
}); 