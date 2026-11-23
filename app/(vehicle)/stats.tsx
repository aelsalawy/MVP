/**
 * Stats view (T5.2, FR-4.2): factual rollup of a vehicle's service history.
 * Totals, per-type breakdown, this-year vs lifetime, 12-month mini series.
 * All values derived from real entries — no invented numbers.
 */
import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { db } from '../../lib/firebase';
import { useAuth } from '../../src/hooks/useAuth';
import { useVehicleStats } from '../../src/hooks/useVehicleStats';
import { Screen, Card, Badge, ListRow, colors, spacing, typography } from '../../src/design';
import { formatCents } from '../../src/services/history';
import { SERVICE_TYPE_LABELS, ServiceType } from '../../src/services/entryValidation';
import { monthKey } from '../../src/services/stats';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** 'YYYY-MM' → 'Nov 26' style label. */
function monthLabel(key: string): string {
  const [y, m] = key.split('-');
  return `${MONTH_NAMES[Number(m) - 1]} ${y.slice(2)}`;
}

export default function StatsScreen() {
  const { vehicleId: vehicleIdParam } = useLocalSearchParams<{ vehicleId?: string }>();
  const { user } = useAuth();
  const vehicleId =
    typeof vehicleIdParam === 'string' && vehicleIdParam ? vehicleIdParam : null;
  const { stats, loading, error } = useVehicleStats(db, vehicleId);
  const [nowMonth] = useState<string>(() => monthKey(Date.now()));

  if (!user) return null;

  if (vehicleId == null) {
    return (
      <Screen padding="md">
        <Card padding="md">
          <Text style={styles.emptyText}>No vehicle selected.</Text>
        </Card>
      </Screen>
    );
  }

  if (error != null) {
    return (
      <Screen padding="md">
        <Card padding="md" style={styles.errorCard}>
          <Text style={styles.errorText}>{error}</Text>
        </Card>
      </Screen>
    );
  }

  if (loading) {
    return (
      <Screen padding="md">
        <Card padding="md">
          <Text style={styles.emptyText}>Loading stats…</Text>
        </Card>
      </Screen>
    );
  }

  if (stats == null) {
    return (
      <Screen padding="md">
        <Card padding="md">
          <Text style={styles.emptyText}>No service entries yet — stats appear once you log service.</Text>
        </Card>
      </Screen>
    );
  }

  const maxMonthCost = Math.max(1, ...stats.monthlySeries.map((p) => p.costCents));
  const label = (t: string) => SERVICE_TYPE_LABELS[t as ServiceType] ?? t;

  return (
    <Screen padding="md" scrollable safeAreaBottom={false}>
      <Card padding="md" style={styles.section}>
        <Text style={styles.sectionTitle}>Totals</Text>
        <ListRow
          title="Entries logged"
          right={<Text style={styles.value}>{stats.count}</Text>}
          showDivider
        />
        <ListRow
          title="Lifetime spend"
          right={<Text style={styles.value}>{formatCents(stats.totalCostCents)}</Text>}
          showDivider
        />
        <ListRow
          title={`This year (${stats.thisYearValue})`}
          subtitle={
            stats.thisYear.count > 0
              ? `${stats.thisYear.count} ${stats.thisYear.count === 1 ? 'entry' : 'entries'}`
              : undefined
          }
          right={
            <Text style={styles.value}>{formatCents(stats.thisYear.costCents)}</Text>
          }
          showDivider
        />
        <ListRow
          title="Average per entry"
          right={<Text style={styles.value}>{formatCents(stats.avgCostCents)}</Text>}
          showDivider={false}
        />
      </Card>

      <Card padding="sm" style={styles.section}>
        <Text style={[styles.sectionTitle, { margin: spacing.sm, marginBottom: 0 }]}>
          By service type
        </Text>
        {stats.byType.map((t, i) => (
          <ListRow
            key={t.serviceType}
            title={label(t.serviceType)}
            subtitle={
              t.avgIntervalDays != null
                ? `${t.count} logged · avg every ${Math.round(t.avgIntervalDays)} days`
                : `${t.count} logged`
            }
            showDivider={i < stats.byType.length - 1}
            left={
              <Badge variant="info" size="sm">
                {t.serviceType.slice(0, 3).toUpperCase()}
              </Badge>
            }
            right={<Text style={styles.value}>{formatCents(t.costCents)}</Text>}
          />
        ))}
      </Card>

      <Card padding="md" style={styles.section}>
        <Text style={styles.sectionTitle}>Last 12 months</Text>
        <View style={styles.bars}>
          {stats.monthlySeries.map((p) => (
            <View key={p.month} style={styles.barCol}>
              <View
                style={[
                  styles.bar,
                  { height: Math.max(2, Math.round((p.costCents / maxMonthCost) * 60)) },
                  p.month === nowMonth && styles.barCurrent,
                ]}
              />
              <Text style={styles.barLabel}>{monthLabel(p.month)}</Text>
            </View>
          ))}
        </View>
        <Text style={styles.seriesNote}>
          Peak month: {formatCents(maxMonthCost)} — bar heights are
          relative to it.
        </Text>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: { marginBottom: spacing.md },
  sectionTitle: {
    color: colors.text.primary,
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold as '700',
    marginBottom: spacing.xs,
  },
  value: {
    color: colors.text.primary,
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold as '600',
  },
  emptyText: {
    color: colors.text.secondary,
    fontSize: typography.fontSize.base,
    textAlign: 'center',
  },
  errorCard: {
    backgroundColor: colors.error.background,
    borderColor: colors.border.error,
  },
  errorText: { color: colors.border.error, fontSize: typography.fontSize.base },
  bars: { flexDirection: 'row', alignItems: 'flex-end', marginTop: spacing.sm },
  barCol: { flex: 1, alignItems: 'center' },
  bar: {
    width: 10,
    backgroundColor: colors.primary[300],
    borderRadius: 2,
    minHeight: 2,
  },
  barCurrent: { backgroundColor: colors.primary[500] },
  barLabel: {
    color: colors.text.secondary,
    fontSize: typography.fontSize.xs as number,
    marginTop: spacing.xs,
  },
  seriesNote: {
    color: colors.text.secondary,
    fontSize: typography.fontSize.xs as number,
    marginTop: spacing.sm,
  },
});
