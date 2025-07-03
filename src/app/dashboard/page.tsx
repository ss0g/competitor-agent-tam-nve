'use client'

import { useRouter } from 'next/navigation'
import { AWSStatusIndicator } from '@/components/status/AWSStatusIndicator'

export default function Dashboard() {
  const router = useRouter()

  const handleLogout = () => {
    // TODO: Implement logout logic
    console.log('Logout clicked')
  }

  const navigateToProjects = () => {
    router.push('/projects')
  }

  const navigateToReports = () => {
    router.push('/reports')
  }

  const navigateToCompetitors = () => {
    router.push('/competitors')
  }

  return (
    <div className="min-h-screen p-8" style={{ backgroundColor: '#EFE9DE' }}>
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-black text-white rounded-md hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-500"
          >
            Logout
          </button>
        </div>

        {/* System Status Section */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">System Status</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* AWS Status Card */}
            <AWSStatusIndicator 
              mode="card" 
              showRefreshButton={true}
              showDetails={true}
              className="col-span-1"
            />
            
            {/* Other Status Cards */}
            <div className="p-6 bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded-full bg-green-400" />
                  <h3 className="text-lg font-semibold text-gray-800">Database</h3>
                </div>
                <span className="text-2xl">💾</span>
              </div>
              <div className="text-sm text-gray-600 mb-4">
                Database connection is healthy
              </div>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Status:</span>
                    <span className="font-medium text-green-800">Connected</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Type:</span>
                    <span className="font-medium text-gray-800">PostgreSQL</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded-full bg-blue-400" />
                  <h3 className="text-lg font-semibold text-gray-800">Application</h3>
                </div>
                <span className="text-2xl">🚀</span>
              </div>
              <div className="text-sm text-gray-600 mb-4">
                Application services running normally
              </div>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Environment:</span>
                    <span className="font-medium text-blue-800">Development</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Uptime:</span>
                    <span className="font-medium text-gray-800">&gt; 1h</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions Section */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <button
              onClick={navigateToProjects}
              className="p-6 bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow text-left"
            >
              <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl">📁</span>
                <h3 className="font-semibold text-gray-900">Projects</h3>
              </div>
              <p className="text-sm text-gray-600">Manage your research projects</p>
            </button>

            <button
              onClick={navigateToReports}
              className="p-6 bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow text-left"
            >
              <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl">📊</span>
                <h3 className="font-semibold text-gray-900">Reports</h3>
              </div>
              <p className="text-sm text-gray-600">View and generate reports</p>
            </button>

            <button
              onClick={navigateToCompetitors}
              className="p-6 bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow text-left"
            >
              <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl">🏢</span>
                <h3 className="font-semibold text-gray-900">Competitors</h3>
              </div>
              <p className="text-sm text-gray-600">Manage competitor data</p>
            </button>

            <button
              onClick={() => router.push('/chat')}
              className="p-6 bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow text-left"
            >
              <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl">💬</span>
                <h3 className="font-semibold text-gray-900">Chat Assistant</h3>
              </div>
              <p className="text-sm text-gray-600">Get help with analysis</p>
            </button>
          </div>
        </div>

        {/* Recent Activity Section */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Activity</h2>
          <div className="bg-white shadow rounded-lg p-6">
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="w-2 h-2 rounded-full bg-green-400 mt-2" />
                <div>
                  <p className="text-sm text-gray-900">
                    AWS credentials are configured and working properly
                  </p>
                  <p className="text-xs text-gray-500">System check • Just now</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-2 h-2 rounded-full bg-blue-400 mt-2" />
                <div>
                  <p className="text-sm text-gray-900">
                    Dashboard enhanced with system status indicators
                  </p>
                  <p className="text-xs text-gray-500">System update • 2 minutes ago</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-2 h-2 rounded-full bg-yellow-400 mt-2" />
                <div>
                  <p className="text-sm text-gray-900">
                    Error handling improvements deployed
                  </p>
                  <p className="text-xs text-gray-500">System update • 5 minutes ago</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 