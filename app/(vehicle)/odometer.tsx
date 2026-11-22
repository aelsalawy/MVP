/**
 * Odometer entry stub (T2.3 TODO).
 * Manual-entry wizard (T2.2) routes here after make/model/year are saved.
 * The actual initial-odometer capture is implemented in card T2.3.
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Screen, Button, colors, spacing, typography } from '../../src/design';

export default function OdometerScreen() {
  return (
    <Screen padding="md">
      <View style={styles.body}>
        <Text style={styles.title}>Odometer</Text>
        <Text style={styles.subtitle}>
          Initial odometer entry is coming in the next step. (T2.3 TODO)
        </Text>
      </View>
      <Button onPress={() => undefined}>Save</Button>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: {
    color: colors.text.primary,
    fontSize: typography.fontSize.xxl,
    fontWeight: typography.fontWeight.bold as '700',
    marginBottom: spacing.sm,
  },
  subtitle: {
    color: colors.text.secondary,
    fontSize: typography.fontSize.base,
    textAlign: 'center',
  },
});
