'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

import { trackPageview } from '@/lib/ops/telemetry';

/**
 * Fires an anonymous pageview beacon on mount / route change. Mount once at the
 * root of a page group to start collecting analytics (needs /api/ops/ingest).
 */
export function PageViewBeacon() {
  const pathname = usePathname();
  useEffect(() => {
    const t = setTimeout(() => trackPageview(pathname, document.referrer), 300);
    return () => clearTimeout(t);
  }, [pathname]);
  return null;
}
