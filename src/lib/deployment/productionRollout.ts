import { featureFlags, productionConfig } from '../env';
import { trackEvent, generateCorrelationId } from '../logger';
import { comparativeReportMonitoring } from '../monitoring/comparativeReportMonitoring';

export interface RolloutStatus {
  phase: 'development' | 'staging' | 'production-10%' | 'production-50%' | 'production-100%';
  rolloutPercentage: number;
  isComparativeReportsEnabled: boolean;
  currentUsers: number;
  totalUsers: number;
  healthStatus: 'healthy' | 'warning' | 'critical';
  canProceedToNext: boolean;
  blockers: string[];
  metrics: {
    errorRate: number;
    averageProcessingTime: number;
    successRate: number;
  };
}

export interface RolloutPhase {
  name: string;
  percentage: number;
  duration: number; // hours
  successCriteria: {
    maxErrorRate: number;
    maxProcessingTime: number; // ms
    minSuccessRate: number;
  };
  rollbackTriggers: {
    errorRateThreshold: number;
    processingTimeThreshold: number;
    consecutiveFailures: number;
  };
}

export class ProductionRolloutService {
  private readonly rolloutPhases: RolloutPhase[] = [
    {
      name: 'development',
      percentage: 0,
      duration: 24,
      successCriteria: {
        maxErrorRate: 0.1,
        maxProcessingTime: 180000,
        minSuccessRate: 0.8
      },
      rollbackTriggers: {
        errorRateThreshold: 0.2,
        processingTimeThreshold: 300000,
        consecutiveFailures: 5
      }
    },
    {
      name: 'production-10%',
      percentage: 10,
      duration: 48,
      successCriteria: {
        maxErrorRate: 0.05,
        maxProcessingTime: 120000,
        minSuccessRate: 0.9
      },
      rollbackTriggers: {
        errorRateThreshold: 0.1,
        processingTimeThreshold: 180000,
        consecutiveFailures: 3
      }
    },
    {
      name: 'production-50%',
      percentage: 50,
      duration: 72,
      successCriteria: {
        maxErrorRate: 0.03,
        maxProcessingTime: 90000,
        minSuccessRate: 0.95
      },
      rollbackTriggers: {
        errorRateThreshold: 0.08,
        processingTimeThreshold: 150000,
        consecutiveFailures: 3
      }
    },
    {
      name: 'production-100%',
      percentage: 100,
      duration: 168, // 1 week
      successCriteria: {
        maxErrorRate: 0.02,
        maxProcessingTime: 60000,
        minSuccessRate: 0.98
      },
      rollbackTriggers: {
        errorRateThreshold: 0.05,
        processingTimeThreshold: 120000,
        consecutiveFailures: 2
      }
    }
  ];

  async getRolloutStatus(): Promise<RolloutStatus> {
    const correlationId = generateCorrelationId();
    
    try {
      const health = comparativeReportMonitoring.generateHealthDashboard();
      const alerts = comparativeReportMonitoring.getSystemAlerts();
      
      const currentPhase = this.getCurrentPhase();
      const rolloutPercentage = parseInt(process.env.COMPARATIVE_REPORTS_ROLLOUT_PERCENTAGE || '100');
      
      const blockers = this.identifyBlockers(health, alerts);
      const canProceedToNext = blockers.length === 0 && this.meetsSuccessCriteria(currentPhase, health);
      
      trackEvent({
        eventType: 'rollout_status_checked',
        category: 'system_event',
        metadata: {
          phase: currentPhase.name,
          rolloutPercentage,
          healthStatus: this.determineHealthStatus(health),
          canProceedToNext,
          blockerCount: blockers.length
        }
      }, {
        correlationId,
        operation: 'get_rollout_status'
      });

      return {
        phase: currentPhase.name as any,
        rolloutPercentage,
        isComparativeReportsEnabled: featureFlags.isComparativeReportsEnabled(),
        currentUsers: Math.round(health.activeProjects * (rolloutPercentage / 100)),
        totalUsers: health.activeProjects,
        healthStatus: this.determineHealthStatus(health),
        canProceedToNext,
        blockers,
        metrics: {
          errorRate: health.errorRate,
          averageProcessingTime: health.averageProcessingTime,
          successRate: 1 - health.failureRate
        }
      };
    } catch (error) {
      trackEvent({
        eventType: 'rollout_status_error',
        category: 'error',
        metadata: {
          error: (error as Error).message
        }
      }, {
        correlationId,
        operation: 'get_rollout_status_error'
      });

      throw error;
    }
  }

  async advanceToNextPhase(): Promise<{ success: boolean; newPhase: string; message: string }> {
    const correlationId = generateCorrelationId();
    
    try {
      const status = await this.getRolloutStatus();
      
      if (!status.canProceedToNext) {
        return {
          success: false,
          newPhase: status.phase,
          message: `Cannot advance: ${status.blockers.join(', ')}`
        };
      }

      const currentPhaseIndex = this.rolloutPhases.findIndex(p => p.name === status.phase);
      if (currentPhaseIndex === -1 || currentPhaseIndex >= this.rolloutPhases.length - 1) {
        return {
          success: false,
          newPhase: status.phase,
          message: 'Already at final phase or phase not found'
        };
      }

      const nextPhase = this.rolloutPhases[currentPhaseIndex + 1];
      
      // Update environment variable (in production, this would update your deployment config)
      process.env.COMPARATIVE_REPORTS_ROLLOUT_PERCENTAGE = nextPhase.percentage.toString();
      
      trackEvent({
        eventType: 'rollout_phase_advanced',
        category: 'business',
        metadata: {
          fromPhase: status.phase,
          toPhase: nextPhase.name,
          newPercentage: nextPhase.percentage,
          previousMetrics: status.metrics
        }
      }, {
        correlationId,
        operation: 'advance_rollout_phase'
      });

      return {
        success: true,
        newPhase: nextPhase.name,
        message: `Successfully advanced to ${nextPhase.name} (${nextPhase.percentage}%)`
      };
    } catch (error) {
      trackEvent({
        eventType: 'rollout_advance_error',
        category: 'error',
        metadata: {
          error: (error as Error).message
        }
      }, {
        correlationId,
        operation: 'advance_rollout_error'
      });

      return {
        success: false,
        newPhase: 'unknown',
        message: `Failed to advance: ${(error as Error).message}`
      };
    }
  }

  async rollbackToPreviousPhase(reason: string): Promise<{ success: boolean; newPhase: string; message: string }> {
    const correlationId = generateCorrelationId();
    
    try {
      const status = await this.getRolloutStatus();
      const currentPhaseIndex = this.rolloutPhases.findIndex(p => p.name === status.phase);
      
      if (currentPhaseIndex <= 0) {
        return {
          success: false,
          newPhase: status.phase,
          message: 'Already at first phase, cannot rollback further'
        };
      }

      const previousPhase = this.rolloutPhases[currentPhaseIndex - 1];
      
      // Update environment variable
      process.env.COMPARATIVE_REPORTS_ROLLOUT_PERCENTAGE = previousPhase.percentage.toString();
      
      trackEvent({
        eventType: 'rollout_phase_rollback',
        category: 'business',
        metadata: {
          fromPhase: status.phase,
          toPhase: previousPhase.name,
          newPercentage: previousPhase.percentage,
          reason,
          currentMetrics: status.metrics
        }
      }, {
        correlationId,
        operation: 'rollback_rollout_phase'
      });

      return {
        success: true,
        newPhase: previousPhase.name,
        message: `Rolled back to ${previousPhase.name} (${previousPhase.percentage}%) due to: ${reason}`
      };
    } catch (error) {
      trackEvent({
        eventType: 'rollout_rollback_error',
        category: 'error',
        metadata: {
          error: (error as Error).message,
          reason
        }
      }, {
        correlationId,
        operation: 'rollback_rollout_error'
      });

      return {
        success: false,
        newPhase: 'unknown',
        message: `Failed to rollback: ${(error as Error).message}`
      };
    }
  }

  shouldTriggerAutomaticRollback(): boolean {
    try {
      const health = comparativeReportMonitoring.generateHealthDashboard();
      const currentPhase = this.getCurrentPhase();
      
      return (
        health.errorRate > currentPhase.rollbackTriggers.errorRateThreshold ||
        health.averageProcessingTime > currentPhase.rollbackTriggers.processingTimeThreshold
      );
    } catch {
      return false;
    }
  }

  getDeploymentGuide(): string {
    return `
# Production Deployment Guide

## Current Rollout Phases:
${this.rolloutPhases.map(phase => `
### ${phase.name} (${phase.percentage}%)
- Duration: ${phase.duration} hours
- Max Error Rate: ${(phase.successCriteria.maxErrorRate * 100).toFixed(1)}%
- Max Processing Time: ${phase.successCriteria.maxProcessingTime / 1000}s
- Min Success Rate: ${(phase.successCriteria.minSuccessRate * 100).toFixed(1)}%
`).join('')}

## Environment Variables:
- COMPARATIVE_REPORTS_ROLLOUT_PERCENTAGE: Controls rollout percentage
- ENABLE_COMPARATIVE_REPORTS: Master feature flag
- DEPLOYMENT_ENVIRONMENT: Environment identifier

## Monitoring Commands:
\`\`\`bash
# Check rollout status
curl "http://localhost:3000/api/debug/comparative-reports"

# Check system health
curl "http://localhost:3000/api/deployment/rollout-status"

# Advance to next phase
curl -X POST "http://localhost:3000/api/deployment/advance-phase"

# Emergency rollback
curl -X POST "http://localhost:3000/api/deployment/rollback" -d '{"reason":"High error rate"}'
\`\`\`
`.trim();
  }

  private getCurrentPhase(): RolloutPhase {
    const rolloutPercentage = parseInt(process.env.COMPARATIVE_REPORTS_ROLLOUT_PERCENTAGE || '100');
    
    // Find the phase that matches current rollout percentage
    const phase = this.rolloutPhases.find(p => p.percentage === rolloutPercentage) ||
                  this.rolloutPhases.find(p => p.percentage >= rolloutPercentage) ||
                  this.rolloutPhases[0];
    
    return phase;
  }

  private meetsSuccessCriteria(phase: RolloutPhase, health: any): boolean {
    return (
      health.errorRate <= phase.successCriteria.maxErrorRate &&
      health.averageProcessingTime <= phase.successCriteria.maxProcessingTime &&
      (1 - health.failureRate) >= phase.successCriteria.minSuccessRate
    );
  }

  private identifyBlockers(health: any, alerts: any[]): string[] {
    const blockers: string[] = [];
    
    if (health.errorRate > productionConfig.limits.errorRateThreshold) {
      blockers.push(`High error rate: ${(health.errorRate * 100).toFixed(1)}%`);
    }
    
    if (health.averageProcessingTime > productionConfig.timeouts.reportGeneration) {
      blockers.push(`Slow processing: ${Math.round(health.averageProcessingTime / 1000)}s`);
    }
    
    const criticalAlerts = alerts.filter(a => a.severity === 'critical');
    if (criticalAlerts.length > 0) {
      blockers.push(`${criticalAlerts.length} critical alerts`);
    }
    
    return blockers;
  }

  private determineHealthStatus(health: any): 'healthy' | 'warning' | 'critical' {
    if (health.errorRate > 0.1 || health.averageProcessingTime > 180000) return 'critical';
    if (health.errorRate > 0.05 || health.averageProcessingTime > 120000) return 'warning';
    return 'healthy';
  }
}

// Singleton instance
export const productionRolloutService = new ProductionRolloutService(); 