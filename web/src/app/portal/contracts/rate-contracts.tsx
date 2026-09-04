'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckIcon, ContractIcon } from '@/components/icons';
import type { ContractStatus, RateContract } from '@/lib/domain';
import { money } from '@/lib/format';

const STATUS_BADGE: Record<ContractStatus, { label: string; tone: 'accent' | 'success' | 'warning' }> = {
  confirmed: { label: 'Confirmed', tone: 'accent' },
  sent: { label: 'Sent for signature', tone: 'warning' },
  signed: { label: 'Signed', tone: 'success' },
};

export function RateContractsSection({ contracts }: { contracts: RateContract[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const active = contracts.filter((c) => c.status !== 'signed');
  const signed = contracts.filter((c) => c.status === 'signed');

  async function run(action: 'send_for_signature' | 'sign', id: string) {
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch('/api/portal/contracts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, id }),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? 'action_failed');
      }
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Action failed. Please try again.');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-4">
      {active.length > 0 ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {active.map((c) => {
            const b = STATUS_BADGE[c.status];
            return (
              <div key={c.id} className="rounded-2xl border border-line bg-white p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-extrabold text-ink">{c.ref}</span>
                      <Badge tone={b.tone} dot>{b.label}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted">{c.lane.origin} → {c.lane.destination} · {c.lane.milesMi} mi</p>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-black text-ink">{money(c.rateUsd)}</div>
                    <div className="text-xs text-faint">${c.ratePerMileUsd.toFixed(2)}/mi</div>
                  </div>
                </div>

                <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
                  <div className="flex justify-between gap-2"><dt className="text-faint">Pickup</dt><dd className="font-semibold text-ink">{c.pickupAt}</dd></div>
                  <div className="flex justify-between gap-2"><dt className="text-faint">Deliver</dt><dd className="font-semibold text-ink">{c.deliverBy}</dd></div>
                  <div className="flex justify-between gap-2"><dt className="text-faint">Detention</dt><dd className="font-semibold text-ink">{c.terms.detention}</dd></div>
                  <div className="flex justify-between gap-2"><dt className="text-faint">Pay terms</dt><dd className="font-semibold text-ink">{c.terms.payTerms}</dd></div>
                </dl>

                <div className="mt-4 flex items-center gap-2">
                  {c.status === 'confirmed' ? (
                    <Button size="sm" disabled={busyId === c.id} onClick={() => run('send_for_signature', c.id)}>
                      {busyId === c.id ? 'Sending…' : 'Send for signature'}
                    </Button>
                  ) : c.status === 'sent' ? (
                    <Button size="sm" disabled={busyId === c.id} onClick={() => run('sign', c.id)}>
                      {busyId === c.id ? 'Signing…' : 'Mark signed'}
                    </Button>
                  ) : null}
                  <span className="text-xs text-faint">{c.carrier}</span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="rounded-xl border border-line bg-bg-alt/40 px-4 py-3 text-sm text-muted">
          No rate confirmations waiting on a signature right now.
        </p>
      )}

      {signed.length > 0 ? (
        <div>
          <h3 className="mb-3 text-sm font-extrabold uppercase tracking-wide text-ink-2">Signed contracts</h3>
          <ul className="space-y-2.5">
            {signed.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-success-soft bg-success-soft/30 px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-success text-white">
                    <ContractIcon width={18} height={18} />
                  </span>
                  <div>
                    <div className="font-mono text-sm font-extrabold text-ink">{c.ref}</div>
                    <div className="text-xs text-faint">
                      {c.lane.origin} → {c.lane.destination} · {c.terms.payTerms}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-black text-success">{money(c.rateUsd)}</div>
                  <div className="flex items-center justify-end gap-1 text-xs text-success">
                    <CheckIcon width={12} height={12} />
                    {c.signedAt ? `Signed ${new Date(c.signedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : 'Signed'}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {error ? <p className="text-sm font-semibold text-danger">{error}</p> : null}
    </div>
  );
}
