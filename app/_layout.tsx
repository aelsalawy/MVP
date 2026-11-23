import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Sentry, sentryEnabled } from '../lib/sentry';

function RootLayoutInner() {
  return (
    <>
      <Stack>
        <Stack.Screen name="index" options={{ title: 'Car Tracker' }} />
        <Stack.Screen name="(vehicle)" options={{ headerShown: false }} />
      </Stack>
      <StatusBar style="auto" />
    </>
  );
}

// Wrap with Sentry's error boundary + routing instrumentation when enabled.
export default sentryEnabled
  ? Sentry.wrap(RootLayoutInner)
  : RootLayoutInner;
