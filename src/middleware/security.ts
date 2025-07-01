import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';

// Rate limiting store (in production, use Redis)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// Rate limit configuration
const RATE_LIMITS = {
  '/api/reports': { requests: 100, windowMs: 60000 }, // 100 requests per minute
  '/api/chat': { requests: 50, windowMs: 60000 },     // 50 requests per minute
  '/api/analysis': { requests: 30, windowMs: 60000 }, // 30 requests per minute
  default: { requests: 200, windowMs: 60000 }         // 200 requests per minute
};

// Input validation patterns
const VALIDATION_PATTERNS = {
  projectId: /^[a-zA-Z0-9_-]{1,50}$/,
  filename: /^[a-zA-Z0-9_.-]{1,255}\.md$/,
  limit: /^[1-9]\d*$/,
  offset: /^\d+$/,
  id: /^[a-zA-Z0-9_-]{1,50}$/,
};

export interface SecurityConfig {
  skipRateLimit?: boolean;
  skipValidation?: boolean;
  customRateLimit?: { requests: number; windowMs: number };
}

export function createSecurityMiddleware(config: SecurityConfig = {}) {
  return async function securityMiddleware(
    request: NextRequest,
    context?: { params?: Record<string, string> }
  ): Promise<NextResponse | null> {
    
    const url = new URL(request.url);
    const pathname = url.pathname;
    const clientIp = getClientIP(request);
    
    // Add security headers
    const response = NextResponse.next();
    addSecurityHeaders(response);
    
    // Rate limiting
    if (!config.skipRateLimit) {
      const rateLimitResult = await checkRateLimit(pathname, clientIp, config.customRateLimit);
      if (rateLimitResult.blocked) {
        return new NextResponse(
          JSON.stringify({ 
            error: 'Rate limit exceeded',
            retryAfter: rateLimitResult.retryAfter 
          }),
          { 
            status: 429,
            headers: {
              'Content-Type': 'application/json',
              'Retry-After': rateLimitResult.retryAfter.toString(),
              'X-RateLimit-Limit': rateLimitResult.limit.toString(),
              'X-RateLimit-Remaining': '0',
              'X-RateLimit-Reset': new Date(rateLimitResult.resetTime).toISOString(),
            }
          }
        );
      }
      
      // Add rate limit headers to successful responses
      response.headers.set('X-RateLimit-Limit', rateLimitResult.limit.toString());
      response.headers.set('X-RateLimit-Remaining', rateLimitResult.remaining.toString());
      response.headers.set('X-RateLimit-Reset', new Date(rateLimitResult.resetTime).toISOString());
    }
    
    // Input validation
    if (!config.skipValidation) {
      const validationResult = validateRequest(request, context);
      if (!validationResult.valid) {
        return new NextResponse(
          JSON.stringify({ 
            error: 'Invalid input',
            details: validationResult.errors,
            code: 'VALIDATION_ERROR'
          }),
          { 
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }
    }
    
    return response;
  };
}

function getClientIP(request: NextRequest): string {
  // Check various headers for client IP
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const cfConnectingIp = request.headers.get('cf-connecting-ip');
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  return realIp || cfConnectingIp || 'unknown';
}

function addSecurityHeaders(response: NextResponse): void {
  // Security headers for production
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  
  // HSTS in production
  if (process.env.NODE_ENV === 'production') {
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  
  // CSP for API endpoints
  response.headers.set(
    'Content-Security-Policy',
    "default-src 'none'; frame-ancestors 'none';"
  );
}

async function checkRateLimit(
  pathname: string, 
  clientIp: string, 
  customLimit?: { requests: number; windowMs: number }
): Promise<{
  blocked: boolean;
  limit: number;
  remaining: number;
  resetTime: number;
  retryAfter: number;
}> {
  
  // Determine rate limit configuration
  let rateLimit = customLimit;
  if (!rateLimit) {
    rateLimit = Object.keys(RATE_LIMITS).find(pattern => pathname.startsWith(pattern))
      ? RATE_LIMITS[pathname.split('/').slice(0, 3).join('/') as keyof typeof RATE_LIMITS]
      : RATE_LIMITS.default;
  }
  
  const key = `${clientIp}:${pathname}`;
  const now = Date.now();
  const windowStart = now - rateLimit.windowMs;
  
  // Clean up old entries
  if (rateLimitStore.size > 10000) {
    for (const [k, v] of rateLimitStore.entries()) {
      if (v.resetTime < now) {
        rateLimitStore.delete(k);
      }
    }
  }
  
  const current = rateLimitStore.get(key);
  
  if (!current || current.resetTime < now) {
    // New window
    rateLimitStore.set(key, {
      count: 1,
      resetTime: now + rateLimit.windowMs
    });
    
    return {
      blocked: false,
      limit: rateLimit.requests,
      remaining: rateLimit.requests - 1,
      resetTime: now + rateLimit.windowMs,
      retryAfter: 0
    };
  }
  
  if (current.count >= rateLimit.requests) {
    // Rate limit exceeded
    return {
      blocked: true,
      limit: rateLimit.requests,
      remaining: 0,
      resetTime: current.resetTime,
      retryAfter: Math.ceil((current.resetTime - now) / 1000)
    };
  }
  
  // Increment counter
  current.count++;
  rateLimitStore.set(key, current);
  
  return {
    blocked: false,
    limit: rateLimit.requests,
    remaining: rateLimit.requests - current.count,
    resetTime: current.resetTime,
    retryAfter: 0
  };
}

function validateRequest(
  request: NextRequest, 
  context?: { params?: Record<string, string> }
): { valid: boolean; errors: string[] } {
  
  const errors: string[] = [];
  const url = new URL(request.url);
  const searchParams = url.searchParams;
  const pathname = url.pathname;
  
  // Validate query parameters
  for (const [key, value] of searchParams.entries()) {
    if (!validateParam(key, value)) {
      errors.push(`Invalid parameter: ${key}=${value}`);
    }
  }
  
  // Validate path parameters
  if (context?.params) {
    for (const [key, value] of Object.entries(context.params)) {
      if (!validateParam(key, value)) {
        errors.push(`Invalid path parameter: ${key}=${value}`);
      }
    }
  }
  
  // Content-Length validation for POST/PUT requests
  if (['POST', 'PUT', 'PATCH'].includes(request.method)) {
    const contentLength = request.headers.get('content-length');
    if (contentLength) {
      const length = parseInt(contentLength);
      if (length > 10 * 1024 * 1024) { // 10MB limit
        errors.push('Request body too large (max 10MB)');
      }
    }
  }
  
  // Validate Content-Type for POST/PUT requests
  if (['POST', 'PUT', 'PATCH'].includes(request.method)) {
    const contentType = request.headers.get('content-type');
    if (contentType && !isAllowedContentType(contentType)) {
      errors.push(`Invalid content type: ${contentType}`);
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

function validateParam(key: string, value: string): boolean {
  // Skip validation for unknown parameters (allow extensibility)
  if (!(key in VALIDATION_PATTERNS)) {
    // Basic safety checks
    if (value.length > 1000) return false;
    if (/[<>{}|\\^`]/.test(value)) return false;
    return true;
  }
  
  const pattern = VALIDATION_PATTERNS[key as keyof typeof VALIDATION_PATTERNS];
  return pattern.test(value);
}

function isAllowedContentType(contentType: string): boolean {
  const allowedTypes = [
    'application/json',
    'application/x-www-form-urlencoded',
    'multipart/form-data',
    'text/plain'
  ];
  
  return allowedTypes.some(type => contentType.toLowerCase().startsWith(type));
}

// Utility function for API routes
export function withSecurity(
  handler: (request: NextRequest, context?: any) => Promise<NextResponse>,
  config: SecurityConfig = {}
) {
  return async function securedHandler(request: NextRequest, context?: any): Promise<NextResponse> {
    const middleware = createSecurityMiddleware(config);
    const securityResult = await middleware(request, context);
    
    if (securityResult && securityResult.status !== 200) {
      return securityResult;
    }
    
    return handler(request, context);
  };
} 