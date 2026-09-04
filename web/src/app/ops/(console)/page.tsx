import { analyticsSummary, opsConfigured, select } from '@/lib/ops/admin-client';
import { Kpi, NotConfigured, Panel } from '@/components/ops/bits';

export const dynamic = 'force-dynamic';

export default async function AnalyticsPage() {
  const configured = opsConfigured();
  const summary = await analyticsSummary(7);
  const recent = configured ? await select<{ path: string; browser: string | null; device: string | null; happened_at: string }>('tb_pageviews', 'path,browser,device,happened_at', { order: { col: 'happened_at', ascending: false }, limit: 12 }) : { data: [], error: null };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-extrabold text-ink">Analytics</h1>
        <p className="text-sm text-muted">truckbuddy.online traffic, events & telemetry · last 7 days</p>
      </div>

      {!configured ? <NotConfigured /> : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Page views" value={summary.totalPageviews.toLocaleString()} hint="non-bot" />
        <Kpi label="Unique sessions" value={summary.uniqueSessions.toLocaleString()} />
        <Kpi label="Tracked events" value={summary.totalEvents.toLocaleString()} />
        <Kpi label="Bot traffic" value={`${summary.botPct}%`} hint="filtered from page views" />
      </div>

      {summary.daily.length ? (
        <Panel title="Daily page views">
          <div className="flex h-40 items-end gap-1.5">
            {summary.daily.map((d) => {
              const max = Math.max(...summary.daily.map((x) => x.count), 1);
              const h = Math.round((d.count / max) * 100);
              return (
                <div key={d.day} className="flex flex-1 flex-col items-center gap-1">
                  <span className="text-[10px] font-bold text-ink-2">{d.count}</span>
                  <div className="w-full rounded-t bg-accent/80" style={{ height: `${Math.max(h, 2)}%` }} />
                  <span className="text-[10px] text-faint">{d.day.slice(5)}</span>
                </div>
              );
            })}
          </div>
        </Panel>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Top paths">
          {summary.topPaths.length ? (
            <ul className="space-y-2">
              {summary.topPaths.map((p) => (
                <li key={p.path} className="flex items-center justify-between gap-3 text-sm">
                  <span className="truncate font-semibold text-ink">{p.path}</span>
                  <span className="rounded-full bg-accent-soft px-2 py-0.5 text-xs font-bold text-accent-600">{p.count}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-faint">No page views recorded yet.</p>
          )}
        </Panel>

        <Panel title="Recent page views">
          {recent.data?.length ? (
            <ul className="space-y-2.5">
              {recent.data.map((r, i) => (
                <li key={i} className="flex items-center justify-between gap-3 text-sm">
                  <span className="truncate font-semibold text-ink">{r.path}</span>
                  <span className="shrink-0 text-xs text-faint">
                    {r.device ?? '—'} · {r.browser ?? '—'} · {new Date(r.happened_at).toLocaleString()}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-faint">Nothing yet — add the telemetry beacon to the site.</p>
          )}
        </Panel>
      </div>
    </div>
  );
}
