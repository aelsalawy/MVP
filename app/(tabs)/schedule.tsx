/**
 * Schedule screen (T4.2, FR-3.2/FR-3.3).
 *
 * Renders the vehicle's maintenance schedule grouped overdue / due-soon /
 * ok with item names, due miles/date, and state chips. Uses only existing
 * design-system components (src/design — read-only).
 */

import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Screen } from '../../src/design/Screen';
import { Card } from '../../src/design/Card';
import { Badge } from '../../src/design/Badge';
import { ListRow } from '../../src/design/ListRow';
import { colors, spacing, typography } from '../../src/design/theme';
import { useScheduleStore } from '../../src/state/scheduleStore';
import type { ScheduleStateItem } from '../../src/services/scheduleEngine';

type GroupKey = 'overdue' | 'due-soon' | 'ok';

const GROUP_ORDER: GroupKey[] = ['overdue', 'due-soon', 'ok'];

const GROUP_META: Record<GroupKey, { title: string; badgeVariant: 'error' | 'warning' | 'success'; chip: string }> = {
  overdue: { title: 'Overdue', badgeVariant: 'error', chip: 'Overdue' },
  'due-soon': { title: 'Due Soon', badgeVariant: 'warning', chip: 'Due soon' },
  ok: { title: 'Up to date', badgeVariant: 'success', chip: 'OK' },
};

function formatDueDate(epochMs: number): string {
  return new Date(epochMs).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function dueLabel(item: ScheduleStateItem): string {
  const parts: string[] = [];
  if (item.dueMileage != null) {
    parts.push(`Due at ${item.dueMileage.toLocaleString()} mi`);
  }
  if (item.dueTime != null) {
    parts.push(`Due by ${formatDueDate(item.dueTime)}`);
  }
  return parts.join(' · ') || 'No due point';
}

function prettyName(itemKey: string): string {
  return itemKey
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function ScheduleScreen() {
  const items = useScheduleStore((s) => s.items);
  const mileage = useScheduleStore((s) => s.mileage);

  const groups = useMemo(() => {
    const grouped: Record<GroupKey, ScheduleStateItem[]> = {
      overdue: [],
      'due-soon': [],
      ok: [],
    };
    for (const item of items) {
      grouped[item.status].push(item);
    }
    return grouped;
  }, [items]);

  const empty = items.length === 0;

  return (
    <Screen scrollable>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Schedule</Text>
        <Text style={styles.subtitle}>{mileage.toLocaleString()} mi on the odometer</Text>

        {empty && (
          <Card>
            <View style={styles.emptyInner}>
              <Text style={styles.emptyText}>
                No schedule yet — add a vehicle with a covered make/model.
              </Text>
            </View>
          </Card>
        )}

        {GROUP_ORDER.map((key) =>
          groups[key].length === 0 ? null : (
            <View key={key} style={styles.group}>
              <View style={styles.groupHeader}>
                <Text style={styles.groupTitle}>{GROUP_META[key].title}</Text>
                <Badge variant={GROUP_META[key].badgeVariant} size="sm">
                  {String(groups[key].length)}
                </Badge>
              </View>
              <Card>
                {groups[key].map((item) => (
                  <ListRow
                    key={item.item}
                    title={prettyName(item.item)}
                    subtitle={dueLabel(item)}
                    showDivider={false}
                    right={
                      <Badge variant={GROUP_META[key].badgeVariant} size="sm">
                        {GROUP_META[key].chip}
                      </Badge>
                    }
                  />
                ))}
              </Card>
            </View>
          )
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: spacing.xl,
  },
  title: {
    fontSize: typography.fontSize.xxxl,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: typography.fontSize.base,
    color: colors.text.secondary,
    marginBottom: spacing.lg,
  },
  group: {
    marginBottom: spacing.lg,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  groupTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
  },
  emptyInner: {
    padding: spacing.md,
  },
  emptyText: {
    fontSize: typography.fontSize.base,
    color: colors.text.secondary,
    textAlign: 'center',
  },
});
