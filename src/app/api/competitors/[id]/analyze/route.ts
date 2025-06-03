import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { CompetitorAnalysisService } from '@/services/competitorAnalysis';

const competitorService = new CompetitorAnalysisService();

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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