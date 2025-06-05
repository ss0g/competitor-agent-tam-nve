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

// GET /api/projects
export async function GET() {
  try {
    // Always use mock user (auth disabled)
    const mockUser = await getOrCreateMockUser();

    const projects = await prisma.project.findMany({
      where: {
        userId: mockUser.id
      },
      include: {
        competitors: true,
      }
    });

    return NextResponse.json(projects);
  } catch (error) {
    console.error('Error fetching projects:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// POST /api/projects
export async function POST(request: Request) {
  try {
    // Always use mock user (auth disabled)
    const mockUser = await getOrCreateMockUser();

    const json = await request.json();
    
    // Auto-assign all competitors if none are specified or if autoAssignCompetitors is true
    let competitorIds = json.competitorIds || [];
    
    if (competitorIds.length === 0 || json.autoAssignCompetitors === true) {
      const allCompetitors = await prisma.competitor.findMany({
        select: { id: true, name: true }
      });
      competitorIds = allCompetitors.map(c => c.id);
      
      console.log(`🔄 Auto-assigning ${allCompetitors.length} competitors to project "${json.name}":`, 
        allCompetitors.map(c => c.name).join(', '));
    }

    const project = await prisma.project.create({
      data: {
        name: json.name,
        description: json.description,
        userId: mockUser.id,
        parameters: {
          ...json.parameters || {},
          autoAssignedCompetitors: competitorIds.length > 0 && (json.competitorIds?.length === 0 || json.autoAssignCompetitors === true),
          assignedCompetitorCount: competitorIds.length
        },
        competitors: {
          connect: competitorIds.map((id: string) => ({ id }))
        }
      },
      include: {
        competitors: true
      }
    });

    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    console.error('Error creating project:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
} 