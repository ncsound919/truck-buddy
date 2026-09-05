'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export interface SessionUser {
  id: string;
  email: string | null;
  name: string | null;
}

const SessionContext = createContext<{ user: SessionUser | null; loading: boolean }>({
  user: null,
  loading: true,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createBrowserClient(url, anonKey);
    let live = true;
    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!live) return;
      if (session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email ?? null,
          name:
            (session.user.user_metadata?.full_name as string | undefined) ||
            (session.user.user_metadata?.name as string | undefined) ||
            null,
        });
      } else {
        setUser(null);
      }
      setLoading(false);
    })();
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (!live) return;
      if (session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email ?? null,
          name:
            (session.user.user_metadata?.full_name as string | undefined) ||
            (session.user.user_metadata?.name as string | undefined) ||
            null,
        });
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return () => {
      live = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return <SessionContext.Provider value={{ user, loading }}>{children}</SessionContext.Provider>;
}

export function useSession() {
  return useContext(SessionContext);
}
