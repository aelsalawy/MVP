import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function DashboardLayout() {
  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" options={{ headerShown: false }} />
      </Stack>
      <StatusBar style="auto" />
    </>
  );
}
