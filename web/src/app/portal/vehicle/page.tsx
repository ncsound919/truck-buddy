import { HealthPanel, PageTitle, SectionCard } from '@/components/portal/primitives';
import { Badge } from '@/components/ui/badge';
import { Stat } from '@/components/ui/card';
import { portalApi } from '@/lib/mock-api';
import { predictMaintenance } from '@/lib/predict';
import { CopilotActions } from './copilot-actions';
import { cn } from '@/lib/cn';

export const dynamic = 'force-dynamic';

export default async function VehiclePage() {
  const v = await portalApi.getVehicleDetail();
  const risks = predictMaintenance(v);
  const high = risks.filter((r) => r.severity === 'high').length;

  return (
    <div>
      <PageTitle
        title="Vehicle health"
        subtitle={`${v.year} ${v.make} ${v.model} · ${v.plate}`}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Odometer" value={v.odometerMi.toLocaleString()} hint="mi" />
        <Stat label="Next service" value={v.nextServiceMi.toLocaleString()} hint={`${(v.nextServiceMi - v.odometerMi).toLocaleString()} mi away`} />
        <Stat label="Coolant" value={`${v.health.metrics.coolantTempF}°F`} hint="within range" />
        <Stat label="Battery" value={`${v.health.metrics.batteryVoltage}V`} hint={v.health.metrics.batteryVoltage >= 12 ? 'charging normally' : 'low'} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <SectionCard
            title="Predictive maintenance"
            action={<Badge tone={high ? 'danger' : 'success'} dot>{high ? `${high} need attention` : 'No urgent risks'}</Badge>}
          >
            {risks.length === 0 ? (
              <p className="text-sm text-muted">
                No risks flagged. Coolant, battery and service intervals all look healthy.
              </p>
            ) : (
              <ul className="space-y-2.5">
                {risks.map((r) => (
                  <li
                    key={r.id}
                    className={cn(
                      'rounded-xl border px-4 py-3',
                      r.severity === 'high' ? 'border-danger-soft bg-danger-soft/40' : 'border-warning-soft bg-warning-soft/40',
                    )}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className={cn('text-sm font-extrabold', r.severity === 'high' ? 'text-danger' : 'text-warning')}>
                        {r.label}
                      </span>
                      <Badge tone={r.severity === 'high' ? 'danger' : 'warning'}>{r.severity}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-ink-2">{r.detail}</p>
                    <p className="mt-1 text-[13px] text-muted">
                      <b className="font-bold text-ink">Action:</b> {r.action}
                    </p>
                  </li>
                ))}
              </ul>
            )}
            <CopilotActions topRisk={risks[0]?.label ?? 'routine service check'} />
            <p className="mt-3 text-xs leading-relaxed text-faint">
              Rule-based trend + interval estimate over your OBD history — not machine learning. A
              forecasting model slots in behind the same signal later.
            </p>
          </SectionCard>

          <SectionCard title="Live diagnostics" action={<Badge tone="success">Live</Badge>}>
            <HealthPanel health={v.health} />
            <p className="mt-3 text-xs text-faint">
              Data from the on-road app&rsquo;s OBD feed. Web can&rsquo;t read the dongle itself —
              this syncs from the cab.
            </p>
          </SectionCard>

          <SectionCard title="Fault history">
            <ul className="divide-y divide-line">
              {v.faultHistory.map((f) => (
                <li key={f.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-surface px-1.5 py-0.5 font-mono text-[11px] font-bold text-white">{f.code}</span>
                      <span className="text-sm font-bold text-ink">{f.label}</span>
                    </div>
                    <div className="mt-0.5 text-xs text-faint">{new Date(f.at).toLocaleString()}</div>
                  </div>
                  <Badge tone={f.cleared ? 'success' : 'warning'} dot>{f.cleared ? 'Cleared' : 'Active'}</Badge>
                </li>
              ))}
              {v.faultHistory.length === 0 ? <li className="py-3 text-sm text-muted">No recorded faults.</li> : null}
            </ul>
            <p className="mt-3 text-xs text-faint">
              Run a fault through the <a href="/assistant" className="font-bold text-accent hover:underline">Roadside Mechanic</a> to decode it and get a safe fix plan.
            </p>
          </SectionCard>
        </div>

        <SectionCard title="Upcoming maintenance">
          <ul className="space-y-3">
            {v.maintenance.map((m) => (
              <li key={m.item} className="flex items-start justify-between gap-3 rounded-xl border border-line px-3.5 py-2.5">
                <div>
                  <div className="text-sm font-bold text-ink">{m.item}</div>
                  <div className="text-xs text-faint">Due at {m.dueAtMi.toLocaleString()} mi</div>
                </div>
                <span className="shrink-0 rounded-full bg-accent-soft px-2.5 py-1 text-xs font-bold text-accent-600">{m.dueText}</span>
              </li>
            ))}
          </ul>
        </SectionCard>
      </div>
    </div>
  );
}
