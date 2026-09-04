import { opsConfigured, select } from '@/lib/ops/admin-client';
import type { SeoPage } from '@/lib/ops/admin-client';
import { Kpi, NotConfigured, Panel } from '@/components/ops/bits';

export const dynamic = 'force-dynamic';

function badgeFor(p: SeoPage) {
  const ok = p.title && p.meta_description && p.crawlable !== false;
  return ok ? 'success' : 'warning';
}

export default async function SeoPageRoute() {
  const configured = opsConfigured();
  const res = configured ? await select<SeoPage>('tb_seo_pages', '*', { order: { col: 'checked_at', ascending: false }, limit: 100 }) : { data: [], error: null };
  const pages = (res.data ?? []) as SeoPage[];
  const error = res.error;
  const okCount = pages.filter((p) => p.title && p.meta_description && p.crawlable !== false).length;
  const avg = pages.length ? Math.round((pages.reduce((a, p) => a + (p.word_count ?? 0), 0)) / pages.length) : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-extrabold text-ink">SEO</h1>
        <p className="text-sm text-muted">On-page audit snapshots · populate via a crawler into tb_seo_pages</p>
      </div>

      {!configured ? <NotConfigured /> : null}

      <div className="grid gap-4 sm:grid-cols-3">
        <Kpi label="Pages tracked" value={pages.length} />
        <Kpi label="Healthy pages" value={okCount} hint="title + description present, crawlable" />
        <Kpi label="Avg words / page" value={avg} />
      </div>

      <Panel title="Pages">
        {error ? <p className="text-sm font-semibold text-danger">Failed to load: {error}</p> : null}
        {!configured ? (
          <p className="text-sm text-faint">Pages will appear once the data layer is configured and a crawl runs.</p>
        ) : pages.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-line text-xs uppercase tracking-wide text-faint">
                  <th className="py-2 pr-3 font-extrabold">URL</th>
                  <th className="py-2 pr-3 font-extrabold">Title</th>
                  <th className="py-2 pr-3 font-extrabold">Words</th>
                  <th className="py-2 pr-3 font-extrabold">Status</th>
                  <th className="py-2 font-extrabold">Health</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {pages.map((p) => (
                  <tr key={p.id}>
                    <td className="max-w-[220px] truncate py-2.5 pr-3 font-mono text-xs text-accent">{p.url}</td>
                    <td className="max-w-[260px] truncate py-2.5 pr-3 font-semibold text-ink">{p.title ?? '—'}</td>
                    <td className="py-2.5 pr-3 text-muted">{p.word_count ?? '—'}</td>
                    <td className="py-2.5 pr-3 text-muted">{p.status_code ?? '—'}</td>
                    <td className="py-2.5">
                      <span
                        className={
                          'rounded-full px-2.5 py-0.5 text-xs font-bold ' +
                          (badgeFor(p) === 'success' ? 'bg-success-soft text-success' : 'bg-warning-soft text-warning')
                        }
                      >
                        {badgeFor(p) === 'success' ? 'Good' : 'Needs work'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-faint">No pages yet — run a crawl to seed this table.</p>
        )}
      </Panel>
    </div>
  );
}
