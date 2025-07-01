/**
 * Phase 5.3: Test Cleanup Utilities
 * Handles proper resource cleanup to prevent worker process issues
 */

import { logger } from '@/lib/logger';

class TestCleanupManager {
  private static instance: TestCleanupManager;
  private activeTimeouts: Set<NodeJS.Timeout> = new Set();
  private activeIntervals: Set<NodeJS.Timeout> = new Set();
  private activePromises: Set<Promise<any>> = new Set();
  private cleanupCallbacks: Set<() => Promise<void> | void> = new Set();

  static getInstance(): TestCleanupManager {
    if (!TestCleanupManager.instance) {
      TestCleanupManager.instance = new TestCleanupManager();
    }
    return TestCleanupManager.instance;
  }

  /**
   * Register a timeout for cleanup
   */
  registerTimeout(timeout: NodeJS.Timeout): NodeJS.Timeout {
    this.activeTimeouts.add(timeout);
    return timeout;
  }

  /**
   * Register an interval for cleanup
   */
  registerInterval(interval: NodeJS.Timeout): NodeJS.Timeout {
    this.activeIntervals.add(interval);
    return interval;
  }

  /**
   * Register a promise to wait for completion
   */
  registerPromise<T>(promise: Promise<T>): Promise<T> {
    this.activePromises.add(promise);
    promise.finally(() => {
      this.activePromises.delete(promise);
    });
    return promise;
  }

  /**
   * Register a cleanup callback
   */
  registerCleanup(callback: () => Promise<void> | void): void {
    this.cleanupCallbacks.add(callback);
  }

  /**
   * Clean up all active resources
   */
  async cleanup(): Promise<void> {
    try {
      // Clear all active timeouts
      for (const timeout of this.activeTimeouts) {
        clearTimeout(timeout);
      }
      this.activeTimeouts.clear();

      // Clear all active intervals
      for (const interval of this.activeIntervals) {
        clearInterval(interval);
      }
      this.activeIntervals.clear();

      // Wait for active promises to complete (with timeout)
      if (this.activePromises.size > 0) {
        await Promise.race([
          Promise.allSettled(Array.from(this.activePromises)),
          new Promise(resolve => setTimeout(resolve, 5000)) // 5 second timeout
        ]);
        this.activePromises.clear();
      }

      // Execute cleanup callbacks
      for (const callback of this.cleanupCallbacks) {
        try {
          await callback();
        } catch (error) {
          logger.error('Error in cleanup callback', error as Error);
        }
      }
      this.cleanupCallbacks.clear();

    } catch (error) {
      logger.error('Error during test cleanup', error as Error);
    }
  }

  /**
   * Reset the cleanup manager state
   */
  reset(): void {
    this.activeTimeouts.clear();
    this.activeIntervals.clear();
    this.activePromises.clear();
    this.cleanupCallbacks.clear();
  }
}

export const testCleanup = TestCleanupManager.getInstance();

/**
 * Enhanced setTimeout that automatically registers for cleanup
 */
export const managedSetTimeout = (callback: () => void, delay: number): NodeJS.Timeout => {
  const timeout = setTimeout(callback, delay);
  return testCleanup.registerTimeout(timeout);
};

/**
 * Enhanced setInterval that automatically registers for cleanup
 */
export const managedSetInterval = (callback: () => void, delay: number): NodeJS.Timeout => {
  const interval = setInterval(callback, delay);
  return testCleanup.registerInterval(interval);
};

/**
 * Enhanced Promise wrapper that automatically registers for cleanup
 */
export const managedPromise = <T>(promise: Promise<T>): Promise<T> => {
  return testCleanup.registerPromise(promise);
};

/**
 * Setup function to be called in beforeEach
 */
export const setupTestCleanup = (): void => {
  testCleanup.reset();
};

/**
 * Teardown function to be called in afterEach
 */
export const teardownTestCleanup = async (): Promise<void> => {
  await testCleanup.cleanup();
};

/**
 * Jest setup hook
 */
export const setupTestEnvironment = (): void => {
  beforeEach(() => {
    setupTestCleanup();
  });

  afterEach(async () => {
    await teardownTestCleanup();
  });

  afterAll(async () => {
    await teardownTestCleanup();
  });
}; 