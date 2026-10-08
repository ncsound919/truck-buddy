import { useEffect } from 'react';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { buildDemoSession } from '@/domain/data';
import { MockTruckBuddyApi } from '@/services/truck-buddy-api';
import { withLiveAssignment, userIdFromJwt } from '@/services/live-assignment';
import { getDispatchAccessToken } from '@/services/dispatch-session';
import { startPingAgent } from '@/services/ping-agent';
import { ProfileProvider } from '@/hooks/use-operating-profile';
import { FlowProvider } from '@/store/flow';

/**
 * Root layout. Single API seam for the whole app. On live sessions the route,
 * vehicle and stop data come from the shared Supabase project; offline/fixture
 * sessions keep the demo data.
 */
const api = withLiveAssignment(new MockTruckBuddyApi(buildDemoSession), {
  getToken: () => getDispatchAccessToken().catch(() => null),
});

export default function RootLayout() {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';

  // Close the return leg of the loop: while signed in with a live route, the cab
  // sends throttled GPS pings so the dispatcher map shows the real dot. Native
  // only; a no-op on web and when signed out.
  useEffect(() => {
    let cache = { at: 0, live: false };
    const agent = startPingAgent({
      getOrgId: () => api.getPrimaryOrgId(),
      getContext: async () => {
        const token = await getDispatchAccessToken().catch(() => null);
        const userId = token ? userIdFromJwt(token) : null;
        if (!userId) return { userId: null, onShift: false, hasActiveRoute: false };
        const now = Date.now();
        if (now - cache.at > 20_000 || !cache.live) {
          cache = { at: now, live: await api.hasLiveRoute().catch(() => false) };
        }
        return { userId, onShift: cache.live, hasActiveRoute: cache.live };
      },
      sendPing: (orgId, userId, lat, lng, extra) => api.submitPing(orgId, userId, lat, lng, extra),
    });
    return () => agent.stop();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={isDark ? DarkTheme : DefaultTheme}>
        <ProfileProvider>
          <FlowProvider api={api}>
            <StatusBar style={isDark ? 'light' : 'dark'} />
            <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
              <Stack.Screen name="index" />
              <Stack.Screen name="profile" />
              <Stack.Screen name="debug" />
              <Stack.Screen name="compliance" />
            </Stack>
          </FlowProvider>
        </ProfileProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
