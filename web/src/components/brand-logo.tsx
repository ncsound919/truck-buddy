import Link from 'next/link';

import { cn } from '@/lib/cn';
import { TruckBuddyMark } from '@/components/truck-buddy-mark';

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
    <Link href={href} className={cn('inline-flex items-center gap-2.5 group', className)}>
      <span
        className={cn(
          'flex h-10 w-10 items-center justify-center rounded-xl ring-1 transition',
          light
            ? 'bg-white/10 ring-white/15 group-hover:bg-white/15'
            : 'bg-gradient-to-br from-[#3B8AE8] to-[#0F6BFF] ring-white/20 shadow-[0_4px_14px_-4px_rgba(15,107,255,0.6)]',
        )}
      >
        <TruckBuddyMark className="h-7 w-7" />
      </span>
      <span
        className={cn(
          'text-[18px] font-black tracking-tight leading-none',
          light ? 'text-white' : 'text-ink',
        )}
      >
        Truck Buddy
      </span>
    </Link>
  );
}