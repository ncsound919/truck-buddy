'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { signOutAction } from './auth-actions';

const TABS = [
  { href: '/ops', label: 'Analytics', exact: true },
  { href: '/ops/crm', label: 'CRM' },
  { href: '/ops/seo', label: 'SEO' },
  { href: '/ops/optimization', label: 'Optimization' },
];

export function OpsNav({ email }: { email: string }) {
  const pathname = usePathname();
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-white">
      <div className="flex h-16 items-center justify-between gap-4 px-4 md:px-6">
        <div className="flex items-center gap-3">
          <Link href="/ops" className="text-[15px] font-extrabold text-ink">
            Truck Buddy <span className="text-accent">Ops</span>
          </Link>
          <span className="hidden rounded-md bg-accent-soft px-2 py-0.5 text-xs font-extrabold text-accent-600 sm:inline">
            {email}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/" className="text-sm font-bold text-faint hover:text-ink">
            ← Site
          </Link>
          <form action={signOutAction}>
            <button className="rounded-lg border border-line px-3 py-1.5 text-sm font-bold text-ink-2 hover:bg-line/50">
              Sign out
            </button>
          </form>
        </div>
      </div>
      <nav className="flex gap-1 overflow-x-auto px-4 pb-2">
        {TABS.map((t) => {
          const active = t.exact ? pathname === t.href : pathname.startsWith(t.href);
          return (
            <Link
              key={t.href}
              href={t.href}
              className={
                'shrink-0 rounded-lg px-3.5 py-2 text-sm font-semibold ' +
                (active ? 'bg-accent text-white' : 'text-ink-2 hover:bg-line/50')
              }
            >
              {t.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
