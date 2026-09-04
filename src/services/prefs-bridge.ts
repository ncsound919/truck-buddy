import type { DriverPrefs } from '@/domain/types';
import { normalizePrefs } from '@/domain/data';

/**
 * Lightweight prefs bridge so the API seam can read the current driver
 * preferences without depending on the React store. The store writes here
 * whenever `state.prefs` changes; the API reads here when it needs to
 * decide transport / recipient.
 *
 * The default is the safe `mock` transport and the safe defaults from
 * `normalizePrefs(null)`.
 */

let current: DriverPrefs = normalizePrefs(null);

export function setLivePrefs(prefs: DriverPrefs): void {
  current = prefs;
}

export function getLivePrefs(): DriverPrefs {
  return current;
}
