import { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { ValidationError } from '@/types/reports';

export type ValidationSchema = z.ZodType<any, any>;

export function validateRequest(schema: ValidationSchema) {
  return async (req: NextApiRequest, res: NextApiResponse, next: () => void) => {
    try {
      const validationResult = await schema.safeParseAsync(req.body);

      if (!validationResult.success) {
        const errors: ValidationError[] = validationResult.error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
        }));

        return res.status(400).json({
          error: 'Validation failed',
          validationErrors: errors,
        });
      }

      req.body = validationResult.data;
      return next();
    } catch (error) {
      console.error('Validation middleware error:', error);
      return res.status(500).json({
        error: 'Internal server error during validation',
      });
    }
  };
}

// Common validation schemas
export const createReportSchema = z.object({
  competitorId: z.string().uuid('Invalid competitor ID'),
  timeframe: z.number().int().min(1).max(90),
  changeLog: z.string().optional(),
});

export const updateReportSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  sections: z
    .array(
      z.object({
        title: z.string().min(1),
        content: z.string().min(1),
        type: z.enum(['summary', 'changes', 'trends', 'recommendations']),
        order: z.number().int().min(0),
      })
    )
    .optional(),
});

export const generateAnalysisSchema = z.object({
  snapshotId: z.string().uuid('Invalid snapshot ID'),
  options: z
    .object({
      primaryModel: z.string().optional(),
      secondaryModel: z.string().optional(),
      maxTokens: z.number().int().min(1).max(4000).optional(),
      temperature: z.number().min(0).max(1).optional(),
    })
    .optional(),
}); 