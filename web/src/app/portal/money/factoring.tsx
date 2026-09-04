'use client';

import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { money } from '@/lib/format';

export function FactoringPanel({ thisLoad, deliveredTotal }: { thisLoad: number; deliveredTotal: number }) {
  const eligible = Math.round(Math.max(deliveredTotal, thisLoad) * 0.75);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function advance() {
    setBusy(true);
    // Real factoring is a fintech/partner integration. This just confirms intent
    // and clears it next business day in the (demo) ledger — no money moves.
    await new Promise((r) => setTimeout(r, 600));
    setBusy(false);
    setDone(true);
  }

  return (
    <div className="rounded-2xl border border-accent/25 bg-gradient-to-br from-accent-soft/60 to-white p-5">
      <div className="flex items-center gap-2 text-[15px] font-extrabold text-ink">
        Get paid today
        <Badge tone="accent">Factoring</Badge>
      </div>
      <p className="mt-2 text-sm text-muted">
        Advance up to <b className="text-ink">{money(eligible)}</b> on this load instead of waiting
        net-30 from the broker.
      </p>
      {done ? (
        <p className="mt-3 rounded-xl bg-success-soft px-3.5 py-2.5 text-sm font-semibold text-success">
          {money(eligible)} advance requested — settles by next business day (demo).
        </p>
      ) : (
        <Button className="mt-3 w-full" onClick={advance} disabled={busy}>
          {busy ? 'Requesting…' : `Request ${money(eligible)} advance`}
        </Button>
      )}
      <p className="mt-3 text-xs leading-relaxed text-faint">
        Demo of the flow. Real factoring is a fintech/partner integration — no actual money is moved
        here. Fee and settlement rules would apply from the provider.
      </p>
    </div>
  );
}
