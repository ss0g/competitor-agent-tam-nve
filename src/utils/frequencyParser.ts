import { ReportScheduleFrequency } from '@prisma/client';

export interface ParsedFrequency {
  frequency: ReportScheduleFrequency;
  cronExpression: string;
  description: string;
}

/**
 * Parse frequency string from user input and convert to standardized format
 */
export function parseFrequency(input: string): ParsedFrequency {
  const normalizedInput = input.toLowerCase().trim();

  // Map common variations to our enum values (order matters - more specific patterns first)
  const frequencyMappings: Array<{
    patterns: string[];
    frequency: ReportScheduleFrequency;
    cronExpression: string;
    description: string;
  }> = [
    {
      patterns: ['biweekly', 'bi-weekly', 'every two weeks', 'every 2 weeks', 'twice a month'],
      frequency: 'BIWEEKLY',
      cronExpression: '0 9 * * 1/2', // Every other Monday at 9 AM
      description: 'Bi-weekly scraping every other Monday at 9:00 AM'
    },
    {
      patterns: ['daily', 'every day', 'day', 'daily reports'],
      frequency: 'DAILY',
      cronExpression: '0 9 * * *', // Daily at 9 AM
      description: 'Daily scraping at 9:00 AM'
    },
    {
      patterns: ['weekly', 'every week', 'week', 'weekly reports', 'once a week'],
      frequency: 'WEEKLY',
      cronExpression: '0 9 * * 1', // Monday at 9 AM
      description: 'Weekly scraping on Mondays at 9:00 AM'
    },
    {
      patterns: ['monthly', 'every month', 'month', 'monthly reports', 'once a month'],
      frequency: 'MONTHLY',
      cronExpression: '0 9 1 * *', // First day of month at 9 AM
      description: 'Monthly scraping on the 1st at 9:00 AM'
    }
  ];

  // Find matching frequency
  for (const mapping of frequencyMappings) {
    if (mapping.patterns.some(pattern => normalizedInput.includes(pattern))) {
      return {
        frequency: mapping.frequency,
        cronExpression: mapping.cronExpression,
        description: mapping.description
      };
    }
  }

  // Default to weekly if no match found
  console.warn(`Could not parse frequency "${input}", defaulting to WEEKLY`);
  return {
    frequency: 'WEEKLY',
    cronExpression: '0 9 * * 1',
    description: 'Weekly scraping on Mondays at 9:00 AM (default)'
  };
}

/**
 * Convert ReportScheduleFrequency enum to human-readable string
 */
export function frequencyToString(frequency: ReportScheduleFrequency): string {
  const descriptions: Record<ReportScheduleFrequency, string> = {
    DAILY: 'Daily',
    WEEKLY: 'Weekly',
    BIWEEKLY: 'Bi-weekly',
    MONTHLY: 'Monthly',
    CUSTOM: 'Custom'
  };

  return descriptions[frequency] || 'Weekly';
}

/**
 * Get cron expression for a frequency
 */
export function frequencyToCronExpression(frequency: ReportScheduleFrequency): string {
  const cronExpressions: Record<ReportScheduleFrequency, string> = {
    DAILY: '0 9 * * *',      // Daily at 9 AM
    WEEKLY: '0 9 * * 1',     // Monday at 9 AM
    BIWEEKLY: '0 9 * * 1/2', // Every other Monday at 9 AM
    MONTHLY: '0 9 1 * *',    // First day of month at 9 AM
    CUSTOM: '0 9 * * 1'      // Default to weekly for custom
  };

  return cronExpressions[frequency] || '0 9 * * 1';
} 