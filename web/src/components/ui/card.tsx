import { cn } from '@/lib/cn';

export function Card({
  className,
  hover,
  interactive,
  children,
}: {
  className?: string;
  /** Adds a lift + shadow on hover (for interactive cards). */
  hover?: boolean;
  /** Marks a hover/interactive card as focusable when wrapped in a link. */
  interactive?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-line bg-white p-5 shadow-[var(--shadow-card)]',
        hover && 'card-lift transition-transform',
        className,
      )}
    >
      {children}
    </div>
  );
}

export function Kicker({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.18em] text-accent',
        className,
      )}
    >
      <span className="h-px w-5 bg-accent/50" aria-hidden />
      {children}
    </span>
  );
}

export function Stat({
  label,
  value,
  hint,
  className,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  className?: string;
}) {
  return (
    <div className={cn('rounded-2xl border border-line bg-white p-4 shadow-[var(--shadow-card)]', className)}>
      <p className="text-[13px] font-medium text-muted">{label}</p>
      <p className="mt-1 text-2xl font-extrabold tracking-tight text-ink">{value}</p>
      {hint ? <p className="mt-0.5 text-xs text-faint">{hint}</p> : null}
    </div>
  );
}
