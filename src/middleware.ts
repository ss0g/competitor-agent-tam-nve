import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // Authentication disabled - all routes are now public
  // const path = request.nextUrl.pathname
  // const isPublicPath = path === '/auth/signin' || path === '/api/chat'
  // const mockUser = request.cookies.get('mockUser')?.value
  
  // if (path === '/auth/signin' && mockUser) {
  //   return NextResponse.redirect(new URL('/dashboard', request.url))
  // }
  
  // if (!isPublicPath && !mockUser) {
  //   return NextResponse.redirect(new URL('/auth/signin', request.url))
  // }
  
  // Allow all requests through without authentication
  return NextResponse.next()
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/projects/:path*',
    '/competitors/:path*',
    '/reports/:path*',
    '/api/:path*',
    '/auth/signin',
  ],
} 