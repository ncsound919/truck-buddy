import Link from 'next/link';
import { redirect } from 'next/navigation';

import { getOpsUser } from '@/lib/ops/ops-auth';
import { SignInForm } from './sign-in-form';

export const dynamic = 'force-dynamic';

export default async function SignInPage() {
  const user = await getOpsUser();
  if (user?.admin) redirect('/ops');

  const hasEmailAuth =
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY);

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-alt px-4">
      <div className="w-full max-w-sm">
        <Link href="/" className="mb-6 block text-center text-xl font-extrabold text-ink">
          Truck Buddy <span className="text-accent">Ops</span>
        </Link>
        <div className="rounded-2xl border border-line bg-white p-6 shadow-[var(--shadow-card)]">
          <h1 className="text-lg font-extrabold text-ink">Sign in</h1>
          <p className="mt-1 text-sm text-muted">Admin access to the Ops console.</p>
          {hasEmailAuth ? (
            <SignInForm />
          ) : (
            <p className="mt-4 text-sm font-semibold text-warning">
              Supabase auth is not configured. Add NEXT_PUBLIC_SUPABASE_URL + anon key, enable email/password auth,
              and set OPS_ADMIN_EMAILS in env.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
