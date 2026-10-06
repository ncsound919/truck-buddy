import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

/**
 * OAuth / magic-link / email-confirmation callback (PKCE).
 *
 * @supabase/ssr uses the PKCE flow, so Supabase returns `?code=...` and the
 * session is only created by exchanging that code server-side and writing the
 * auth cookies. Without this route the code lands on a middleware-protected page
 * (/portal) and is discarded, so the user arrives signed out.
 *
 * `/auth/callback` is intentionally public - the middleware matcher only covers
 * /portal and /account.
 */
const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

function safeNext(value: string | null): string {
  // Only allow same-site absolute paths (no //host or full URLs).
  if (value && value.startsWith('/') && !value.startsWith('//')) return value;
  return '/portal';
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const next = safeNext(searchParams.get('next'));

  const providerError = searchParams.get('error') || searchParams.get('error_description');
  if (providerError) {
    return NextResponse.redirect(new URL(`/auth?error=${encodeURIComponent(providerError)}`, request.url));
  }

  if (!code) {
    return NextResponse.redirect(new URL('/auth?error=missing_code', request.url));
  }

  if (!url || !anonKey) {
    // Fail closed rather than pretending we signed someone in.
    return NextResponse.redirect(new URL('/auth?error=supabase_not_configured', request.url));
  }

  const res = NextResponse.redirect(new URL(next, request.url));
  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet) => {
        for (const { name, value, options } of cookiesToSet) {
          res.cookies.set(name, value, options);
        }
      },
    },
  });

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(new URL(`/auth?error=${encodeURIComponent(error.message)}`, request.url));
  }

  // Auth cookies are set on `res` and return with the redirect to `next`.
  return res;
}
