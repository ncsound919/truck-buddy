'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { BrandLogo } from '@/components/brand-logo';
import { useSession } from '@/components/auth/session-provider';
import { MenuIcon, CloseIcon } from '@/components/icons';
import { cn } from '@/lib/cn';

const NAV = [
  { href: '/#product', label: 'Product' },
  { href: '/assistant', label: 'Breakdown help' },
  { href: '/#how-it-works', label: 'How it works' },
  { href: '/portal', label: 'Driver portal' },
  { href: '/#pricing', label: 'Pricing' },
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { user, loading } = useSession();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={cn(
        'sticky top-0 z-50 border-b transition-colors',
        scrolled ? 'border-line bg-white/85 backdrop-blur-md' : 'border-transparent bg-transparent',
      )}
    >
      <div className="mx-auto flex h-[72px] max-w-6xl items-center justify-between px-5">
        <BrandLogo />
        <nav className="hidden items-center gap-8 md:flex">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className="text-[15px] font-semibold text-ink-2 hover:text-accent">
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="hidden items-center gap-3 md:flex">
          {loading ? null : user ? (
            <>
              <Link href="/account" className="text-[15px] font-semibold text-ink-2 hover:text-accent">
                {user.name?.split(' ')[0] || user.email?.split('@')[0] || 'Account'}
              </Link>
              <Link
                href="/portal"
                className="inline-flex h-10 items-center justify-center rounded-xl bg-accent px-4 text-[15px] font-bold text-white transition hover:bg-accent-600"
              >
                Open portal
              </Link>
            </>
          ) : (
            <>
              <Link href="/auth" className="text-[15px] font-semibold text-ink-2 hover:text-accent">
                Sign in
              </Link>
              <Link
                href="/auth?mode=sign-up"
                className="inline-flex h-10 items-center justify-center rounded-xl bg-accent px-4 text-[15px] font-bold text-white transition hover:bg-accent-600"
              >
                Get started
              </Link>
            </>
          )}
        </div>
        <button
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-ink md:hidden"
          aria-label="Toggle menu"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <CloseIcon /> : <MenuIcon />}
        </button>
      </div>

      {open ? (
        <nav className="border-t border-line bg-white px-5 pb-4 pt-2 md:hidden">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              onClick={() => setOpen(false)}
              className="block border-b border-line py-3 font-semibold text-ink last:border-0"
            >
              {n.label}
            </Link>
          ))}
          <Link
            href={user ? '/portal' : '/auth?mode=sign-up'}
            onClick={() => setOpen(false)}
            className="mt-3 flex h-11 items-center justify-center rounded-xl bg-accent font-bold text-white"
          >
            {user ? 'Open portal' : 'Get started'}
          </Link>
        </nav>
      ) : null}
    </header>
  );
}
