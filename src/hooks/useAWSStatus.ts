import { useState, useEffect, useCallback } from 'react';
import { logger } from '@/lib/logger';

export interface AWSStatus {
  status: 'healthy' | 'unhealthy' | 'unknown';
  configured: boolean;
  valid: boolean;
  region: string;
  message: string;
  details?: string;
  errorMessage?: string;
  lastChecked: string;
  connectionTest?: {
    success: boolean;
    latency?: number;
  };
}

export interface AWSStatusHookReturn {
  status: AWSStatus | null;
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  refreshStatus: () => Promise<void>;
  isRefreshing: boolean;
}

interface UseAWSStatusOptions {
  autoRefresh?: boolean;
  refreshInterval?: number; // in milliseconds
  retryOnError?: boolean;
  maxRetries?: number;
}

export function useAWSStatus(options: UseAWSStatusOptions = {}): AWSStatusHookReturn {
  const {
    autoRefresh = true,
    refreshInterval = 5 * 60 * 1000, // 5 minutes default
    retryOnError = true,
    maxRetries = 3
  } = options;

  const [status, setStatus] = useState<AWSStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const fetchAWSStatus = useCallback(async (forceRefresh = false): Promise<void> => {
    try {
      if (forceRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      const url = forceRefresh ? '/api/health/aws?refresh=true' : '/api/health/aws';
      
      logger.debug('Fetching AWS status', { 
        url, 
        forceRefresh,
        retryCount 
      });

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        cache: forceRefresh ? 'no-cache' : 'default'
      });

      if (!response.ok) {
        throw new Error(`AWS status check failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      logger.debug('AWS status fetched successfully', { 
        status: data.status,
        configured: data.configured,
        valid: data.valid
      });

      setStatus(data);
      setLastUpdated(new Date());
      setRetryCount(0); // Reset retry count on success
      setError(null);

    } catch (fetchError) {
      const errorMessage = (fetchError as Error).message;
      
      logger.error('Failed to fetch AWS status', fetchError as Error, {
        retryCount,
        maxRetries,
        forceRefresh
      });

      setError(errorMessage);

      // Set a fallback status for better UX
      setStatus({
        status: 'unknown',
        configured: false,
        valid: false,
        region: 'unknown',
        message: 'Unable to check AWS status',
        details: errorMessage,
        errorMessage,
        lastChecked: new Date().toISOString()
      });

      // Retry logic
      if (retryOnError && retryCount < maxRetries) {
        setRetryCount(prev => prev + 1);
        const retryDelay = Math.min(1000 * Math.pow(2, retryCount), 10000); // Exponential backoff, max 10s
        
        logger.info('Retrying AWS status fetch', { 
          retryCount: retryCount + 1, 
          retryDelay,
          maxRetries 
        });

        setTimeout(() => {
          fetchAWSStatus(forceRefresh);
        }, retryDelay);
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [retryOnError, maxRetries, retryCount]);

  const refreshStatus = useCallback(async (): Promise<void> => {
    await fetchAWSStatus(true);
  }, [fetchAWSStatus]);

  // Initial fetch
  useEffect(() => {
    fetchAWSStatus(false);
  }, [fetchAWSStatus]);

  // Auto-refresh interval
  useEffect(() => {
    if (!autoRefresh || refreshInterval <= 0) {
      return;
    }

    const interval = setInterval(() => {
      // Only auto-refresh if not currently loading/refreshing and no recent errors
      if (!isLoading && !isRefreshing && (!error || retryCount >= maxRetries)) {
        logger.debug('Auto-refreshing AWS status', { refreshInterval });
        fetchAWSStatus(false);
      }
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, isLoading, isRefreshing, error, retryCount, maxRetries, fetchAWSStatus]);

  // Cleanup retry count when component unmounts or options change
  useEffect(() => {
    setRetryCount(0);
  }, [maxRetries, retryOnError]);

  return {
    status,
    isLoading,
    error,
    lastUpdated,
    refreshStatus,
    isRefreshing
  };
}

// Utility function to get status color
export function getAWSStatusColor(status?: AWSStatus): string {
  if (!status) return 'gray';
  
  switch (status.status) {
    case 'healthy':
      return 'green';
    case 'unhealthy':
      return 'red';
    case 'unknown':
    default:
      return 'yellow';
  }
}

// Utility function to get status icon
export function getAWSStatusIcon(status?: AWSStatus): string {
  if (!status) return '❓';
  
  switch (status.status) {
    case 'healthy':
      return '✅';
    case 'unhealthy':
      return '❌';
    case 'unknown':
    default:
      return '⚠️';
  }
}

// Utility function to format last updated time
export function formatLastUpdated(lastUpdated: Date | null): string {
  if (!lastUpdated) return 'Never';
  
  const now = new Date();
  const diffMs = now.getTime() - lastUpdated.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  
  if (diffMinutes < 1) {
    return 'Just now';
  } else if (diffMinutes < 60) {
    return `${diffMinutes} minute${diffMinutes === 1 ? '' : 's'} ago`;
  } else {
    const diffHours = Math.floor(diffMinutes / 60);
    return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  }
} 