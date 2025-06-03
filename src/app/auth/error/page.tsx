'use client'

import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { XCircleIcon } from '@heroicons/react/24/outline'

const errorMessages: Record<string, { title: string; message: string }> = {
  Configuration: {
    title: 'Server Configuration Error',
    message: 'There is a problem with the server configuration. Please contact support.',
  },
  AccessDenied: {
    title: 'Access Denied',
    message: 'You do not have permission to sign in. Please contact your administrator.',
  },
  Verification: {
    title: 'Account Not Verified',
    message: 'The sign in link is no longer valid. It may have been used already or it may have expired.',
  },
  Default: {
    title: 'Authentication Error',
    message: 'An error occurred while trying to authenticate. Please try again.',
  },
}

export default function AuthError() {
  const searchParams = useSearchParams()
  const error = searchParams.get('error') || 'Default'
  const { title, message } = errorMessages[error] || errorMessages.Default

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="flex flex-col items-center">
          <XCircleIcon className="h-12 w-12 text-red-500" />
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            {title}
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            {message}
          </p>
        </div>
        
        <div className="flex flex-col space-y-4">
          <Link
            href="/auth/signin"
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Try Again
          </Link>
          
          <Link
            href="/"
            className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Return to Home
          </Link>

          <div className="text-center mt-4">
            <a
              href="mailto:support@example.com"
              className="text-sm text-blue-600 hover:text-blue-500"
            >
              Contact Support
            </a>
          </div>
        </div>

        {process.env.NODE_ENV === 'development' && error !== 'Default' && (
          <div className="mt-4 p-4 bg-gray-100 rounded-md">
            <p className="text-xs text-gray-500">
              Error Code: {error}
            </p>
          </div>
        )}
      </div>
    </div>
  )
} 