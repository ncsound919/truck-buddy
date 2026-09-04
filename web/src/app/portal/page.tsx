import Link from 'next/link';

import {
  DocStatusBadge,
  HealthPanel,
  LoadCard,
  PageTitle,
  SectionCard,
} from '@/components/portal/primitives';
import { Badge } from '@/components/ui/badge';
import { ArrowRightIcon, BellIcon, MoneyIcon, RouteIcon } from '@/components/icons';
import { Stat } from '@/components/ui/card';
import { portalApi } from '@/lib/mock-api';

export const dynamic = 'force-dynamic';

export default async function OverviewPage() {
  const [today, profile] = await Promise.all([
    portalApi.getToday(),
    portalApi.getOperatingProfile(),
  ]);
  const load = today.load!;
  const pending = today.documents.find((d) => d.status === 'pending');

  return (
    <div>
      {!profile.set ? (
        <Link
          href="/portal/setup"
          className="mb-6 flex items-center justify-between gap-3 rounded-2xl border border-accent/30 bg-accent-soft/50 px-5 py-4"
        >
          <div>
            <div className="text-[15px] font-extrabold text-ink">Finish setting up how you work</div>
            <div className="text-sm text-muted">Pick your role, equipment, and authority so we tailor this portal.</div>
          </div>
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-accent px-3.5 py-2 text-sm font-bold text-white">
            Set up <ArrowRightIcon width={15} height={15} />
          </span>
        </Link>
      ) : null}
      <PageTitle
        title={`Good morning, ${today.driver.name.split(' ')[0]}.`}
        subtitle="Here's your day at a glance."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="This week · gross" value={`$${today.earnings.weekGross.toLocaleString()}`} hint="4 loads" />
        <Stat label="This load · payout" value={`$${today.earnings.thisLoadPayout.toLocaleString()}`} hint={today.nextStopLabel} />
        <Stat label="Miles this week" value={today.earnings.weekMiles.toLocaleString()} hint="On 2.00/mi rate" />
        <Stat label="Truck" value={today.driver.truck.plate} hint={`${today.driver.truck.make} ${today.driver.truck.model}`} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <SectionCard
            title="Active load"
            action={<Link href="/portal/loads" className="text-sm font-bold text-accent hover:underline">View loads →</Link>}
          >
            <LoadCard load={load} />
            <div className="mt-4 flex flex-wrap gap-2.5">
              <span className="inline-flex items-center gap-2 rounded-xl bg-accent-soft px-3 py-2 text-sm font-bold text-accent-600">
                <RouteIcon width={18} height={18} />
                Next stop · {load.destination}
              </span>
            </div>
          </SectionCard>

          <SectionCard title="Documents">
            <ul className="divide-y divide-line">
              {today.documents.map((d) => (
                <li key={d.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-bg-alt text-ink-2">
                      <span className="text-xs font-black">{d.kind === 'DeliveryReceipt' ? 'DR' : d.kind === 'Invoice' ? 'IN' : 'BOL'}</span>
                    </div>
                    <div>
                      <div className="text-sm font-bold text-ink">{d.bolNumber}</div>
                      <div className="text-xs text-faint">{d.shipper}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="hidden text-sm text-faint sm:inline">{d.weightLb.toLocaleString()} lb</span>
                    <DocStatusBadge status={d.status} />
                  </div>
                </li>
              ))}
            </ul>
            {pending ? (
              <Link
                href="/portal/documents"
                className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-accent py-3 text-sm font-extrabold text-white transition hover:bg-accent-600"
              >
                Capture {pending.kind.toLowerCase()} for {pending.bolNumber}
                <ArrowRightIcon width={16} height={16} />
              </Link>
            ) : null}
          </SectionCard>
        </div>

        <div className="space-y-6">
          <SectionCard title="Truck health" action={<Badge tone="success">Live</Badge>}>
            <HealthPanel health={today.health} />
            <p className="mt-3 text-xs text-faint">Updated {today.health.updatedAt}</p>
          </SectionCard>

          <SectionCard
            title="Dispatch"
            action={<Badge tone="danger">{today.messages.filter((m) => m.unread).length} new</Badge>}
          >
            <ul className="space-y-4">
              {today.messages.map((m) => (
                <li key={m.id} className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent">
                    <BellIcon width={16} height={16} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-bold text-ink">{m.from}</span>
                      <span className="text-[11px] text-faint">{m.at}</span>
                      {m.unread ? <span className="h-1.5 w-1.5 rounded-full bg-accent" /> : null}
                    </div>
                    <p className="text-sm text-muted">{m.text}</p>
                  </div>
                </li>
              ))}
            </ul>
          </SectionCard>

          <SectionCard title="Earnings" action={<MoneyIcon className="text-accent" width={18} height={18} />}>
            <div className="flex items-end justify-between">
              <div>
                <div className="text-3xl font-black text-ink">${today.earnings.weekGross.toLocaleString()}</div>
                <div className="text-xs text-faint">Gross · this week</div>
              </div>
              <div className="text-right text-sm">
                <div className="font-bold text-success">+18%</div>
                <div className="text-xs text-faint">vs last week</div>
              </div>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-line">
              <div className="h-full w-[72%] rounded-full bg-accent" />
            </div>
            <p className="mt-2 text-xs text-faint">72% of weekly goal</p>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
