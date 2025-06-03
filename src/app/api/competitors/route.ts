import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'

const competitorSchema = z.object({
  name: z.string().min(1),
  url: z.string().url(),
  description: z.string().optional(),
})

export async function POST(request: Request) {
  try {
    const session = await getServerSession()
    
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const json = await request.json()
    const body = competitorSchema.parse(json)

    const competitor = await prisma.competitor.create({
      data: {
        ...body,
        userId: session.user.id,
      },
    })

    return NextResponse.json(competitor)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new NextResponse(JSON.stringify(error.issues), { status: 422 })
    }

    return new NextResponse('Internal Error', { status: 500 })
  }
}

export async function GET(request: Request) {
  try {
    const session = await getServerSession()
    
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const search = searchParams.get('search') || ''

    const competitors = await prisma.competitor.findMany({
      where: {
        userId: session.user.id,
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ],
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    })

    const total = await prisma.competitor.count({
      where: {
        userId: session.user.id,
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ],
      },
    })

    return NextResponse.json({
      competitors,
      pagination: {
        total,
        pages: Math.ceil(total / limit),
        page,
        limit,
      },
    })
  } catch (error) {
    return new NextResponse('Internal Error', { status: 500 })
  }
} 