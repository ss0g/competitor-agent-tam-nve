import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { SnapshotComparison } from '@/components/snapshots/SnapshotComparison';

interface SnapshotPageProps {
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

export default async function SnapshotPage({ params }: SnapshotPageProps) {
  // Always use mock user (auth disabled)
  const mockUser = await getOrCreateMockUser();

  const snapshot = await prisma.snapshot.findFirst({
    where: {
      id: params.id,
      competitor: {
        userId: mockUser.id,
      },
    },
    include: {
      competitor: {
        include: {
          snapshots: {
            where: {
              NOT: {
                id: params.id,
              },
            },
            orderBy: {
              timestamp: 'desc',
            },
            select: {
              id: true,
              timestamp: true,
              title: true,
            },
          },
        },
      },
    },
  });

  if (!snapshot) {
    return notFound();
  }

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="md:flex md:items-center md:justify-between md:space-x-4 xl:border-b xl:pb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {snapshot.competitor.name} - Snapshot
          </h1>
          <p className="mt-2 text-sm text-gray-700">
            Taken on {new Date(snapshot.timestamp).toLocaleString()}
          </p>
        </div>
      </div>

      <div className="mt-8 space-y-8">
        {snapshot.competitor.snapshots.length > 0 && (
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <div className="px-4 py-5 sm:px-6">
              <h2 className="text-lg font-medium text-gray-900">Compare with Previous Snapshot</h2>
              <p className="mt-1 text-sm text-gray-500">
                Select a previous snapshot to compare changes
              </p>
            </div>
            <div className="border-t border-gray-200">
              <SnapshotComparison
                oldSnapshotId={snapshot.competitor.snapshots[0].id}
                newSnapshotId={snapshot.id}
              />
            </div>
          </div>
        )}

        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6">
            <h2 className="text-lg font-medium text-gray-900">Snapshot Details</h2>
          </div>
          <div className="border-t border-gray-200 px-4 py-5 sm:px-6">
            <dl className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2">
              <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-gray-500">Title</dt>
                <dd className="mt-1 text-sm text-gray-900">{snapshot.title}</dd>
              </div>
              <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-gray-500">URL</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  <a
                    href={snapshot.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-500"
                  >
                    {snapshot.url}
                  </a>
                </dd>
              </div>
              <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-gray-500">Status Code</dt>
                <dd className="mt-1 text-sm text-gray-900">{snapshot.statusCode}</dd>
              </div>
              <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-gray-500">Content Length</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {snapshot.contentLength
                    ? `${Math.round(snapshot.contentLength / 1024)} KB`
                    : 'Unknown'}
                </dd>
              </div>
              {snapshot.description && (
                <div className="sm:col-span-2">
                  <dt className="text-sm font-medium text-gray-500">Meta Description</dt>
                  <dd className="mt-1 text-sm text-gray-900">{snapshot.description}</dd>
                </div>
              )}
            </dl>
          </div>
        </div>

        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6">
            <h2 className="text-lg font-medium text-gray-900">Page Content</h2>
          </div>
          <div className="border-t border-gray-200">
            <div className="px-4 py-5 sm:px-6">
              <pre className="mt-1 text-sm text-gray-900 whitespace-pre-wrap font-mono bg-gray-50 p-4 rounded-md overflow-auto max-h-96">
                {snapshot.text}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 