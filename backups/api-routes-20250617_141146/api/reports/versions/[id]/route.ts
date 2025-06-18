import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const versionId = params.id;

    const version = await prisma.reportVersion.findUnique({
      where: {
        id: versionId,
      },
      include: {
        report: {
          include: {
            competitor: true,
          },
        },
      },
    });

    if (!version) {
      return NextResponse.json(
        { error: 'Report version not found' },
        { status: 404 }
      );
    }

    const content = version.content as any;
    return NextResponse.json({
      title: version.title,
      description: version.description,
      sections: content.sections,
      metadata: content.metadata,
      version: {
        number: version.versionNumber,
        createdAt: version.createdAt,
        changeLog: version.changeLog || undefined,
      },
    });
  } catch (error) {
    console.error('Error fetching report version:', error);
    return NextResponse.json(
      { error: 'Failed to fetch report version' },
      { status: 500 }
    );
  }
} 