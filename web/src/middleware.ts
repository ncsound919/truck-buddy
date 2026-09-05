import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

/**
 * Route protection. Refreshes the Supabase session cookie on every request and
 * gates authenticated areas:
 *   - /portal and /account require a signed-in user (redirect to /auth).
 * Public routes (marketing home, /auth, /ops, /assistant, pricing) are open.
 */
const PROTECTED = ['/portal', '/account'];

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next({ request: req });
  const path = req.nextUrl.pathname;

  if (!url || !anonKey) return res;

  const sb = createServerClient(url, anonKey, {
    cookies: {
      getAll: () => req.cookies.getAll(),
      setAll: (cookiesToSet) => {
        for (const { name, value, options } of cookiesToSet) {
          req.cookies.set(name, value);
          res.cookies.set(name, value, options);
        }
      },
    },
  });

  const isProtected = PROTECTED.some((p) => path === p || path.startsWith(p + '/'));
  // Public funnel: anyone can see plans; checkout itself requires sign-in
  // (the pricing page redirects to /auth?next=/portal/pricing on 401).
  if (path === '/portal/pricing' || path.startsWith('/portal/pricing/')) return res;
  if (!isProtected) return res;

  const {
    data: { user },
  } = await sb.auth.getUser();

  if (!user) {
    const signIn = new URL('/auth', req.url);
    signIn.searchParams.set('next', path);
    return NextResponse.redirect(signIn);
  }
  return res;
}

export const config = {
  matcher: ['/portal/:path*', '/account/:path*'],
};
