import Link from 'next/link';
import { redirect } from 'next/navigation';

import { getSessionUser } from '@/lib/supabase/server';
import { AuthForm } from './auth-form';
import type { AuthMode } from './auth-form';

export const dynamic = 'force-dynamic';

export default async function AuthPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string }>;
}) {
  const { mode } = await searchParams;
  const authMode: AuthMode = mode === 'sign-up' ? 'sign-up' : 'sign-in';

  const user = await getSessionUser();
  if (user) redirect('/portal');

  const hasAuth = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) && Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-alt px-4">
      <div className="w-full max-w-sm">
        <Link href="/" className="mb-6 block text-center text-xl font-extrabold text-ink">
          Truck Buddy
        </Link>
        <div className="rounded-2xl border border-line bg-white p-6 shadow-[var(--shadow-card)]">
          <h1 className="text-lg font-extrabold text-ink">{authMode === 'sign-in' ? 'Sign in' : 'Create your account'}</h1>
          <p className="mt-1 text-sm text-muted">
            {authMode === 'sign-in'
              ? 'Access your loads, documents, and driver profile.'
              : 'Start with loads, inspections, and paperwork — the app works on web now.'}
          </p>
          {hasAuth ? (
            <AuthForm mode={authMode} />
          ) : (
            <p className="mt-4 text-sm font-semibold text-warning">Authentication is not configured yet.</p>
          )}
        </div>
        <p className="mt-4 text-center text-sm text-muted">
          {authMode === 'sign-in' ? (
            <>
              New here?{' '}
              <Link href="/auth?mode=sign-up" className="font-bold text-accent hover:underline">
                Create an account
              </Link>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <Link href="/auth" className="font-bold text-accent hover:underline">
                Sign in
              </Link>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
