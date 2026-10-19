import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { getVerifiedUserRole } from './lib/authGuard';

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const pathname = request.nextUrl.pathname;

  // 1. Skip static assets, next internals, and public images
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/assets') ||
    pathname === '/favicon.ico' ||
    /\.(svg|png|jpg|jpeg|gif|webp|ico|css|js)$/.test(pathname)
  ) {
    return response;
  }

  // 2. Initialize Supabase SSR Client for cookie exchange
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: '', ...options });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({ name, value: '', ...options });
        },
      },
    }
  );

  // 3. Verify user securely with Supabase server
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isAuthRoute = pathname.startsWith('/api/auth');
  const isLoginPage = pathname === '/login';

  // 4. Handle Unauthenticated Requests
  if (!user) {
    if (isLoginPage || isAuthRoute) {
      return response;
    }

    // Protect API endpoints with JSON 401
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        {
          success: false,
          error: 'Autentikasi diperlukan. Silakan login terlebih dahulu.',
        },
        { status: 401 }
      );
    }

    // Protect UI pages: Redirect to login with return url
    const loginUrl = new URL('/login', request.url);
    if (pathname !== '/') {
      loginUrl.searchParams.set('redirect', pathname);
    }
    return NextResponse.redirect(loginUrl);
  }

  // 5. User is Authenticated: If opening login page, redirect to appropriate start page
  const roleInfo = await getVerifiedUserRole(user.id, user.email, user.user_metadata);
  const userRole = roleInfo?.role || 'ADMIN';

  if (isLoginPage) {
    const destination = userRole === 'PEWAWANCARA' ? '/wawancara' : '/pendaftar';
    return NextResponse.redirect(new URL(destination, request.url));
  }

  // 6. Role-Based Navigation Protection (Edge level)
  // Protected Super-Admin Only Pages (Finances, Master Settings, Bank Accounts, Discounts)
  const superAdminOnlyPages = [
    '/keuangan',
    '/formulir',
    '/rekening',
    '/daftar-ulang',
    '/rekomendasi',
    '/pengaturan',
    '/draft',
  ];

  // Panitia PPDB and Unit specific accounts: Allowed on operational modules only
  if (userRole === 'PANITIA' || userRole === 'UNIT') {
    const isTryingFinancialPage = superAdminOnlyPages.some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
    );
    if (isTryingFinancialPage) {
      // Redirect to main operational applicant list
      return NextResponse.redirect(new URL('/pendaftar', request.url));
    }
  }

  // Pewawancara role: Limited exclusively to interview and applicant list
  if (userRole === 'PEWAWANCARA') {
    const allowedPewawancara = ['/wawancara', '/pendaftar'];
    const isAllowed = allowedPewawancara.some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
    );
    if (!isAllowed) {
      return NextResponse.redirect(new URL('/wawancara', request.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
