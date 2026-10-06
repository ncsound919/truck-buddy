'use client';

import { useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { ROLE_LABEL } from '@/lib/rbac';
import type { OrgMember, OrgRole } from '@/lib/domain';

const ROLES: OrgRole[] = ['owner', 'admin', 'dispatcher', 'driver', 'accountant'];

export function TeamPanel({ meRole, initial }: { meRole: OrgRole; initial: OrgMember[] }) {
  const [members, setMembers] = useState<OrgMember[]>(initial);
  const [error, setError] = useState<string | null>(null);

  async function changeRole(memberId: string, role: OrgRole) {
    setError(null);
    try {
      const res = await fetch('/api/portal/orgs/members', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId, role }),
      });
      if (!res.ok) throw new Error('role_update_failed');
      const { members: list } = (await res.json()) as { members: OrgMember[] };
      setMembers(list);
    } catch {
      setError('Could not change that role.');
    }
  }

  return (
    <div className="space-y-6">
      {error ? (
        <div className="rounded-xl border border-danger-soft bg-danger-soft px-4 py-3 text-sm font-semibold text-danger">{error}</div>
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-line bg-white">
        <div className="grid grid-cols-12 gap-3 border-b border-line bg-bg-alt px-5 py-3 text-xs font-extrabold uppercase tracking-wide text-faint">
          <div className="col-span-4">Member</div>
          <div className="col-span-3">Role</div>
          <div className="col-span-3">Equipment</div>
          <div className="col-span-2">Joined</div>
        </div>
        <ul className="divide-y divide-line">
          {members.map((m) => {
            const isYouOwner = m.role === 'owner';
            return (
              <li key={m.userId} className="grid grid-cols-2 items-center gap-3 px-5 py-3 sm:grid-cols-12">
                <div className="col-span-2 sm:col-span-4">
                  <div className="flex items-center gap-2 text-sm font-bold text-ink">
                    {m.name}
                    {m.role === meRole ? <Badge tone="accent">you</Badge> : null}
                  </div>
                  <div className="text-xs text-faint">{m.email}</div>
                </div>
                <div className="col-span-1 sm:col-span-3">
                  <select
                    value={m.role}
                    disabled={isYouOwner}
                    onChange={(e) => changeRole(m.userId, e.target.value as OrgRole)}
                    className="h-9 w-full rounded-lg border border-line bg-white px-2 text-sm text-ink outline-none focus:border-accent disabled:opacity-60"
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>{ROLE_LABEL[r]}</option>
                    ))}
                  </select>
                </div>
                <div className="col-span-1 text-sm capitalize text-ink-2 sm:col-span-3">
                  {m.equipment.replace('_', ' ')}
                </div>
                <div className="col-span-1 text-xs text-faint sm:col-span-2">
                  {new Date(m.joinedAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      <p className="text-sm text-muted">
        Teammates join by signing in to the portal with their own email — once they do, they appear here and you can
        set their role. There is no invite step.
      </p>
    </div>
  );
}
