'use client';

import { useState } from 'react';

import type { CrmLead } from '@/lib/ops/admin-client';

export function LeadsTable({
  leads,
  toneOf,
}: {
  leads: CrmLead[];
  toneOf: (status: string) => string;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-line text-xs uppercase tracking-wide text-faint">
            <th className="py-2 pr-3 font-extrabold">Company</th>
            <th className="py-2 pr-3 font-extrabold">Contact</th>
            <th className="py-2 pr-3 font-extrabold">Source</th>
            <th className="py-2 pr-3 font-extrabold">Status</th>
            <th className="py-2 pr-3 font-extrabold">Value</th>
            <th className="py-2 font-extrabold">Created</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {leads.map((l) => (
            <tr key={l.id}>
              <td className="py-2.5 pr-3 font-bold text-ink">{l.company}</td>
              <td className="py-2.5 pr-3 text-muted">
                {l.contact_name ?? '—'}
                {l.contact_email ? <div className="text-xs text-faint">{l.contact_email}</div> : null}
              </td>
              <td className="py-2.5 pr-3 text-xs text-muted">{l.source ?? '—'}</td>
              <td className="py-2.5 pr-3">
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${toneOf(l.status)}`}>{l.status}</span>
              </td>
              <td className="py-2.5 pr-3 text-muted">{l.value_usd ? `$${l.value_usd.toLocaleString()}` : '—'}</td>
              <td className="py-2.5 text-xs text-faint">{new Date(l.created_at).toLocaleDateString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function NewLeadForm({ disabled }: { disabled?: boolean }) {
  const [form, setForm] = useState({ company: '', contact_name: '', contact_email: '', source: '', value_usd: '' });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function submit() {
    if (!form.company.trim()) return;
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch('/api/ops/crm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, value_usd: form.value_usd ? Number(form.value_usd) : null }),
      });
      if (!res.ok) throw new Error('create_failed');
      setMsg('Lead added.');
      setForm({ company: '', contact_name: '', contact_email: '', source: '', value_usd: '' });
      window.location.reload();
    } catch {
      setMsg('Could not add lead.');
    } finally {
      setBusy(false);
    }
  }

  const input =
    'h-10 rounded-lg border border-line bg-white px-3 text-sm text-ink outline-none focus:border-accent';
  return (
    <div className="rounded-2xl border border-line bg-white p-5">
      <h3 className="text-[15px] font-extrabold text-ink">Add a lead</h3>
      <div className="mt-3 grid gap-3 sm:grid-cols-6">
        <input className={input + ' sm:col-span-2'} placeholder="Company *" value={form.company} disabled={disabled}
          onChange={(e) => setForm({ ...form, company: e.target.value })} />
        <input className={input} placeholder="Contact" value={form.contact_name}
          onChange={(e) => setForm({ ...form, contact_name: e.target.value })} />
        <input className={input} placeholder="email" value={form.contact_email}
          onChange={(e) => setForm({ ...form, contact_email: e.target.value })} />
        <input className={input} placeholder="Source" value={form.source}
          onChange={(e) => setForm({ ...form, source: e.target.value })} />
        <input className={input} placeholder="Value $" type="number" value={form.value_usd}
          onChange={(e) => setForm({ ...form, value_usd: e.target.value })} />
      </div>
      <div className="mt-3 flex items-center gap-3">
        <button
          onClick={submit}
          disabled={disabled || busy || !form.company.trim()}
          className="rounded-xl bg-accent px-4 py-2 text-sm font-extrabold text-white transition hover:bg-accent-600 disabled:opacity-50"
        >
          {busy ? 'Adding…' : 'Add lead'}
        </button>
        {msg ? <span className="text-sm text-muted">{msg}</span> : null}
        {disabled ? <span className="text-xs text-warning">Data layer not configured</span> : null}
      </div>
    </div>
  );
}
