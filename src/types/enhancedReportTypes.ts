/**
 * Phase 5.3.2: Enhanced Type Definitions
 * Strengthened type definitions for comparative reports and related entities
 */

import { ComparativeReport, ComparativeReportMetadata } from './comparativeReport';

// Branded types for better type safety
export type ProjectId = string & { readonly __brand: unique symbol };
export type ReportId = string & { readonly __brand: unique symbol };
export type CompetitorId = string & { readonly __brand: unique symbol };
export type ProductId = string & { readonly __brand: unique symbol };
export type SnapshotId = string & { readonly __brand: unique symbol };
export type UserId = string & { readonly __brand: unique symbol };

// Helper functions to create branded types
export const createProjectId = (id: string): ProjectId => id as ProjectId;
export const createReportId = (id: string): ReportId => id as ReportId;
export const createCompetitorId = (id: string): CompetitorId => id as CompetitorId;
export const createProductId = (id: string): ProductId => id as ProductId;
export const createSnapshotId = (id: string): SnapshotId => id as SnapshotId;
export const createUserId = (id: string): UserId => id as UserId;

// Quality assessment types
export type QualityTier = 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
export type DataFreshness = 'new' | 'existing' | 'mixed' | 'basic';
export type ReportGenerationStatus = 'generating' | 'completed' | 'failed' | 'not_started' | 'queued' | 'timeout';

export interface QualityAssessment {
  readonly overallScore: number; // 0-100
  readonly qualityTier: QualityTier;
  readonly dataCompleteness: number; // 0-100
  readonly dataFreshness: number; // 0-100 (age-based scoring)
  readonly analysisConfidence: number; // 0-100
  readonly improvementPotential: number; // 0-100
  readonly quickWinsAvailable: number; // Count of actionable recommendations
  readonly assessmentTimestamp: Date;
  readonly assessmentVersion: string; // Version of assessment algorithm
}

export interface GenerationContext {
  readonly isInitialReport: boolean;
  readonly dataFreshness: DataFreshness;
  readonly competitorSnapshotsCaptured: number;
  readonly usedPartialDataGeneration: boolean;
  readonly generationTime: number; // milliseconds
  readonly generationStartTime: Date;
  readonly generationEndTime: Date;
  readonly configurationVersion: string; // Configuration used for generation
  readonly algorithmVersion: string; // Analysis algorithm version
  readonly fallbacksUsed: readonly string[]; // List of fallback strategies used
}

export interface SnapshotCaptureMetadata {
  readonly snapshotId: SnapshotId;
  readonly competitorId: CompetitorId;
  readonly captureStartTime: Date;
  readonly captureEndTime: Date;
  readonly captureDuration: number; // milliseconds
  readonly captureSuccess: boolean;
  readonly captureError?: string;
  readonly captureRetryCount: number;
  readonly websiteComplexity: 'basic' | 'ecommerce' | 'saas' | 'marketplace';
  readonly dataSize: number; // bytes
  readonly compressionRatio: number; // compressed/original size
}

// Enhanced report metadata with stronger typing
export interface EnhancedComparativeReportMetadata extends Omit<ComparativeReportMetadata, 'id' | 'projectId'> {
  readonly id: ReportId;
  readonly projectId: ProjectId;
  readonly qualityAssessment?: QualityAssessment;
  readonly generationContext?: GenerationContext;
  readonly snapshotMetadata?: readonly SnapshotCaptureMetadata[];
  readonly validationErrors?: readonly ValidationError[];
  readonly performanceMetrics?: PerformanceMetrics;
}

// Enhanced comparative report with stronger typing
export interface EnhancedComparativeReport extends Omit<ComparativeReport, 'id' | 'metadata'> {
  readonly id: ReportId;
  readonly metadata: EnhancedComparativeReportMetadata;
  readonly typeVersion: '2.0'; // Version identifier for enhanced reports
}

// Error types for better error handling
export interface ValidationError {
  readonly code: string;
  readonly message: string;
  readonly field?: string;
  readonly value?: unknown;
  readonly severity: 'error' | 'warning' | 'info';
  readonly timestamp: Date;
}

export interface ReportGenerationError extends Error {
  readonly code: string;
  readonly projectId: ProjectId;
  readonly reportId?: ReportId;
  readonly stage: 'validation' | 'snapshot_capture' | 'analysis' | 'generation' | 'storage';
  readonly retryable: boolean;
  readonly context: Record<string, unknown>;
  readonly timestamp: Date;
}

export interface SnapshotCaptureError extends Error {
  readonly code: string;
  readonly competitorId: CompetitorId;
  readonly website: string;
  readonly attemptNumber: number;
  readonly maxAttempts: number;
  readonly captureTimeout: number;
  readonly retryable: boolean;
  readonly timestamp: Date;
}

// Performance metrics types
export interface PerformanceMetrics {
  readonly reportGenerationTime: number; // milliseconds
  readonly snapshotCaptureTime: number; // milliseconds
  readonly analysisTime: number; // milliseconds
  readonly databaseQueryTime: number; // milliseconds
  readonly memoryUsage: number; // bytes
  readonly cpuTime: number; // milliseconds
  readonly cacheHitRate: number; // 0-1
  readonly retryCount: number;
  readonly concurrentOperations: number;
}

// API response types with enhanced typing
export interface InitialReportStatusResponse {
  readonly projectId: ProjectId;
  readonly reportExists: boolean;
  readonly reportId?: ReportId;
  readonly status: ReportGenerationStatus;
  readonly dataCompletenessScore?: number;
  readonly generatedAt?: Date;
  readonly error?: ValidationError;
  readonly estimatedCompletionTime?: Date;
  readonly competitorSnapshotsStatus: CompetitorSnapshotsStatus;
  readonly dataFreshness: DataFreshness;
  readonly qualityAssessment?: QualityAssessment;
}

export interface CompetitorSnapshotsStatus {
  readonly captured: number;
  readonly total: number;
  readonly capturedAt?: Date;
  readonly failures?: readonly SnapshotFailure[];
  readonly inProgress?: readonly SnapshotInProgress[];
}

export interface SnapshotFailure {
  readonly competitorId: CompetitorId;
  readonly competitorName: string;
  readonly error: string;
  readonly retryable: boolean;
  readonly nextRetryAt?: Date;
}

export interface SnapshotInProgress {
  readonly competitorId: CompetitorId;
  readonly competitorName: string;
  readonly startedAt: Date;
  readonly estimatedCompletion: Date;
  readonly progress: number; // 0-100
}

// Configuration types with enhanced validation
export interface TypedInitialReportOptions {
  readonly template?: 'comprehensive' | 'executive' | 'technical' | 'strategic';
  readonly priority?: 'high' | 'normal' | 'low';
  readonly timeout?: number; // Must be positive integer
  readonly fallbackToPartialData?: boolean;
  readonly notifyOnCompletion?: boolean;
  readonly requireFreshSnapshots?: boolean;
  readonly userId?: UserId;
  readonly correlationId?: string;
}

// Project readiness types
export interface TypedProjectReadinessResult {
  readonly isReady: boolean;
  readonly hasProduct: boolean;
  readonly hasCompetitors: boolean;
  readonly hasProductData: boolean;
  readonly missingData: readonly string[];
  readonly readinessScore: number; // 0-100
  readonly validationErrors: readonly ValidationError[];
  readonly checkedAt: Date;
}

// Snapshot capture result types
export interface TypedSnapshotCaptureResult {
  readonly success: boolean;
  readonly capturedCount: number;
  readonly totalCompetitors: number;
  readonly failures: readonly SnapshotFailure[];
  readonly captureTime: number; // milliseconds
  readonly captureMetadata: readonly SnapshotCaptureMetadata[];
  readonly resourceUsage: PerformanceMetrics;
}

// Data availability result types
export interface TypedDataAvailabilityResult {
  readonly hasMinimumData: boolean;
  readonly dataCompletenessScore: number; // 0-100
  readonly availableCompetitors: number;
  readonly totalCompetitors: number;
  readonly dataFreshness: DataFreshness;
  readonly freshDataAge: number; // hours since capture
  readonly validationErrors: readonly ValidationError[];
}

// Type guards for runtime type checking
export const isProjectId = (value: string): value is ProjectId => {
  return typeof value === 'string' && value.length > 0;
};

export const isReportId = (value: string): value is ReportId => {
  return typeof value === 'string' && value.length > 0;
};

export const isValidQualityTier = (value: string): value is QualityTier => {
  return ['excellent', 'good', 'fair', 'poor', 'critical'].includes(value);
};

export const isValidDataFreshness = (value: string): value is DataFreshness => {
  return ['new', 'existing', 'mixed', 'basic'].includes(value);
};

export const isValidReportGenerationStatus = (value: string): value is ReportGenerationStatus => {
  return ['generating', 'completed', 'failed', 'not_started', 'queued', 'timeout'].includes(value);
};

// Utility types for enhanced type safety
export type NonEmptyArray<T> = [T, ...T[]];
export type Writeable<T> = { -readonly [P in keyof T]: T[P] };
export type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends (infer U)[]
    ? ReadonlyArray<DeepReadonly<U>>
    : T[P] extends object
    ? DeepReadonly<T[P]>
    : T[P];
};

// Result types for better error handling
export type Result<T, E = Error> = 
  | { readonly success: true; readonly data: T }
  | { readonly success: false; readonly error: E };

export type AsyncResult<T, E = Error> = Promise<Result<T, E>>;

// Type-safe event types for real-time updates
export interface TypedReportStatusUpdate {
  readonly type: 'validation' | 'snapshot_capture' | 'data_collection' | 'analysis' | 'generation' | 'completion' | 'error';
  readonly projectId: ProjectId;
  readonly reportId?: ReportId;
  readonly timestamp: Date;
  readonly progress?: number; // 0-100
  readonly message?: string;
  readonly error?: ValidationError;
  readonly metadata?: Record<string, unknown>;
}

// Configuration update types
export interface TypedConfigUpdateRequest {
  readonly config: Partial<Record<string, unknown>>;
  readonly reason?: string;
  readonly updatedBy: UserId;
  readonly correlationId?: string;
  readonly validationLevel?: 'strict' | 'standard' | 'permissive';
}

export interface TypedConfigUpdateResult {
  readonly success: boolean;
  readonly updatedFields: readonly string[];
  readonly validationErrors?: readonly ValidationError[];
  readonly rollbackInfo?: {
    readonly previousValues: Record<string, unknown>;
    readonly rollbackToken: string;
    readonly expiresAt: Date;
  };
  readonly updatedBy: UserId;
  readonly updatedAt: Date;
  readonly performanceImpact?: {
    readonly estimatedImpact: 'low' | 'medium' | 'high';
    readonly affectedSystems: readonly string[];
    readonly rolloutStrategy: 'immediate' | 'gradual' | 'maintenance_window';
  };
} 