import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Force HTTPS in production or when explicitly configured
  if (process.env.FORCE_HTTPS !== 'false') {
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



