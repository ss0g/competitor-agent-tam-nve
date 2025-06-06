import { useCallback, useEffect, useRef } from 'react';
import { 
  generateCorrelationId, 
  trackEvent, 
  trackError, 
  trackPerformance,
  trackUserAction,
  LogContext 
} from '@/lib/logger';

interface UseObservabilityOptions {
  feature: string;
  userId?: string;
  sessionId?: string;
}

interface PerformanceMetrics {
  pageLoadStart: number;
  componentMountTime?: number;
  renderTime?: number;
  apiCallDuration?: number;
}

export const useObservability = (options: UseObservabilityOptions) => {
  const { feature, userId, sessionId } = options;
  const correlationId = useRef<string>(generateCorrelationId());
  const metrics = useRef<PerformanceMetrics>({
    pageLoadStart: performance.now()
  });

  const baseContext: LogContext = {
    correlationId: correlationId.current,
    userId,
    sessionId,
    feature,
  };

  // Track component mount
  useEffect(() => {
    metrics.current.componentMountTime = performance.now();
    
    trackEvent({
      eventType: 'component_mounted',
      category: 'system_event',
      metadata: {
        feature,
        mountTime: metrics.current.componentMountTime,
      }
    }, baseContext);

    return () => {
      // Track component unmount
      trackEvent({
        eventType: 'component_unmounted',
        category: 'system_event',
        metadata: {
          feature,
          sessionDuration: performance.now() - metrics.current.pageLoadStart,
        }
      }, baseContext);
    };
  }, [feature]);

  // Log user actions with consistent context
  const logUserAction = useCallback((action: string, metadata?: Record<string, any>) => {
    trackUserAction(action, {
      ...baseContext,
      metadata,
    });
  }, [baseContext]);

  // Log errors with enhanced context
  const logError = useCallback((error: Error, operation: string, additionalContext?: LogContext) => {
    trackError(error, operation, {
      ...baseContext,
      ...additionalContext,
    });
  }, [baseContext]);

  // Log performance metrics
  const logPerformance = useCallback((operation: string, startTime: number, additionalContext?: LogContext) => {
    const duration = performance.now() - startTime;
    trackPerformance(operation, duration, {
      ...baseContext,
      ...additionalContext,
    });
    return duration;
  }, [baseContext]);

  // Log events with consistent context
  const logEvent = useCallback((eventType: string, category: 'user_action' | 'system_event' | 'error' | 'performance' | 'business', metadata?: Record<string, any>) => {
    trackEvent({
      eventType,
      category,
      metadata,
    }, baseContext);
  }, [baseContext]);

  // Track API calls with automatic performance and error logging
  const trackApiCall = useCallback(async <T>(
    apiName: string,
    apiCall: () => Promise<T>,
    additionalContext?: LogContext
  ): Promise<T> => {
    const startTime = performance.now();
    
    logEvent('api_call_started', 'system_event', {
      apiName,
      url: additionalContext?.url,
    });

    try {
      const result = await apiCall();
      
      const duration = logPerformance(`api_call_${apiName}`, startTime, {
        ...additionalContext,
        apiName,
        success: true,
      });

      logEvent('api_call_completed', 'system_event', {
        apiName,
        duration,
        success: true,
      });

      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      
      logError(error as Error, `api_call_${apiName}`, {
        ...additionalContext,
        apiName,
        duration,
        success: false,
      });

      logEvent('api_call_failed', 'error', {
        apiName,
        duration,
        error: (error as Error).message,
      });

      throw error;
    }
  }, [logEvent, logPerformance, logError]);

  // Track user interactions (clicks, navigation, etc.)
  const trackInteraction = useCallback((interactionType: string, target: string, metadata?: Record<string, any>) => {
    logUserAction(`${interactionType}_${target}`, {
      interactionType,
      target,
      timestamp: Date.now(),
      ...metadata,
    });
  }, [logUserAction]);

  // Track page navigation
  const trackNavigation = useCallback((from: string, to: string, method: 'click' | 'programmatic' = 'click') => {
    trackInteraction('navigation', to, {
      from,
      to,
      method,
      navigationTime: performance.now(),
    });
  }, [trackInteraction]);

  // Track errors in render cycles
  const trackRenderError = useCallback((error: Error, componentName: string, props?: any) => {
    logError(error, 'component_render', {
      componentName,
      props: props ? JSON.stringify(props) : undefined,
      renderTime: performance.now(),
    });
  }, [logError]);

  return {
    correlationId: correlationId.current,
    logUserAction,
    logError,
    logPerformance,
    logEvent,
    trackApiCall,
    trackInteraction,
    trackNavigation,
    trackRenderError,
    metrics: metrics.current,
  };
}; 