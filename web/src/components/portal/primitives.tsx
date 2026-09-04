import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import type { DocStatus, Load, LoadStatus, TruckHealth, TruckDoc } from '@/lib/domain';
import { cn } from '@/lib/cn';
import { HealthIcon, MapPinIcon, TruckIcon } from '@/components/icons';

export function PageTitle({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-ink">{title}</h1>
        {subtitle ? <p className="mt-1 text-sm text-muted">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

export function SectionCard({
  title,
  action,
  className,
  children,
}: {
  title?: string;
  action?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Card className={cn('p-5', className)}>
      {title ? (
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-[15px] font-extrabold text-ink">{title}</h2>
          {action}
        </div>
      ) : null}
      {children}
    </Card>
  );
}

const LOAD_STATUS: Record<LoadStatus, { label: string; tone: 'accent' | 'success' | 'warning' | 'danger' | 'neutral' | 'dark' }> = {
  open: { label: 'Open', tone: 'accent' },
  accepted: { label: 'Accepted', tone: 'warning' },
  in_progress: { label: 'In progress', tone: 'accent' },
  delivered: { label: 'Delivered', tone: 'success' },
};

export function LoadStatusBadge({ status }: { status: LoadStatus }) {
  const s = LOAD_STATUS[status];
  return <Badge tone={s.tone} dot>{s.label}</Badge>;
}

const DOC_TONE: Record<DocStatus, { label: string; tone: 'success' | 'warning' | 'danger' }> = {
  verified: { label: 'Verified', tone: 'success' },
  pending: { label: 'Pending', tone: 'warning' },
  error: { label: 'Review', tone: 'danger' },
};

export function DocStatusBadge({ status }: { status: DocStatus }) {
  const s = DOC_TONE[status];
  return <Badge tone={s.tone} dot>{s.label}</Badge>;
}

export function DocKindLabel({ kind }: { kind: TruckDoc['kind'] }) {
  const map: Record<TruckDoc['kind'], string> = {
    BOL: 'Bill of lading',
    Invoice: 'Invoice',
    DeliveryReceipt: 'Delivery receipt',
  };
  return map[kind];
}

export function LoadCard({ load }: { load: Load }) {
  return (
    <div className="rounded-2xl border border-line bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="font-mono text-sm font-extrabold text-ink">{load.ref}</span>
            <LoadStatusBadge status={load.status} />
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
            <span>{load.shipper}</span>
            <span className="text-faint">via {load.source}</span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-black text-ink">${load.payout.toLocaleString()}</div>
          <div className="text-xs text-faint">{load.distanceMi} mi</div>
        </div>
      </div>
      <div className="mt-4 flex items-center gap-3 rounded-xl bg-bg-alt px-4 py-3">
        <div className="flex items-center gap-2 text-[15px] font-semibold text-ink">
          <MapPinIcon className="text-accent" width={18} height={18} />
          {load.origin}
        </div>
        <div className="mx-1 h-px flex-1 border-t border-dashed border-line" />
        <div className="flex items-center gap-2 text-[15px] font-semibold text-ink">
          {load.destination}
          <TruckIcon className="text-accent" width={18} height={18} />
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
        <div><div className="text-xs text-faint">Pickup</div><div className="font-semibold text-ink">{load.pickupAt}</div></div>
        <div><div className="text-xs text-faint">Deliver by</div><div className="font-semibold text-ink">{load.deliverBy}</div></div>
        <div><div className="text-xs text-faint">Equipment</div><div className="font-semibold text-ink">{load.equipment}</div></div>
      </div>
      {load.acceptedAt ? (
        <div className="mt-3 flex items-center gap-2 rounded-xl border border-success-soft bg-success-soft/40 px-3 py-2 text-xs font-semibold text-success">
          <ClockIcon width={14} height={14} />
          Accepted {formatTs(load.acceptedAt)} · timestamped for your records
        </div>
      ) : null}
    </div>
  );
}

function formatTs(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function ClockIcon(p: { width: number; height: number }) {
  return (
    <svg width={p.width} height={p.height} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

export function HealthPanel({ health }: { health: TruckHealth }) {
  const rows: { label: string; value: string }[] = [
    { label: 'Coolant', value: `${health.metrics.coolantTempF}°F` },
    { label: 'Battery', value: `${health.metrics.batteryVoltage}V` },
    { label: 'Fuel', value: `${health.metrics.fuelPct}%` },
    { label: 'RPM', value: String(health.metrics.rpm) },
  ];
  const ok = health.faultCodes.length === 0;
  return (
    <div>
      <div className="mb-3 flex items-center gap-2 rounded-xl border border-success-soft bg-success-soft/50 px-3 py-2 text-sm font-bold text-success">
        <HealthIcon width={18} height={18} />
        {ok ? 'Truck health nominal' : `${health.faultCodes.length} fault code(s)`}
      </div>
      <div className="grid grid-cols-2 gap-2.5">
        {rows.map(({ label, value }) => (
          <div key={label} className="rounded-xl border border-line px-3 py-2">
            <div className="text-[11px] uppercase tracking-wide text-faint">{label}</div>
            <div className="text-base font-extrabold text-ink">{value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
