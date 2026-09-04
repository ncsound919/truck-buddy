'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowRightIcon, ShieldIcon } from '@/components/icons';
import type { ContractLead, ContractReceipt, PacketDraft } from '@/lib/domain';
import { cn } from '@/lib/cn';

export interface PacketEntry {
  lead: ContractLead;
  draft: PacketDraft;
}

export function PacketComposer({ entries, receipts }: { entries: PacketEntry[]; receipts: ContractReceipt[] }) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState(entries[0]?.lead.id ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<{ ok: boolean; text: string } | null>(null);

  const entry = entries.find((e) => e.lead.id === selectedId) ?? entries[0];
  if (!entry) return null;
  const { lead, draft } = entry;
  const sentReceipt = receipts.find((r) => r.leadId === lead.id);

  async function send() {
    setBusy(true);
    setError(null);
    setFlash(null);
    try {
      const res = await fetch('/api/portal/contracts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'send_packet', leadId: lead.id }),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? 'send_failed');
      }
      const data = (await res.json()) as { receipt: ContractReceipt };
      setFlash({ ok: true, text: 'Packet sent — ' + data.receipt.deliveredTo });
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Send failed. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border border-line bg-white p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 text-[15px] font-extrabold text-ink">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent text-white">
            <ShieldIcon width={18} height={18} />
          </span>
          Carrier packet
        </div>
        <div className="flex gap-2">
          {entries.map((e) => (
            <button
              key={e.lead.id}
              onClick={() => setSelectedId(e.lead.id)}
              className={cn(
                'rounded-full px-3 py-1.5 text-xs font-bold transition',
                e.lead.id === entry.lead.id
                  ? 'bg-accent text-white'
                  : 'border border-line bg-white text-ink-2 hover:bg-bg-alt',
              )}
            >
              {e.lead.company}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-sm text-muted">
          Files {lead.company} asks for before they&rsquo;ll book you.
        </p>
        <Badge tone={draft.complete ? 'success' : 'warning'}>
          {draft.items.filter((i) => i.onFile).length}/{draft.items.length} ready
        </Badge>
      </div>

      <ul className="space-y-2">
        {draft.items.map((item) => (
          <li
            key={item.key}
            className={cn(
              'flex items-center justify-between gap-3 rounded-xl border px-3.5 py-2.5',
              item.onFile ? 'border-line bg-bg-alt/40' : 'border-dashed border-line bg-white',
            )}
          >
            <div className="flex items-center gap-2.5">
              <span
                className={cn(
                  'flex h-7 w-7 items-center justify-center rounded-lg',
                  item.onFile ? 'bg-success-soft text-success' : 'bg-warning-soft text-warning',
                )}
              >
                {item.onFile ? '✓' : '!'}
              </span>
              <div>
                <div className="text-sm font-bold text-ink">{item.label}</div>
                <div className="text-xs text-faint">
                  {item.onFile
                    ? item.fromDossier
                      ? 'From your compliance docs on file'
                      : 'On file'
                    : 'Not on file'}
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>

      {!draft.complete ? (
        <div className="mt-3 rounded-xl border border-warning-soft bg-warning-soft/50 px-3.5 py-2.5">
          <p className="text-[13px] font-semibold text-warning">
            {lead.packetRequiresAdditionalInsured
              ? `${lead.company} requires a COI endorsement naming them as additional insured. Get an updated COI from your insurer first.`
              : 'Get the missing files on file before you send this packet.'}
          </p>
          <Link
            href="/portal/compliance"
            className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-warning px-3 py-1.5 text-xs font-bold text-white transition hover:opacity-90"
          >
            Open compliance <ArrowRightIcon width={14} height={14} />
          </Link>
        </div>
      ) : null}

      {error ? <p className="mt-3 text-sm font-semibold text-danger">{error}</p> : null}
      {flash && flash.ok ? (
        <p className="mt-3 rounded-xl border border-success-soft bg-success-soft px-3.5 py-2.5 text-sm font-semibold text-success">
          {flash.text}
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button onClick={send} disabled={busy || !draft.complete || lead.vet.status !== 'verified' || lead.stage === 'packet_sent'}>
          {busy
            ? 'Sending…'
            : lead.stage === 'packet_sent'
              ? 'Packet already sent'
              : 'Send packet'}
        </Button>
        {sentReceipt ? (
          <span className="rounded-full border border-dashed border-line px-3 py-1 text-xs font-semibold text-faint">
            Queued to the demo outbox — nothing was emailed
          </span>
        ) : null}
      </div>

      <p className="mt-3 text-[11px] leading-relaxed text-faint">
        Packet delivery is demo-only: no email is sent from this portal yet. Real delivery
        routes through the Supabase Edge Function + Resend when it is deployed.
      </p>
    </div>
  );
}
