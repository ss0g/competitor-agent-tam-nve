import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { WebsiteScraper } from '@/lib/scraper';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession();
    
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // Get the competitor
    const competitor = await prisma.competitor.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      },
    });

    if (!competitor) {
      return new NextResponse('Competitor not found', { status: 404 });
    }

    // Take a snapshot
    const scraper = new WebsiteScraper();
    try {
      const snapshot = await scraper.takeSnapshot(competitor.url);

      // Store the snapshot in the database
      const savedSnapshot = await prisma.snapshot.create({
        data: {
          competitorId: competitor.id,
          url: snapshot.url,
          title: snapshot.title,
          description: snapshot.description,
          html: snapshot.html,
          text: snapshot.text,
          timestamp: snapshot.timestamp,
          statusCode: snapshot.metadata.statusCode,
          headers: snapshot.metadata.headers,
          contentLength: snapshot.metadata.contentLength,
          lastModified: snapshot.metadata.lastModified,
        },
      });

      return NextResponse.json(savedSnapshot);
    } finally {
      await scraper.close();
    }
  } catch (error) {
    console.error('Error taking snapshot:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
} 