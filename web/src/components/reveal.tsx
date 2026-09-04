'use client';

import { useEffect, useRef, useState } from 'react';

import { cn } from '@/lib/cn';

/**
 * Reveal-on-scroll wrapper. Fades content up when it enters the viewport.
 * - Add `reveal-stagger` to stagger direct children.
 * - Respects prefers-reduced-motion (handled in CSS).
 * - Always renders content (hidden only until JS confirms visibility), so
 *   there's no layout jump and it fails safe if JS is disabled.
 */
export function Reveal({
  children,
  className,
  delay,
  as,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  as?: 'div' | 'section' | 'li';
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (!('IntersectionObserver' in window)) {
      const raf = requestAnimationFrame(() => setVisible(true));
      return () => cancelAnimationFrame(raf);
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisible(true);
          io.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -6% 0px' },
    );
    io.observe(node);
    return () => io.disconnect();
  }, []);

  const Tag = as ?? 'div';
  return (
    <Tag
      ref={ref as never}
      className={cn('reveal', visible && 'is-visible', className)}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </Tag>
  );
}
