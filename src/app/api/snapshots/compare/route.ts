import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { SnapshotDiff } from '@/lib/diff';
import { z } from 'zod';

const compareSchema = z.object({
  oldSnapshotId: z.string(),
  newSnapshotId: z.string(),
});

export async function POST(request: Request) {
  try {
    const session = await getServerSession();
    
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const json = await request.json();
    const { oldSnapshotId, newSnapshotId } = compareSchema.parse(json);

    // Get both snapshots and verify access
    const [oldSnapshot, newSnapshot] = await Promise.all([
      prisma.snapshot.findFirst({
        where: {
          id: oldSnapshotId,
          competitor: {
            userId: session.user.id,
          },
        },
      }),
      prisma.snapshot.findFirst({
        where: {
          id: newSnapshotId,
          competitor: {
            userId: session.user.id,
          },
        },
      }),
    ]);

    if (!oldSnapshot || !newSnapshot) {
      return new NextResponse('Snapshot not found', { status: 404 });
    }

    // Compare snapshots
    const diff = SnapshotDiff.compare(oldSnapshot, newSnapshot);
    const significantChanges = SnapshotDiff.getSignificantChanges(diff);
    const formattedDiff = SnapshotDiff.formatTextDiff(diff);

    return NextResponse.json({
      diff,
      significantChanges,
      formattedDiff,
      metadata: {
        oldSnapshot: {
          timestamp: oldSnapshot.timestamp,
          title: oldSnapshot.title,
        },
        newSnapshot: {
          timestamp: newSnapshot.timestamp,
          title: newSnapshot.title,
        },
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new NextResponse(JSON.stringify(error.issues), { status: 422 });
    }

    console.error('Error comparing snapshots:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
} 