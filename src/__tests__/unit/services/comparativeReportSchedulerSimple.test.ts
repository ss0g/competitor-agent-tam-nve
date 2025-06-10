import { ComparativeReportSchedulerSimple, SimpleSchedulerConfig } from '@/services/comparativeReportSchedulerSimple';

describe('ComparativeReportSchedulerSimple', () => {
  let scheduler: ComparativeReportSchedulerSimple;

  beforeEach(() => {
    scheduler = new ComparativeReportSchedulerSimple();
  });

  afterEach(() => {
    // Clean up any scheduled jobs
    scheduler.stopAllJobs();
  });

  describe('Core Functionality', () => {
    it('should create scheduler instance successfully', () => {
      expect(scheduler).toBeDefined();
      expect(typeof scheduler.scheduleComparativeReports).toBe('function');
      expect(typeof scheduler.generateScheduledReport).toBe('function');
      expect(typeof scheduler.stopSchedule).toBe('function');
      expect(typeof scheduler.startSchedule).toBe('function');
    });

    it('should convert frequencies to cron expressions correctly', () => {
      // Access private method for testing
      const frequencyToCron = scheduler['frequencyToCron'].bind(scheduler);
      
      expect(frequencyToCron('DAILY')).toBe('0 9 * * *');
      expect(frequencyToCron('WEEKLY')).toBe('0 9 * * 1');
      expect(frequencyToCron('BIWEEKLY')).toBe('0 9 * * 1/2');
      expect(frequencyToCron('MONTHLY')).toBe('0 9 1 * *');
      expect(frequencyToCron('CUSTOM')).toBe('0 9 * * 1');
    });

    it('should manage active executions', () => {
      const executions = scheduler.getActiveExecutions();
      expect(Array.isArray(executions)).toBe(true);
      expect(executions.length).toBe(0);
    });

    it('should stop and start schedules', () => {
      // Test with non-existent schedule
      expect(scheduler.stopSchedule('non-existent')).toBe(false);
      expect(scheduler.startSchedule('non-existent')).toBe(false);
    });

    it('should stop all jobs during cleanup', () => {
      // This should not throw an error
      expect(() => scheduler.stopAllJobs()).not.toThrow();
    });
  });

  describe('Configuration Validation', () => {
    it('should handle default configuration', () => {
      const defaultConfig = scheduler['defaultConfig'];
      
      expect(defaultConfig.enabled).toBe(true);
      expect(defaultConfig.frequency).toBe('WEEKLY');
      expect(defaultConfig.notifyOnCompletion).toBe(true);
      expect(defaultConfig.notifyOnErrors).toBe(true);
      expect(defaultConfig.maxConcurrentJobs).toBe(1);
    });
  });

  describe('Cron Expression Calculation', () => {
    it('should calculate next run time', () => {
      const calculateNextRun = scheduler['calculateNextRun'].bind(scheduler);
      const nextRun = calculateNextRun('0 9 * * 1');
      
      expect(nextRun).toBeInstanceOf(Date);
      expect(nextRun.getTime()).toBeGreaterThan(Date.now());
    });
  });
}); 