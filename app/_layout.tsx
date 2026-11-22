import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
  return (
    <>
      <Stack>
        <Stack.Screen name="index" options={{ title: 'Car Tracker' }} />
      </Stack>
      <StatusBar style="auto" />
    </>
  );
}
