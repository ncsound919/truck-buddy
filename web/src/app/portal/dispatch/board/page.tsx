export const dynamic = 'force-dynamic';

import { PageTitle } from '@/components/portal/primitives';

/**
 * Ops board: the AetherRoute dispatcher (Vite SPA) embedded into the Truck
 * Buddy portal. Standing up the AetherRoute server separately and embedding
 * it keeps one data shape: the same shared Supabase tables feed both.
 *
 * Configure via NEXT_PUBLIC_AETHERROUTE_URL (no trailing slash). When unset
 * the page tells you how to run local.
 */
export default async function OpsBoardPage() {
  const url = process.env.NEXT_PUBLIC_AETHERROUTE_URL;
  return (
    <div>
      <PageTitle title="Ops board" subtitle="AetherRoute dispatcher, embedded in this portal." />
      {url ? (
        <iframe
          title="AetherRoute operations"
          src={url}
          className="h-[calc(100vh-180px)] w-full rounded-xl border border-line"
          allow="clipboard-read; clipboard-write; geolocation"
        />
      ) : (
        <div className="rounded-xl border border-line bg-surface p-6 text-sm text-muted">
          <p className="font-semibold text-ink">AetherRoute URL is not configured.</p>
          <p className="mt-2">
            Run the AetherRoute server (<code className="rounded bg-bg-alt px-1 py-0.5">bun dev</code> in
            <code className="mx-1 rounded bg-bg-alt px-1 py-0.5">AetherRoute-Logistics-main</code>), then set
            <code className="mx-1 rounded bg-bg-alt px-1 py-0.5">NEXT_PUBLIC_AETHERROUTE_URL=http://localhost:3000</code>
            on the portal and reload.
          </p>
        </div>
      )}
    </div>
  );
}
