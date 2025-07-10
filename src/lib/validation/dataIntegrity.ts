/**
 * Phase 1.3: Critical Data Integrity Validation Layer
 * Provides comprehensive data validation to ensure consistency across services
 */

import { z } from 'zod';
import { logger } from '@/lib/logger';

// Validation result types
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings?: string[];
}

export interface DetailedValidationResult extends ValidationResult {
  field?: string;
  severity: 'error' | 'warning' | 'info';
  code?: string;
  metadata?: Record<string, any>;
}

export interface ValidationError {
  field: string;
  message: string;
  code?: string;
  value?: any;
}

// Core validation schemas
const urlSchema = z.string().url('Invalid URL format');
const emailSchema = z.string().email('Invalid email format');
const nonEmptyStringSchema = z.string().min(1, 'Field cannot be empty').trim();
const idSchema = z.string().min(1, 'ID cannot be empty');

// Product data validation schema
const productDataSchema = z.object({
  name: nonEmptyStringSchema,
  website: urlSchema,
  positioning: nonEmptyStringSchema.min(10, 'Positioning must be at least 10 characters'),
  customerData: nonEmptyStringSchema.min(10, 'Customer data must be at least 10 characters'),
  userProblem: nonEmptyStringSchema.min(10, 'User problem must be at least 10 characters'),
  industry: nonEmptyStringSchema.min(3, 'Industry must be at least 3 characters'),
  projectId: idSchema,
});

// Project data validation schema
const projectDataSchema = z.object({
  name: nonEmptyStringSchema.min(3, 'Project name must be at least 3 characters'),
  description: z.string().optional(),
  userId: idSchema,
  status: z.enum(['DRAFT', 'ACTIVE', 'COMPLETED', 'ARCHIVED']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
});

// Chat/Conversation data validation schema
const chatDataSchema = z.object({
  userEmail: emailSchema,
  reportFrequency: z.enum(['daily', 'weekly', 'monthly', 'quarterly']),
  projectName: nonEmptyStringSchema.min(3, 'Project name must be at least 3 characters'),
  productName: nonEmptyStringSchema,
  productUrl: urlSchema,
  industry: nonEmptyStringSchema,
  positioning: nonEmptyStringSchema.min(10, 'Positioning must be at least 10 characters'),
  customerData: nonEmptyStringSchema.min(10, 'Customer data must be at least 10 characters'),
  userProblem: nonEmptyStringSchema.min(10, 'User problem must be at least 10 characters'),
});

// Report data validation schema
const reportDataSchema = z.object({
  title: nonEmptyStringSchema,
  description: z.string().optional(),
  projectId: idSchema,
  productId: idSchema,
  sections: z.array(z.object({
    title: nonEmptyStringSchema,
    content: nonEmptyStringSchema,
    type: z.enum(['summary', 'analysis', 'recommendations', 'conclusion']),
    order: z.number().min(0),
  })).min(1, 'Report must have at least one section'),
  metadata: z.object({
    analysisDate: z.date(),
    competitorCount: z.number().min(0),
    analysisType: z.string(),
    confidenceScore: z.number().min(0).max(100),
  }),
});

// Analysis input validation schema
const analysisInputSchema = z.object({
  product: z.object({
    id: idSchema,
    name: nonEmptyStringSchema,
    website: urlSchema,
    positioning: nonEmptyStringSchema,
    customerData: nonEmptyStringSchema,
    userProblem: nonEmptyStringSchema,
    industry: nonEmptyStringSchema,
  }),
  productSnapshot: z.object({
    id: idSchema,
    content: nonEmptyStringSchema.min(100, 'Snapshot content too short for analysis'),
    metadata: z.record(z.any()),
  }),
  competitors: z.array(z.object({
    competitor: z.object({
      id: idSchema,
      name: nonEmptyStringSchema,
      website: urlSchema,
      industry: nonEmptyStringSchema,
    }),
    snapshot: z.object({
      id: idSchema,
      metadata: z.record(z.any()),
    }),
  })).min(1, 'At least one competitor required'),
});

/**
 * Data Integrity Validator Class
 */
export class DataIntegrityValidator {
  private static instance: DataIntegrityValidator;

  public static getInstance(): DataIntegrityValidator {
    if (!DataIntegrityValidator.instance) {
      DataIntegrityValidator.instance = new DataIntegrityValidator();
    }
    return DataIntegrityValidator.instance;
  }

  /**
   * Validate product data
   */
  validateProductData(data: any): ValidationResult {
    try {
      productDataSchema.parse(data);
      return { valid: true, errors: [] };
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors = error.errors.map(err => `${err.path.join('.')}: ${err.message}`);
        logger.warn('Product data validation failed', { errors, data: this.sanitizeData(data) });
        return { valid: false, errors };
      }
      return { valid: false, errors: ['Unknown validation error'] };
    }
  }

  /**
   * Validate project data
   */
  validateProjectData(data: any): ValidationResult {
    try {
      projectDataSchema.parse(data);
      return { valid: true, errors: [] };
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors = error.errors.map(err => `${err.path.join('.')}: ${err.message}`);
        logger.warn('Project data validation failed', { errors, data: this.sanitizeData(data) });
        return { valid: false, errors };
      }
      return { valid: false, errors: ['Unknown validation error'] };
    }
  }

  /**
   * Validate chat/conversation data
   */
  validateChatData(data: any): ValidationResult {
    try {
      chatDataSchema.parse(data);
      return { valid: true, errors: [] };
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors = error.errors.map(err => `${err.path.join('.')}: ${err.message}`);
        logger.warn('Chat data validation failed', { errors, data: this.sanitizeData(data) });
        return { valid: false, errors };
      }
      return { valid: false, errors: ['Unknown validation error'] };
    }
  }

  /**
   * Validate report data
   */
  validateReportData(data: any): ValidationResult {
    try {
      reportDataSchema.parse(data);
      return { valid: true, errors: [] };
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors = error.errors.map(err => `${err.path.join('.')}: ${err.message}`);
        logger.warn('Report data validation failed', { errors, data: this.sanitizeData(data) });
        return { valid: false, errors };
      }
      return { valid: false, errors: ['Unknown validation error'] };
    }
  }

  /**
   * Validate analysis input data
   */
  validateAnalysisInput(data: any): ValidationResult {
    try {
      analysisInputSchema.parse(data);
      return { valid: true, errors: [] };
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors = error.errors.map(err => `${err.path.join('.')}: ${err.message}`);
        logger.warn('Analysis input validation failed', { errors, data: this.sanitizeData(data) });
        return { valid: false, errors };
      }
      return { valid: false, errors: ['Unknown validation error'] };
    }
  }

  /**
   * Comprehensive data validation with detailed results
   */
  validateWithDetails<T>(data: any, schema: z.ZodSchema<T>): DetailedValidationResult[] {
    try {
      schema.parse(data);
      return [{ valid: true, errors: [], severity: 'info' }];
    } catch (error) {
      if (error instanceof z.ZodError) {
        return error.errors.map(err => ({
          valid: false,
          errors: [err.message],
          field: err.path.join('.'),
          severity: this.getSeverityFromCode(err.code) as 'error' | 'warning' | 'info',
          code: err.code,
          metadata: { path: err.path, code: err.code }
        }));
      }
      return [{
        valid: false,
        errors: ['Unknown validation error'],
        severity: 'error' as const
      }];
    }
  }

  /**
   * Validate data consistency across related entities
   */
  validateDataConsistency(relatedData: {
    product?: any;
    project?: any;
    competitors?: any[];
    snapshots?: any[];
  }): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check product-project consistency
    if (relatedData.product && relatedData.project) {
      if (relatedData.product.projectId !== relatedData.project.id) {
        errors.push('Product projectId does not match project id');
      }
      if (relatedData.product.industry !== relatedData.project.industry) {
        warnings.push('Product industry differs from project industry');
      }
    }

    // Check competitor data consistency
    if (relatedData.competitors) {
      const uniqueCompetitors = new Set(relatedData.competitors.map(c => c.id));
      if (uniqueCompetitors.size !== relatedData.competitors.length) {
        errors.push('Duplicate competitors found');
      }
    }

    // Check snapshot data completeness
    if (relatedData.snapshots) {
      const incompleteSnapshots = relatedData.snapshots.filter(s => 
        !s.content || !s.metadata || Object.keys(s.metadata).length === 0
      );
      if (incompleteSnapshots.length > 0) {
        warnings.push(`${incompleteSnapshots.length} snapshots have incomplete data`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate required fields are present and not null/undefined
   */
  validateRequiredFields(data: any, requiredFields: string[]): ValidationResult {
    const errors: string[] = [];

    for (const field of requiredFields) {
      const value = this.getNestedValue(data, field);
      if (value === null || value === undefined || value === '') {
        errors.push(`Required field '${field}' is missing or empty`);
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate data quality and completeness
   */
  validateDataQuality(data: any): {
    score: number; // 0-100
    issues: string[];
    recommendations: string[];
  } {
    const issues: string[] = [];
    const recommendations: string[] = [];
    let score = 100;

    // Check for empty or very short text fields
    if (typeof data === 'object' && data !== null) {
      for (const [key, value] of Object.entries(data)) {
        if (typeof value === 'string') {
          if (value.length < 3) {
            issues.push(`Field '${key}' is too short`);
            score -= 10;
            recommendations.push(`Provide more detailed information for '${key}'`);
          } else if (value.length < 10 && ['positioning', 'customerData', 'userProblem'].includes(key)) {
            issues.push(`Field '${key}' could be more detailed`);
            score -= 5;
            recommendations.push(`Consider expanding '${key}' with more details`);
          }
        }
      }
    }

    // Ensure score doesn't go below 0
    score = Math.max(0, score);

    return { score, issues, recommendations };
  }

  /**
   * Private helper methods
   */
  private sanitizeData(data: any): any {
    if (typeof data !== 'object' || data === null) return data;
    
    const sanitized = { ...data };
    // Remove sensitive fields
    const sensitiveFields = ['password', 'token', 'secret', 'key'];
    for (const field of sensitiveFields) {
      if (field in sanitized) {
        sanitized[field] = '[REDACTED]';
      }
    }
    return sanitized;
  }

  private getSeverityFromCode(code: string): string {
    const errorCodes = ['invalid_type', 'too_small', 'too_big'];
    const warningCodes = ['invalid_string', 'invalid_date'];
    
    if (errorCodes.includes(code)) return 'error';
    if (warningCodes.includes(code)) return 'warning';
    return 'info';
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }
}

// Export singleton instance
export const dataIntegrityValidator = DataIntegrityValidator.getInstance();

// Export schemas for external use
export {
  productDataSchema,
  projectDataSchema,
  chatDataSchema,
  reportDataSchema,
  analysisInputSchema
}; 