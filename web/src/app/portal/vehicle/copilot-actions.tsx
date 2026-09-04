'use client';

import { useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BellIcon } from '@/components/icons';

/**
 * Copilot action surface. Only actions we can genuinely perform today are real
 * buttons (notify dispatch via the shared store; open a call/sms). Booking a
 * shop or calling a broker needs provider/telephony integrations — not faked.
 */
export function CopilotActions({ topRisk }: { topRisk: string }) {
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  async function alertDispatch() {
    setBusy(true);
    try {
      await fetch('/api/portal/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: `Maintenance flag: ${topRisk}. Please note for this truck.` }),
      });
      setSent(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-4 rounded-xl border border-accent/20 bg-accent-soft/40 p-3.5">
      <div className="mb-2 flex items-center gap-2 text-sm font-extrabold text-ink">
        <BellIcon width={16} height={16} className="text-accent" />
        Copilot
      </div>
      {sent ? (
        <p className="rounded-lg bg-success-soft px-3 py-2 text-sm font-semibold text-success">
          Dispatch notified about &ldquo;{topRisk}&rdquo;.
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={alertDispatch} disabled={busy}>
            {busy ? 'Sending…' : 'Alert dispatch'}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => (window.location.href = `/assistant?q=${encodeURIComponent(topRisk)}`)}
          >
            Decode in Roadside Mechanic
          </Button>
        </div>
      )}
      <Badge tone="neutral" className="mt-2">Real actions only · booking needs provider integrations</Badge>
    </div>
  );
}
