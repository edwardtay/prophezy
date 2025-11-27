import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Force HTTPS only in production or when explicitly configured
  // Allow HTTP in development (localhost)
  const isLocalhost = request.nextUrl.hostname === 'localhost' || 
                      request.nextUrl.hostname === '127.0.0.1' ||
                      process.env.NODE_ENV === 'development';
  
  if (!isLocalhost && process.env.FORCE_HTTPS !== 'false') {
    const url = request.nextUrl.clone();
    
    // Check if request is HTTP
    if (url.protocol === 'http:') {
      url.protocol = 'https:';
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/(.*)',
};




