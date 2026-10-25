import * as Notifications from 'expo-notifications';
import { DarkTheme, DefaultTheme, router, Stack, ThemeProvider } from 'expo-router';
import { ShareIntentProvider } from 'expo-share-intent';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { AppState, useColorScheme } from 'react-native';

import { AppLock } from '@/components/app-lock';
import { Colors } from '@/constants/theme';
import { handleReminderAction, refreshGlances, syncNow } from '@/lib/actions';
import { registerReminderCategories, type ReminderAction } from '@/lib/reminders';
import { onCloudChange, takeShared } from '@/modules/trial-system';

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

registerReminderCategories().catch(() => {});

const ACTIONS: ReminderAction[] = ['cancelled', 'keep', 'tonight', 'not-charged', 'charged'];

function useNotificationTaps() {
  useEffect(() => {
    const handled = new Set<string>();
    const open = async (response: Notifications.NotificationResponse | null) => {
      if (!response) return;
      // The same response can arrive twice on a cold start (last response and the listener).
      const key = `${response.notification.request.identifier}:${response.actionIdentifier}`;
      if (handled.has(key)) return;
      handled.add(key);

      const { url, trialId } = response.notification.request.content.data ?? {};
      const action = ACTIONS.find((a) => a === response.actionIdentifier);
      if (action && typeof trialId === 'string') {
        await handleReminderAction(trialId, action);
        if (action === 'charged') router.push(`/trial/${trialId}?refund=1` as never);
        else if (action !== 'tonight' && action !== 'not-charged' && typeof url === 'string') router.push(url as never);
        return;
      }
      if (typeof url === 'string') router.push(url as never);
    };
    open(Notifications.getLastNotificationResponse());
    const subscription = Notifications.addNotificationResponseReceivedListener(open);
    return () => subscription.remove();
  }, []);
}

/** A screen a Siri or Shortcuts action asked for, such as "Add a trial". */
function openPendingRoute() {
  const route = takeShared('pendingRoute');
  if (route === '/add') router.push('/add');
}

/**
 * Keeps the widget, the Lock Screen countdown and iCloud fresh whenever the app comes to the
 * front, and picks up changes made on the person's other devices.
 */
function useForegroundRefresh() {
  useEffect(() => {
    refreshGlances();
    openPendingRoute();
    const appState = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;
      refreshGlances();
      openPendingRoute();
    });
    const cloud = onCloudChange(() => syncNow());
    return () => {
      appState.remove();
      cloud.remove();
    };
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
      <AppLock>
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
      </AppLock>
    </ShareIntentProvider>
  );
}
