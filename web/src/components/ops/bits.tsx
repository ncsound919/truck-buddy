export function NotConfigured() {
  return (
    <div className="rounded-2xl border border-warning/40 bg-warning-soft/50 p-5">
      <p className="text-sm font-extrabold text-warning">Ops data layer is not configured</p>
      <p className="mt-1 text-sm text-muted">
        Set <code className="rounded bg-line/60 px-1.5 py-0.5 text-xs">NEXT_PUBLIC_SUPABASE_URL</code> and{' '}
        <code className="rounded bg-line/60 px-1.5 py-0.5 text-xs">SUPABASE_SERVICE_ROLE_KEY</code> (or{' '}
        <code className="rounded bg-line/60 px-1.5 py-0.5 text-xs">SUPABASE_SECRET_KEY</code>) in your environment,
        then run the <code className="rounded bg-line/60 px-1.5 py-0.5 text-xs">ops-console.sql</code> migration against
        the truck-buddy Supabase project.
      </p>
    </div>
  );
}

export function Kpi({ label, value, hint }: { label: string; value: React.ReactNode; hint?: string }) {
  return (
    <div className="rounded-2xl border border-line bg-white p-4">
      <p className="text-[13px] font-medium text-muted">{label}</p>
      <p className="mt-1 text-2xl font-extrabold tracking-tight text-ink">{value}</p>
      {hint ? <p className="mt-0.5 text-xs text-faint">{hint}</p> : null}
    </div>
  );
}

export function Panel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-line bg-white p-5">
      <h3 className="text-[15px] font-extrabold text-ink">{title}</h3>
      <div className="mt-3">{children}</div>
    </div>
  );
}
