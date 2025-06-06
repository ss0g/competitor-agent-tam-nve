import { 
  trackEvent, 
  trackError, 
  trackPerformance, 
  trackUserAction,
  generateCorrelationId,
  LogContext 
} from './logger';

// Observability metrics for the report viewer features
export interface ReportViewerMetrics {
  pageLoadTime: number;
  reportFetchTime: number;
  markdownParseTime: number;
  renderTime: number;
  userInteractions: number;
  errorCount: number;
  reportSize: number;
  sectionCount: number;
}

export interface UserJourneyStep {
  step: string;
  timestamp: number;
  duration?: number;
  metadata?: Record<string, any>;
  success: boolean;
}

export class ObservabilityCollector {
  private correlationId: string;
  private sessionId: string;
  private feature: string;
  private metrics: Partial<ReportViewerMetrics> = {};
  private userJourney: UserJourneyStep[] = [];
  private startTime: number;

  constructor(feature: string, sessionId?: string) {
    this.correlationId = generateCorrelationId();
    this.sessionId = sessionId || `session_${Date.now()}`;
    this.feature = feature;
    this.startTime = performance.now();
  }

  // Track user journey steps
  trackJourneyStep(step: string, success: boolean = true, metadata?: Record<string, any>) {
    const timestamp = performance.now();
    const previousStep = this.userJourney[this.userJourney.length - 1];
    const duration = previousStep ? timestamp - previousStep.timestamp : 0;

    const journeyStep: UserJourneyStep = {
      step,
      timestamp,
      duration,
      metadata,
      success,
    };

    this.userJourney.push(journeyStep);

    trackEvent({
      eventType: 'user_journey_step',
      category: 'user_action',
      metadata: {
        step,
        success,
        duration,
        journeyLength: this.userJourney.length,
        ...metadata,
      }
    }, this.getBaseContext());
  }

  // Track performance metrics
  trackMetric(metricName: keyof ReportViewerMetrics, value: number, metadata?: Record<string, any>) {
    this.metrics[metricName] = value;

    trackPerformance(`${this.feature}_${metricName}`, value, {
      ...this.getBaseContext(),
      metricName,
      metricValue: value,
      ...metadata,
    });
  }

  // Track errors with context
  trackError(error: Error, operation: string, metadata?: Record<string, any>) {
    this.metrics.errorCount = (this.metrics.errorCount || 0) + 1;

    trackError(error, operation, {
      ...this.getBaseContext(),
      errorCount: this.metrics.errorCount,
      journeyStep: this.userJourney[this.userJourney.length - 1]?.step,
      ...metadata,
    });
  }

  // Track user interactions
  trackInteraction(action: string, target: string, metadata?: Record<string, any>) {
    this.metrics.userInteractions = (this.metrics.userInteractions || 0) + 1;

    trackUserAction(`${action}_${target}`, {
      ...this.getBaseContext(),
      action,
      target,
      interactionCount: this.metrics.userInteractions,
      ...metadata,
    });
  }

  // Generate comprehensive session summary
  generateSessionSummary(): SessionSummary {
    const totalDuration = performance.now() - this.startTime;
    const successfulSteps = this.userJourney.filter(step => step.success).length;
    const failedSteps = this.userJourney.filter(step => !step.success).length;

    return {
      correlationId: this.correlationId,
      sessionId: this.sessionId,
      feature: this.feature,
      totalDuration,
      metrics: this.metrics,
      userJourney: this.userJourney,
      summary: {
        totalSteps: this.userJourney.length,
        successfulSteps,
        failedSteps,
        successRate: this.userJourney.length > 0 ? successfulSteps / this.userJourney.length : 0,
        averageStepDuration: this.userJourney.length > 0 
          ? this.userJourney.reduce((sum, step) => sum + (step.duration || 0), 0) / this.userJourney.length 
          : 0,
      }
    };
  }

  // Send session summary to logging system
  sendSessionSummary() {
    const summary = this.generateSessionSummary();

    trackEvent({
      eventType: 'session_summary',
      category: 'business',
      metadata: summary,
    }, this.getBaseContext());

    return summary;
  }

  private getBaseContext(): LogContext {
    return {
      correlationId: this.correlationId,
      sessionId: this.sessionId,
      feature: this.feature,
    };
  }
}

export interface SessionSummary {
  correlationId: string;
  sessionId: string;
  feature: string;
  totalDuration: number;
  metrics: Partial<ReportViewerMetrics>;
  userJourney: UserJourneyStep[];
  summary: {
    totalSteps: number;
    successfulSteps: number;
    failedSteps: number;
    successRate: number;
    averageStepDuration: number;
  };
}

// Utility functions for common observability patterns
export const observabilityUtils = {
  // Track API call with automatic error handling and performance
  async trackApiCall<T>(
    collector: ObservabilityCollector,
    apiName: string,
    apiCall: () => Promise<T>,
    metadata?: Record<string, any>
  ): Promise<T> {
    const startTime = performance.now();
    
    collector.trackJourneyStep(`api_call_${apiName}_started`, true, {
      apiName,
      ...metadata,
    });

    try {
      const result = await apiCall();
      const duration = performance.now() - startTime;
      
      collector.trackMetric('reportFetchTime', duration, {
        apiName,
        success: true,
        ...metadata,
      });

      collector.trackJourneyStep(`api_call_${apiName}_completed`, true, {
        apiName,
        duration,
        success: true,
      });

      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      
      collector.trackError(error as Error, `api_call_${apiName}`, {
        apiName,
        duration,
        ...metadata,
      });

      collector.trackJourneyStep(`api_call_${apiName}_failed`, false, {
        apiName,
        duration,
        error: (error as Error).message,
      });

      throw error;
    }
  },

  // Track component render performance
  trackComponentRender(
    collector: ObservabilityCollector,
    componentName: string,
    renderData?: Record<string, any>
  ) {
    const startTime = performance.now();
    
    return {
      complete: (success: boolean = true, metadata?: Record<string, any>) => {
        const duration = performance.now() - startTime;
        
        collector.trackMetric('renderTime', duration, {
          componentName,
          success,
          ...renderData,
          ...metadata,
        });

        collector.trackJourneyStep(`component_${componentName}_rendered`, success, {
          componentName,
          duration,
          ...renderData,
          ...metadata,
        });
      }
    };
  },

  // Track user navigation
  trackNavigation(
    collector: ObservabilityCollector,
    from: string,
    to: string,
    method: 'click' | 'programmatic' = 'click'
  ) {
    collector.trackInteraction('navigation', to, {
      from,
      to,
      method,
      navigationTime: performance.now(),
    });

    collector.trackJourneyStep('navigation', true, {
      from,
      to,
      method,
    });
  },

  // Track page load performance
  trackPageLoad(
    collector: ObservabilityCollector,
    pageName: string,
    loadData?: Record<string, any>
  ) {
    const startTime = performance.now();
    
    collector.trackJourneyStep(`page_${pageName}_load_started`, true, {
      pageName,
      ...loadData,
    });

    return {
      complete: (success: boolean = true, metadata?: Record<string, any>) => {
        const duration = performance.now() - startTime;
        
        collector.trackMetric('pageLoadTime', duration, {
          pageName,
          success,
          ...loadData,
          ...metadata,
        });

        collector.trackJourneyStep(`page_${pageName}_load_completed`, success, {
          pageName,
          duration,
          ...loadData,
          ...metadata,
        });
      }
    };
  },
};

// Global observability instance for the application
export const createObservabilityCollector = (feature: string, sessionId?: string) => {
  return new ObservabilityCollector(feature, sessionId);
};

// Types are already exported above 