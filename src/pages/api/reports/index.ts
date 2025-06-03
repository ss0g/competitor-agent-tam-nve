import { NextApiRequest, NextApiResponse } from 'next';
import { ReportGenerator } from '@/lib/reports';
import { validateRequest, createReportSchema } from '@/lib/middleware/validation';
import { ReportData, APIResponse } from '@/types/reports';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';

async function handler(
  req: NextApiRequest,
  res: NextApiResponse<APIResponse<ReportData>>
) {
  const session = await getServerSession(req, res, authOptions);

  if (!session) {
    return res.status(401).json({
      error: 'Unauthorized',
    });
  }

  if (req.method === 'POST') {
    try {
      const generator = new ReportGenerator();
      const result = await generator.generateReport(
        req.body.competitorId,
        req.body.timeframe,
        {
          userId: session.user.id,
          changeLog: req.body.changeLog,
        }
      );

      return res.status(result.error ? 400 : 200).json(result);
    } catch (error) {
      console.error('Error generating report:', error);
      return res.status(500).json({
        error: 'Failed to generate report',
        validationErrors: [{
          field: 'general',
          message: error instanceof Error ? error.message : 'Unknown error',
        }],
      });
    }
  }

  return res.status(405).json({
    error: 'Method not allowed',
  });
}

export default validateRequest(createReportSchema)(handler); 