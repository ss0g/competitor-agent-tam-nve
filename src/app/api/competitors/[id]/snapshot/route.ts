import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { WebsiteScraper } from '@/lib/scraper';

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

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Always use mock user (auth disabled)
    const mockUser = await getOrCreateMockUser();

    // Get the competitor
    const competitor = await prisma.competitor.findFirst({
      where: {
        id: params.id,
        userId: mockUser.id,
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