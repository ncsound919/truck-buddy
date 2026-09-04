import { opsConfigured, select } from '@/lib/ops/admin-client';
import { NotConfigured, Panel } from '@/components/ops/bits';

export const dynamic = 'force-dynamic';

const CHECKS = [
  {
    label: 'Cloudflare zone (truckbuddy.online)',
    hint: 'Zone added; nameservers point at desi/simon.ns.cloudflare.com. Propagation may take up to 24h.',
    ok: true,
  },
  {
    label: 'SSL / universal cert',
    hint: 'Cloudflare issues a free universal SSL cert for the zone once active.',
    ok: true,
  },
  {
    label: 'Analytics telemetry beacon',
    hint: 'Post a pageview to /api/ops/ingest from the marketing layout to start collecting real data.',
    ok: false,
  },
  {
    label: 'Sitemap.xml',
    hint: 'Add /sitemap.ts and /robots.ts in the Next app so crawlers discover marketing pages.',
    ok: false,
  },
  {
    label: 'Real Supabase keys wired',
    hint: 'Keys are seeded in KeyWire; set them in the app env (NEXT_PUBLIC_SUPABASE_URL + service key) to make the console live.',
    ok: false,
  },
];

export default async function OptimizationPage() {
  const configured = opsConfigured();
  const pages = configured ? await select<{ url: string }>('tb_seo_pages', 'url') : { data: null, error: null };
  const tracked = (pages.data ?? []).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-extrabold text-ink">Site optimization</h1>
        <p className="text-sm text-muted">Lever status for truckbuddy.online · honest checklist, not claims</p>
      </div>

      {!configured ? <NotConfigured /> : null}

      <Panel title="Status board">
        <ul className="space-y-3">
          {CHECKS.map((c) => (
            <li key={c.label} className="flex items-start gap-3 rounded-xl border border-line p-3">
              <span
                className={
                  'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-black text-white ' +
                  (c.ok ? 'bg-success' : 'bg-faint')
                }
              >
                {c.ok ? '✓' : '·'}
              </span>
              <div>
                <p className="text-sm font-bold text-ink">{c.label}</p>
                <p className="text-xs text-muted">{c.hint}</p>
              </div>
            </li>
          ))}
          <li className="flex items-start gap-3 rounded-xl border border-line p-3">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent text-[11px] font-black text-white">
              {tracked}
            </span>
            <div>
              <p className="text-sm font-bold text-ink">SEO pages tracked in Supabase</p>
              <p className="text-xs text-muted">tb_seo_pages rows — run a crawler to grow this.</p>
            </div>
          </li>
        </ul>
      </Panel>
    </div>
  );
}
