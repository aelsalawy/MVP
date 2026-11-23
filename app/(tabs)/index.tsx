/**
 * Simplified dashboard (T6.1, FR-5.x).
 *
 * Single scrollable view:
 *  - vehicle header card (year/make/model, odometer, VIN last 8)
 *  - schedule summary strip (overdue n / due-soon n via scheduleEngine + scheduleStore)
 *  - Garage quick actions (Add service, View schedule, View history)
 *  - recent activity (last 3 service entries)
 *
 * Vehicle display prefers the persisted vehicle doc and falls back to the
 * in-memory vehicle draft (src/state/vehicleDraft.ts) for a vehicle that
 * has not been saved yet.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { collection, getDocs, limit, query, where } from 'firebase/firestore';
import { auth, db } from '../../lib/firebase';
import { useAuth } from '../../src/hooks/useAuth';
import { useEntitlements } from '../../src/hooks/useEntitlements';
import { Screen } from '../../src/design/Screen';
import { Card } from '../../src/design/Card';
import { Button } from '../../src/design/Button';
import { Badge } from '../../src/design/Badge';
import { ListRow } from '../../src/design/ListRow';
import { colors, spacing, typography } from '../../src/design/theme';
import { useVehicleDraft } from '../../src/state/vehicleDraft';
import { useScheduleStore } from '../../src/state/scheduleStore';
import { fetchIntervals } from '../../src/services/intervals';
import {
  listHistoryEntries,
  formatEntryDate,
  formatCents,
  type HistoryEntry,
} from '../../src/services/history';
import type { VehicleDoc } from '../../src/types';

/** Display shape for the current vehicle (persisted doc or draft fallback). */
interface VehicleSummary {
  year: number | null;
  make: string | null;
  model: string | null;
  odometer: number | null;
  vin: string | null;
}

const EMPTY_SUMMARY: VehicleSummary = {
  year: null,
  make: null,
  model: null,
  odometer: null,
  vin: null,
};

function vinLast8(vin: string | null): string | null {
  if (!vin) return null;
  return vin.length <= 8 ? vin : vin.slice(-8);
}

export default function DashboardScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { planTier } = useEntitlements(user?.uid);
  const draft = useVehicleDraft((s) => s.draft);

  const scheduleItems = useScheduleStore((s) => s.items);
  const computeSchedule = useScheduleStore((s) => s.compute);

  const [vehicle, setVehicle] = useState<VehicleSummary>(EMPTY_SUMMARY);
  const [recent, setRecent] = useState<HistoryEntry[]>([]);
  const [loaded, setLoaded] = useState(false);

  // Resolve the current vehicle: prefer the persisted doc, fall back to draft.
  useEffect(() => {
    let cancelled = false;
    if (!user) return;
    (async () => {
      const snap = await getDocs(
        query(collection(db, 'vehicles'), where('ownerId', '==', user.uid), limit(1))
      );
      if (cancelled) return;
      if (snap.docs.length > 0) {
        const doc = snap.docs[0].data() as VehicleDoc;
        setVehicle({
          year: doc.year,
          make: doc.make,
          model: doc.model,
          odometer: doc.initialOdometer,
          vin: doc.vin ?? null,
        });
      } else {
        // No saved vehicle yet — show the onboarding draft (T2.x flow).
        setVehicle({
          year: draft.manualYear,
          make: draft.manualMake,
          model: draft.manualModel,
          odometer: draft.initialOdometer,
          vin: draft.vin,
        });
      }
    })().catch(() => {
      if (!cancelled) setLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, [user, draft]);

  // Recent activity (last 3 entries) + schedule summary computation.
  const loadDashboardData = useCallback(async () => {
    if (!user) return;
    const snap = await getDocs(
      query(collection(db, 'vehicles'), where('ownerId', '==', user.uid), limit(1))
    );
    if (snap.docs.length === 0) {
      setLoaded(true);
      return;
    }
    const vehicleDoc = snap.docs[0].data() as VehicleDoc;
    const page = await listHistoryEntries(db, {
      vehicleId: vehicleDoc.uid,
      pageSize: 3,
    });
    if (page.entries.length > 0) setRecent(page.entries);

    // Schedule strip (FR-5.x): compute overdue / due-soon counts once per load.
    const intervals = await fetchIntervals(vehicleDoc.make, vehicleDoc.model, vehicleDoc.year);
    if (intervals.length > 0) {
      computeSchedule({
        vehicleMileage: vehicleDoc.initialOdometer,
        entries: page.entries.map((e) => ({
          date: e.date,
          odometer: e.odometer,
          serviceType: e.serviceType,
        })),
        intervals,
      });
    }
    setLoaded(true);
  }, [user, computeSchedule]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        await loadDashboardData();
      } catch {
        /* offline / rules — dashboard stays in empty state */
      }
    })();
  }, [user, loadDashboardData]);

  const { overdueCount, dueSoonCount } = useMemo(() => {
    let overdue = 0;
    let dueSoon = 0;
    for (const item of scheduleItems) {
      if (item.status === 'overdue') overdue += 1;
      else if (item.status === 'due-soon') dueSoon += 1;
    }
    return { overdueCount: overdue, dueSoonCount: dueSoon };
  }, [scheduleItems]);

  const handleLogout = async () => {
    await auth.signOut();
    router.replace('/');
  };

  const vehicleTitle =
    vehicle.year != null && vehicle.make && vehicle.model
      ? `${vehicle.year} ${vehicle.make} ${vehicle.model}`
      : null;

  return (
    <Screen scrollable>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.title}>Dashboard</Text>
            <Text style={styles.email}>{user?.email ?? ''}</Text>
          </View>
          {/* Tier-aware subscription entry (T7.1): Upgrade when free,
              Manage subscription placeholder when pro. */}
          <Button
            variant="secondary"
            size="sm"
            onPress={() => router.push('/(tabs)/paywall')}
          >
            {planTier === 'pro' ? 'Manage subscription' : 'Upgrade'}
          </Button>
          <Button variant="secondary" size="sm" onPress={handleLogout}>
            Sign out
          </Button>
        </View>

        {/* Vehicle header (FR-5.x): year make model, odometer, VIN last 8 */}
        <Card style={styles.section}>
          <Text style={styles.cardLabel}>Current vehicle</Text>
          {vehicleTitle ? (
            <Text style={styles.vehicleTitle}>{vehicleTitle}</Text>
          ) : (
            <Text style={styles.vehicleTitle}>No vehicle yet</Text>
          )}
          <View style={styles.vehicleMetaRow}>
            <View style={styles.metaBlock}>
              <Text style={styles.metaLabel}>Odometer</Text>
              <Text style={styles.metaValue}>
                {vehicle.odometer != null ? `${vehicle.odometer.toLocaleString()} mi` : '—'}
              </Text>
            </View>
            <View style={styles.metaBlock}>
              <Text style={styles.metaLabel}>VIN (last 8)</Text>
              <Text style={styles.metaValue}>{vinLast8(vehicle.vin) ?? '—'}</Text>
            </View>
          </View>
        </Card>

        {/* Schedule summary strip (FR-3.2/3.3 via scheduleEngine) */}
        <Card style={styles.section}>
          <Text style={styles.cardLabel}>Maintenance schedule</Text>
          <View style={styles.stripRow}>
            <View style={styles.stripItem}>
              <Badge variant={overdueCount > 0 ? 'error' : 'success'} size="sm">
                {overdueCount}
              </Badge>
              <Text style={styles.stripLabel}>Overdue</Text>
            </View>
            <View style={styles.stripItem}>
              <Badge variant={dueSoonCount > 0 ? 'warning' : 'success'} size="sm">
                {dueSoonCount}
              </Badge>
              <Text style={styles.stripLabel}>Due soon</Text>
            </View>
          </View>
        </Card>

        {/* Garage quick actions (Add service / View history kept intact) */}
        <Card style={styles.section}>
          <Text style={styles.cardLabel}>Garage</Text>
          <View style={styles.actionsRow}>
            <Button
              variant="primary"
              size="sm"
              style={styles.actionButton}
              onPress={() => router.push('/(vehicle)/service-entry')}
            >
              + Add service
            </Button>
            <Button
              variant="secondary"
              size="sm"
              style={styles.actionButton}
              onPress={() => router.push('/(tabs)/schedule')}
            >
              View schedule
            </Button>
            <Button
              variant="secondary"
              size="sm"
              style={styles.actionButton}
              onPress={() => router.push('/(vehicle)/history')}
            >
              View history
            </Button>
          </View>
        </Card>

        {/* Recent activity (last 3 entries, FR-2.5) */}
        <Card style={styles.section}>
          <Text style={styles.cardLabel}>Recent activity</Text>
          {recent.length === 0 ? (
            <Text style={styles.emptyText}>
              {loaded ? 'No service entries yet — log your first one.' : 'Loading…'}
            </Text>
          ) : (
            recent.map((entry, index) => (
              <ListRow
                key={entry.id}
                title={entry.serviceType.replace(/\b\w/g, (c) => c.toUpperCase())}
                subtitle={`${formatEntryDate(entry.date)} · ${entry.odometer.toLocaleString()} mi · ${formatCents(entry.costCents)}`}
                showDivider={index < recent.length - 1}
                onPress={() =>
                  router.push(`/(vehicle)/history-detail?entryId=${entry.id}`)
                }
              />
            ))
          )}
        </Card>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: typography.fontSize.xxxl,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  email: {
    fontSize: typography.fontSize.base,
    color: colors.text.secondary,
  },
  section: {
    marginBottom: spacing.md,
  },
  cardLabel: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.sm,
  },
  vehicleTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  vehicleMetaRow: {
    flexDirection: 'row',
    gap: spacing.lg,
  },
  metaBlock: {
    flex: 1,
  },
  metaLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  metaValue: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
  },
  stripRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  stripItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  stripLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
  },
  actionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  actionButton: {
    alignSelf: 'flex-start',
  },
  emptyText: {
    fontSize: typography.fontSize.base,
    color: colors.text.secondary,
    paddingVertical: spacing.xs,
  },
});
