import Link from 'next/link';

import { PageTitle, SectionCard } from '@/components/portal/primitives';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/feedback';
import { ContractIcon, ShieldIcon } from '@/components/icons';
import { packetDraft } from '@/lib/contracts';
import { portalApi } from '@/lib/mock-api';
import { runsOwnAuthority } from '@/lib/perspective';
import { vettingLabel } from '@/lib/vetting';
import type { LeadStage } from '@/lib/domain';
import { PacketComposer, type PacketEntry } from './packet';
import { RateContractsSection } from './rate-contracts';

export const dynamic = 'force-dynamic';

const STAGE_BADGE: Record<LeadStage, { label: string; tone: 'accent' | 'success' | 'warning' | 'neutral' }> = {
  new: { label: 'New', tone: 'accent' },
  vetting: { label: 'Vetting', tone: 'warning' },
  packet_sent: { label: 'Packet sent', tone: 'warning' },
  negotiating: { label: 'Negotiating', tone: 'accent' },
  signed: { label: 'Signed', tone: 'success' },
  closed: { label: 'Closed', tone: 'neutral' },
};

export default async function ContractsPage() {
  const [leads, rateContracts, receipts, dossier, profile] = await Promise.all([
    portalApi.getContractLeads(),
    portalApi.getRateContracts(),
    portalApi.getContractReceipts(),
    portalApi.getCompliance(),
    portalApi.getOperatingProfile(),
  ]);

  if (!runsOwnAuthority(profile)) {
    return (
      <div>
        <PageTitle title="Contracts" subtitle="Turn leads into signed loads." />
        <EmptyState
          icon={<ContractIcon width={22} height={22} />}
          title="Your employer or carrier handles contracting"
          body="As a leased or company driver, work is assigned by your dispatcher — you do not chase or contract shippers yourself. Truck Buddy only offers lead-to-contract tooling for independents with their own authority."
        />
      </div>
    );
  }

  const packetEntries: PacketEntry[] = leads
    .filter((l) => l.stage === 'new')
    .map((lead) => ({ lead, draft: packetDraft(lead, dossier) }));

  const open = leads.filter((l) => l.stage !== 'signed' && l.stage !== 'closed');
  const signed = leads.filter((l) => l.stage === 'signed');

  return (
    <div>
      <PageTitle
        title="Contracts"
        subtitle="Vet who you work with, send your carrier packet, and lock the rate."
      />

      <SectionCard title="Leads — who you could be contracting with">
        <ul className="space-y-2.5">
          {open.map((lead) => {
            const stage = STAGE_BADGE[lead.stage];
            const risky = lead.vet.status !== 'verified';
            return (
              <li key={lead.id} className="rounded-xl border border-line bg-white px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-extrabold text-ink">{lead.company}</span>
                        <Badge tone="neutral" className="normal-case tracking-normal">
                          {lead.kind}
                        </Badge>
                        <Badge tone={stage.tone} dot>{stage.label}</Badge>
                      </div>
                      <p className="mt-0.5 text-xs text-faint">
                        {lead.contact} · {lead.source}
                        {lead.dot ? ` · DOT ${lead.dot}` : ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      tone={risky ? 'warning' : 'success'}
                      className="normal-case tracking-normal"
                    >
                      {vettingLabel(lead.vet.status)}
                    </Badge>
                    {lead.stage === 'negotiating' ? (
                      <span className="text-xs font-semibold text-accent">Rate card below ↓</span>
                    ) : null}
                  </div>
                </div>
                {risky ? (
                  <ul className="mt-2 space-y-0.5 rounded-lg border border-warning-soft bg-warning-soft/40 px-3 py-2">
                    {lead.vet.reasons.map((r) => (
                      <li key={r} className="text-xs font-medium text-warning">{r}</li>
                    ))}
                  </ul>
                ) : null}
              </li>
            );
          })}
        </ul>
        <p className="mt-3 text-[11px] text-faint">
          Counterparty records come from the demo FMCSA registry (
          {leads[0]?.vet.sourceLabel ?? 'live FMCSA lookup needed before you trust a payer'}
          ). Real-time FMCSA lookups and packet delivery are future seams, not live today.
        </p>
      </SectionCard>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <h2 className="flex items-center gap-2 text-sm font-extrabold uppercase tracking-wide text-ink-2">
            <ShieldIcon width={16} height={16} /> Carrier packet
          </h2>
          <PacketComposer entries={packetEntries} receipts={receipts} />

          <h2 className="mt-8 flex items-center gap-2 text-sm font-extrabold uppercase tracking-wide text-ink-2">
            <ContractIcon width={16} height={16} /> Rate confirmations
          </h2>
          <RateContractsSection contracts={rateContracts} />
        </div>

        <div className="space-y-6">
          <SectionCard title="Signed relationships">
            {signed.length === 0 ? (
              <p className="text-sm text-muted">No signed contracts yet.</p>
            ) : (
              <ul className="space-y-3">
                {signed.map((lead) => (
                  <li key={lead.id} className="flex items-center justify-between gap-2">
                    <div>
                      <div className="text-sm font-bold text-ink">{lead.company}</div>
                      <div className="text-xs text-faint">{lead.kind === 'broker' ? 'Broker' : 'Shipper'} · signed deal on file</div>
                    </div>
                    <Link href="#signed" className="text-xs font-bold text-accent hover:underline">View →</Link>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
