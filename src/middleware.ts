import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'super-secret-key-change-me-in-production-12345-trust-center'
);

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  
  const token = request.cookies.get('token')?.value;
  let session: any = null;
  
  if (token) {
    try {
      const { payload } = await jwtVerify(token, JWT_SECRET);
      session = payload;
    } catch (e) {
      // Clear invalid token cookie and redirect to login
      const response = NextResponse.redirect(new URL('/login', request.url));
      response.cookies.delete('token');
      return response;
    }
  }
  
  // Protecting Admin routes
  if (path.startsWith('/admin')) {
    if (!session) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('callbackUrl', path);
      return NextResponse.redirect(loginUrl);
    }
    
    const role = session.role as string;
    if (role !== 'ADMIN' && role !== 'COMPLIANCE_MANAGER') {
      return NextResponse.redirect(new URL('/trust-center', request.url));
    }
    
    // Strict admin-only panels: User management, backups, and audit logs
    const isAdminOnlyPath = 
      path.startsWith('/admin/users') || 
      path.startsWith('/admin/backup') || 
      path.startsWith('/admin/logs');
      
    if (isAdminOnlyPath && role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/admin', request.url));
    }
  }
  
  // If already logged in, redirect user away from login page
  if (path === '/login' && session) {
    return NextResponse.redirect(new URL('/admin', request.url));
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/login'],
};
