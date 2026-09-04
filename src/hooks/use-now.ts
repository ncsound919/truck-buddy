import { useEffect, useState } from 'react';

/**
 * Re-renders on an interval so live values (clocks, wait timers) refresh.
 * `ms=0` disables ticking and returns a static now once.
 */
export function useNow(ms = 1000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (ms <= 0) return;
    const id = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(id);
  }, [ms]);
  return now;
}
