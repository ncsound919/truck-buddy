import { DocKindLabel, DocStatusBadge, PageTitle } from '@/components/portal/primitives';
import { Button } from '@/components/ui/button';
import { DownloadIcon } from '@/components/icons';
import { portalApi } from '@/lib/mock-api';
import { CaptureDoc } from './capture-doc';
import { RealOcrScan } from './real-ocr';

export const dynamic = 'force-dynamic';

export default async function DocumentsPage() {
  const [docs, loads] = await Promise.all([portalApi.getDocuments(), portalApi.getLoads()]);
  const loadRefs = loads.map((l) => l.ref);

  return (
    <div>
      <PageTitle
        title="Documents"
        subtitle="Every bill, receipt, and invoice, reconciled against your loads."
      />

      <div className="mb-6 space-y-4">
        <RealOcrScan loadRefs={loadRefs} />
        <CaptureDoc loadRefs={loadRefs} />
      </div>

      <div className="overflow-hidden rounded-2xl border border-line bg-white">
        <div className="hidden grid-cols-12 gap-3 border-b border-line bg-bg-alt px-5 py-3 text-xs font-extrabold uppercase tracking-wide text-faint sm:grid">
          <div className="col-span-4">Document</div>
          <div className="col-span-2">Kind</div>
          <div className="col-span-2">Load</div>
          <div className="col-span-2">Weight / Value</div>
          <div className="col-span-2 text-right">Status</div>
        </div>
        <ul className="divide-y divide-line">
          {docs.map((d) => (
            <li key={d.id} className="grid grid-cols-2 items-center gap-3 px-5 py-4 sm:grid-cols-12">
              <div className="col-span-2 sm:col-span-4">
                <div className="text-sm font-extrabold text-ink">{d.bolNumber}</div>
                <div className="truncate text-xs text-faint">{d.shipper} → {d.consignee}</div>
              </div>
              <div className="col-span-1 text-sm font-semibold text-ink-2 sm:col-span-2">
                {DocKindLabel({ kind: d.kind })}
              </div>
              <div className="col-span-1 font-mono text-sm text-ink-2 sm:col-span-2">{d.loadRef}</div>
              <div className="col-span-1 text-sm text-muted sm:col-span-2">
                {d.weightLb > 0 ? `${d.weightLb.toLocaleString()} lb` : d.amount > 0 ? `$${d.amount.toLocaleString()}` : '—'}
              </div>
              <div className="col-span-1 flex items-center justify-end gap-2 sm:col-span-2">
                <DocStatusBadge status={d.status} />
                {d.status === 'verified' && d.fileName ? (
                  <Button variant="ghost" size="sm" title={d.fileName}>
                    <DownloadIcon width={16} height={16} />
                    <span className="hidden lg:inline">PDF</span>
                  </Button>
                ) : null}
              </div>
            </li>
          ))}
          {docs.length === 0 ? (
            <li className="px-5 py-10 text-center text-sm text-muted">No documents yet.</li>
          ) : null}
        </ul>
      </div>
    </div>
  );
}
