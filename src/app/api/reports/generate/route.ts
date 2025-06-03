import { NextResponse } from 'next/server';
import { ReportGenerator } from '@/lib/reports';

export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const competitorId = searchParams.get('competitorId');
    const timeframe = parseInt(searchParams.get('timeframe') || '30', 10);

    if (!competitorId) {
      return NextResponse.json(
        { error: 'Competitor ID is required' },
        { status: 400 }
      );
    }

    if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
      return NextResponse.json(
        { error: 'AWS credentials not configured' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { changeLog } = body;

    const generator = new ReportGenerator();
    const report = await generator.generateReport(competitorId, timeframe, {
      changeLog,
      // TODO: Add user ID from session when auth is implemented
    });

    return NextResponse.json(report);
  } catch (error) {
    console.error('Report generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate report' },
      { status: 500 }
    );
  }
} 