import { opsConfigured, select } from '@/lib/ops/admin-client';
import type { CrmLead } from '@/lib/ops/admin-client';
import { Kpi, NotConfigured, Panel } from '@/components/ops/bits';
import { LeadsTable, NewLeadForm } from './leads-client';

export const dynamic = 'force-dynamic';

const STATUS_TONE: Record<string, string> = {
  new: 'bg-line/60 text-ink-2',
  contacted: 'bg-accent-soft text-accent-600',
  qualified: 'bg-warning-soft text-warning',
  negotiating: 'bg-accent-soft text-accent-600',
  customer: 'bg-success-soft text-success',
  lost: 'bg-line/60 text-faint',
};

export default async function CrmPage() {
  const configured = opsConfigured();
  const res = configured ? await select<CrmLead>('tb_crm_leads', '*', { order: { col: 'created_at', ascending: false }, limit: 100 }) : { data: [], error: null };
  const leads = (res.data ?? []) as CrmLead[];
  const error = res.error;
  const customers = leads.filter((l) => l.status === 'customer').length;
  const open = leads.filter((l) => ['new', 'contacted', 'qualified', 'negotiating'].includes(l.status)).length;
  const pipeline = leads.reduce((a, l) => a + (l.value_usd ?? 0), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-extrabold text-ink">CRM</h1>
        <p className="text-sm text-muted">Leads, accounts and pipeline for truckbuddy.online</p>
      </div>

      {!configured ? <NotConfigured /> : null}

      <div className="grid gap-4 sm:grid-cols-3">
        <Kpi label="Open leads" value={open} />
        <Kpi label="Customers" value={customers} />
        <Kpi label="Pipeline value" value={`$${pipeline.toLocaleString()}`} />
      </div>

      <NewLeadForm disabled={!configured} />

      <Panel title="Leads">
        {error ? <p className="text-sm font-semibold text-danger">Failed to load leads: {error}</p> : null}
        {!configured ? (
          <p className="text-sm text-faint">Leads will appear once the data layer is configured.</p>
        ) : leads.length ? (
          <LeadsTable leads={leads} toneOf={(s) => STATUS_TONE[s] ?? STATUS_TONE.new} />
        ) : (
          <p className="text-sm text-faint">No leads yet — add your first above.</p>
        )}
      </Panel>
    </div>
  );
}
