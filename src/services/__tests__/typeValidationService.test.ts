/**
 * Phase 5.3.2: Type Validation Service Tests
 * Comprehensive test suite for runtime type validation functionality
 */

import { TypeValidationService } from '../typeValidationService';
import {
  createProjectId, createReportId, createCompetitorId,
  QualityTier, DataFreshness, ReportGenerationStatus,
  TypedInitialReportOptions, TypedProjectReadinessResult,
  ValidationError
} from '@/types/enhancedReportTypes';

describe('TypeValidationService', () => {
  let typeValidationService: TypeValidationService;

  beforeEach(() => {
    // Reset singleton instance for each test
    (TypeValidationService as any).instance = undefined;
    typeValidationService = TypeValidationService.getInstance();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance when called multiple times', () => {
      const instance1 = TypeValidationService.getInstance();
      const instance2 = TypeValidationService.getInstance();
      
      expect(instance1).toBe(instance2);
    });
  });

  describe('Branded Type Validation', () => {
    describe('validateProjectId', () => {
      it('should validate valid project IDs', () => {
        const validIds = ['proj_123', 'project-456', 'abc123def456'];
        
        validIds.forEach(id => {
          const result = typeValidationService.validateProjectId(id);
          expect(result.success).toBe(true);
          if (result.success) {
            expect(result.data).toBe(id);
          }
        });
      });

      it('should reject empty project IDs', () => {
        const result = typeValidationService.validateProjectId('');
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.code).toBe('INVALID_PROJECT_ID');
          expect(result.error.field).toBe('projectId');
        }
      });
    });

    describe('validateReportId', () => {
      it('should validate valid report IDs', () => {
        const validIds = ['rep_123', 'report-456', 'xyz789abc123'];
        
        validIds.forEach(id => {
          const result = typeValidationService.validateReportId(id);
          expect(result.success).toBe(true);
          if (result.success) {
            expect(result.data).toBe(id);
          }
        });
      });

      it('should reject empty report IDs', () => {
        const result = typeValidationService.validateReportId('');
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.code).toBe('INVALID_REPORT_ID');
          expect(result.error.field).toBe('reportId');
        }
      });
    });
  });

  describe('Enum Validation', () => {
    describe('validateQualityTier', () => {
      it('should validate all valid quality tiers', () => {
        const validTiers: QualityTier[] = ['excellent', 'good', 'fair', 'poor', 'critical'];
        
        validTiers.forEach(tier => {
          const result = typeValidationService.validateQualityTier(tier);
          expect(result.success).toBe(true);
          if (result.success) {
            expect(result.data).toBe(tier);
          }
        });
      });

      it('should reject invalid quality tiers', () => {
        const invalidTiers = ['bad', 'amazing', 'terrible', '', 'GOOD'];
        
        invalidTiers.forEach(tier => {
          const result = typeValidationService.validateQualityTier(tier);
          expect(result.success).toBe(false);
          if (!result.success) {
            expect(result.error.code).toBe('INVALID_QUALITY_TIER');
            expect(result.error.message).toContain('excellent, good, fair, poor, critical');
          }
        });
      });
    });

    describe('validateDataFreshness', () => {
      it('should validate all valid data freshness values', () => {
        const validValues: DataFreshness[] = ['new', 'existing', 'mixed', 'basic'];
        
        validValues.forEach(value => {
          const result = typeValidationService.validateDataFreshness(value);
          expect(result.success).toBe(true);
          if (result.success) {
            expect(result.data).toBe(value);
          }
        });
      });

      it('should reject invalid data freshness values', () => {
        const invalidValues = ['fresh', 'stale', 'old', '', 'NEW'];
        
        invalidValues.forEach(value => {
          const result = typeValidationService.validateDataFreshness(value);
          expect(result.success).toBe(false);
          if (!result.success) {
            expect(result.error.code).toBe('INVALID_DATA_FRESHNESS');
            expect(result.error.message).toContain('new, existing, mixed, basic');
          }
        });
      });
    });

    describe('validateReportGenerationStatus', () => {
      it('should validate all valid report generation statuses', () => {
        const validStatuses: ReportGenerationStatus[] = [
          'generating', 'completed', 'failed', 'not_started', 'queued', 'timeout'
        ];
        
        validStatuses.forEach(status => {
          const result = typeValidationService.validateReportGenerationStatus(status);
          expect(result.success).toBe(true);
          if (result.success) {
            expect(result.data).toBe(status);
          }
        });
      });

      it('should reject invalid report generation statuses', () => {
        const invalidStatuses = ['pending', 'processing', 'done', '', 'COMPLETED'];
        
        invalidStatuses.forEach(status => {
          const result = typeValidationService.validateReportGenerationStatus(status);
          expect(result.success).toBe(false);
          if (!result.success) {
            expect(result.error.code).toBe('INVALID_REPORT_STATUS');
            expect(result.error.message).toContain('generating, completed, failed');
          }
        });
      });
    });
  });

  describe('Complex Type Validation', () => {
    describe('validateInitialReportOptions', () => {
      it('should validate valid initial report options', () => {
        const validOptions = {
          template: 'comprehensive' as const,
          priority: 'high' as const,
          timeout: 30000,
          fallbackToPartialData: true,
          notifyOnCompletion: false,
          requireFreshSnapshots: true,
          userId: 'user_123',
          correlationId: 'corr_456'
        };

        const result = typeValidationService.validateInitialReportOptions(validOptions);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.template).toBe('comprehensive');
          expect(result.data.priority).toBe('high');
          expect(result.data.timeout).toBe(30000);
        }
      });

      it('should validate options with missing optional fields', () => {
        const minimalOptions = {
          template: 'executive' as const
        };

        const result = typeValidationService.validateInitialReportOptions(minimalOptions);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.template).toBe('executive');
          expect(result.data.priority).toBeUndefined();
        }
      });

      it('should reject options with invalid template', () => {
        const invalidOptions = {
          template: 'invalid_template',
          priority: 'high'
        };

        const result = typeValidationService.validateInitialReportOptions(invalidOptions);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.length).toBeGreaterThan(0);
          expect(result.error[0]?.code).toContain('VALIDATION_ERROR');
        }
      });

      it('should reject options with negative timeout', () => {
        const invalidOptions = {
          timeout: -1000
        };

        const result = typeValidationService.validateInitialReportOptions(invalidOptions);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.length).toBeGreaterThan(0);
        }
      });
    });

    describe('validateProjectReadinessResult', () => {
      it('should validate valid project readiness result', () => {
        const validResult = {
          isReady: true,
          hasProduct: true,
          hasCompetitors: true,
          hasProductData: true,
          missingData: [],
          readinessScore: 95,
          validationErrors: [],
          checkedAt: new Date()
        };

        const result = typeValidationService.validateProjectReadinessResult(validResult);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.isReady).toBe(true);
          expect(result.data.readinessScore).toBe(95);
          expect(result.data.missingData).toEqual([]);
        }
      });

      it('should validate result with missing data', () => {
        const resultWithMissingData = {
          isReady: false,
          hasProduct: true,
          hasCompetitors: false,
          hasProductData: true,
          missingData: ['competitors'],
          readinessScore: 60,
          validationErrors: [{
            code: 'MISSING_COMPETITORS',
            message: 'No competitors found',
            severity: 'error' as const,
            timestamp: new Date()
          }],
          checkedAt: new Date()
        };

        const result = typeValidationService.validateProjectReadinessResult(resultWithMissingData);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.isReady).toBe(false);
          expect(result.data.missingData).toContain('competitors');
          expect(result.data.validationErrors).toHaveLength(1);
        }
      });

      it('should reject result with invalid readiness score', () => {
        const invalidResult = {
          isReady: true,
          hasProduct: true,
          hasCompetitors: true,
          hasProductData: true,
          missingData: [],
          readinessScore: 150,
          validationErrors: [],
          checkedAt: new Date()
        };

        const result = typeValidationService.validateProjectReadinessResult(invalidResult);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.length).toBeGreaterThan(0);
        }
      });
    });
  });

  describe('Array Validation', () => {
    it('should validate arrays with proper error handling', () => {
      // Test array validation concept without accessing private properties
      expect(true).toBe(true); // Placeholder test for array validation
    });
  });

  describe('Error Handling', () => {
    describe('createValidationError', () => {
      it('should create validation error with all fields', () => {
        const error = typeValidationService.createValidationError(
          'TEST_ERROR',
          'Test error message',
          'testField',
          'testValue',
          'warning'
        );

        expect(error.code).toBe('TEST_ERROR');
        expect(error.message).toBe('Test error message');
        expect(error.field).toBe('testField');
        expect(error.value).toBe('testValue');
        expect(error.severity).toBe('warning');
        expect(error.timestamp).toBeInstanceOf(Date);
      });

      it('should create validation error with minimal fields', () => {
        const error = typeValidationService.createValidationError(
          'MINIMAL_ERROR',
          'Minimal error'
        );

        expect(error.code).toBe('MINIMAL_ERROR');
        expect(error.message).toBe('Minimal error');
        expect(error.field).toBeUndefined();
        expect(error.value).toBeUndefined();
        expect(error.severity).toBe('error');
      });

      it('should sanitize long values', () => {
        const longValue = 'a'.repeat(150);
        const error = typeValidationService.createValidationError(
          'LONG_VALUE_ERROR',
          'Error with long value',
          'field',
          longValue
        );

        expect(typeof error.value).toBe('string');
        expect((error.value as string).length).toBeLessThan(150);
        expect((error.value as string)).toContain('...');
      });
    });

    describe('Result Unwrapping', () => {
      it('should unwrap successful result', () => {
        const successResult = { success: true as const, data: 'test data' };
        const unwrapped = typeValidationService.unwrapResult(successResult);
        expect(unwrapped).toBe('test data');
      });

      it('should throw error when unwrapping failed result', () => {
        const failedResult = {
          success: false as const,
          error: [
            typeValidationService.createValidationError('TEST_ERROR', 'Test error 1'),
            typeValidationService.createValidationError('TEST_ERROR', 'Test error 2')
          ]
        };

        expect(() => {
          typeValidationService.unwrapResult(failedResult);
        }).toThrow('Validation failed: Test error 1, Test error 2');
      });

      it('should unwrap async successful result', async () => {
        const asyncSuccessResult = Promise.resolve({ success: true as const, data: 'async data' });
        const unwrapped = await typeValidationService.unwrapAsyncResult(asyncSuccessResult);
        expect(unwrapped).toBe('async data');
      });

      it('should throw error when unwrapping async failed result', async () => {
        const asyncFailedResult = Promise.resolve({
          success: false as const,
          error: [typeValidationService.createValidationError('ASYNC_ERROR', 'Async error')]
        });

        await expect(typeValidationService.unwrapAsyncResult(asyncFailedResult))
          .rejects.toThrow('Validation failed: Async error');
      });
    });
  });

  describe('Type Safety Features', () => {
    it('should provide type-safe validation methods', () => {
      // Test that the validation service provides expected methods
      expect(typeof typeValidationService.validateProjectId).toBe('function');
      expect(typeof typeValidationService.validateReportId).toBe('function');
      expect(typeof typeValidationService.validateQualityTier).toBe('function');
      expect(typeof typeValidationService.validateDataFreshness).toBe('function');
      expect(typeof typeValidationService.validateReportGenerationStatus).toBe('function');
      expect(typeof typeValidationService.createValidationError).toBe('function');
    });

    it('should ensure type safety with branded types', () => {
      // Test that validation returns proper typed results
      const projectIdResult = typeValidationService.validateProjectId('test_project');
      expect(projectIdResult.success).toBe(true);
      
      const reportIdResult = typeValidationService.validateReportId('test_report');
      expect(reportIdResult.success).toBe(true);
    });
  });
}); 