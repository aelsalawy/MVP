/**
 * Manual entry — Step 2: model + year + optional trim (T2.2, FR-1.2b).
 * Model is picked from the filtered list for the chosen make (free text
 * allowed). Year is numeric, 1990..current+1. On save the draft is stored
 * and the user is routed to the odometer step (T2.3).
 */
import React, { useMemo, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Keyboard,
} from 'react-native';
import { router } from 'expo-router';
import {
  Card, ListRow, Input, Button, Screen,
  colors, spacing, typography,
} from '../../../src/design';
import { MODELS_BY_MAKE, MIN_YEAR, MAX_YEAR } from '../../../src/vehicle/makes';
import { useVehicleDraft } from '../../../src/state/vehicleDraft';

export default function ManualDetailsScreen() {
  const draft = useVehicleDraft((s) => s.draft);
  const setManual = useVehicleDraft((s) => s.setManual);

  const [modelQuery, setModelQuery] = useState(draft.manualModel ?? '');
  const [yearText, setYearText] = useState(
    draft.manualYear != null ? String(draft.manualYear) : ''
  );
  const [trim, setTrim] = useState(draft.manualTrim ?? '');
  const [showErrors, setShowErrors] = useState(false);

  const make = draft.manualMake;

  const yearNum = /^\d{4}$/.test(yearText) ? Number(yearText) : null;
  const yearValid =
    yearNum != null && yearNum >= MIN_YEAR && yearNum <= MAX_YEAR;
  const modelValue = modelQuery.trim();
  const modelValid = modelValue.length > 0;

  const modelSuggestions = useMemo(() => {
    const models = MODELS_BY_MAKE[make ?? ''] ?? [];
    const q = modelValue.toLowerCase();
    return q ? models.filter((m) => m.toLowerCase().includes(q)) : models;
  }, [make, modelValue]);

  const handleSave = () => {
    if (!modelValid || !yearValid || !make) {
      setShowErrors(true);
      return;
    }
    setManual({
      manualMake: make,
      manualModel: modelValue,
      manualTrim: trim.trim() || null,
      manualYear: yearNum,
    });
    Keyboard.dismiss();
    // (T2.3 TODO) odometer entry is implemented in the next card.
    router.push('/(vehicle)/odometer');
  };

  return (
    <Screen padding="md" scrollable safeAreaBottom={false}>
      <View style={styles.header}>
        <Text style={styles.stepIndicator}>Step 2 of 3</Text>
        <Text style={styles.title}>{make ?? 'Vehicle details'}</Text>
      </View>

      <Input
        label="Model *"
        placeholder="e.g. Corolla"
        value={modelQuery}
        onChangeText={setModelQuery}
        autoCapitalize="words"
        autoCorrect={false}
        error={showErrors && !modelValid ? 'Model is required' : undefined}
      />

      {modelSuggestions.length > 0 && (
        <View style={styles.suggestions}>
          {modelSuggestions.slice(0, 6).map((m) => (
            <ListRow
              key={m}
              title={m}
              showDivider={false}
              onPress={() => {
                setModelQuery(m);
                Keyboard.dismiss();
              }}
            />
          ))}
        </View>
      )}

      <Input
        label="Year *"
        placeholder={`${MIN_YEAR}–${MAX_YEAR}`}
        value={yearText}
        onChangeText={(t) => setYearText(t.replace(/[^0-9]/g, '').slice(0, 4))}
        keyboardType="number-pad"
        error={
          showErrors && !yearValid
            ? `Enter a year between ${MIN_YEAR} and ${MAX_YEAR}`
            : undefined
        }
      />

      <Input
        label="Trim (optional)"
        placeholder="e.g. LE, EX-L"
        value={trim}
        onChangeText={setTrim}
        autoCapitalize="words"
        helperText="Optional — trim or badge name."
      />

      {!make && (
        <Card style={styles.warningCard}>
          <Text style={styles.warningText}>
            No make selected — go back to step 1 and pick a make.
          </Text>
        </Card>
      )}

      {/* Pinned bottom primary button (FR-1.4). */}
      <View style={styles.footer}>
        <Button onPress={handleSave}>Save Vehicle</Button>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { marginBottom: spacing.md },
  stepIndicator: {
    color: colors.text.secondary,
    fontSize: typography.fontSize.sm,
    marginBottom: spacing.xs,
  },
  title: {
    color: colors.text.primary,
    fontSize: typography.fontSize.xxl,
    fontWeight: typography.fontWeight.bold as '700',
  },
  suggestions: {
    marginBottom: spacing.md,
    borderRadius: 8,
    overflow: 'hidden',
  },
  warningCard: { marginBottom: spacing.md },
  warningText: {
    color: colors.border.warning,
    fontSize: typography.fontSize.base,
  },
  footer: {
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border.default,
    backgroundColor: colors.background.base,
  },
});
