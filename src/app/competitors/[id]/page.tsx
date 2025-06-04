import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { SnapshotList } from '@/components/competitors/SnapshotList';

interface CompetitorPageProps {
  params: {
    id: string;
  };
}

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

export default async function CompetitorPage({ params }: CompetitorPageProps) {
  // Always use mock user (auth disabled)
  const mockUser = await getOrCreateMockUser();

  const competitor = await prisma.competitor.findFirst({
    where: {
      id: params.id,
      userId: mockUser.id,
    },
    include: {
      snapshots: {
        orderBy: {
          timestamp: 'desc',
        },
        select: {
          id: true,
          url: true,
          title: true,
          timestamp: true,
          statusCode: true,
        },
      },
    },
  });

  if (!competitor) {
    return notFound();
  }

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="md:flex md:items-center md:justify-between md:space-x-4 xl:border-b xl:pb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{competitor.name}</h1>
          <p className="mt-2 text-sm text-gray-700">
            <a
              href={competitor.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-500"
            >
              {competitor.url}
            </a>
          </p>
          {competitor.description && (
            <p className="mt-1 text-sm text-gray-500">{competitor.description}</p>
          )}
        </div>
      </div>

      <div className="mt-8">
        <SnapshotList
          competitorId={competitor.id}
          snapshots={competitor.snapshots}
        />
      </div>
    </div>
  );
} 