/**
 * VIN scan + manual entry screen (Car Tracker MVP — T2.1, AC FR-1.2a).
 *
 * Primary flow: capture a photo of the VIN barcode via the camera, then enter
 * (or confirm) the 17-char VIN in the manual field, which drives the vPIC
 * decode. OCR of the captured image is NOT in scope for this card (T7.x).
 *
 * On a valid VIN, the screen decodes via NHTSA vPIC and navigates to the
 * decode-result screen. On a checksum failure or vPIC error, an inline error
 * is shown with a one-tap manual fallback (AC FR-1.5).
 */

import React, { useCallback, useState } from 'react';
import { StyleSheet, Text, View, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '../../src/design/Screen';
import { Input } from '../../src/design/Input';
import { Button } from '../../src/design/Button';
import { VinCamera } from '../../src/components/VinCamera';
import { validateVin } from '../../src/vin/validation';
import { decodeVin } from '../../src/vin/vpic';
import { useVehicleDraft } from '../../src/state/vehicleDraft';
import { colors, spacing, typography } from '../../src/design/theme';

export default function VinScanScreen() {
  const router = useRouter();
  const setVin = useVehicleDraft((s) => s.setVin);
  const setVinPhoto = useVehicleDraft((s) => s.setVinPhoto);
  const setChecksumValid = useVehicleDraft((s) => s.setChecksumValid);
  const setDecode = useVehicleDraft((s) => s.setDecode);

  const [vinInput, setVinInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [decoding, setDecoding] = useState(false);
  const [photoUri, setPhotoUri] = useState<string | null>(null);

  const handleCapture = useCallback(
    (uri: string) => {
      setPhotoUri(uri);
      setVinPhoto(uri);
    },
    [setVinPhoto]
  );

  const handleManualFallback = useCallback(() => {
    // One-tap manual fallback (AC FR-1.5) → T2.2 manual-entry wizard.
    router.push('/(vehicle)/manual/index');
  }, [router]);

  const handleDecode = useCallback(async () => {
    if (decoding) return;

    const result = validateVin(vinInput);
    if (!result.valid) {
      setError(result.error);
      return;
    }

    // Checksum is informational; we still decode and surface quality on the
    // result screen, but flag the checksum in the draft for T2.2/T2.3.
    setVin(result.normalized);
    setChecksumValid(result.checksumValid);
    setError(null);
    setDecoding(true);

    try {
      const decode = await decodeVin(result.normalized);
      if (!decode.success) {
        setError(decode.errorText ?? 'No match found for this VIN.');
        return;
      }
      // Persist decode into the draft so decode-result (and T2.2/T2.3) can consume it.
      setDecode({
        make: decode.make,
        model: decode.model,
        trim: decode.trim,
        year: decode.year,
        errorCode: decode.errorCode,
      });
      router.push('/(vehicle)/decode-result');
    } finally {
      setDecoding(false);
    }
  }, [decoding, router, setChecksumValid, setDecode, setVin, vinInput]);

  return (
    <Screen scrollable>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Add a vehicle</Text>
        <Text style={styles.subtitle}>
          Scan the VIN barcode (driver-side door jamb or windshield), then confirm the code.
        </Text>

        <View style={styles.cameraWrap}>
          <VinCamera onCapture={handleCapture} onManualFallback={handleManualFallback} />
        </View>

        {photoUri && <Text style={styles.photoNote}>Photo captured — VIN photo attached.</Text>}

        <Input
          label="VIN"
          value={vinInput}
          onChangeText={(v) => {
            setVinInput(v);
            if (error) setError(null);
          }}
          placeholder="17-character VIN (no I, O, Q)"
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={17}
          error={error ?? undefined}
        />

        <Button onPress={handleDecode} loading={decoding} disabled={decoding} style={styles.cta}>
          Decode VIN
        </Button>

        <Button variant="secondary" onPress={handleManualFallback} style={styles.secondaryCta}>
          Enter vehicle details manually
        </Button>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: spacing.xxl, gap: spacing.md },
  title: { color: colors.text.primary, fontSize: typography.fontSize.xl, fontWeight: '700' },
  subtitle: { color: colors.text.secondary, fontSize: typography.fontSize.base, marginBottom: spacing.sm },
  cameraWrap: { height: 280, borderRadius: 12, overflow: 'hidden', marginBottom: spacing.sm },
  photoNote: { color: colors.success.default, fontSize: typography.fontSize.sm },
  cta: { marginTop: spacing.sm },
  secondaryCta: { marginTop: spacing.sm },
});
