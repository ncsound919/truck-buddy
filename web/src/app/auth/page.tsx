import Link from 'next/link';
import { redirect } from 'next/navigation';

import { getSessionUser } from '@/lib/supabase/server';
import { AuthForm } from './auth-form';
import type { AuthMode } from './auth-form';
import { TruckBuddyMark } from '@/components/truck-buddy-mark';
import { CheckIcon } from '@/components/icons';

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
    <div className="flex min-h-screen w-full bg-[#f8fafb]">
      {/* LEFT HERO — mascot + message + features */}
      <section className="hidden lg:flex lg:w-[52%] lg:flex-col lg:items-start lg:justify-between lg:overflow-hidden lg:bg-gradient-to-br lg:from-[#0b1626] lg:via-[#13223d] lg:to-[#0b1626] lg:px-14 lg:py-16 lg:text-white">
        <div>
          <Link href="/" className="inline-flex items-center gap-3 group">
            <div className="h-12 w-12 rounded-2xl bg-white/10 backdrop-blur flex items-center justify-center shadow-xl ring-1 ring-white/10 group-hover:bg-white/15 transition">
              <TruckBuddyMark className="h-7 w-7" />
            </div>
            <span className="text-xl font-black tracking-tight leading-none">Truck Buddy</span>
          </Link>
          <h1 className="mt-10 text-[3.4rem] font-black leading-[1.05] tracking-[-0.04em] balance">
            Less paperwork.
            <br />
            <span className="bg-gradient-to-r from-[#F9A653] to-[#D97225] bg-clip-text text-transparent">
              More road.
            </span>
          </h1>
          <p className="mt-6 max-w-md text-base leading-relaxed text-[#b8c3d8]">
            The hands-free companion for drivers and the logistics hub for everything off the road —
            loads, documents, dispatch, and money in one flow.
          </p>

          <ul className="mt-9 flex flex-wrap gap-2 max-w-md">
            {[
              'Guided inspections',
              'Scan any document',
              'Hands-free navigation',
              'Real-time truck health',
            ].map((t) => (
              <li key={t} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3.5 py-1.5 text-[13px] font-semibold text-[#dde5f0] backdrop-blur">
                <CheckIcon width={14} height={14} className="shrink-0 text-[#F9A653]" />
                {t}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative w-full">
          {/* Big mascot illustration */}
          <div className="flex items-end gap-8">
            <div className="relative">
              <img
                src="/truckbuddy-logo.jpg"
                alt="Truck Buddy mascot — a friendly blue truck"
                className="h-[240px] w-auto object-contain drop-shadow-[0_30px_60px_-12px_rgba(15,107,255,0.5)]"
              />
              {/* decorative glow behind mascot */}
              <div className="absolute -top-10 -left-10 -z-10 h-60 w-60 rounded-full bg-[#0F6BFF]/30 blur-3xl" />
            </div>
            <div className="mb-4 max-w-xs">
              <p className="text-lg font-extrabold tracking-tight leading-snug">Your Reliable Logistics Friend</p>
              <p className="mt-2 text-sm text-[#b8c3d8] leading-relaxed">Built for one-handed, eyes-up use. No typing. Talk or tap. Works offline in the cab.</p>
            </div>
          </div>
        </div>
      </section>

      {/* RIGHT FORM — the sign-in / sign-up card */}
      <main className="flex w-full items-center justify-center px-6 py-12 lg:w-[48%] lg:px-16 lg:py-10">
        <div className="w-full max-w-[440px]">
          <div className="rounded-3xl border border-[#e8eef4] bg-white/80 backdrop-blur-xl p-8 shadow-[0_8px_30px_-8px_rgba(11,22,38,0.12)] lg:p-10">
            <Link href="/" className="inline-flex items-center gap-2.5 lg:hidden mb-6">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-[#0F6BFF] to-[#0b47b8] flex items-center justify-center shadow-md">
                <TruckBuddyMark className="h-5 w-5 text-white" />
              </div>
              <span className="text-lg font-extrabold text-ink tracking-tight">Truck Buddy</span>
            </Link>

            <div className="mb-1 flex items-center gap-2.5">
              <h2 className="text-2xl font-black tracking-[-0.03em] text-ink leading-none">
                {authMode === 'sign-in' ? 'Sign in' : 'Create account'}
              </h2>
            </div>
            <p className="mt-2 text-sm font-medium text-muted leading-snug">
              {authMode === 'sign-in'
                ? 'Access your loads, documents, and driver profile.'
                : 'Start with loads, inspections, and paperwork — the app works on web now.'}
            </p>

            {hasAuth ? (
              <AuthForm mode={authMode} />
            ) : (
              <p className="mt-5 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm font-semibold text-amber-800">
                Authentication is not configured yet — check your Supabase environment.
              </p>
            )}
          </div>

          <p className="mt-5 text-center text-[13px] text-muted leading-snug">
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

          <p className="mt-4 text-center text-[11px] text-faint leading-snug">
            By continuing you agree to the <Link href="/terms" className="underline hover:text-ink">Terms</Link> and <Link href="/privacy" className="underline hover:text-ink">Privacy Policy</Link>.
          </p>
        </div>
      </main>
    </div>
  );
}
