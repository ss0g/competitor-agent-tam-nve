'use client'

// Authentication disabled - no need for SessionProvider
// import { SessionProvider } from 'next-auth/react'

export function Providers({ children }: { children: React.ReactNode }) {
  // Return children directly without SessionProvider since auth is disabled
  return <>{children}</>
} 