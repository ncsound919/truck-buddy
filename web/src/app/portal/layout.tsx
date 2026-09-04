'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

import { OrgSwitcher } from '@/components/portal/org-switcher';

import { BrandLogo } from '@/components/brand-logo';
import {
  BellIcon,
  ChatIcon,
  ClipboardIcon,
  ContractIcon,
  DocIcon,
  HealthIcon,
  MoneyIcon,
  RouteIcon,
  ShieldIcon,
  TruckIcon,
  UsersIcon,
} from '@/components/icons';
import { cn } from '@/lib/cn';

const BASE_NAV: NavItem[] = [
  { href: '/portal', label: 'Overview', icon: RouteIcon, exact: true },
  { href: '/portal/loads', label: 'Loads', icon: TruckIcon },
  { href: '/portal/money', label: 'Payments', icon: MoneyIcon },
  { href: '/portal/vehicle', label: 'Vehicle health', icon: HealthIcon },
  { href: '/portal/dispatch', label: 'Dispatch', icon: ChatIcon },
  { href: '/portal/paperwork', label: 'Paperwork desk', icon: ClipboardIcon },
  { href: '/portal/contracts', label: 'Contracts', icon: ContractIcon },
  { href: '/portal/compliance', label: 'Compliance', icon: ShieldIcon },
  { href: '/portal/documents', label: 'Documents', icon: DocIcon },
];
const ADMIN_NAV: NavItem = { href: '/portal/admin', label: 'Team & roles', icon: UsersIcon };

interface NavItem {
  href: string;
  label: string;
  icon: (p: { width?: number; height?: number }) => React.ReactNode;
  exact?: boolean;
}

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isManager, setIsManager] = useState(false);

  useEffect(() => {
    let live = true;
    fetch('/api/portal/orgs')
      .then((r) => r.json())
      .then((d: { membership: { member: { role?: string } } }) => {
        const role = d.membership?.member?.role;
        if (live) setIsManager(role === 'owner' || role === 'admin');
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, []);

  const nav = isManager ? [...BASE_NAV, ADMIN_NAV] : BASE_NAV;

  return (
    <div className="min-h-screen bg-bg-alt">
      <header className="sticky top-0 z-40 border-b border-line bg-white">
        <div className="flex h-16 items-center justify-between gap-4 px-4 md:px-6">
          <div className="flex items-center gap-3">
            <BrandLogo href="/portal" />
            <span className="hidden rounded-md bg-accent-soft px-2 py-0.5 text-xs font-extrabold text-accent-600 md:inline">
              PORTAL
            </span>
          </div>
          <div className="flex items-center gap-3">
            <OrgSwitcher />
            <button className="relative hidden h-10 w-10 items-center justify-center rounded-lg text-muted hover:bg-line/50 sm:inline-flex" aria-label="Notifications">
              <BellIcon />
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-danger" />
            </button>
            <div className="flex items-center gap-2.5 rounded-lg border border-line bg-bg-alt py-1 pl-1 pr-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-md bg-surface text-xs font-black text-white">
                TB
              </span>
              <div className="hidden leading-tight md:block">
                <div className="text-sm font-bold text-ink">Terrence Brooks</div>
                <div className="text-[11px] text-faint">Pro Â· MC-482119</div>
              </div>
            </div>
          </div>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-4 pb-2 lg:hidden">
          {nav.map((n) => {
            const active = n.exact ? pathname === n.href : pathname.startsWith(n.href);
            return (
              <Link
                key={n.href}
                href={n.href}
                className={cn(
                  'inline-flex shrink-0 items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-semibold',
                  active ? 'bg-accent text-white' : 'text-ink-2 hover:bg-line/50',
                )}
              >
                <n.icon width={16} height={16} />
                {n.label}
              </Link>
            );
          })}
        </nav>
      </header>

      <div className="mx-auto flex max-w-[1200px] gap-8 px-4 py-6 md:px-6">
        <aside className="hidden w-56 shrink-0 lg:block">
          <nav className="sticky top-24 flex flex-col gap-1">
            {nav.map((n) => {
              const active = n.exact ? pathname === n.href : pathname.startsWith(n.href);
              return (
                <Link
                  key={n.href}
                  href={n.href}
                  className={cn(
                    'flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-[15px] font-semibold',
                    active ? 'bg-accent text-white' : 'text-ink-2 hover:bg-line/60',
                  )}
                >
                  <n.icon width={18} height={18} />
                  {n.label}
                </Link>
              );
            })}
          </nav>
        </aside>
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}


