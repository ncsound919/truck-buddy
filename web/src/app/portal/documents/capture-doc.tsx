'use client';

import { useState } from 'react';

import { DocKindLabel } from '@/components/portal/primitives';
import { Button } from '@/components/ui/button';
import { ScanIcon } from '@/components/icons';
import type { DocKind, TruckDoc } from '@/lib/domain';

const KINDS: DocKind[] = ['BOL', 'Invoice', 'DeliveryReceipt'];

export function CaptureDoc({ loadRefs }: { loadRefs: string[] }) {
  const [kind, setKind] = useState<DocKind>('DeliveryReceipt');
  const [loadRef, setLoadRef] = useState(loadRefs[0] ?? '');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<TruckDoc | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function capture() {
    setBusy(true);
    setError(null);
    setDone(null);
    try {
      const res = await fetch('/api/portal/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind, loadRef }),
      });
      if (!res.ok) throw new Error('capture_failed');
      const { document } = (await res.json()) as { document: TruckDoc };
      setDone(document);
    } catch {
      setError('Capture failed. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border border-dashed border-accent/40 bg-accent-soft/40 p-5">
      <div className="mb-4 flex items-center gap-2.5 text-[15px] font-extrabold text-ink">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent text-white">
          <ScanIcon width={18} height={18} />
        </span>
        Capture a new document
      </div>
      <p className="mb-4 text-sm text-muted">
        In the app, point at the paper and OCR reads it. From the portal, drop the file in and we file it against the load.
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-ink-2">Type</span>
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value as DocKind)}
            className="h-11 w-full rounded-xl border border-line bg-white px-3 text-sm font-medium text-ink outline-none focus:border-accent"
          >
            {KINDS.map((k) => (
              <option key={k} value={k}>{DocKindLabel({ kind: k })}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-ink-2">Load</span>
          <select
            value={loadRef}
            onChange={(e) => setLoadRef(e.target.value)}
            className="h-11 w-full rounded-xl border border-line bg-white px-3 text-sm font-medium text-ink outline-none focus:border-accent"
          >
            {loadRefs.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <Button onClick={capture} disabled={busy}>
          {busy ? 'Capturing…' : 'Capture document'}
        </Button>
        <span className="rounded-full border border-dashed border-line px-3 py-1 text-xs font-semibold text-faint">
          Or scan in the app
        </span>
      </div>

      {error ? <p className="mt-3 text-sm font-semibold text-danger">{error}</p> : null}
      {done ? (
        <div className="mt-4 rounded-xl border border-success-soft bg-success-soft px-4 py-3 text-sm font-semibold text-success">
          Captured {DocKindLabel({ kind: done.kind })} {done.bolNumber} · pending verification
        </div>
      ) : null}
    </div>
  );
}
