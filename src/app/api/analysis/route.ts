import { NextResponse } from 'next/server';
import { ContentAnalyzer } from '@/lib/analysis';

export async function POST(request: Request) {
  try {
    const { oldContent, newContent, diff, competitorName } = await request.json();

    if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
      return NextResponse.json(
        { error: 'AWS credentials not configured' },
        { status: 500 }
      );
    }

    if (!process.env.AWS_REGION) {
      return NextResponse.json(
        { error: 'AWS region not configured' },
        { status: 500 }
      );
    }

    const analyzer = new ContentAnalyzer();
    const analysis = await analyzer.analyzeChanges(
      oldContent,
      newContent,
      diff,
      competitorName
    );

    return NextResponse.json(analysis);
  } catch (error) {
    console.error('Analysis error:', error);
    return NextResponse.json(
      { error: 'Failed to analyze content' },
      { status: 500 }
    );
  }
} 