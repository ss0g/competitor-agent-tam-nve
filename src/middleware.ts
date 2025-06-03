import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Get the pathname
  const path = request.nextUrl.pathname;

  // Define public paths that don't require authentication
  const isPublicPath = path === '/auth/signin';

  // Check if user is authenticated (using mock auth for now)
  const mockUser = request.cookies.get('mockUser')?.value;

  // Redirect authenticated users away from public paths
  if (isPublicPath && mockUser) {
    return NextResponse.redirect(new URL('/competitors', request.url));
  }

  // Redirect unauthenticated users to sign in
  if (!isPublicPath && !mockUser) {
    return NextResponse.redirect(new URL('/auth/signin', request.url));
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
}; 