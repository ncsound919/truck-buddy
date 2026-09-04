import { cn } from '@/lib/cn';

export type BadgeTone = 'accent' | 'success' | 'warning' | 'danger' | 'neutral' | 'dark';

const TONES: Record<BadgeTone, string> = {
  accent: 'bg-accent-soft text-accent-600',
  success: 'bg-success-soft text-success',
  warning: 'bg-warning-soft text-warning',
  danger: 'bg-danger-soft text-danger',
  neutral: 'bg-line/60 text-ink-2',
  dark: 'bg-surface text-white',
};

export function Badge({
  tone = 'neutral',
  dot,
  className,
  children,
}: {
  tone?: BadgeTone;
  dot?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  const dotColor =
    tone === 'success' ? 'bg-success' : tone === 'warning' ? 'bg-warning' : tone === 'danger' ? 'bg-danger' : 'bg-accent';
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold uppercase tracking-wide',
        TONES[tone],
        className,
      )}
    >
      {dot ? <span className={cn('size-1.5 rounded-full', dotColor)} /> : null}
      {children}
    </span>
  );
}
