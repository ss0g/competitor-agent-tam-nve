import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// GET /api/competitors/[id]
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const competitor = await prisma.competitor.findUnique({
      where: {
        id: params.id,
        userId: session.user.id
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
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const json = await request.json();
    const competitor = await prisma.competitor.update({
      where: {
        id: params.id,
        userId: session.user.id
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
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await prisma.competitor.delete({
      where: {
        id: params.id,
        userId: session.user.id
      }
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Error deleting competitor:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
} 