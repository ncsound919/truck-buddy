'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { KIND_LABEL, ROLE_LABEL } from '@/lib/rbac';
import type { Organization, OrgMembership } from '@/lib/domain';
import { cn } from '@/lib/cn';

/**
 * Header org switcher. Shows the active account (org) + your role in it.
 * Clicking switches to the next org you belong to; the server re-derives the
 * driver perspective (owner-operator vs company/leased) for that membership.
 */
export function OrgSwitcher() {
  const router = useRouter();
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [membership, setMembership] = useState<OrgMembership | null>(null);

  useEffect(() => {
    let live = true;
    fetch('/api/portal/orgs')
      .then((r) => r.json())
      .then((d: { orgs: Organization[]; membership: OrgMembership }) => {
        if (!live) return;
        setOrgs(d.orgs);
        setMembership(d.membership);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, []);

  const me = membership?.member;
  const label = membership
    ? `${membership.org.name} · ${me ? ROLE_LABEL[me.role] : ''}`
    : 'Account';

  async function switchNext() {
    if (orgs.length < 2) return;
    const cur = orgs.findIndex((o) => o.id === membership?.org.id);
    const next = orgs[(cur + 1) % orgs.length];
    await fetch('/api/portal/orgs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orgId: next.id }),
    });
    router.refresh();
  }

  return (
    <button
      onClick={switchNext}
      title={membership ? `${KIND_LABEL[membership.org.kind]} account — click to switch` : undefined}
      className={cn(
        'hidden items-center gap-2 rounded-lg border border-line bg-white px-2.5 py-1.5 text-[13px] font-semibold text-ink-2 transition hover:border-accent/50 sm:inline-flex',
        orgs.length > 1 && 'cursor-pointer',
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', membership?.org.tier === 'enterprise' ? 'bg-accent' : 'bg-success')} />
      <span className="max-w-[180px] truncate">{label}</span>
      {orgs.length > 1 ? <span className="text-faint">▾</span> : null}
    </button>
  );
}
