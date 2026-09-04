import Link from 'next/link';

import { PageTitle, SectionCard } from '@/components/portal/primitives';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/feedback';
import { CheckIcon, DocIcon, ScanIcon } from '@/components/icons';
import { portalApi } from '@/lib/mock-api';
import type { DocKind } from '@/lib/domain';
import { cn } from '@/lib/cn';

const DESK: { key: string; kind: DocKind; label: string; needed: string }[] = [
  { key: 'bol', kind: 'BOL', label: 'Bill of lading', needed: 'Required at pickup' },
  { key: 'ratecon', kind: 'Invoice', label: 'Rate confirmation', needed: 'Proof of agreed rate' },
  { key: 'pod', kind: 'DeliveryReceipt', label: 'Delivery receipt (POD)', needed: 'Proof of delivery' },
  { key: 'invoice', kind: 'Invoice', label: 'Invoice / settlement', needed: 'Needed to get paid' },
];

export const dynamic = 'force-dynamic';

export default async function PaperworkPage() {
  const [loads, docs] = await Promise.all([portalApi.getLoads(), portalApi.getDocuments()]);
  const active = loads.filter((l) => l.status !== 'delivered');

  const have = (loadRef: string, kind: DocKind) =>
    docs.some((d) => d.loadRef === loadRef && d.kind === kind);

  const countFor = (loadRef: string) =>
    DESK.filter((d) => have(loadRef, d.kind)).length;

  return (
    <div>
      <PageTitle
        title="Paperwork desk"
        subtitle="Every document each load needs, tracked and capture-ready."
      />

      {active.length === 0 ? (
        <EmptyState
          icon={<DocIcon width={22} height={22} />}
          title="No active loads yet"
          body="Accept a load from the load board and its paperwork desk will appear here."
          action={
            <Link
              href="/portal/loads"
              className="mt-1 inline-flex h-10 items-center justify-center rounded-xl bg-accent px-4 text-sm font-bold text-white transition hover:bg-accent-600"
            >
              Browse loads
            </Link>
          }
        />
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          {active.map((load) => {
            const total = DESK.length;
            const done = countFor(load.ref);
            const complete = done === total;
            return (
              <SectionCard key={load.id} title={load.ref}>
                <div className="mb-3 flex items-center justify-between gap-3">
                  <p className="truncate text-sm text-muted">
                    {load.origin} → {load.destination}
                  </p>
                  <Badge tone={complete ? 'success' : 'warning'}>
                    {done}/{total} filed
                  </Badge>
                </div>

                {complete ? (
                  <div className="mb-3 flex items-center gap-2 rounded-xl border border-success-soft bg-success-soft/50 px-3.5 py-2.5 text-sm font-bold text-success">
                    <CheckIcon width={18} height={18} /> This load&rsquo;s paperwork is complete.
                  </div>
                ) : null}

                <ul className="space-y-2">
                  {DESK.map((item) => {
                    const present = have(load.ref, item.kind);
                    return (
                      <li
                        key={item.key}
                        className={cn(
                          'flex items-center justify-between gap-3 rounded-xl border px-3.5 py-2.5',
                          present ? 'border-line bg-bg-alt/40' : 'border-dashed border-line bg-white',
                        )}
                      >
                        <div className="flex items-center gap-2.5">
                          <span
                            className={cn(
                              'flex h-7 w-7 items-center justify-center rounded-lg',
                              present ? 'bg-success-soft text-success' : 'bg-bg-alt text-faint',
                            )}
                          >
                            {present ? <CheckIcon width={15} height={15} /> : <DocIcon width={15} height={15} />}
                          </span>
                          <div>
                            <div className="text-sm font-bold text-ink">{item.label}</div>
                            <div className="text-xs text-faint">{item.needed}</div>
                          </div>
                        </div>
                        <DocKindLabelSpan present={present} />
                      </li>
                    );
                  })}
                </ul>

                {!complete ? (
                  <Link
                    href="/portal/documents"
                    className="mt-3 flex items-center justify-center gap-2 rounded-xl bg-accent py-2.5 text-sm font-extrabold text-white transition hover:bg-accent-600"
                  >
                    <ScanIcon width={16} height={16} /> Capture for {load.ref}
                  </Link>
                ) : null}
              </SectionCard>
            );
          })}
        </div>
      )}
    </div>
  );
}

function DocKindLabelSpan({ present }: { present: boolean }) {
  return present ? (
    <span className="rounded-full bg-success-soft px-2.5 py-1 text-xs font-bold text-success">Filed</span>
  ) : (
    <span className="rounded-full bg-warning-soft px-2.5 py-1 text-xs font-bold text-warning">Missing</span>
  );
}
