import Link from 'next/link'

export default function Home() {
  return (
    <div className="container mx-auto px-4 py-8">
      <header className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900">Competitor Research Dashboard</h1>
        <p className="mt-2 text-gray-600">Monitor and analyze your competitors in real-time</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Quick Actions Card */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="space-y-3">
            <Link 
              href="/competitors/add" 
              className="block w-full text-center bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 transition"
            >
              Add New Competitor
            </Link>
            <Link 
              href="/reports/create" 
              className="block w-full text-center bg-green-600 text-white py-2 px-4 rounded hover:bg-green-700 transition"
            >
              Generate Report
            </Link>
          </div>
        </div>

        {/* Recent Reports Card */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Reports</h2>
          <div className="space-y-3">
            <p className="text-gray-600">No reports generated yet</p>
          </div>
        </div>

        {/* Monitored Competitors Card */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Monitored Competitors</h2>
          <div className="space-y-3">
            <p className="text-gray-600">No competitors added yet</p>
          </div>
        </div>
      </div>
    </div>
  )
}
