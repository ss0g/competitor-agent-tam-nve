import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const competitorId = searchParams.get('competitorId');

    if (!competitorId) {
      return NextResponse.json(
        { error: 'Competitor ID is required' },
        { status: 400 }
      );
    }

    const report = await prisma.report.findFirst({
      where: {
        competitorId,
        isLatest: true,
      },
    });

    if (!report) {
      return NextResponse.json([]);
    }

    const versions = await prisma.reportVersion.findMany({
      where: {
        reportId: report.id,
      },
      orderBy: {
        versionNumber: 'desc',
      },
      select: {
        id: true,
        versionNumber: true,
        title: true,
        description: true,
        createdAt: true,
        changeLog: true,
      },
    });

    return NextResponse.json(versions);
  } catch (error) {
    console.error('Error fetching report versions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch report versions' },
      { status: 500 }
    );
  }
} 