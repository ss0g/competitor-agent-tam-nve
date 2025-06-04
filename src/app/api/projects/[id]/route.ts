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

// GET /api/projects/[id]
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Always use mock user (auth disabled)
    const mockUser = await getOrCreateMockUser();

    const project = await prisma.project.findUnique({
      where: {
        id: params.id,
        userId: mockUser.id
      },
      include: {
        competitors: true,
        reports: true,
      }
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    return NextResponse.json(project);
  } catch (error) {
    console.error('Error fetching project:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// PUT /api/projects/[id]
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Always use mock user (auth disabled)
    const mockUser = await getOrCreateMockUser();

    const json = await request.json();
    const project = await prisma.project.update({
      where: {
        id: params.id,
        userId: mockUser.id
      },
      data: {
        name: json.name,
        description: json.description,
        competitors: {
          set: json.competitorIds?.map((id: string) => ({ id })) || []
        }
      },
      include: {
        competitors: true
      }
    });

    return NextResponse.json(project);
  } catch (error) {
    console.error('Error updating project:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// DELETE /api/projects/[id]
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Always use mock user (auth disabled)
    const mockUser = await getOrCreateMockUser();

    await prisma.project.delete({
      where: {
        id: params.id,
        userId: mockUser.id
      }
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Error deleting project:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
} 