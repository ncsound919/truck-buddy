import Link from 'next/link';
import { redirect } from 'next/navigation';

import { getSessionUser, getSupabaseServer } from '@/lib/supabase/server';
import { NameForm, SignOutButton } from './account-client';

export const dynamic = 'force-dynamic';

export default async function AccountPage() {
  const user = await getSessionUser();
  if (!user) redirect('/auth');

  const sb = await getSupabaseServer();
  const { data: profile } = await sb.from('profiles').select('full_name,email').eq('id', user.id).maybeSingle();

  return (
    <div className="min-h-screen bg-bg-alt">
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-5">
          <Link href="/" className="text-lg font-extrabold text-ink">Truck Buddy</Link>
          <div className="flex items-center gap-3">
            <Link href="/portal" className="text-sm font-bold text-faint hover:text-ink">Portal</Link>
            <SignOutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-5 py-10">
        <h1 className="text-2xl font-extrabold text-ink">Your account</h1>
        <p className="text-sm text-muted">Profile, sign-in, and how you use Truck Buddy.</p>

        <div className="mt-6 space-y-6">
          <div className="rounded-2xl border border-line bg-white p-6">
            <h2 className="text-[15px] font-extrabold text-ink">Profile</h2>
            <NameForm
              name={profile?.full_name || user.name || ''}
              email={profile?.email || user.email || ''}
            />
          </div>

          <div className="rounded-2xl border border-line bg-white p-6">
            <h2 className="text-[15px] font-extrabold text-ink">How you work</h2>
            <p className="mt-1 text-sm text-muted">
              Choose your role, equipment, and authority so your portal and loads are tailored.
            </p>
            <Link
              href="/portal/setup"
              className="mt-3 inline-flex rounded-xl bg-accent px-4 py-2 text-sm font-bold text-white transition hover:bg-accent-600"
            >
              Edit driver setup
            </Link>
          </div>

          <div className="rounded-2xl border border-line bg-white p-6">
            <h2 className="text-[15px] font-extrabold text-ink">Signed in as</h2>
            <p className="mt-1 text-sm text-muted">
              {user.email} · Account id <span className="font-mono text-xs">{user.id.slice(0, 8)}…</span>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
