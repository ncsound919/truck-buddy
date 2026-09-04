import AsyncStorage from '@react-native-async-storage/async-storage';

import type { DayClock, DetentionClaim, Dispatch, DriverPrefs, RememberedStop } from '@/domain/types';

/**
 * Local "memory" layer (spec: driver memory). This is what survives a restart —
 * remembered stops, driver preferences, and the dispatch activity log. The
 * backend stores nothing of this; it is the driver's own record on their device.
 *
 * Every read/write is guarded: storage must never take down the driver flow.
 */

const KEYS = {
  prefs: 'tb.prefs.v1',
  remembered: 'tb.remembered.v1',
  log: 'tb.aidlog.v1',
  clock: 'tb.clock.v1',
  detention: 'tb.detention.v1',
} as const;

async function read<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

async function write<T>(key: string, value: T): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage unavailable (private mode, test env) — degrade silently.
  }
}

export const memory = {
  async loadPrefs(): Promise<DriverPrefs | null> {
    return read<DriverPrefs>(KEYS.prefs);
  },
  savePrefs(prefs: DriverPrefs): Promise<void> {
    return write(KEYS.prefs, prefs);
  },

  async loadRemembered(): Promise<RememberedStop[] | null> {
    return read<RememberedStop[]>(KEYS.remembered);
  },
  saveRemembered(list: RememberedStop[]): Promise<void> {
    return write(KEYS.remembered, list);
  },

  async loadLog(): Promise<Dispatch[] | null> {
    return read<Dispatch[]>(KEYS.log);
  },
  saveLog(log: Dispatch[]): Promise<void> {
    return write(KEYS.log, log);
  },

  async loadClock(): Promise<DayClock | null> {
    return read<DayClock>(KEYS.clock);
  },
  saveClock(clock: DayClock): Promise<void> {
    return write(KEYS.clock, clock);
  },

  async loadDetention(): Promise<DetentionClaim[] | null> {
    return read<DetentionClaim[]>(KEYS.detention);
  },
  saveDetention(list: DetentionClaim[]): Promise<void> {
    return write(KEYS.detention, list);
  },
};
