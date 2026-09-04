import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { buildDemoSession } from '@/domain/data';
import { MockTruckBuddyApi } from '@/services/truck-buddy-api';
import { ProfileProvider } from '@/hooks/use-operating-profile';
import { FlowProvider } from '@/store/flow';

/**
 * Root layout. Single API seam for the whole app: swap MockTruckBuddyApi for
 * the HTTP implementation when the backend exists.
 */
const api = new MockTruckBuddyApi(buildDemoSession);

export default function RootLayout() {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';

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
            </Stack>
          </FlowProvider>
        </ProfileProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
