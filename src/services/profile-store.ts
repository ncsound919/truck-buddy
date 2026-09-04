import AsyncStorage from '@react-native-async-storage/async-storage';

import { DEFAULT_PROFILE, type OperatingProfile } from '@/domain/profile';

/**
 * Device persistence for the driver's operating profile (role + equipment +
 * authority). This is the app-side copy of the web portal's profile; it lives
 * on-device until a real backend syncs the two (see portal sync notes).
 */

const KEY = 'tb.profile.v1';

export async function loadProfile(): Promise<OperatingProfile> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return DEFAULT_PROFILE;
    const parsed = JSON.parse(raw) as OperatingProfile;
    return { ...DEFAULT_PROFILE, ...parsed };
  } catch {
    return DEFAULT_PROFILE;
  }
}

export async function saveProfile(profile: OperatingProfile): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(profile));
  } catch {
    // Storage unavailable — degrade silently.
  }
}
