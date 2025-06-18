// Unmock the logger for this test file to test the real implementation
jest.unmock('@/lib/logger');

import { 
  logger, 
  LogLevel, 
  trackEvent, 
  trackError, 
  trackPerformance, 
  trackUserAction, 
  trackBusinessEvent 
} from '@/lib/logger';

// Mock console methods
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;
const originalConsoleDebug = console.debug;

describe('Logger', () => {
  let consoleLogs: string[] = [];
  let consoleErrors: string[] = [];
  let consoleWarns: string[] = [];
  let consoleDebugs: string[] = [];

  beforeEach(() => {
    consoleLogs = [];
    consoleErrors = [];
    consoleWarns = [];
    consoleDebugs = [];

    console.log = jest.fn((message) => consoleLogs.push(message));
    console.error = jest.fn((message) => consoleErrors.push(message));
    console.warn = jest.fn((message) => consoleWarns.push(message));
    console.debug = jest.fn((message) => consoleDebugs.push(message));

    logger.clearContext();
    logger.setLogLevel(LogLevel.DEBUG);
  });

  afterEach(() => {
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
    console.warn = originalConsoleWarn;
    console.debug = originalConsoleDebug;
  });

  describe('Log Levels', () => {
    it('should log debug messages when level is DEBUG', () => {
      logger.setLogLevel(LogLevel.DEBUG);
      logger.debug('Debug message');
      
      expect(consoleDebugs).toHaveLength(1);
      expect(consoleDebugs[0]).toContain('Debug message');
      expect(consoleDebugs[0]).toContain('[DEBUG]');
    });

    it('should not log debug messages when level is INFO', () => {
      logger.setLogLevel(LogLevel.INFO);
      logger.debug('Debug message');
      
      expect(consoleDebugs).toHaveLength(0);
    });

    it('should log info messages when level is INFO', () => {
      logger.setLogLevel(LogLevel.INFO);
      logger.info('Info message');
      
      expect(consoleLogs).toHaveLength(1);
      expect(consoleLogs[0]).toContain('Info message');
      expect(consoleLogs[0]).toContain('[INFO]');
    });

    it('should log warning messages', () => {
      logger.warn('Warning message');
      
      expect(consoleWarns).toHaveLength(1);
      expect(consoleWarns[0]).toContain('Warning message');
      expect(consoleWarns[0]).toContain('[WARN]');
    });

    it('should log error messages', () => {
      const error = new Error('Test error');
      logger.error('Error message', error);
      
      expect(consoleErrors).toHaveLength(1);
      expect(consoleErrors[0]).toContain('Error message');
      expect(consoleErrors[0]).toContain('[ERROR]');
      expect(consoleErrors[0]).toContain('Test error');
    });
  });

  describe('Context Management', () => {
    it('should include context in log messages', () => {
      const context = { userId: 'user123', requestId: 'req456' };
      logger.info('Test message', context);
      
      expect(consoleLogs[0]).toContain('userId');
      expect(consoleLogs[0]).toContain('user123');
      expect(consoleLogs[0]).toContain('requestId');
      expect(consoleLogs[0]).toContain('req456');
    });

    it('should maintain persistent context', () => {
      logger.setContext({ userId: 'user123' });
      logger.info('First message');
      logger.info('Second message');
      
      expect(consoleLogs[0]).toContain('user123');
      expect(consoleLogs[1]).toContain('user123');
    });

    it('should merge contexts correctly', () => {
      logger.setContext({ userId: 'user123' });
      logger.info('Test message', { requestId: 'req456' });
      
      expect(consoleLogs[0]).toContain('user123');
      expect(consoleLogs[0]).toContain('req456');
    });

    it('should clear context', () => {
      logger.setContext({ userId: 'user123' });
      logger.clearContext();
      logger.info('Test message');
      
      expect(consoleLogs[0]).not.toContain('user123');
    });
  });

  describe('Child Logger', () => {
    it('should create child logger with additional context', () => {
      const childLogger = logger.child({ requestId: 'req123' });
      childLogger.info('Child message');
      
      expect(consoleLogs[0]).toContain('req123');
    });

    it('should inherit parent context in child logger', () => {
      logger.setContext({ userId: 'user123' });
      const childLogger = logger.child({ requestId: 'req456' });
      childLogger.info('Child message');
      
      expect(consoleLogs[0]).toContain('user123');
      expect(consoleLogs[0]).toContain('req456');
    });
  });

  describe('Performance Timing', () => {
    it('should time operations successfully', async () => {
      const mockOperation = jest.fn().mockResolvedValue('result');
      const result = await logger.timeOperation('test_operation', mockOperation);
      
      expect(result).toBe('result');
      expect(mockOperation).toHaveBeenCalled();
      expect(consoleLogs.some(log => log.includes('Performance: test_operation'))).toBe(true);
    });

    it('should handle operation failures', async () => {
      const error = new Error('Operation failed');
      const mockOperation = jest.fn().mockRejectedValue(error);
      
      await expect(logger.timeOperation('test_operation', mockOperation)).rejects.toThrow('Operation failed');
      expect(consoleErrors.some(log => log.includes('test_operation failed'))).toBe(true);
    });
  });

  describe('Event Tracking', () => {
    it('should track events', () => {
      trackEvent({
        eventType: 'user_login',
        category: 'user_action',
        metadata: { source: 'web' }
      });
      
      expect(consoleLogs.some(log => log.includes('Event: user_login'))).toBe(true);
    });

    it('should track errors', () => {
      const error = new Error('Test error');
      trackError(error, 'test_operation');
      
      expect(consoleErrors.some(log => log.includes('Error in test_operation'))).toBe(true);
    });

    it('should track performance', () => {
      trackPerformance('test_operation', 100);
      
      expect(consoleLogs.some(log => log.includes('Performance: test_operation'))).toBe(true);
    });

    it('should track user actions', () => {
      trackUserAction('button_click', { buttonId: 'submit' });
      
      expect(consoleLogs.some(log => log.includes('Event: button_click'))).toBe(true);
    });

    it('should track business events', () => {
      trackBusinessEvent('report_generated', { reportId: 'report123' });
      
      expect(consoleLogs.some(log => log.includes('Event: report_generated'))).toBe(true);
    });
  });

  describe('Log Formatting', () => {
    it('should format timestamps correctly', () => {
      logger.info('Test message');
      
      const logMessage = consoleLogs[0];
      const timestampRegex = /\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\]/;
      expect(timestampRegex.test(logMessage)).toBe(true);
    });

    it('should include stack trace for errors', () => {
      const error = new Error('Test error');
      logger.error('Error occurred', error);
      
      expect(consoleErrors[0]).toContain('Stack:');
    });

    it('should format performance logs correctly', () => {
      logger.performance('test_operation', 150);
      
      expect(consoleLogs[0]).toContain('Performance: test_operation took 150ms');
    });
  });

  describe('Error Handling', () => {
    it('should handle errors without stack traces', () => {
      const error = new Error('Test error');
      delete error.stack;
      logger.error('Error occurred', error);
      
      expect(consoleErrors[0]).toContain('Test error');
      expect(consoleErrors[0]).not.toContain('Stack:');
    });

    it('should handle null/undefined errors gracefully', () => {
      logger.error('Error occurred', undefined);
      
      expect(consoleErrors[0]).toContain('Error occurred');
      expect(consoleErrors).toHaveLength(1);
    });
  });
}); 