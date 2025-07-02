import { logger } from '@/lib/logger';
import { EventEmitter } from 'events';

// Status update types for initial report generation
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

// Server-Sent Events connection manager
export class RealTimeStatusService extends EventEmitter {
  private connections: Map<string, Map<string, (data: string) => void>> = new Map();
  private static instance: RealTimeStatusService | null = null;

  private constructor() {
    super();
    this.setMaxListeners(1000); // Support many concurrent connections
  }

  static getInstance(): RealTimeStatusService {
    if (!RealTimeStatusService.instance) {
      RealTimeStatusService.instance = new RealTimeStatusService();
    }
    return RealTimeStatusService.instance;
  }

  /**
   * Add a new SSE connection for a project
   */
  addConnection(projectId: string, connectionId: string, writeToClient: (data: string) => void): void {
    if (!this.connections.has(projectId)) {
      this.connections.set(projectId, new Map());
    }
    
    const projectConnections = this.connections.get(projectId)!;
    projectConnections.set(connectionId, writeToClient);

    logger.info('SSE connection added', {
      projectId,
      connectionId,
      totalConnections: projectConnections.size
    });
  }

  /**
   * Remove an SSE connection
   */
  removeConnection(projectId: string, connectionId: string): void {
    const projectConnections = this.connections.get(projectId);
    if (projectConnections) {
      projectConnections.delete(connectionId);
      
      // Clean up empty project maps
      if (projectConnections.size === 0) {
        this.connections.delete(projectId);
      }

      logger.info('SSE connection removed', {
        projectId,
        connectionId,
        remainingConnections: projectConnections.size
      });
    }
  }

  /**
   * Send status update to all connected clients for a project
   */
  sendStatusUpdate(projectId: string, update: InitialReportStatusUpdate): void {
    const projectConnections = this.connections.get(projectId);
    
    if (!projectConnections || projectConnections.size === 0) {
      return; // No connections for this project
    }

    const data = JSON.stringify(update);
    const sseData = `data: ${data}\n\n`;

    // Send to all connections for this project
    const deadConnections: string[] = [];
    
    projectConnections.forEach((writeToClient, connectionId) => {
      try {
        writeToClient(sseData);
      } catch (error) {
        logger.warn('Failed to send SSE update, marking connection as dead', {
          projectId,
          connectionId,
          error: (error as Error).message
        });
        deadConnections.push(connectionId);
      }
    });

    // Clean up dead connections
    deadConnections.forEach(connectionId => {
      this.removeConnection(projectId, connectionId);
    });

    logger.info('Status update sent via SSE', {
      projectId,
      phase: update.phase,
      progress: update.progress,
      connectionsSent: projectConnections.size - deadConnections.length,
      deadConnections: deadConnections.length
    });
  }

  /**
   * Send project validation status
   */
  sendValidationUpdate(projectId: string, isReady: boolean, missingData?: string[]): void {
    this.sendStatusUpdate(projectId, {
      projectId,
      status: 'generating',
      phase: 'validation',
      progress: 5,
      message: isReady 
        ? 'Project validation completed successfully'
        : `Project validation failed: ${missingData?.join(', ') || 'Unknown issues'}`,
      timestamp: new Date().toISOString(),
      error: isReady ? undefined : `Missing: ${missingData?.join(', ') || 'Unknown'}`
    });
  }

  /**
   * Send competitor snapshot capture progress
   */
  sendSnapshotCaptureUpdate(
    projectId: string, 
    captured: number, 
    total: number, 
    currentCompetitor?: string,
    estimatedCompletion?: Date
  ): void {
    const progress = Math.round(10 + (captured / total) * 40); // 10-50% for snapshot phase
    
    this.sendStatusUpdate(projectId, {
      projectId,
      status: 'generating',
      phase: 'snapshot_capture',
      progress,
      message: currentCompetitor 
        ? `Capturing snapshot for ${currentCompetitor}...`
        : `Captured ${captured}/${total} competitor snapshots`,
      timestamp: new Date().toISOString(),
      estimatedCompletionTime: estimatedCompletion?.toISOString(),
      competitorSnapshotsStatus: {
        captured,
        total,
        current: currentCompetitor
      }
    });
  }

  /**
   * Send data collection progress
   */
  sendDataCollectionUpdate(projectId: string, dataCompletenessScore: number): void {
    this.sendStatusUpdate(projectId, {
      projectId,
      status: 'generating',
      phase: 'data_collection',
      progress: 55,
      message: `Data collection completed (${dataCompletenessScore}% completeness)`,
      timestamp: new Date().toISOString(),
      dataCompletenessScore
    });
  }

  /**
   * Send analysis phase progress
   */
  sendAnalysisUpdate(projectId: string, message: string): void {
    this.sendStatusUpdate(projectId, {
      projectId,
      status: 'generating',
      phase: 'analysis',
      progress: 75,
      message,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Send report generation progress
   */
  sendReportGenerationUpdate(projectId: string, message: string): void {
    this.sendStatusUpdate(projectId, {
      projectId,
      status: 'generating',
      phase: 'report_generation',
      progress: 90,
      message,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Send completion status
   */
  sendCompletionUpdate(
    projectId: string, 
    success: boolean, 
    reportId?: string,
    dataCompletenessScore?: number,
    error?: string
  ): void {
    this.sendStatusUpdate(projectId, {
      projectId,
      status: success ? 'completed' : 'failed',
      phase: 'completed',
      progress: 100,
      message: success 
        ? 'Initial report generated successfully'
        : `Report generation failed: ${error || 'Unknown error'}`,
      timestamp: new Date().toISOString(),
      dataCompletenessScore,
      error
    });
  }

  /**
   * Get connection statistics
   */
  getConnectionStats(): {
    totalProjects: number;
    totalConnections: number;
    projectBreakdown: Record<string, number>;
  } {
    const projectBreakdown: Record<string, number> = {};
    let totalConnections = 0;

    this.connections.forEach((connections, projectId) => {
      projectBreakdown[projectId] = connections.size;
      totalConnections += connections.size;
    });

    return {
      totalProjects: this.connections.size,
      totalConnections,
      projectBreakdown
    };
  }

  /**
   * Clean up all connections (for shutdown)
   */
  cleanup(): void {
    this.connections.clear();
    this.removeAllListeners();
    logger.info('RealTimeStatusService cleaned up');
  }
}

// Export singleton instance
export const realTimeStatusService = RealTimeStatusService.getInstance(); 