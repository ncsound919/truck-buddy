import { PageTitle, SectionCard } from '@/components/portal/primitives';
import { Badge } from '@/components/ui/badge';
import { portalApi } from '@/lib/mock-api';
import { DispatchThread } from './thread';

export const dynamic = 'force-dynamic';

export default async function DispatchPage() {
  const [messages, today] = await Promise.all([portalApi.getMessages(), portalApi.getToday()]);
  const unread = messages.filter((m) => m.unread && m.sender !== 'me').length;

  return (
    <div>
      <PageTitle
        title="Dispatch"
        subtitle="Talk to dispatch and your contacts in real time."
        actions={<Badge tone={unread ? 'danger' : 'neutral'} dot>{unread} unread</Badge>}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <DispatchThread initial={messages} />
        </div>
        <div className="space-y-6">
          <SectionCard title="Active load">
            {today.load ? (
              <div className="text-sm">
                <div className="font-extrabold text-ink">{today.load.ref}</div>
                <div className="mt-1 text-muted">{today.load.origin} → {today.load.destination}</div>
                <div className="mt-1 text-muted">Deliver by {today.load.deliverBy}</div>
              </div>
            ) : (
              <p className="text-sm text-muted">No active load.</p>
            )}
          </SectionCard>
          <SectionCard title="Contacts">
            <ul className="space-y-2.5 text-sm">
              {[{ n: 'Dispatch · Raleigh', d: 'Primary' }, { n: 'Haley Logistics', d: 'Broker' }, { n: 'Raleigh Freight Co.', d: 'Shipper' }].map((c) => (
                <li key={c.n} className="flex items-center justify-between rounded-xl border border-line px-3.5 py-2.5">
                  <span className="font-bold text-ink">{c.n}</span>
                  <span className="text-xs text-faint">{c.d}</span>
                </li>
              ))}
            </ul>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
