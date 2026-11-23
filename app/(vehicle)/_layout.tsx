import { Stack } from 'expo-router';

/** Manual vehicle entry flow (T2.2) — route group (vehicle). */
export default function VehicleLayout() {
  return (
    <Stack>
      <Stack.Screen name="vin-scan" options={{ title: 'Add Vehicle' }} />
      <Stack.Screen name="decode-result" options={{ title: 'Vehicle Details' }} />
      <Stack.Screen name="manual/index" options={{ title: 'Add Vehicle' }} />
      <Stack.Screen name="manual/details" options={{ title: 'Vehicle Details' }} />
      <Stack.Screen name="odometer" options={{ title: 'Odometer' }} />
      <Stack.Screen name="ocr-review" options={{ title: 'Review Receipt' }} />
      <Stack.Screen name="service-entry" options={{ title: 'Add Service' }} />
      <Stack.Screen name="history" options={{ title: 'Service History' }} />
      <Stack.Screen name="history-detail" options={{ title: 'Entry Details' }} />
      <Stack.Screen name="history-edit" options={{ title: 'Edit Entry' }} />
    </Stack>
  );
}
