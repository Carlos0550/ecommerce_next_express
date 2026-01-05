import { NextRequest, NextResponse } from 'next/server';


const EXCLUDED_SUBDOMAINS = ['admin', 'www', 'api'];

function extractTenantSlug(hostname: string): string | null {
  
  const hostWithoutPort = hostname.split(':')[0];
  
  
  const parts = hostWithoutPort.split('.');
  
  console.log('[extractTenantSlug] hostname:', hostname, '| hostWithoutPort:', hostWithoutPort, '| parts:', parts);
  
  
  if (parts.length >= 2) {
    const subdomain = parts[0].toLowerCase();
    
    
    if (EXCLUDED_SUBDOMAINS.includes(subdomain)) {
      return null;
    }
    
    
    
    if (parts.length === 2 && parts[1] === 'localhost') {
      
      return subdomain;
    }
    
    
    
    return subdomain;
  }
  
  
  if (hostWithoutPort === 'localhost' || hostWithoutPort === '127.0.0.1') {
    return null;
  }
  
  return null;
}

export default async function middleware(req: NextRequest) {
  const { pathname, searchParams } = req.nextUrl;
  const hostname = req.headers.get('host') || '';
  
  
  let tenantSlug = extractTenantSlug(hostname);
  
  
  console.log('[Middleware] hostname:', hostname, '| tenantSlug:', tenantSlug, '| pathname:', pathname);
  
  
  if (!tenantSlug) {
    tenantSlug = searchParams.get('tenant') || req.cookies.get('tenant_slug')?.value || null;
  }
  
  
  if (!tenantSlug) {
    
    if (process.env.NODE_ENV === 'development') {
      
      tenantSlug = process.env.DEFAULT_TENANT_SLUG || null;
    }
    
    if (!tenantSlug) {
      
      
      if (pathname !== '/tienda-no-encontrada' && pathname !== '/_not-found' && !pathname.startsWith('/_next')) {
        const url = req.nextUrl.clone();
        url.pathname = '/tienda-no-encontrada';
        return NextResponse.redirect(url);
      }
      
      return NextResponse.next();
    }
  }
  
  
  const protectedPaths = ['/account', '/orders'];
  const isProtected = protectedPaths.some((p) => pathname.startsWith(p));
  
  if (isProtected) {
    const cookieToken = req.cookies.get('auth_token')?.value;
    if (!cookieToken) {
      const url = req.nextUrl.clone();
      url.pathname = '/';
      url.searchParams.set('from', pathname);
      return NextResponse.redirect(url);
    }
  }
  
  
  
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set('x-tenant-slug', tenantSlug);
  
  
  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
  
  
  response.cookies.set('tenant_slug', tenantSlug, {
    httpOnly: false, 
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24, 
    path: '/',
  });
  
  return response;
}

export const config = {
  matcher: [
    
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.png$|.*\\.svg$|.*\\.ico$).*)',
  ],
};

