import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

function hasAuthSession(request: NextRequest): boolean {
  return (
    request.cookies.get('vx_auth_present')?.value === 'true' ||
    Boolean(request.cookies.get('vx_access')?.value)
  );
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith('/dashboard') && !hasAuthSession(request)) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\..*|api).*)',
  ],
};
