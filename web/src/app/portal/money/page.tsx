import { PageTitle, SectionCard } from '@/components/portal/primitives';
import { Badge } from '@/components/ui/badge';
import { Stat } from '@/components/ui/card';
import { CheckIcon, ExternalIcon } from '@/components/icons';
import { portalApi } from '@/lib/mock-api';
import { canFactor } from '@/lib/perspective';
import { FactoringPanel } from './factoring';
import { BillingSection } from './billing';

export const dynamic = 'force-dynamic';

export default async function MoneyPage() {
  const [today, loads, profile] = await Promise.all([
    portalApi.getToday(),
    portalApi.getLoads(),
    portalApi.getOperatingProfile(),
  ]);
  const factoring = canFactor(profile);
  const e = today.earnings;
  const active = loads.filter((l) => l.status !== 'delivered');
  const deliveredTotal = loads
    .filter((l) => l.status === 'delivered')
    .reduce((s, l) => s + l.payout, 0);

  return (
    <div>
      <PageTitle
        title="Payments"
        subtitle="What you've earned, what's owed, and getting paid faster."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Week gross" value={`$${e.weekGross.toLocaleString()}`} hint="4 loads" />
        <Stat label="Week miles" value={e.weekMiles.toLocaleString()} hint={`On $${e.ratePerMile.toFixed(2)}/mi avg`} />
        <Stat label="Pending settlement" value={`$${active.reduce((s, l) => s + l.payout, 0).toLocaleString()}`} hint={`${active.length} load(s) in progress`} />
        <Stat label="Delivered & billable" value={`$${deliveredTotal.toLocaleString()}`} hint="Ready to invoice" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <SectionCard title="Settlements">
            <div className="mb-3 rounded-xl border border-success-soft bg-success-soft/40 px-3.5 py-2 text-sm">
              <b className="text-ink">This load:</b> {today.load ? `${today.load.ref} · ` : ''}
              <span className="font-bold text-success">${e.thisLoadPayout.toLocaleString()}</span> settles
              on delivery POD verification.
            </div>
            {loads.length === 0 ? (
              <p className="text-sm text-muted">No loads yet.</p>
            ) : (
              <ul className="space-y-2.5">
                {loads.map((l) => (
                  <li key={l.id} className="flex items-center justify-between gap-3 rounded-xl border border-line px-3.5 py-2.5">
                    <div>
                      <div className="font-mono text-sm font-extrabold text-ink">{l.ref}</div>
                      <div className="text-xs text-faint">{l.origin} → {l.destination}</div>
                    </div>
                    <div className="flex items-center gap-2.5 text-right">
                      <div>
                        <div className="text-sm font-black text-ink">${l.payout.toLocaleString()}</div>
                        <div className="flex items-center justify-end gap-1 text-xs text-faint">
                          <CheckIcon width={12} height={12} className="text-success" />
                          {l.acceptedAt ? 'Accepted · docs pending' : l.status}
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
          
          <BillingSection />
        </div>

        <div className="space-y-6">
          {factoring ? (
            <FactoringPanel thisLoad={e.thisLoadPayout} deliveredTotal={deliveredTotal} />
          ) : (
            <div className="rounded-2xl border border-line bg-bg-alt p-5 text-sm text-muted">
              <b className="text-ink">Factoring</b> is for independents who run their own authority.
              Your earnings settle through your employer/carrier — keep an eye on the settlements
              below.
            </div>
          )}
          <SectionCard title="How settlement works">
            <ol className="space-y-2.5 text-sm text-muted">
              <li><b className="text-ink">Deliver</b> and capture the POD (receipt).</li>
              <li><b className="text-ink">Invoice</b> is filed against the load in the paperwork desk.</li>
              <li><b className="text-ink">Get paid</b> net-30, or advance today with factoring.</li>
            </ol>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}