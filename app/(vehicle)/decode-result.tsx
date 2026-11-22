/**
 * Decode result screen (Car Tracker MVP — T2.1).
 *
 * Shows Make / Model / Trim / Year (plus a vPIC error-code note) and a match
 * quality badge derived from how many fields resolved. The primary "Continue"
 * button is pinned to the bottom and advances the draft into the T2.2 manual
 * wizard (which pre-fills nothing — it re-collects make/model/year — but the
 * draft's decoded fields remain available for T2.2/T2.3 to consume).
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '../../src/design/Screen';
import { Button } from '../../src/design/Button';
import { Card } from '../../src/design/Card';
import { Badge } from '../../src/design/Badge';
import { useVehicleDraft } from '../../src/state/vehicleDraft';
import { colors, spacing, typography } from '../../src/design/theme';

type MatchQuality = 'high' | 'medium' | 'low';

function qualityFor(resolved: number): MatchQuality {
  if (resolved >= 3) return 'high';
  if (resolved >= 2) return 'medium';
  return 'low';
}

const QUALITY_LABEL: Record<MatchQuality, string> = {
  high: 'High confidence',
  medium: 'Partial match',
  low: 'Low confidence',
};

export default function DecodeResultScreen() {
  const router = useRouter();
  const draft = useVehicleDraft((s) => s.draft);

  const decode = draft.decode;

  if (!draft.vin || !decode) {
    // No decode in the draft — nothing to show; bounce back to scan.
    router.replace('/(vehicle)/vin-scan');
    return null;
  }

  const resolvedFieldCount = [decode.make, decode.model, decode.year, decode.trim].filter(
    Boolean
  ).length;
  const quality = qualityFor(resolvedFieldCount);

  return (
    <Screen style={styles.screen}>
      <View style={styles.content}>
        <Text style={styles.title}>Vehicle details</Text>

        <View style={styles.badgeRow}>
          <Badge variant={quality === 'high' ? 'success' : quality === 'medium' ? 'warning' : 'error'}>
            {QUALITY_LABEL[quality]}
          </Badge>
          {draft.checksumValid === false && (
            <Badge variant="warning">Check digit mismatch</Badge>
          )}
        </View>

        <Card style={styles.card}>
          <Field label="Make" value={decode.make} />
          <Field label="Model" value={decode.model} />
          <Field label="Year" value={decode.year} />
          <Field label="Trim" value={decode.trim ?? '—'} />
          <Field label="VIN" value={draft.vin} mono />
          {decode.errorCode && decode.errorCode !== '0' && (
            <Text style={styles.note}>vPIC note: {decode.errorCode}</Text>
          )}
        </Card>
      </View>

      {/* Primary CTA pinned to bottom (AC FR-1.5). */}
      <View style={styles.footer}>
        <Button onPress={() => router.push('/(vehicle)/manual/index')}>Continue</Button>
      </View>
    </Screen>
  );
}

function Field({ label, value, mono }: { label: string; value: string | null; mono?: boolean }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={[styles.fieldValue, mono && styles.mono]}>{value || '—'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { flex: 1, gap: spacing.md },
  title: { color: colors.text.primary, fontSize: typography.fontSize.xl, fontWeight: '700' },
  body: { color: colors.text.secondary, fontSize: typography.fontSize.base },
  badgeRow: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  card: { gap: spacing.sm },
  field: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  fieldLabel: { color: colors.text.secondary, fontSize: typography.fontSize.sm },
  fieldValue: { color: colors.text.primary, fontSize: typography.fontSize.base, fontWeight: '600' },
  mono: { fontFamily: 'monospace' },
  note: { color: colors.text.disabled, fontSize: typography.fontSize.xs, marginTop: spacing.xs },
  footer: { paddingTop: spacing.md },
});
