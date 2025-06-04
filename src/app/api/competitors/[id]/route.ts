import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

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

// GET /api/competitors/[id]
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Always use mock user (auth disabled)
    const mockUser = await getOrCreateMockUser();

    const competitor = await prisma.competitor.findUnique({
      where: {
        id: params.id,
        userId: mockUser.id
      },
      include: {
        projects: true,
        analyses: true,
      }
    });

    if (!competitor) {
      return NextResponse.json({ error: 'Competitor not found' }, { status: 404 });
    }

    return NextResponse.json(competitor);
  } catch (error) {
    console.error('Error fetching competitor:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// PUT /api/competitors/[id]
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Always use mock user (auth disabled)
    const mockUser = await getOrCreateMockUser();

    const json = await request.json();
    const competitor = await prisma.competitor.update({
      where: {
        id: params.id,
        userId: mockUser.id
      },
      data: {
        name: json.name,
        website: json.website,
        description: json.description,
      }
    });

    return NextResponse.json(competitor);
  } catch (error) {
    console.error('Error updating competitor:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// DELETE /api/competitors/[id]
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Always use mock user (auth disabled)
    const mockUser = await getOrCreateMockUser();

    await prisma.competitor.delete({
      where: {
        id: params.id,
        userId: mockUser.id
      }
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Error deleting competitor:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
} 