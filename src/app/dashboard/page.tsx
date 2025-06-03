'use client'

import { useRouter } from 'next/navigation'

export default function Dashboard() {
  const router = useRouter()

  const handleLogout = () => {
    // Remove the authentication cookie
    document.cookie = 'mockUser=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT'
    router.push('/auth/signin')
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            Logout
          </button>
        </div>
        <div className="bg-white shadow rounded-lg p-6">
          <p className="text-gray-600">Welcome to your dashboard!</p>
        </div>
      </div>
    </div>
  )
} 