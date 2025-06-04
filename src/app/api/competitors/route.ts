import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'

const competitorSchema = z.object({
  name: z.string().min(1),
  website: z.string().url(),
  description: z.string().optional(),
  industry: z.string().min(1),
  employeeCount: z.number().optional(),
  revenue: z.number().optional(),
  founded: z.number().optional(),
  headquarters: z.string().optional(),
  socialMedia: z.any().optional(),
})

export async function POST(request: Request) {
  try {
    const json = await request.json()
    const body = competitorSchema.parse(json)

    const competitor = await prisma.competitor.create({
      data: {
        ...body,
      },
    })

    return NextResponse.json(competitor, { status: 201 })
  } catch (error) {
    console.error('Error creating competitor:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams?.get('page') || '1')
    const limit = parseInt(searchParams?.get('limit') || '10')
    const search = searchParams?.get('search') || ''

    // Calculate offset for pagination
    const offset = (page - 1) * limit

    // Build where clause for search
    const whereClause = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' as const } },
            { website: { contains: search, mode: 'insensitive' as const } },
            { description: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {}

    // Get total count for pagination
    const total = await prisma.competitor.count({
      where: whereClause,
    })

    // Get competitors with pagination
    const competitors = await prisma.competitor.findMany({
      where: whereClause,
      skip: offset,
      take: limit,
      orderBy: { createdAt: 'desc' },
    })

    // Calculate pagination info
    const pages = Math.ceil(total / limit)

    return NextResponse.json({
      competitors,
      pagination: {
        total,
        pages,
        page,
        limit,
      },
    })
  } catch (error) {
    console.error('Error fetching competitors:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
} 