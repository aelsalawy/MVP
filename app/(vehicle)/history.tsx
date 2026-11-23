/**
 * History list (T5.1, FR-2.5): reverse-chronological service entries for a
 * vehicle with pull pagination ("Load more"). Tap a row for the detail view.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  QueryDocumentSnapshot,
  DocumentData,
  collection,
  getDocs,
  query,
  where,
  limit,
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../src/hooks/useAuth';
import { Screen, Card, Button, Badge, ListRow, colors, spacing, typography } from '../../src/design';
import {
  listHistoryEntries,
  formatEntryDate,
  formatCents,
  HistoryEntry,
} from '../../src/services/history';
import { SERVICE_TYPE_LABELS, ServiceType } from '../../src/services/entryValidation';

const TYPE_BADGE_VARIANT: Record<ServiceType, 'info' | 'warning' | 'success' | 'default'> = {
  maintenance: 'info',
  repair: 'warning',
  inspection: 'success',
  fuel: 'default',
  other: 'default',
};

export default function HistoryScreen() {
  const { vehicleId: vehicleIdParam } = useLocalSearchParams<{ vehicleId?: string }>();
  const { user } = useAuth();
  const router = useRouter();

  // When opened without a vehicle (e.g. from the dashboard Garage card),
  // fall back to the user's first vehicle (multi-vehicle picker is T6.1).
  const [fallbackVehicleId, setFallbackVehicleId] = useState<string | null>(null);
  const vehicleId =
    typeof vehicleIdParam === 'string' && vehicleIdParam
      ? vehicleIdParam
      : fallbackVehicleId;

  useEffect(() => {
    if (!user || fallbackVehicleId != null) return;
    let cancelled = false;
    (async () => {
      const snap = await getDocs(
        query(collection(db, 'vehicles'), where('ownerId', '==', user.uid), limit(1))
      );
      if (!cancelled && snap.docs.length > 0) {
        setFallbackVehicleId(snap.docs[0].data().uid as string);
      }
    })().catch(() => {
      /* no vehicles — list stays empty */
    });
    return () => {
      cancelled = true;
    };
  }, [user, fallbackVehicleId]);

  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [cursor, setCursor] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [exhausted, setExhausted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPage = useCallback(
    async (reset: boolean) => {
      if (!user || !vehicleId) return;
      if (reset) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);
      try {
        const page = await listHistoryEntries(db, {
          vehicleId,
          cursor: reset ? null : cursor,
        });
        setEntries((prev) => (reset ? page.entries : [...prev, ...page.entries]));
        setCursor(page.nextCursor);
        if (page.entries.length === 0) setExhausted(true);
      } catch {
        setError('Could not load history. Pull to retry.');
      } finally {
        setRefreshing(false);
        setLoading(false);
      }
    },
    [user, vehicleId, cursor]
  );

  // Initial + on vehicleId change.
  useEffect(() => {
    const run = async () => {
      setEntries([]);
      setCursor(null);
      setExhausted(false);
      await loadPage(true);
    };
    void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid, vehicleId]);

  if (!user) return null;

  return (
    <Screen padding="md" scrollable safeAreaBottom={false}>
      <View style={styles.header}>
        <Text style={styles.title}>Service history</Text>
        <Text style={styles.subtitle}>
          Newest first{entries.length > 0 ? ` · ${entries.length} shown` : ''}.
        </Text>
      </View>

      {error != null && (
        <Card style={styles.errorCard} padding="sm">
          <Text style={styles.errorText}>{error}</Text>
        </Card>
      )}

      {vehicleId == null && fallbackVehicleId != null && (
        <Card padding="md" style={{ marginBottom: spacing.md }}>
          <Text style={styles.emptyText}>
            Add a vehicle first — service history will appear here.
          </Text>
        </Card>
      )}

      {entries.length === 0 && !loading && error == null && vehicleId != null && (
        <Card padding="md">
          <Text style={styles.emptyText}>
            {error != null ? '' : 'No service entries yet. Add one to get started.'}
          </Text>
        </Card>
      )}

      {entries.length > 0 && (
        <Card style={styles.listCard} padding="sm">
          {entries.map((entry, i) => (
            <ListRow
              key={entry.id}
              title={SERVICE_TYPE_LABELS[entry.serviceType as ServiceType] ?? entry.serviceType}
              subtitle={
                (entry.provider ? `${entry.provider} · ` : '') +
                formatEntryDate(entry.date)
              }
              showDivider={i < entries.length - 1}
              left={
                <Badge variant={TYPE_BADGE_VARIANT[entry.serviceType as ServiceType] ?? 'default'} size="sm">
                  {entry.serviceType.slice(0, 3).toUpperCase()}
                </Badge>
              }
              right={
                <Text style={styles.amount}>{formatCents(entry.costCents)}</Text>
              }
              onPress={() => router.push(`/(vehicle)/history-detail?entryId=${entry.id}`)}
            />
          ))}
        </Card>
      )}

      {error != null && (
        <Button
          variant="secondary"
          size="sm"
          onPress={() => void loadPage(true)}
          style={styles.loadMore}
          disabled={refreshing}
        >
          Retry
        </Button>
      )}

      {!exhausted && (
        <Button
          variant="secondary"
          size="sm"
          loading={loading}
          onPress={() => void loadPage(false)}
          style={styles.loadMore}
          disabled={loading || !vehicleId}
        >
          Load more
        </Button>
      )}
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
  subtitle: { color: colors.text.secondary, fontSize: typography.fontSize.base },
  errorCard: {
    marginBottom: spacing.md,
    backgroundColor: colors.error.background,
    borderColor: colors.border.error,
  },
  errorText: { color: colors.border.error, fontSize: typography.fontSize.base },
  emptyText: {
    color: colors.text.secondary,
    fontSize: typography.fontSize.base,
    textAlign: 'center',
  },
  listCard: { marginBottom: spacing.md },
  amount: {
    color: colors.text.primary,
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold as '600',
  },
  loadMore: { alignSelf: 'center' },
});
