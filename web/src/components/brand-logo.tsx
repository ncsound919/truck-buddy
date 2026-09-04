import Link from 'next/link';

import { cn } from '@/lib/cn';

export function BrandLogo({
  href = '/',
  light = false,
  className,
}: {
  href?: string;
  light?: boolean;
  className?: string;
}) {
  return (
    <Link href={href} className={cn('inline-flex items-center gap-2.5', className)}>
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent font-black text-white">
        TB
      </span>
      <span className={cn('text-[17px] font-extrabold tracking-tight', light ? 'text-white' : 'text-ink')}>
        Truck Buddy
      </span>
    </Link>
  );
}
