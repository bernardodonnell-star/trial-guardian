import * as Notifications from 'expo-notifications';
import { DarkTheme, DefaultTheme, router, Stack, ThemeProvider } from 'expo-router';
import { ShareIntentProvider } from 'expo-share-intent';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { AppState, useColorScheme } from 'react-native';

import { Colors } from '@/constants/theme';
import { refreshGlances } from '@/lib/actions';

SplashScreen.preventAutoHideAsync();

// Keep the trial list underneath screens opened from the share sheet or a notification.
export const unstable_settings = { initialRouteName: 'index' };

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

function useNotificationTaps() {
  useEffect(() => {
    const open = (response: Notifications.NotificationResponse | null) => {
      const url = response?.notification.request.content.data?.url;
      if (typeof url === 'string') router.push(url as never);
    };
    open(Notifications.getLastNotificationResponse());
    const subscription = Notifications.addNotificationResponseReceivedListener(open);
    return () => subscription.remove();
  }, []);
}

/** Keeps the widget and Lock Screen countdown fresh whenever the app comes to the front. */
function useForegroundRefresh() {
  useEffect(() => {
    refreshGlances();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') refreshGlances();
    });
    return () => subscription.remove();
  }, []);
}

export default function RootLayout() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
  useNotificationTaps();
  useForegroundRefresh();

  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <ShareIntentProvider options={{ resetOnBackground: true }}>
      <ThemeProvider
        value={{
          ...base,
          colors: { ...base.colors, primary: colors.accent, background: colors.background, card: colors.background, text: colors.text },
        }}>
        <Stack screenOptions={{ headerShadowVisible: false, headerTintColor: colors.accent, headerTitleStyle: { color: colors.text } }}>
          <Stack.Screen name="index" options={{ title: 'Trial Guardian', headerLargeTitle: true }} />
          <Stack.Screen name="add" options={{ title: 'Add a trial', presentation: 'modal' }} />
          <Stack.Screen name="import" options={{ title: 'New trial', presentation: 'modal' }} />
          <Stack.Screen name="trial/[id]" options={{ title: '' }} />
          <Stack.Screen name="edit/[id]" options={{ title: 'Edit trial', presentation: 'modal' }} />
          <Stack.Screen name="settings" options={{ title: 'Settings' }} />
        </Stack>
      </ThemeProvider>
    </ShareIntentProvider>
  );
}
