'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import { LoadStatusBadge } from '@/components/portal/primitives';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DocIcon, MapPinIcon, TruckIcon } from '@/components/icons';
import { vettingLabel, vettingSeam } from '@/lib/vetting';
import { coordDistanceMi } from '@/lib/geo';
import type { Load, VettingResult } from '@/lib/domain';
import { cn } from '@/lib/cn';

type SortKey = 'match' | 'payout' | 'miles' | 'rate';

const SORTS: { id: SortKey; label: string }[] = [
  { id: 'match', label: 'Best match' },
  { id: 'payout', label: 'Highest payout' },
  { id: 'miles', label: 'Shortest miles' },
  { id: 'rate', label: 'Best $/mi' },
];

export function LoadBoard({ open, sources }: { open: Load[]; sources: string[] }) {
  const [accepted, setAccepted] = useState<Load[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<string>('all');
  const [equipment, setEquipment] = useState<string>('all');
  const [sort, setSort] = useState<SortKey>('match');

  const equipments = useMemo(
    () => [...new Set(open.map((l) => l.equipment))].sort(),
    [open],
  );

  const base = open.filter((l) => !accepted.some((a) => a.id === l.id));
  const shown = useMemo(() => {
    let list = base;
    if (source !== 'all') list = list.filter((l) => l.source === source);
    if (equipment !== 'all') list = list.filter((l) => l.equipment === equipment);
    return sortLoads(list, sort);
  }, [base, source, equipment, sort]);

  async function accept(l: Load) {
    setBusyId(l.id);
    setError(null);
    try {
      const res = await fetch('/api/portal/loads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: l.id }),
      });
      if (!res.ok) throw new Error('accept_failed');
      const { load } = (await res.json()) as { load: Load };
      setAccepted((prev) => [load, ...prev]);
    } catch {
      setError('Could not accept that load right now. Try again.');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      {error ? (
        <div className="mb-4 rounded-xl border border-danger-soft bg-danger-soft px-4 py-3 text-sm font-semibold text-danger">
          {error}
        </div>
      ) : null}

      {/* Filters */}
      <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-line bg-white p-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="px-1 text-xs font-extrabold uppercase tracking-wide text-faint">Board</span>
          <Chip active={source === 'all'} onClick={() => setSource('all')}>
            All boards
          </Chip>
          {sources.map((s) => (
            <Chip key={s} active={source === s} onClick={() => setSource(s)}>
              {s}
            </Chip>
          ))}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3">
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-faint">
              Equipment
              <select
                value={equipment}
                onChange={(e) => setEquipment(e.target.value)}
                className="h-9 rounded-lg border border-line bg-white px-2 text-sm font-medium text-ink outline-none focus:border-accent"
              >
                <option value="all">All</option>
                {equipments.map((e) => <option key={e} value={e}>{e}</option>)}
              </select>
            </label>
          </div>
          <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-faint">
            Sort
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              className="h-9 rounded-lg border border-line bg-white px-2 text-sm font-medium text-ink outline-none focus:border-accent"
            >
              {SORTS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          </label>
        </div>
      </div>

      {/* Just accepted */}
      {accepted.length > 0 ? (
        <div className="mb-5">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-extrabold uppercase tracking-wide text-ink-2">
            Accepted · {accepted.length}
            <span className="normal-case text-faint">timestamped</span>
          </h3>
          <div className="grid gap-4 lg:grid-cols-2">
            {accepted.map((l) => (
              <AcceptedCard key={l.id} load={l} />
            ))}
          </div>
        </div>
      ) : null}

      {/* Open feed */}
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-extrabold uppercase tracking-wide text-ink-2">
          Open loads · {shown.length}
        </h3>
        <span className="text-xs text-faint">
          Aggregated from {sources.length} partner boards
        </span>
      </div>

      {shown.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line bg-bg-alt px-5 py-10 text-center text-sm text-muted">
          No loads match these filters. Clear a filter or check back shortly.
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {shown.map((l) => (
            <OpenRow key={l.id} load={l} onAccept={() => accept(l)} busy={busyId === l.id} />
          ))}
        </div>
      )}
    </div>
  );
}

function sortLoads(list: Load[], sort: SortKey): Load[] {
  const copy = [...list];
  if (sort === 'payout') return copy.sort((a, b) => b.payout - a.payout);
  if (sort === 'miles') return copy.sort((a, b) => a.distanceMi - b.distanceMi);
  if (sort === 'rate') return copy.sort((a, b) => b.payout / b.distanceMi - a.payout / a.distanceMi);
  return copy;
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'rounded-lg px-3 py-1.5 text-sm font-semibold transition',
        active ? 'bg-accent text-white' : 'text-ink-2 hover:bg-line/60',
      )}
    >
      {children}
    </button>
  );
}

function SourceTag({ source }: { source: string }) {
  return <span className="rounded bg-bg-alt px-1.5 py-0.5 text-[11px] font-semibold text-ink-2">{source}</span>;
}

function OpenRow({
  load: l,
  onAccept,
  busy,
}: {
  load: Load;
  onAccept?: () => void;
  busy?: boolean;
}) {
  const [vet, setVet] = useState<VettingResult | null>(null);
  const [confirm, setConfirm] = useState(false);
  const dist = coordDistanceMi(l.originCoords, l.destCoords) ?? l.distanceMi;
  const cpm = Math.round(l.payout / dist);

  useEffect(() => {
    let live = true;
    vettingSeam.check(l.shipper, 'shipper').then((r) => {
      if (live) setVet(r);
    });
    return () => {
      live = false;
    };
  }, [l.shipper, l.id]);

  const needsReview = vet ? vet.status !== 'verified' : false;

  return (
    <div className="flex flex-col rounded-2xl border border-line bg-white p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-extrabold text-ink">{l.ref}</span>
            <SourceTag source={l.source} />
          </div>
          <div className="mt-1 flex items-center gap-2">
            <p className="text-sm text-muted">{l.shipper}</p>
            {vet ? <VetBadge vet={vet} /> : <span className="text-xs text-faint">vetting…</span>}
          </div>
        </div>
        <div className="text-right">
          <div className="text-xl font-black text-ink">${l.payout.toLocaleString()}</div>
          <div className="text-xs text-faint">{dist} mi · ${cpm}/mi</div>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2 text-sm">
        <span className="flex items-center gap-1.5 font-semibold text-ink">
          <MapPinIcon className="text-accent" width={16} height={16} /> {l.origin}
        </span>
        <span className="mx-1 flex-1 border-t border-dashed border-line" />
        <span className="flex items-center gap-1.5 text-right font-semibold text-ink">
          {l.destination} <TruckIcon className="text-accent" width={16} height={16} />
        </span>
      </div>

      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-[13px] text-muted">
        <span>Pickup: <b className="text-ink">{l.pickupAt}</b></span>
        <span>Deliver: <b className="text-ink">{l.deliverBy}</b></span>
        <span>{l.weightLb.toLocaleString()} lb · {l.equipment}</span>
      </div>

      {vet && needsReview && !confirm ? (
        <div className="mt-3 rounded-xl border border-warning-soft bg-warning-soft/50 px-3.5 py-2.5">
          {vet.reasons.map((r) => (
            <p key={r} className="text-[13px] font-medium text-warning">{r}</p>
          ))}
          <Button variant="danger" size="sm" className="mt-2 w-full" onClick={() => setConfirm(true)}>
            Review &amp; accept anyway
          </Button>
        </div>
      ) : null}

      {onAccept ? (
        <Button
          className="mt-4 w-full"
          disabled={busy || vet === null || (needsReview && !confirm)}
          onClick={onAccept}
        >
          {busy
            ? 'Accepting…'
            : vet === null
              ? 'Checking payer…'
              : needsReview && !confirm
                ? 'Review payer above'
                : `Accept · $${l.payout.toLocaleString()}`}
        </Button>
      ) : null}
    </div>
  );
}

function VetBadge({ vet }: { vet: VettingResult }) {
  const tone: 'success' | 'warning' | 'danger' =
    vet.status === 'verified' ? 'success' : vet.status === 'warning' ? 'warning' : 'danger';
  return (
    <Badge tone={tone} dot className="normal-case tracking-normal">
      {vettingLabel(vet.status)}
    </Badge>
  );
}

function AcceptedCard({ load: l }: { load: Load }) {
  const dist = coordDistanceMi(l.originCoords, l.destCoords) ?? l.distanceMi;
  return (
    <div className="flex flex-col rounded-2xl border border-success-soft bg-success-soft/30 p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-success text-[11px] font-black text-white">✓</span>
          <span className="font-mono text-sm font-extrabold text-ink">{l.ref}</span>
          <LoadStatusBadge status="accepted" />
        </div>
        <div className="text-right text-sm font-black text-success">${l.payout.toLocaleString()}</div>
      </div>
      <p className="mt-1 text-sm text-muted">
        {l.origin} → {l.destination} · {dist} mi
      </p>
      {l.acceptedAt ? (
        <p className="mt-1 text-xs font-semibold text-success">
          Accepted {formatTs(l.acceptedAt)} — timestamped proof of acceptance
        </p>
      ) : null}
      <div className="mt-3 flex items-center justify-between gap-2 border-t border-success-soft/70 pt-3">
        <span className="text-xs text-ink-2">Now add your paperwork.</span>
        <Link
          href="/portal/documents"
          className="inline-flex items-center gap-1.5 rounded-lg bg-success px-3 py-1.5 text-xs font-bold text-white transition hover:opacity-90"
        >
          <DocIcon width={14} height={14} /> Add documents
        </Link>
      </div>
    </div>
  );
}

function formatTs(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', second: '2-digit' });
}
