/**
 * Memory Monitoring Utility
 * 
 * Provides tools for monitoring and optimizing memory usage in the application
 * Phase 5.2: Memory Optimization
 */

import { logger } from '../logger';
import { PrismaClient } from '@prisma/client';
import { createId } from '@paralleldrive/cuid2';

/**
 * Memory threshold configurations (in megabytes)
 */
export const MEMORY_THRESHOLDS = {
  // Warning threshold (75% of heap total)
  WARNING: 0.75,
  
  // Critical threshold (90% of heap total)
  CRITICAL: 0.9,
  
  // Object size threshold (in bytes) for detailed tracking
  LARGE_OBJECT_THRESHOLD: 10 * 1024 * 1024, // 10 MB
  
  // Clean up snapshot history after this many snapshots
  MAX_SNAPSHOTS: 100,
  
  // Take memory snapshots every N milliseconds
  SNAPSHOT_INTERVAL: 60 * 1000 // 1 minute
};

/**
 * Memory snapshot data structure
 */
export interface MemorySnapshot {
  id: string;
  timestamp: Date;
  rss: number;      // Resident Set Size - total memory allocated in MB
  heapTotal: number;  // V8 heap memory allocated in MB
  heapUsed: number;   // V8 heap memory used in MB
  external: number;   // Memory used by C++ objects bound to JS objects
  arrayBuffers: number; // Memory used by ArrayBuffers and SharedArrayBuffers
  heapUsagePercent: number; // Percentage of heap used
  source: string;   // Where the snapshot was initiated from
}

/**
 * Memory leak detection result
 */
export interface MemoryLeakDetectionResult {
  hasLeak: boolean;
  confidence: 'low' | 'medium' | 'high';
  trend: 'stable' | 'increasing' | 'decreasing';
  growthRate: number; // MB per hour
  potentialLeakSources: string[];
  recommendations: string[];
}

/**
 * Memory Management Class
 */
export class MemoryManager {
  private snapshots: MemorySnapshot[] = [];
  private snapshotInterval: NodeJS.Timeout | null = null;
  private prisma: PrismaClient | null = null;
  private isMonitoring: boolean = false;
  private largeObjectRegistry = new Map<string, { size: number, type: string, createdAt: Date }>();

  constructor() {
    // Initialize with a first snapshot
    this.takeSnapshot('initialization');
  }
  
  /**
   * Take a memory snapshot and store it
   */
  public takeSnapshot(source: string = 'manual'): MemorySnapshot {
    const memoryUsage = process.memoryUsage();
    
    // Convert to MB for readability
    const snapshot: MemorySnapshot = {
      id: createId(),
      timestamp: new Date(),
      rss: Math.round(memoryUsage.rss / 1024 / 1024),
      heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
      heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
      external: Math.round(memoryUsage.external / 1024 / 1024),
      arrayBuffers: Math.round((memoryUsage as any).arrayBuffers / 1024 / 1024),
      heapUsagePercent: Math.round((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100),
      source
    };
    
    // Add to snapshots history
    this.snapshots.push(snapshot);
    
    // Clean up if we exceed the max snapshots
    if (this.snapshots.length > MEMORY_THRESHOLDS.MAX_SNAPSHOTS) {
      this.snapshots = this.snapshots.slice(-MEMORY_THRESHOLDS.MAX_SNAPSHOTS);
    }
    
    // Log warnings if usage is high
    if (snapshot.heapUsagePercent > MEMORY_THRESHOLDS.CRITICAL * 100) {
      logger.warn('Memory usage critical', {
        heapUsagePercent: snapshot.heapUsagePercent,
        heapUsedMB: snapshot.heapUsed,
        heapTotalMB: snapshot.heapTotal
      });
    } else if (snapshot.heapUsagePercent > MEMORY_THRESHOLDS.WARNING * 100) {
      logger.info('Memory usage high', {
        heapUsagePercent: snapshot.heapUsagePercent,
        heapUsedMB: snapshot.heapUsed,
        heapTotalMB: snapshot.heapTotal
      });
    }
    
    return snapshot;
  }
  
  /**
   * Start continuous memory monitoring
   */
  public startMonitoring(intervalMs: number = MEMORY_THRESHOLDS.SNAPSHOT_INTERVAL): void {
    if (this.isMonitoring) {
      return;
    }
    
    this.isMonitoring = true;
    this.snapshotInterval = setInterval(() => {
      this.takeSnapshot('monitoring');
    }, intervalMs);
    
    logger.info('Memory monitoring started', {
      intervalMs,
      timestamp: new Date().toISOString()
    });
  }
  
  /**
   * Stop continuous memory monitoring
   */
  public stopMonitoring(): void {
    if (this.snapshotInterval) {
      clearInterval(this.snapshotInterval);
      this.snapshotInterval = null;
    }
    
    this.isMonitoring = false;
    logger.info('Memory monitoring stopped', {
      timestamp: new Date().toISOString()
    });
  }
  
  /**
   * Get current memory statistics
   */
  public getMemoryStats(): MemorySnapshot {
    return this.takeSnapshot('stats-request');
  }
  
  /**
   * Get history of memory usage
   */
  public getMemoryHistory(): MemorySnapshot[] {
    return [...this.snapshots];
  }
  
  /**
   * Register a large object for tracking
   */
  public registerLargeObject(objectId: string, sizeBytes: number, type: string): void {
    if (sizeBytes >= MEMORY_THRESHOLDS.LARGE_OBJECT_THRESHOLD) {
      this.largeObjectRegistry.set(objectId, {
        size: sizeBytes,
        type,
        createdAt: new Date()
      });
      
      logger.debug('Large object registered for tracking', {
        objectId,
        sizeMB: Math.round(sizeBytes / 1024 / 1024),
        type
      });
    }
  }
  
  /**
   * Unregister a large object (e.g., when it's garbage collected)
   */
  public unregisterLargeObject(objectId: string): void {
    if (this.largeObjectRegistry.has(objectId)) {
      this.largeObjectRegistry.delete(objectId);
      logger.debug('Large object unregistered', { objectId });
    }
  }
  
  /**
   * Get list of currently tracked large objects
   */
  public getLargeObjects(): Record<string, { size: number, type: string, createdAt: string }> {
    const result: Record<string, { size: number, type: string, createdAt: string }> = {};
    
    for (const [objectId, info] of this.largeObjectRegistry.entries()) {
      result[objectId] = {
        size: info.size,
        type: info.type,
        createdAt: info.createdAt.toISOString()
      };
    }
    
    return result;
  }
  
  /**
   * Force garbage collection if available in the environment
   * Note: Requires --expose-gc flag when starting Node.js
   */
  public forceGarbageCollection(): boolean {
    if (global.gc) {
      global.gc();
      logger.info('Forced garbage collection executed');
      return true;
    }
    
    logger.info('Garbage collection not available (start Node with --expose-gc flag)');
    return false;
  }
  
  /**
   * Analyze memory usage for potential leaks
   */
  public detectMemoryLeaks(): MemoryLeakDetectionResult {
    if (this.snapshots.length < 10) {
      return {
        hasLeak: false,
        confidence: 'low',
        trend: 'stable',
        growthRate: 0,
        potentialLeakSources: [],
        recommendations: ['Collect more data for accurate leak detection']
      };
    }
    
    // Calculate heap growth per hour over the last 10 snapshots
    const recentSnapshots = this.snapshots.slice(-10);
    const oldestSnapshot = recentSnapshots[0];
    const newestSnapshot = recentSnapshots[recentSnapshots.length - 1];
    
    const timeDiffHours = (newestSnapshot.timestamp.getTime() - oldestSnapshot.timestamp.getTime()) / 1000 / 60 / 60;
    
    if (timeDiffHours < 0.1) { // At least 6 minutes of data
      return {
        hasLeak: false,
        confidence: 'low',
        trend: 'stable',
        growthRate: 0,
        potentialLeakSources: [],
        recommendations: ['Collect data over a longer period for accurate leak detection']
      };
    }
    
    const heapGrowth = newestSnapshot.heapUsed - oldestSnapshot.heapUsed;
    const growthRatePerHour = heapGrowth / timeDiffHours;
    
    // Determine trend
    let trend: 'stable' | 'increasing' | 'decreasing' = 'stable';
    if (growthRatePerHour > 5) { // More than 5 MB/hour growth
      trend = 'increasing';
    } else if (growthRatePerHour < -5) { // Decreasing more than 5 MB/hour
      trend = 'decreasing';
    }
    
    // Check for potential leak
    let hasLeak = false;
    let confidence: 'low' | 'medium' | 'high' = 'low';
    const potentialLeakSources: string[] = [];
    const recommendations: string[] = [];
    
    if (growthRatePerHour > 10) { // Significant growth
      hasLeak = true;
      
      if (growthRatePerHour > 50) {
        confidence = 'high';
        recommendations.push('Critical: Investigate memory usage immediately');
        recommendations.push('Consider server restart as a temporary measure');
      } else if (growthRatePerHour > 20) {
        confidence = 'medium';
        recommendations.push('Investigate memory usage patterns');
      } else {
        confidence = 'low';
        recommendations.push('Monitor memory usage over a longer period');
      }
      
      // Add leak source analysis
      if (this.largeObjectRegistry.size > 0) {
        const largeObjectTypes = new Map<string, number>();
        
        for (const [_, info] of this.largeObjectRegistry.entries()) {
          largeObjectTypes.set(info.type, (largeObjectTypes.get(info.type) || 0) + 1);
        }
        
        for (const [type, count] of largeObjectTypes.entries()) {
          if (count > 3) {
            potentialLeakSources.push(`Multiple ${type} objects (${count} instances)`);
          }
        }
        
        recommendations.push('Check for unclosed resources or incomplete cleanup');
      }
      
      // Add more recommendations based on growth rate
      if ((newestSnapshot.arrayBuffers / newestSnapshot.heapUsed) > 0.3) {
        potentialLeakSources.push('High ArrayBuffer usage (potential file processing leak)');
        recommendations.push('Review file processing code for proper cleanup');
      }
    }
    
    if (trend === 'stable' || trend === 'decreasing') {
      recommendations.push('Memory usage appears normal, continue monitoring');
    }
    
    return {
      hasLeak,
      confidence,
      trend,
      growthRate: growthRatePerHour,
      potentialLeakSources,
      recommendations
    };
  }
  
  /**
   * Get memory-related recommendations based on current usage
   */
  public getMemoryRecommendations(): string[] {
    const currentSnapshot = this.takeSnapshot('recommendations');
    const recommendations: string[] = [];
    
    // Check heap usage
    if (currentSnapshot.heapUsagePercent > 90) {
      recommendations.push('CRITICAL: Heap usage > 90%. Consider immediate server restart');
      recommendations.push('Investigate memory-intensive operations');
    } else if (currentSnapshot.heapUsagePercent > 75) {
      recommendations.push('WARNING: Heap usage > 75%. Consider scaling up memory or optimizing code');
    }
    
    // Check for ArrayBuffer-heavy usage
    if (currentSnapshot.arrayBuffers > 100) { // > 100 MB
      recommendations.push('High ArrayBuffer usage detected. Check file processing or binary data handling');
    }
    
    // Check large objects
    if (this.largeObjectRegistry.size > 10) {
      recommendations.push(`${this.largeObjectRegistry.size} large objects tracked. Consider implementing stream processing`);
    }
    
    // General recommendations
    if (recommendations.length === 0) {
      recommendations.push('Memory usage normal. No immediate actions required');
    }
    
    return recommendations;
  }
}

// Create singleton instance
export const memoryManager = new MemoryManager();

/**
 * Calculate approximate size of an object in bytes
 * Note: This is an estimation and not 100% accurate
 */
export function getApproximateSize(obj: any): number {
  if (obj === null || obj === undefined) {
    return 0;
  }
  
  // Handle primitive types
  if (typeof obj === 'boolean') return 4;
  if (typeof obj === 'number') return 8;
  if (typeof obj === 'string') return obj.length * 2; // UTF-16
  
  // Handle arrays and objects recursively
  if (Array.isArray(obj)) {
    return obj.reduce((acc, item) => acc + getApproximateSize(item), 0);
  }
  
  if (typeof obj === 'object') {
    let size = 0;
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        size += key.length * 2; // Key size
        size += getApproximateSize(obj[key]); // Value size
      }
    }
    return size;
  }
  
  // Default fallback
  return 8;
}

/**
 * Create a weak reference to an object for memory-efficient tracking
 */
export function createWeakRef<T extends object>(obj: T): WeakRef<T> {
  return new WeakRef(obj);
}

/**
 * Clean up function for manual memory optimization
 */
export function optimizeMemory(options: { 
  forceGc?: boolean, 
  clearReferences?: boolean 
} = {}): MemorySnapshot {
  // Force garbage collection if requested and available
  if (options.forceGc) {
    memoryManager.forceGarbageCollection();
  }
  
  // Take a snapshot after optimization
  return memoryManager.takeSnapshot('manual-optimization');
} 