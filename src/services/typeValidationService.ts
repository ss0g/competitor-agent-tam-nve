/**
 * Phase 5.3.2: Runtime Type Validation Service
 * Provides runtime type checking and validation for enhanced type safety
 */

import { z } from 'zod';
import { logger } from '@/lib/logger';
import {
  ProjectId, ReportId, CompetitorId, ProductId, SnapshotId, UserId,
  QualityTier, DataFreshness, ReportGenerationStatus,
  ValidationError, TypedInitialReportOptions, TypedProjectReadinessResult,
  TypedSnapshotCaptureResult, TypedDataAvailabilityResult,
  SnapshotFailure, SnapshotCaptureMetadata,
  Result, AsyncResult,
  isProjectId, isReportId, isValidQualityTier, isValidDataFreshness, isValidReportGenerationStatus
} from '@/types/enhancedReportTypes';

// Zod schemas for runtime validation
export const ProjectIdSchema = z.string().min(1).refine(isProjectId, {
  message: 'Invalid project ID format'
});

export const ReportIdSchema = z.string().min(1).refine(isReportId, {
  message: 'Invalid report ID format'
});

export const QualityTierSchema = z.enum(['excellent', 'good', 'fair', 'poor', 'critical']);

export const DataFreshnessSchema = z.enum(['new', 'existing', 'mixed', 'basic']);

export const ReportGenerationStatusSchema = z.enum(['generating', 'completed', 'failed', 'not_started', 'queued', 'timeout']);

export const QualityAssessmentSchema = z.object({
  overallScore: z.number().min(0).max(100),
  qualityTier: QualityTierSchema,
  dataCompleteness: z.number().min(0).max(100),
  dataFreshness: z.number().min(0).max(100),
  analysisConfidence: z.number().min(0).max(100),
  improvementPotential: z.number().min(0).max(100),
  quickWinsAvailable: z.number().min(0),
  assessmentTimestamp: z.date(),
  assessmentVersion: z.string().min(1)
});

export const GenerationContextSchema = z.object({
  isInitialReport: z.boolean(),
  dataFreshness: DataFreshnessSchema,
  competitorSnapshotsCaptured: z.number().min(0),
  usedPartialDataGeneration: z.boolean(),
  generationTime: z.number().min(0),
  generationStartTime: z.date(),
  generationEndTime: z.date(),
  configurationVersion: z.string().min(1),
  algorithmVersion: z.string().min(1),
  fallbacksUsed: z.array(z.string())
});

export const ValidationErrorSchema = z.object({
  code: z.string().min(1),
  message: z.string().min(1),
  field: z.string().optional(),
  value: z.unknown().optional(),
  severity: z.enum(['error', 'warning', 'info']),
  timestamp: z.date()
});

export const TypedInitialReportOptionsSchema = z.object({
  template: z.enum(['comprehensive', 'executive', 'technical', 'strategic']).optional(),
  priority: z.enum(['high', 'normal', 'low']).optional(),
  timeout: z.number().positive().optional(),
  fallbackToPartialData: z.boolean().optional(),
  notifyOnCompletion: z.boolean().optional(),
  requireFreshSnapshots: z.boolean().optional(),
  userId: z.string().optional(),
  correlationId: z.string().optional()
}).transform((data) => ({
  ...data,
  userId: data.userId ? data.userId as UserId : undefined
}));

export const TypedProjectReadinessResultSchema = z.object({
  isReady: z.boolean(),
  hasProduct: z.boolean(),
  hasCompetitors: z.boolean(),
  hasProductData: z.boolean(),
  missingData: z.array(z.string()),
  readinessScore: z.number().min(0).max(100),
  validationErrors: z.array(ValidationErrorSchema),
  checkedAt: z.date()
});

export const SnapshotCaptureMetadataSchema = z.object({
  snapshotId: z.string().min(1),
  competitorId: z.string().min(1),
  captureStartTime: z.date(),
  captureEndTime: z.date(),
  captureDuration: z.number().min(0),
  captureSuccess: z.boolean(),
  captureError: z.string().optional(),
  captureRetryCount: z.number().min(0),
  websiteComplexity: z.enum(['basic', 'ecommerce', 'saas', 'marketplace']),
  dataSize: z.number().min(0),
  compressionRatio: z.number().min(0).max(1)
});

export const PerformanceMetricsSchema = z.object({
  reportGenerationTime: z.number().min(0),
  snapshotCaptureTime: z.number().min(0),
  analysisTime: z.number().min(0),
  databaseQueryTime: z.number().min(0),
  memoryUsage: z.number().min(0),
  cpuTime: z.number().min(0),
  cacheHitRate: z.number().min(0).max(1),
  retryCount: z.number().min(0),
  concurrentOperations: z.number().min(0)
});

// Type validation service class
export class TypeValidationService {
  private static instance: TypeValidationService;

  private constructor() {}

  public static getInstance(): TypeValidationService {
    if (!TypeValidationService.instance) {
      TypeValidationService.instance = new TypeValidationService();
    }
    return TypeValidationService.instance;
  }

  /**
   * Validate and parse typed initial report options
   */
  public validateInitialReportOptions(input: unknown): Result<TypedInitialReportOptions, ValidationError[]> {
    try {
      const result = TypedInitialReportOptionsSchema.parse(input);
      return { success: true, data: result };
    } catch (error) {
      const validationErrors = this.parseZodError(error, 'InitialReportOptions');
      return { success: false, error: validationErrors };
    }
  }

  /**
   * Validate project readiness result
   */
  public validateProjectReadinessResult(input: unknown): Result<TypedProjectReadinessResult, ValidationError[]> {
    try {
      const result = TypedProjectReadinessResultSchema.parse(input);
      return { success: true, data: result };
    } catch (error) {
      const validationErrors = this.parseZodError(error, 'ProjectReadinessResult');
      return { success: false, error: validationErrors };
    }
  }

  /**
   * Validate snapshot capture result
   */
  public validateSnapshotCaptureResult(input: unknown): Result<TypedSnapshotCaptureResult, ValidationError[]> {
    const SnapshotCaptureResultSchema = z.object({
      success: z.boolean(),
      capturedCount: z.number().min(0),
      totalCompetitors: z.number().min(0),
      failures: z.array(z.object({
        competitorId: z.string().min(1),
        competitorName: z.string().min(1),
        error: z.string().min(1),
        retryable: z.boolean(),
        nextRetryAt: z.date().optional()
      })),
      captureTime: z.number().min(0),
      captureMetadata: z.array(SnapshotCaptureMetadataSchema),
      resourceUsage: PerformanceMetricsSchema
    }).transform((data) => ({
      ...data,
      failures: data.failures.map(failure => ({
        ...failure,
        competitorId: failure.competitorId as CompetitorId
      })) as readonly SnapshotFailure[],
      captureMetadata: data.captureMetadata.map(metadata => ({
        ...metadata,
        snapshotId: metadata.snapshotId as SnapshotId,
        competitorId: metadata.competitorId as CompetitorId
      })) as readonly SnapshotCaptureMetadata[]
    }));

    try {
      const result = SnapshotCaptureResultSchema.parse(input);
      return { success: true, data: result };
    } catch (error) {
      const validationErrors = this.parseZodError(error, 'SnapshotCaptureResult');
      return { success: false, error: validationErrors };
    }
  }

  /**
   * Validate data availability result
   */
  public validateDataAvailabilityResult(input: unknown): Result<TypedDataAvailabilityResult, ValidationError[]> {
    const DataAvailabilityResultSchema = z.object({
      hasMinimumData: z.boolean(),
      dataCompletenessScore: z.number().min(0).max(100),
      availableCompetitors: z.number().min(0),
      totalCompetitors: z.number().min(0),
      dataFreshness: DataFreshnessSchema,
      freshDataAge: z.number().min(0),
      validationErrors: z.array(ValidationErrorSchema)
    });

    try {
      const result = DataAvailabilityResultSchema.parse(input);
      return { success: true, data: result };
    } catch (error) {
      const validationErrors = this.parseZodError(error, 'DataAvailabilityResult');
      return { success: false, error: validationErrors };
    }
  }

  /**
   * Validate API request parameters
   */
  public validateApiRequest<T>(schema: z.ZodSchema<T>, input: unknown, context: string): Result<T, ValidationError[]> {
    try {
      const result = schema.parse(input);
      return { success: true, data: result };
    } catch (error) {
      const validationErrors = this.parseZodError(error, context);
      logger.warn('API request validation failed', {
        context,
        validationErrors,
        input: this.sanitizeInput(input)
      });
      return { success: false, error: validationErrors };
    }
  }

  /**
   * Validate and type-check branded IDs
   */
  public validateProjectId(input: string): Result<ProjectId, ValidationError> {
    if (!isProjectId(input)) {
      return {
        success: false,
        error: {
          code: 'INVALID_PROJECT_ID',
          message: 'Invalid project ID format',
          field: 'projectId',
          value: input,
          severity: 'error',
          timestamp: new Date()
        }
      };
    }
    return { success: true, data: input };
  }

  public validateReportId(input: string): Result<ReportId, ValidationError> {
    if (!isReportId(input)) {
      return {
        success: false,
        error: {
          code: 'INVALID_REPORT_ID',
          message: 'Invalid report ID format',
          field: 'reportId',
          value: input,
          severity: 'error',
          timestamp: new Date()
        }
      };
    }
    return { success: true, data: input };
  }

  /**
   * Validate enum values
   */
  public validateQualityTier(input: string): Result<QualityTier, ValidationError> {
    if (!isValidQualityTier(input)) {
      return {
        success: false,
        error: {
          code: 'INVALID_QUALITY_TIER',
          message: `Invalid quality tier: ${input}. Must be one of: excellent, good, fair, poor, critical`,
          field: 'qualityTier',
          value: input,
          severity: 'error',
          timestamp: new Date()
        }
      };
    }
    return { success: true, data: input };
  }

  public validateDataFreshness(input: string): Result<DataFreshness, ValidationError> {
    if (!isValidDataFreshness(input)) {
      return {
        success: false,
        error: {
          code: 'INVALID_DATA_FRESHNESS',
          message: `Invalid data freshness: ${input}. Must be one of: new, existing, mixed, basic`,
          field: 'dataFreshness',
          value: input,
          severity: 'error',
          timestamp: new Date()
        }
      };
    }
    return { success: true, data: input };
  }

  public validateReportGenerationStatus(input: string): Result<ReportGenerationStatus, ValidationError> {
    if (!isValidReportGenerationStatus(input)) {
      return {
        success: false,
        error: {
          code: 'INVALID_REPORT_STATUS',
          message: `Invalid report generation status: ${input}. Must be one of: generating, completed, failed, not_started, queued, timeout`,
          field: 'status',
          value: input,
          severity: 'error',
          timestamp: new Date()
        }
      };
    }
    return { success: true, data: input };
  }

  /**
   * Create a validation error with consistent format
   */
  public createValidationError(
    code: string,
    message: string,
    field?: string,
    value?: unknown,
    severity: 'error' | 'warning' | 'info' = 'error'
  ): ValidationError {
    return {
      code,
      message,
      field,
      value: this.sanitizeValue(value),
      severity,
      timestamp: new Date()
    };
  }

  /**
   * Parse Zod validation errors into structured validation errors
   */
  private parseZodError(error: unknown, context: string): ValidationError[] {
    if (error instanceof z.ZodError) {
      return error.errors.map(err => ({
        code: `VALIDATION_ERROR_${err.code.toUpperCase()}`,
        message: `${context}: ${err.message}`,
        field: err.path.join('.'),
        value: undefined, // ZodIssue doesn't expose input value
        severity: 'error' as const,
        timestamp: new Date()
      }));
    }

    // Fallback for non-Zod errors
    return [{
      code: 'UNKNOWN_VALIDATION_ERROR',
      message: `${context}: ${error instanceof Error ? error.message : 'Unknown validation error'}`,
      severity: 'error' as const,
      timestamp: new Date()
    }];
  }

  /**
   * Sanitize input for logging (remove sensitive data)
   */
  private sanitizeInput(input: unknown): unknown {
    if (typeof input === 'object' && input !== null) {
      const sanitized = { ...input as Record<string, unknown> };
      // Remove potentially sensitive fields
      delete sanitized.password;
      delete sanitized.token;
      delete sanitized.apiKey;
      delete sanitized.secret;
      return sanitized;
    }
    return input;
  }

  /**
   * Sanitize value for error reporting
   */
  private sanitizeValue(value: unknown): unknown {
    if (typeof value === 'string' && value.length > 100) {
      return value.substring(0, 100) + '...';
    }
    return this.sanitizeInput(value);
  }

  /**
   * Validate array of items with detailed error reporting
   */
  public validateArray<T>(
    schema: z.ZodSchema<T>,
    items: unknown[],
    context: string
  ): Result<T[], ValidationError[]> {
    const validItems: T[] = [];
    const errors: ValidationError[] = [];

    items.forEach((item, index) => {
      try {
        const validItem = schema.parse(item);
        validItems.push(validItem);
      } catch (error) {
        const itemErrors = this.parseZodError(error, `${context}[${index}]`);
        errors.push(...itemErrors);
      }
    });

    if (errors.length > 0) {
      return { success: false, error: errors };
    }

    return { success: true, data: validItems };
  }

  /**
   * Type-safe result unwrapping with error handling
   */
  public unwrapResult<T>(result: Result<T, ValidationError[]>): T {
    if (!result.success) {
      const errorMessage = result.error.map(e => e.message).join(', ');
      throw new Error(`Validation failed: ${errorMessage}`);
    }
    return result.data;
  }

  /**
   * Async result unwrapping
   */
  public async unwrapAsyncResult<T>(result: AsyncResult<T, ValidationError[]>): Promise<T> {
    const resolvedResult = await result;
    return this.unwrapResult(resolvedResult);
  }

  /**
   * Validate and transform database entity to typed entity
   */
  public validateDatabaseEntity<T>(
    schema: z.ZodSchema<T>,
    entity: unknown,
    entityType: string
  ): Result<T, ValidationError[]> {
    try {
      // Pre-process dates from database (ISO strings to Date objects)
      const processedEntity = this.preprocessDatabaseEntity(entity);
      const validEntity = schema.parse(processedEntity);
      return { success: true, data: validEntity };
    } catch (error) {
      const validationErrors = this.parseZodError(error, entityType);
      logger.error('Database entity validation failed', {
        entityType,
        validationErrors,
        entity: this.sanitizeInput(entity)
      });
      return { success: false, error: validationErrors };
    }
  }

  /**
   * Preprocess database entity to handle common conversions
   */
  private preprocessDatabaseEntity(entity: unknown): unknown {
    if (typeof entity !== 'object' || entity === null) {
      return entity;
    }

    const processed = { ...entity as Record<string, unknown> };

    // Convert ISO date strings to Date objects
    for (const [key, value] of Object.entries(processed)) {
      if (typeof value === 'string' && this.isISODateString(value)) {
        processed[key] = new Date(value);
      }
    }

    return processed;
  }

  /**
   * Check if string is an ISO date string
   */
  private isISODateString(value: string): boolean {
    const isoDateRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/;
    return isoDateRegex.test(value) && !isNaN(Date.parse(value));
  }
} 