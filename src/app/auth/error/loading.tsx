export default function AuthErrorLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="animate-pulse flex flex-col items-center">
          <div className="h-12 w-12 bg-gray-200 rounded-full"></div>
          <div className="mt-6 h-8 bg-gray-200 rounded w-3/4"></div>
          <div className="mt-2 h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
        
        <div className="flex flex-col space-y-4">
          <div className="h-10 bg-gray-200 rounded"></div>
          <div className="h-10 bg-gray-200 rounded"></div>
          <div className="h-4 bg-gray-200 rounded w-1/3 mx-auto"></div>
        </div>
      </div>
    </div>
  )
} 