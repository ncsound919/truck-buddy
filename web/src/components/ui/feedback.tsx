import { cn } from '@/lib/cn';

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      aria-label="Loading"
      role="status"
      className={cn(
        'inline-block size-5 animate-spin rounded-full border-2 border-line border-t-accent',
        className,
      )}
    />
  );
}

export function LoadingBlock({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-line bg-white px-5 py-14 text-sm text-muted">
      <Spinner className="size-6" />
      {label}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon?: React.ReactNode;
  title: string;
  body?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-line bg-bg-alt/60 px-6 py-12 text-center">
      {icon ? (
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-accent shadow-[var(--shadow-card)]">
          {icon}
        </span>
      ) : null}
      <div>
        <p className="font-extrabold text-ink">{title}</p>
        {body ? <p className="mx-auto mt-1 max-w-sm text-sm text-muted">{body}</p> : null}
      </div>
      {action}
    </div>
  );
}
