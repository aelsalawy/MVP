/**
 * Odometer entry (T2.3, FR-1.3).
 * Required numeric initial odometer + optional annual mileage estimate.
 * Editing sanity validation vs the last recorded entry (FR-1.3):
 *  - decreasing value → rejected (hard error)
 *  - jump of more than 5,000 → accepted with a warning the user must confirm
 */
import React, { useState } from 'react';
import { StyleSheet, Text, View, Keyboard } from 'react-native';
import { router } from 'expo-router';
import {
  Card, Input, Button, Screen,
  colors, spacing, typography,
} from '../../src/design';
import {
  validateOdometer,
  validateAnnualEstimate,
} from '../../src/vehicle/odometer';
import { useVehicleDraft } from '../../src/state/vehicleDraft';

export default function OdometerScreen() {
  const draft = useVehicleDraft((s) => s.draft);
  const setOdometer = useVehicleDraft((s) => s.setOdometer);

  const [odoText, setOdoText] = useState(
    draft.initialOdometer != null ? String(draft.initialOdometer) : ''
  );
  const [annualText, setAnnualText] = useState(
    draft.annualMileageEstimate != null ? String(draft.annualMileageEstimate) : ''
  );
  const [showErrors, setShowErrors] = useState(false);
  // Set when the user confirms a >5k jump warning so save can proceed.
  const [jumpConfirmed, setJumpConfirmed] = useState(false);

  // Initial entry: no last recorded value yet for this vehicle.
  const odo = validateOdometer(odoText, null);
  const annualError = validateAnnualEstimate(annualText);

  const handleSave = () => {
    setShowErrors(true);
    if (odo.error || !odo.value || annualError) return;
    if (odo.warning && !jumpConfirmed) return; // require confirmation first
    setOdometer(odo.value, annualText.trim() ? Number(annualText.trim()) : null);
    Keyboard.dismiss();
    // Vehicle draft is complete; onboarding persistence lands in a later card.
    router.back();
  };

  return (
    <Screen padding="md" scrollable safeAreaBottom={false}>
      <View style={styles.header}>
        <Text style={styles.title}>Current odometer</Text>
        <Text style={styles.subtitle}>
          Enter the reading on the dash today. This is the baseline for all
          future service reminders.
        </Text>
      </View>

      <Input
        label="Odometer *"
        placeholder="e.g. 52350"
        value={odoText}
        onChangeText={(t) => {
          setOdoText(t.replace(/[^0-9.]/g, '').slice(0, 11));
          setJumpConfirmed(false);
        }}
        keyboardType="numeric"
        error={showErrors && odo.error ? odo.error : undefined}
        helperText="Numbers only — miles or km, matching your dash."
      />

      <Input
        label="Annual mileage estimate (optional)"
        placeholder="e.g. 12000"
        value={annualText}
        onChangeText={(t) => setAnnualText(t.replace(/[^0-9]/g, '').slice(0, 6))}
        keyboardType="number-pad"
        error={showErrors && annualError ? annualError : undefined}
        helperText="Helps predict when services come due."
      />

      {showErrors && odo.warning && !jumpConfirmed && (
        <Card style={styles.warningCard}>
          <Text style={styles.warningText}>{odo.warning}</Text>
          <View style={styles.warningActions}>
            <Button
              variant="secondary"
              size="sm"
              onPress={() => {
                setJumpConfirmed(true);
                setOdoText('');
              }}
            >
              Re-enter
            </Button>
            <Button
              size="sm"
              onPress={() => setJumpConfirmed(true)}
            >
              It&apos;s correct
            </Button>
          </View>
        </Card>
      )}

      <View style={styles.footer}>
        <Button onPress={handleSave}>Save Vehicle</Button>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { marginBottom: spacing.md },
  title: {
    color: colors.text.primary,
    fontSize: typography.fontSize.xxl,
    fontWeight: typography.fontWeight.bold as '700',
    marginBottom: spacing.xs,
  },
  subtitle: {
    color: colors.text.secondary,
    fontSize: typography.fontSize.base,
  },
  warningCard: { marginBottom: spacing.md },
  warningText: {
    color: colors.border.warning,
    fontSize: typography.fontSize.base,
    marginBottom: spacing.md,
  },
  warningActions: { flexDirection: 'row', gap: spacing.sm },
  footer: {
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border.default,
    backgroundColor: colors.background.base,
  },
});
