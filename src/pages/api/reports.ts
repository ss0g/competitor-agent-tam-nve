import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { ReportGenerator } from '@/lib/reports';
import { logger } from '@/lib/logger';

// Default mock user for testing without authentication
const DEFAULT_USER_EMAIL = 'mock@example.com';

async function getOrCreateMockUser() {
  let mockUser = await prisma.user.findFirst({
    where: { email: DEFAULT_USER_EMAIL }
  });
  
  if (!mockUser) {
    mockUser = await prisma.user.create({
      data: {
        email: DEFAULT_USER_EMAIL,
        name: 'Mock User'
      }
    });
  }
  return mockUser;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Always use mock user (auth disabled)
    const mockUser = await getOrCreateMockUser();

    // Only allow POST method
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    // Validate request body
    const { competitorId, timeframe, changeLog } = req.body;

    if (!competitorId || typeof competitorId !== 'string') {
      return res.status(400).json({ 
        error: 'Validation failed',
        details: 'competitorId is required and must be a string'
      });
    }

    if (!timeframe || typeof timeframe !== 'number' || timeframe <= 0) {
      return res.status(400).json({ 
        error: 'Validation failed',
        details: 'timeframe is required and must be a positive number'
      });
    }

    // Generate report
    const reportGenerator = new ReportGenerator();
    const result = await reportGenerator.generateReport(competitorId, timeframe);

    if (result.error) {
      logger.error('Report generation failed', new Error(result.error), {
        competitorId,
        timeframe,
        userId: mockUser.id,
      });
      return res.status(500).json({ error: 'Failed to generate report' });
    }

    logger.info('Report generated successfully', {
      competitorId,
      timeframe,
      title: result.data?.title,
      userId: mockUser.id,
    });

    return res.status(200).json({ data: result.data });

  } catch (error) {
    logger.error('Unexpected error in reports API', error as Error, {
      method: req.method,
      url: req.url,
    });
    
    return res.status(500).json({ error: 'Failed to generate report' });
  }
} 