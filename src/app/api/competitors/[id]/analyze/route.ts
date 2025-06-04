import { NextResponse } from 'next/server';
import { CompetitorAnalysisService } from '@/services/competitorAnalysis';

const competitorService = new CompetitorAnalysisService();

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Authentication disabled - allow all requests
    const { id } = params;

    if (!id) {
      return NextResponse.json({ error: 'Invalid competitor ID' }, { status: 400 });
    }

    const analysis = await competitorService.analyzeCompetitor(id);
    return NextResponse.json(analysis);
  } catch (error: any) {
    console.error('Competitor Analysis API Error:', error);
    
    if (error.message === 'Competitor not found') {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
} 