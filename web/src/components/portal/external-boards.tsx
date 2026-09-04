import { EXTERNAL_BOARDS } from '@/lib/boards';
import { Badge } from '@/components/ui/badge';
import { ArrowRightIcon, ExternalIcon, TruckIcon } from '@/components/icons';

export function ExternalBoards() {
  return (
    <section className="mb-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-[15px] font-extrabold text-ink">Also search the genuinely-free load boards</h2>
          <p className="mt-1 max-w-2xl text-sm text-muted">
            These boards are free to search and book. Open one and run it from here — your live loads
            live on the provider&rsquo;s board. (Login may be required to see rates.)
          </p>
        </div>
        <Badge tone="success">Free to use</Badge>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {EXTERNAL_BOARDS.map((b) => (
          <a
            key={b.id}
            href={b.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex flex-col rounded-2xl border border-line bg-white p-5 transition hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-[0_16px_40px_-26px_rgba(11,22,38,0.5)]"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-soft text-accent">
                  <TruckIcon width={18} height={18} />
                </span>
                <span className="text-[15px] font-extrabold text-ink">{b.name}</span>
              </div>
              <span className="rounded-md bg-bg-alt px-2 py-1 text-[11px] font-bold text-success">{b.cost}</span>
            </div>
            <p className="mt-3 flex-1 text-sm text-muted">{b.blurb}</p>
            <p className="mt-2 text-xs text-faint">Best for: {b.bestFor}</p>
            <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-accent group-hover:underline">
              Search loads
              {b.needsLogin ? <ExternalIcon width={14} height={14} /> : <ArrowRightIcon width={15} height={15} />}
            </span>
          </a>
        ))}
      </div>
    </section>
  );
}
