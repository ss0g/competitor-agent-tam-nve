import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/auth'

const competitorSchema = z.object({
  name: z.string().min(1),
  url: z.string().url(),
  description: z.string().optional(),
})

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const json = await request.json()
    const body = competitorSchema.parse(json)

    const competitor = await prisma.competitor.create({
      data: {
        ...body,
        userId: session.user.id,
      },
    })

    return NextResponse.json(competitor, { status: 201 })
  } catch (error) {
    console.error('Error creating competitor:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const competitors = await prisma.competitor.findMany({
      where: {
        userId: session.user.id
      },
      include: {
        projects: true,
        analyses: true,
      }
    })

    return NextResponse.json(competitors)
  } catch (error) {
    console.error('Error fetching competitors:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
} 