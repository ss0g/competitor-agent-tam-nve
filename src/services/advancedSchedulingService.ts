/**
 * Advanced Scheduling Algorithms Service
 * Phase 3.2: ML-based optimization, predictive scheduling, and intelligent load balancing
 * 
 * Features:
 * - ML-based optimization for scraping intervals
 * - Dynamic threshold adjustment based on data change patterns
 * - Predictive scheduling for high-priority updates
 * - Intelligent load balancing for scraping tasks
 * - Integration with Phase 1 & 2 services
 */

import { PrismaClient } from '@prisma/client';
import { generateCorrelationId } from '../lib/logger';
import SmartSchedulingService from './smartSchedulingService';

const prisma = new PrismaClient();

// Advanced Scheduling Types
interface DataChangePattern {
  projectId: string;
  entityType: 'PRODUCT' | 'COMPETITOR';
  entityId: string;
  patterns: {
    averageChangeFrequency: number; // hours between significant changes
    changeVolatility: number; // 0-1 scale of change unpredictability
    peakActivityHours: number[]; // hours of day with most changes
    peakActivityDays: number[]; // days of week with most changes
    seasonalTrends: Record<string, number>; // monthly change patterns
  };
  confidence: number; // 0-1 confidence in pattern accuracy
  lastUpdated: Date;
}

interface OptimizedSchedule {
  projectId: string;
  entityType: 'PRODUCT' | 'COMPETITOR';
  entityId: string;
  originalInterval: number; // original scraping interval in hours
  optimizedInterval: number; // ML-optimized interval in hours
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  nextScrapeTime: Date;
  confidenceScore: number; // 0-1 confidence in optimization
  reasoning: string;
  expectedDataChange: number; // 0-1 probability of data change
}

interface LoadBalancingStrategy {
  maxConcurrentTasks: number;
  taskDistribution: {
    HIGH: number; // percentage of resources for high priority
    MEDIUM: number;
    LOW: number;
  };
  timeSlotScheduling: {
    peakHours: { start: number; end: number; maxTasks: number };
    offPeakHours: { start: number; end: number; maxTasks: number };
  };
  backoffStrategy: {
    failureDelay: number; // ms delay after failure
    maxRetries: number;
    exponentialFactor: number;
  };
}

interface PredictiveInsight {
  projectId: string;
  type: 'HIGH_ACTIVITY_PREDICTED' | 'LOW_ACTIVITY_PREDICTED' | 'DATA_CHANGE_LIKELY' | 'RESOURCE_BOTTLENECK';
  confidence: number;
  timeframe: string; // e.g., "next 4 hours", "next 2 days"
  description: string;
  recommendedAction: string;
  impact: 'HIGH' | 'MEDIUM' | 'LOW';
  timestamp: Date;
}

class AdvancedSchedulingService {
  private correlationId: string;
  private smartScheduler: SmartSchedulingService;
  
  // ML-based thresholds (would be learned from data in production)
  private readonly ML_THRESHOLDS = {
    highVolatilityThreshold: 0.7, // entities with high change unpredictability
    lowActivityThreshold: 0.2, // entities with very low change frequency
    confidenceThreshold: 0.8, // minimum confidence for optimization
    patternReliabilityDays: 30 // days of data needed for reliable patterns
  };

  // Load balancing configuration
  private readonly LOAD_BALANCING: LoadBalancingStrategy = {
    maxConcurrentTasks: 10,
    taskDistribution: {
      HIGH: 50,
      MEDIUM: 30,
      LOW: 20
    },
    timeSlotScheduling: {
      peakHours: { start: 9, end: 17, maxTasks: 6 }, // business hours - reduced load
      offPeakHours: { start: 22, end: 6, maxTasks: 10 } // night hours - full load
    },
    backoffStrategy: {
      failureDelay: 5000, // 5 seconds base delay
      maxRetries: 3,
      exponentialFactor: 2
    }
  };

  constructor() {
    this.correlationId = generateCorrelationId();
    this.smartScheduler = new SmartSchedulingService();
  }

  /**
   * Analyze data change patterns for all entities
   */
  async analyzeDataChangePatterns(): Promise<DataChangePattern[]> {
    console.log(`[${this.correlationId}] Analyzing data change patterns`);
    
    const projects = await prisma.project.findMany({
      where: { status: 'ACTIVE' },
      include: {
        products: {
          include: {
            snapshots: {
              orderBy: { createdAt: 'desc' },
              take: 100 // Last 100 snapshots for pattern analysis
            }
          }
        },
        competitors: {
          include: {
            snapshots: {
              orderBy: { createdAt: 'desc' },
              take: 100
            }
          }
        }
      }
    });

    const patterns: DataChangePattern[] = [];

    for (const project of projects) {
      // Analyze product patterns
      for (const product of project.products) {
        const pattern = await this.analyzeEntityPatterns(
          project.id,
          'PRODUCT',
          product.id,
          product.snapshots
        );
        if (pattern) patterns.push(pattern);
      }

      // Analyze competitor patterns
      for (const competitor of project.competitors) {
        const pattern = await this.analyzeEntityPatterns(
          project.id,
          'COMPETITOR',
          competitor.id,
          competitor.snapshots
        );
        if (pattern) patterns.push(pattern);
      }
    }

    return patterns;
  }

  /**
   * Analyze patterns for a specific entity
   */
  private async analyzeEntityPatterns(
    projectId: string,
    entityType: 'PRODUCT' | 'COMPETITOR',
    entityId: string,
    snapshots: any[]
  ): Promise<DataChangePattern | null> {
    if (snapshots.length < 10) {
      return null; // Need at least 10 snapshots for meaningful analysis
    }

    // Calculate change frequency
    const changes = this.detectContentChanges(snapshots);
    const averageChangeFrequency = this.calculateAverageChangeFrequency(snapshots, changes);
    
    // Calculate volatility (how unpredictable changes are)
    const changeVolatility = this.calculateChangeVolatility(changes);
    
    // Identify peak activity patterns
    const peakActivityHours = this.identifyPeakActivityHours(snapshots, changes);
    const peakActivityDays = this.identifyPeakActivityDays(snapshots, changes);
    
    // Calculate seasonal trends (basic month-based for now)
    const seasonalTrends = this.calculateSeasonalTrends(snapshots, changes);
    
    // Calculate confidence based on data quantity and consistency
    const confidence = this.calculatePatternConfidence(snapshots, changes);

    return {
      projectId,
      entityType,
      entityId,
      patterns: {
        averageChangeFrequency,
        changeVolatility,
        peakActivityHours,
        peakActivityDays,
        seasonalTrends
      },
      confidence,
      lastUpdated: new Date()
    };
  }

  /**
   * Detect content changes between snapshots
   */
  private detectContentChanges(snapshots: any[]): boolean[] {
    const changes: boolean[] = [];
    
    for (let i = 1; i < snapshots.length; i++) {
      const current = snapshots[i];
      const previous = snapshots[i - 1];
      
      // Simple content change detection (in production, would use more sophisticated diffing)
      const hasChanged = current.content && previous.content &&
        this.calculateContentSimilarity(current.content, previous.content) < 0.95;
      
      changes.push(hasChanged);
    }
    
    return changes;
  }

  /**
   * Calculate content similarity (simple implementation)
   */
  private calculateContentSimilarity(content1: string, content2: string): number {
    if (!content1 || !content2) return 0;
    
    // Simple Jaccard similarity based on words
    const words1 = new Set(content1.toLowerCase().split(/\s+/));
    const words2 = new Set(content2.toLowerCase().split(/\s+/));
    
    const intersection = new Set([...words1].filter(word => words2.has(word)));
    const union = new Set([...words1, ...words2]);
    
    return intersection.size / union.size;
  }

  /**
   * Calculate average change frequency in hours
   */
  private calculateAverageChangeFrequency(snapshots: any[], changes: boolean[]): number {
    if (changes.length === 0) return 168; // Default to weekly if no changes detected
    
    const changeIndices = changes.map((changed, index) => changed ? index : -1).filter(i => i >= 0);
    
    if (changeIndices.length < 2) return 168;
    
    let totalTimeBetweenChanges = 0;
    for (let i = 1; i < changeIndices.length; i++) {
      const currentChangeSnapshot = snapshots[changeIndices[i]];
      const previousChangeSnapshot = snapshots[changeIndices[i - 1]];
      
      const timeDiff = new Date(previousChangeSnapshot.createdAt).getTime() - 
                      new Date(currentChangeSnapshot.createdAt).getTime();
      totalTimeBetweenChanges += Math.abs(timeDiff);
    }
    
    const averageTimeBetweenChanges = totalTimeBetweenChanges / (changeIndices.length - 1);
    return Math.max(1, averageTimeBetweenChanges / (1000 * 60 * 60)); // Convert to hours, minimum 1 hour
  }

  /**
   * Calculate change volatility (0-1 scale)
   */
  private calculateChangeVolatility(changes: boolean[]): number {
    if (changes.length < 5) return 0.5; // Default medium volatility
    
    // Calculate the variance in change intervals
    const changeIntervals: number[] = [];
    let lastChangeIndex = -1;
    
    changes.forEach((changed, index) => {
      if (changed) {
        if (lastChangeIndex >= 0) {
          changeIntervals.push(index - lastChangeIndex);
        }
        lastChangeIndex = index;
      }
    });
    
    if (changeIntervals.length < 2) return 0.1; // Low volatility if few changes
    
    const mean = changeIntervals.reduce((sum, interval) => sum + interval, 0) / changeIntervals.length;
    const variance = changeIntervals.reduce((sum, interval) => sum + Math.pow(interval - mean, 2), 0) / changeIntervals.length;
    const standardDeviation = Math.sqrt(variance);
    
    // Normalize to 0-1 scale (high std dev = high volatility)
    return Math.min(1, standardDeviation / mean);
  }

  /**
   * Identify peak activity hours (hours of day with most changes)
   */
  private identifyPeakActivityHours(snapshots: any[], changes: boolean[]): number[] {
    const hourCounts = new Array(24).fill(0);
    
    changes.forEach((changed, index) => {
      if (changed && index < snapshots.length) {
        const hour = new Date(snapshots[index].createdAt).getHours();
        hourCounts[hour]++;
      }
    });
    
    // Return hours with above-average activity
    const averageActivity = hourCounts.reduce((sum, count) => sum + count, 0) / 24;
    return hourCounts
      .map((count, hour) => ({ hour, count }))
      .filter(item => item.count > averageActivity)
      .map(item => item.hour);
  }

  /**
   * Identify peak activity days (days of week with most changes)
   */
  private identifyPeakActivityDays(snapshots: any[], changes: boolean[]): number[] {
    const dayCounts = new Array(7).fill(0);
    
    changes.forEach((changed, index) => {
      if (changed && index < snapshots.length) {
        const dayOfWeek = new Date(snapshots[index].createdAt).getDay();
        dayCounts[dayOfWeek]++;
      }
    });
    
    // Return days with above-average activity
    const averageActivity = dayCounts.reduce((sum, count) => sum + count, 0) / 7;
    return dayCounts
      .map((count, day) => ({ day, count }))
      .filter(item => item.count > averageActivity)
      .map(item => item.day);
  }

  /**
   * Calculate seasonal trends (monthly patterns)
   */
  private calculateSeasonalTrends(snapshots: any[], changes: boolean[]): Record<string, number> {
    const monthCounts: Record<string, number> = {};
    
    changes.forEach((changed, index) => {
      if (changed && index < snapshots.length) {
        const month = new Date(snapshots[index].createdAt).toISOString().slice(0, 7); // YYYY-MM
        monthCounts[month] = (monthCounts[month] || 0) + 1;
      }
    });
    
    return monthCounts;
  }

  /**
   * Calculate pattern confidence based on data quality
   */
  private calculatePatternConfidence(snapshots: any[], changes: boolean[]): number {
    let confidence = 0;
    
    // Factor 1: Data quantity (more snapshots = higher confidence)
    const quantityScore = Math.min(1, snapshots.length / 50); // 50 snapshots = full confidence
    confidence += quantityScore * 0.4;
    
    // Factor 2: Data recency (recent data = higher confidence)
    const latestSnapshot = snapshots[0];
    const daysSinceLatest = (Date.now() - new Date(latestSnapshot.createdAt).getTime()) / (1000 * 60 * 60 * 24);
    const recencyScore = Math.max(0, 1 - (daysSinceLatest / 30)); // 30 days = zero confidence
    confidence += recencyScore * 0.3;
    
    // Factor 3: Pattern consistency (consistent changes = higher confidence)
    const changeRate = changes.filter(c => c).length / changes.length;
    const consistencyScore = changeRate > 0.1 && changeRate < 0.9 ? 1 : 0.5; // Extreme rates are less reliable
    confidence += consistencyScore * 0.3;
    
    return Math.min(1, confidence);
  }

  /**
   * Generate ML-optimized schedules based on patterns
   */
  async generateOptimizedSchedules(): Promise<OptimizedSchedule[]> {
    console.log(`[${this.correlationId}] Generating ML-optimized schedules`);
    
    const patterns = await this.analyzeDataChangePatterns();
    const optimizedSchedules: OptimizedSchedule[] = [];
    
    for (const pattern of patterns) {
      if (pattern.confidence < this.ML_THRESHOLDS.confidenceThreshold) {
        continue; // Skip patterns with low confidence
      }
      
      const optimized = await this.optimizeEntitySchedule(pattern);
      if (optimized) {
        optimizedSchedules.push(optimized);
      }
    }
    
    return optimizedSchedules;
  }

  /**
   * Optimize schedule for a specific entity based on its patterns
   */
  private async optimizeEntitySchedule(pattern: DataChangePattern): Promise<OptimizedSchedule | null> {
    const { projectId, entityType, entityId, patterns, confidence } = pattern;
    
    // Get current scheduling info
    const freshnessStatus = await this.smartScheduler.getFreshnessStatus(projectId);
    
    // Default 7-day interval from smart scheduling
    const originalInterval = 7 * 24; // 7 days in hours
    
    // Calculate optimized interval based on change frequency
    let optimizedInterval = patterns.averageChangeFrequency;
    
    // Adjust for volatility
    if (patterns.changeVolatility > this.ML_THRESHOLDS.highVolatilityThreshold) {
      optimizedInterval *= 0.7; // Check more frequently for volatile entities
    } else if (patterns.changeVolatility < this.ML_THRESHOLDS.lowActivityThreshold) {
      optimizedInterval *= 1.5; // Check less frequently for stable entities
    }
    
    // Ensure reasonable bounds
    optimizedInterval = Math.max(1, Math.min(14 * 24, optimizedInterval)); // 1 hour to 14 days
    
    // Determine priority based on change patterns
    let priority: 'HIGH' | 'MEDIUM' | 'LOW';
    if (patterns.averageChangeFrequency < 24 || patterns.changeVolatility > 0.7) {
      priority = 'HIGH'; // Frequent or unpredictable changes
    } else if (patterns.averageChangeFrequency < 72) {
      priority = 'MEDIUM'; // Moderate change frequency
    } else {
      priority = 'LOW'; // Infrequent changes
    }
    
    // Calculate next scrape time considering peak activity hours
    const nextScrapeTime = this.calculateOptimalNextScrapeTime(patterns, optimizedInterval);
    
    // Calculate expected data change probability
    const expectedDataChange = this.calculateDataChangeProbability(patterns);
    
    // Generate reasoning
    const reasoning = this.generateOptimizationReasoning(patterns, originalInterval, optimizedInterval, priority);
    
    return {
      projectId,
      entityType,
      entityId,
      originalInterval,
      optimizedInterval,
      priority,
      nextScrapeTime,
      confidenceScore: confidence,
      reasoning,
      expectedDataChange
    };
  }

  /**
   * Calculate optimal next scrape time based on patterns
   */
  private calculateOptimalNextScrapeTime(patterns: DataChangePattern['patterns'], intervalHours: number): Date {
    const now = new Date();
    const baseNextTime = new Date(now.getTime() + (intervalHours * 60 * 60 * 1000));
    
    // Adjust for peak activity hours if any are identified
    if (patterns.peakActivityHours.length > 0) {
      const targetHour = patterns.peakActivityHours[0]; // Use first peak hour
      const adjustedTime = new Date(baseNextTime);
      adjustedTime.setHours(targetHour);
      
      // If the adjusted time is in the past, add a day
      if (adjustedTime < now) {
        adjustedTime.setDate(adjustedTime.getDate() + 1);
      }
      
      return adjustedTime;
    }
    
    return baseNextTime;
  }

  /**
   * Calculate probability of data change in next interval
   */
  private calculateDataChangeProbability(patterns: DataChangePattern['patterns']): number {
    // Base probability on change frequency
    const currentHour = new Date().getHours();
    const currentDay = new Date().getDay();
    
    let baseProbability = Math.min(1, 24 / patterns.averageChangeFrequency);
    
    // Boost probability if we're in peak activity period
    if (patterns.peakActivityHours.includes(currentHour)) {
      baseProbability *= 1.5;
    }
    
    if (patterns.peakActivityDays.includes(currentDay)) {
      baseProbability *= 1.3;
    }
    
    // Adjust for volatility
    baseProbability += patterns.changeVolatility * 0.2;
    
    return Math.min(1, baseProbability);
  }

  /**
   * Generate human-readable optimization reasoning
   */
  private generateOptimizationReasoning(
    patterns: DataChangePattern['patterns'],
    originalInterval: number,
    optimizedInterval: number,
    priority: string
  ): string {
    let reasoning = `Changed from ${originalInterval}h to ${optimizedInterval}h intervals. `;
    
    if (patterns.averageChangeFrequency < 24) {
      reasoning += 'Entity shows frequent changes (less than daily). ';
    } else if (patterns.averageChangeFrequency > 7 * 24) {
      reasoning += 'Entity shows infrequent changes (more than weekly). ';
    }
    
    if (patterns.changeVolatility > 0.7) {
      reasoning += 'High volatility detected - unpredictable change patterns. ';
    } else if (patterns.changeVolatility < 0.3) {
      reasoning += 'Low volatility detected - consistent change patterns. ';
    }
    
    if (patterns.peakActivityHours.length > 0) {
      reasoning += `Peak activity hours: ${patterns.peakActivityHours.join(', ')}. `;
    }
    
    reasoning += `Priority: ${priority}`;
    
    return reasoning;
  }

  /**
   * Generate predictive insights for proactive scheduling
   */
  async generatePredictiveInsights(): Promise<PredictiveInsight[]> {
    console.log(`[${this.correlationId}] Generating predictive insights`);
    
    const insights: PredictiveInsight[] = [];
    const patterns = await this.analyzeDataChangePatterns();
    
    for (const pattern of patterns) {
      // Predict high activity periods
      if (pattern.patterns.peakActivityHours.length > 0) {
        const nextPeakHour = this.getNextPeakActivityTime(pattern.patterns.peakActivityHours);
        if (nextPeakHour) {
          insights.push({
            projectId: pattern.projectId,
            type: 'HIGH_ACTIVITY_PREDICTED',
            confidence: pattern.confidence,
            timeframe: `next ${Math.abs(nextPeakHour.getTime() - Date.now()) / (1000 * 60 * 60)} hours`,
            description: `High activity period predicted based on historical patterns`,
            recommendedAction: 'Schedule additional scraping during this period',
            impact: 'MEDIUM',
            timestamp: new Date()
          });
        }
      }
      
      // Predict data changes
      const changeProbability = this.calculateDataChangeProbability(pattern.patterns);
      if (changeProbability > 0.8) {
        insights.push({
          projectId: pattern.projectId,
          type: 'DATA_CHANGE_LIKELY',
          confidence: pattern.confidence * changeProbability,
          timeframe: `next ${pattern.patterns.averageChangeFrequency} hours`,
          description: `High probability of data change detected`,
          recommendedAction: 'Consider immediate scraping to capture changes',
          impact: 'HIGH',
          timestamp: new Date()
        });
      }
    }
    
    // Detect resource bottlenecks
    const activeProjects = await prisma.project.count({ where: { status: 'ACTIVE' } });
    if (activeProjects > this.LOAD_BALANCING.maxConcurrentTasks * 0.8) {
      insights.push({
        projectId: 'SYSTEM',
        type: 'RESOURCE_BOTTLENECK',
        confidence: 0.9,
        timeframe: 'current',
        description: `System approaching capacity limits (${activeProjects} active projects)`,
        recommendedAction: 'Consider increasing concurrent task limits or implementing queue management',
        impact: 'HIGH',
        timestamp: new Date()
      });
    }
    
    return insights;
  }

  /**
   * Get next peak activity time
   */
  private getNextPeakActivityTime(peakHours: number[]): Date | null {
    if (peakHours.length === 0) return null;
    
    const now = new Date();
    const currentHour = now.getHours();
    
    // Find next peak hour today or tomorrow
    let nextPeakHour = peakHours.find(hour => hour > currentHour);
    
    const nextTime = new Date(now);
    if (nextPeakHour !== undefined) {
      nextTime.setHours(nextPeakHour, 0, 0, 0);
    } else {
      // Next peak is tomorrow
      nextTime.setDate(nextTime.getDate() + 1);
      nextTime.setHours(peakHours[0], 0, 0, 0);
    }
    
    return nextTime;
  }

  /**
   * Implement intelligent load balancing
   */
  async implementLoadBalancing(): Promise<{ strategy: LoadBalancingStrategy; currentLoad: any }> {
    console.log(`[${this.correlationId}] Implementing intelligent load balancing`);
    
    // Get current system load
    const activeProjects = await prisma.project.count({ where: { status: 'ACTIVE' } });
    const recentTasks = await this.getRecentTaskMetrics();
    
    // Adjust load balancing based on current conditions
    const adjustedStrategy = { ...this.LOAD_BALANCING };
    
    // Adjust max concurrent tasks based on system performance
    if (recentTasks.errorRate > 0.1) {
      adjustedStrategy.maxConcurrentTasks = Math.max(
        5,
        Math.floor(adjustedStrategy.maxConcurrentTasks * 0.8)
      );
    } else if (recentTasks.errorRate < 0.02 && recentTasks.averageResponseTime < 10000) {
      adjustedStrategy.maxConcurrentTasks = Math.min(
        20,
        Math.floor(adjustedStrategy.maxConcurrentTasks * 1.2)
      );
    }
    
    // Adjust time slot scheduling based on current hour
    const currentHour = new Date().getHours();
    const isBusinessHours = currentHour >= adjustedStrategy.timeSlotScheduling.peakHours.start &&
                           currentHour <= adjustedStrategy.timeSlotScheduling.peakHours.end;
    
    const currentMaxTasks = isBusinessHours 
      ? adjustedStrategy.timeSlotScheduling.peakHours.maxTasks
      : adjustedStrategy.timeSlotScheduling.offPeakHours.maxTasks;
    
    return {
      strategy: adjustedStrategy,
      currentLoad: {
        activeProjects,
        currentMaxTasks,
        isBusinessHours,
        recentTaskMetrics: recentTasks,
        utilizationRate: activeProjects / adjustedStrategy.maxConcurrentTasks
      }
    };
  }

  /**
   * Get recent task performance metrics
   */
  private async getRecentTaskMetrics() {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    const recentSnapshots = await prisma.productSnapshot.findMany({
      where: { createdAt: { gte: oneDayAgo } },
      select: {
        scrapingDuration: true,
        content: true,
        error: true,
        captureSuccess: true
      }
    });
    
    const totalTasks = recentSnapshots.length;
    const failedTasks = recentSnapshots.filter(s => 
      !s.captureSuccess || s.content === null || s.error
    ).length;
    const errorRate = totalTasks > 0 ? failedTasks / totalTasks : 0;
    
    const validDurations = recentSnapshots
      .filter(s => s.scrapingDuration && s.scrapingDuration > 0)
      .map(s => s.scrapingDuration);
    
    const averageResponseTime = validDurations.length > 0
      ? validDurations.reduce((sum, duration) => sum + duration, 0) / validDurations.length
      : 5000;
    
    return {
      totalTasks,
      errorRate,
      averageResponseTime
    };
  }

  /**
   * Get optimization summary for all projects
   */
  async getOptimizationSummary() {
    console.log(`[${this.correlationId}] Getting optimization summary`);
    
    const [patterns, schedules, insights, loadBalancing] = await Promise.all([
      this.analyzeDataChangePatterns(),
      this.generateOptimizedSchedules(),
      this.generatePredictiveInsights(),
      this.implementLoadBalancing()
    ]);
    
    return {
      summary: {
        totalEntitiesAnalyzed: patterns.length,
        highConfidencePatterns: patterns.filter(p => p.confidence > 0.8).length,
        optimizedSchedules: schedules.length,
        predictiveInsights: insights.length,
        systemUtilization: loadBalancing.currentLoad.utilizationRate
      },
      patterns,
      optimizedSchedules: schedules,
      predictiveInsights: insights,
      loadBalancing,
      timestamp: new Date()
    };
  }
}

export default AdvancedSchedulingService;
export type {
  DataChangePattern,
  OptimizedSchedule,
  LoadBalancingStrategy,
  PredictiveInsight
}; 