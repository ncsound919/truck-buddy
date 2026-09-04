import { createContext, useContext, useEffect, useMemo, useState } from 'react';

import type { OperatingProfile } from '@/domain/profile';
import { loadProfile, saveProfile } from '@/services/profile-store';

/**
 * OperatingProfile context. Independent of the workflow store (which another
 * team owns); the two can be merged later. Loads once from device storage and
 * persists any change.
 */
interface ProfileController {
  profile: OperatingProfile;
  /** null until storage has been read once. */
  ready: boolean;
  setOperatingProfile: (update: Partial<OperatingProfile>) => Promise<void>;
}

const ProfileContext = createContext<ProfileController | null>(null);

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<OperatingProfile | null>(null);

  useEffect(() => {
    let live = true;
    loadProfile().then((p) => {
      if (live) setProfile(p);
    });
    return () => {
      live = false;
    };
  }, []);

  const controller = useMemo<ProfileController>(() => {
    const current = profile;
    return {
      profile: current ?? {
        role: 'independent',
        equipment: 'dry_van',
        authority: 'own',
        set: false,
      },
      ready: current != null,
      async setOperatingProfile(update) {
        const next = { ...(profile ?? current), ...update, set: true } as OperatingProfile;
        setProfile(next);
        await saveProfile(next);
      },
    };
  }, [profile]);

  return <ProfileContext.Provider value={controller}>{children}</ProfileContext.Provider>;
}

export function useOperatingProfile(): ProfileController {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error('useOperatingProfile must be used inside <ProfileProvider>');
  return ctx;
}
