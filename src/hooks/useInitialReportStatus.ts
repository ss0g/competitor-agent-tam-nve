import { useState, useEffect, useRef, useCallback } from 'react';

// Types from the real-time status service
export interface InitialReportStatusUpdate {
  projectId: string;
  status: 'generating' | 'completed' | 'failed' | 'not_started';
  phase: 'validation' | 'snapshot_capture' | 'data_collection' | 'analysis' | 'report_generation' | 'completed';
  progress: number; // 0-100
  message: string;
  timestamp: string;
  estimatedCompletionTime?: string;
  competitorSnapshotsStatus?: {
    captured: number;
    total: number;
    current?: string; // Currently processing competitor
  };
  dataCompletenessScore?: number;
  error?: string;
}

export interface InitialReportStatus {
  projectId: string;
  reportExists: boolean;
  reportId?: string;
  status: 'generating' | 'completed' | 'failed' | 'not_started';
  dataCompletenessScore?: number;
  generatedAt?: string;
  error?: string;
  estimatedCompletionTime?: string;
  competitorSnapshotsStatus: {
    captured: number;
    total: number;
    capturedAt?: string;
    failures?: string[];
  };
  dataFreshness: 'new' | 'existing' | 'mixed' | 'basic';
}

interface UseInitialReportStatusOptions {
  projectId?: string;
  autoConnect?: boolean;
  onStatusUpdate?: (update: InitialReportStatusUpdate) => void;
  onComplete?: (reportId: string, dataCompletenessScore?: number) => void;
  onError?: (error: string) => void;
}

interface UseInitialReportStatusReturn {
  currentStatus: InitialReportStatus | null;
  lastUpdate: InitialReportStatusUpdate | null;
  isConnected: boolean;
  error: string | null;
  connect: () => void;
  disconnect: () => void;
  fetchCurrentStatus: () => Promise<void>;
}

export const useInitialReportStatus = (
  options: UseInitialReportStatusOptions = {}
): UseInitialReportStatusReturn => {
  const {
    projectId,
    autoConnect = true,
    onStatusUpdate,
    onComplete,
    onError
  } = options;

  const [currentStatus, setCurrentStatus] = useState<InitialReportStatus | null>(null);
  const [lastUpdate, setLastUpdate] = useState<InitialReportStatusUpdate | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;

  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    setIsConnected(false);
    reconnectAttemptsRef.current = 0;
  }, []);

  const fetchCurrentStatus = useCallback(async () => {
    if (!projectId) return;

    try {
      const response = await fetch(`/api/projects/${projectId}/initial-report-status`);
      if (!response.ok) {
        throw new Error('Failed to fetch initial report status');
      }

      const status: InitialReportStatus = await response.json();
      setCurrentStatus(status);
      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch status';
      setError(errorMessage);
      onError?.(errorMessage);
    }
  }, [projectId, onError]);

  const connect = useCallback(() => {
    if (!projectId || eventSourceRef.current) return;

    disconnect(); // Ensure clean state

    try {
      const eventSource = new EventSource(`/api/projects/${projectId}/initial-report-status/stream`);
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        console.log('SSE connection opened for project:', projectId);
        setIsConnected(true);
        setError(null);
        reconnectAttemptsRef.current = 0;
      };

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          // Handle different message types
          if (data.type === 'connection') {
            console.log('SSE connection established:', data.message);
            return;
          }

          if (data.type === 'heartbeat') {
            return; // Just keep the connection alive
          }

          // Handle status updates
          if (data.projectId && data.status !== undefined) {
            const update = data as InitialReportStatusUpdate;
            setLastUpdate(update);
            onStatusUpdate?.(update);

            // Update current status based on the update
            setCurrentStatus(prev => ({
              ...prev,
              projectId: update.projectId,
              status: update.status,
              dataCompletenessScore: update.dataCompletenessScore,
              error: update.error,
              estimatedCompletionTime: update.estimatedCompletionTime,
              competitorSnapshotsStatus: update.competitorSnapshotsStatus || {
                captured: 0,
                total: 0
              },
              reportExists: update.status === 'completed',
              dataFreshness: 'new' // Assume new data during generation
            } as InitialReportStatus));

            // Handle completion
            if (update.status === 'completed') {
              onComplete?.(update.projectId, update.dataCompletenessScore);
              // Fetch final status to get report ID
              setTimeout(fetchCurrentStatus, 1000);
            }

            // Handle errors
            if (update.status === 'failed' && update.error) {
              onError?.(update.error);
            }
          }
        } catch (parseError) {
          console.error('Error parsing SSE message:', parseError, event.data);
        }
      };

      eventSource.onerror = (event) => {
        console.error('SSE connection error:', event);
        setIsConnected(false);

        // Attempt to reconnect with exponential backoff
        if (reconnectAttemptsRef.current < maxReconnectAttempts) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
          reconnectAttemptsRef.current++;

          console.log(`Attempting to reconnect in ${delay}ms (attempt ${reconnectAttemptsRef.current}/${maxReconnectAttempts})`);

          reconnectTimeoutRef.current = setTimeout(() => {
            if (eventSourceRef.current?.readyState === EventSource.CLOSED) {
              connect();
            }
          }, delay);
        } else {
          setError('Connection lost. Please refresh the page.');
          onError?.('Connection lost. Please refresh the page.');
        }
      };

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to establish SSE connection';
      setError(errorMessage);
      onError?.(errorMessage);
    }
  }, [projectId, onStatusUpdate, onComplete, onError, disconnect, fetchCurrentStatus]);

  // Auto-connect when projectId is available
  useEffect(() => {
    if (projectId && autoConnect) {
      connect();
      fetchCurrentStatus();
    }

    return () => {
      disconnect();
    };
  }, [projectId, autoConnect, connect, disconnect, fetchCurrentStatus]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    currentStatus,
    lastUpdate,
    isConnected,
    error,
    connect,
    disconnect,
    fetchCurrentStatus
  };
}; 