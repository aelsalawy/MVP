/**
 * Manual entry — Step 1: make search/pick (T2.2, FR-1.2b).
 * Common makes (Toyota, Kia, …) are shown first; a search field filters
 * the full list. One decision path per screen.
 */
import React, { useMemo, useState } from 'react';
import {
  FlatList,
  StyleSheet,
  Text,
  View,
  Keyboard,
} from 'react-native';
import { router } from 'expo-router';
import { Card, Screen, Input, ListRow, Button, colors, spacing, typography } from '../../../src/design';
import { ALL_MAKES, COMMON_MAKES } from '../../../src/vehicle/makes';
import { useVehicleDraft } from '../../../src/state/vehicleDraft';

export default function ManualMakeScreen() {
  const [query, setQuery] = useState('');
  const make = useVehicleDraft((s) => s.draft.manualMake);
  const setManual = useVehicleDraft((s) => s.setManual);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const source = q
      ? ALL_MAKES.filter((m) => m.toLowerCase().includes(q))
      : ALL_MAKES;
    return source;
  }, [query]);

  const handlePick = (value: string) => {
    // Switching make invalidates a previously picked model.
    setManual({ manualMake: value, manualModel: null });
    Keyboard.dismiss();
    router.push('/(vehicle)/manual/details');
  };

  const renderRow = ({ item }: { item: string }) => (
    <ListRow
      title={item}
      subtitle={COMMON_MAKES.includes(item) ? 'Popular' : undefined}
      right={
        item === make ? (
          <Text style={styles.check}>✓</Text>
        ) : undefined
      }
      onPress={() => handlePick(item)}
    />
  );

  return (
    <Screen padding="md" safeAreaBottom={false}>
      <View style={styles.header}>
        <Text style={styles.stepIndicator}>Step 1 of 2</Text>
        <Text style={styles.title}>Pick the make</Text>
        <Text style={styles.subtitle}>
          Popular makes first — or search for any brand.
        </Text>
        <Input
          placeholder="Search make…"
          value={query}
          onChangeText={setQuery}
          autoCapitalize="words"
          autoCorrect={false}
        />
      </View>

      {results.length === 0 ? (
        <Card>
          <Text style={styles.emptyText}>No makes match “{query}”.</Text>
        </Card>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => item}
          renderItem={renderRow}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.list}
        />
      )}

      {/* Pinned bottom primary button (FR-1.4): continue with selected/typed make. */}
      <View style={styles.footer}>
        <Button
          disabled={!make}
          onPress={() => handlePick(query.trim() || make!)}
        >
          Continue
        </Button>
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
    marginBottom: spacing.xs,
  },
  subtitle: {
    color: colors.text.secondary,
    fontSize: typography.fontSize.base,
    marginBottom: spacing.md,
  },
  list: { paddingBottom: spacing.lg },
  emptyText: { color: colors.text.secondary, fontSize: typography.fontSize.base },
  check: { color: colors.border.focused, fontSize: typography.fontSize.lg },
  footer: {
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border.default,
    backgroundColor: colors.background.base,
  },
});
