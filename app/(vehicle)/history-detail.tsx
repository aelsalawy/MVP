/**
 * History detail (T5.1, FR-2.5): all fields + line items for one entry,
 * with Edit (prefilled manual form) and Delete (confirm dialog → hard delete,
 * since ServiceEntryDoc has no soft-delete flag).
 */
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { db } from '../../lib/firebase';
import { useAuth } from '../../src/hooks/useAuth';
import { hasEntitlement } from '../../src/entitlements';
import { PlanTier } from '../../src/types';
import {
  Screen,
  Card,
  Button,
  Badge,
  colors,
  spacing,
  typography,
} from '../../src/design';
import {
  getHistoryEntry,
  deleteHistoryEntry,
  formatEntryDate,
  formatCents,
  HistoryEntry,
} from '../../src/services/history';
import { SERVICE_TYPE_LABELS, ServiceType, LineItem } from '../../src/services/entryValidation';

export default function HistoryDetailScreen() {
  const { entryId } = useLocalSearchParams<{ entryId?: string }>();
  const id = typeof entryId === 'string' && entryId ? entryId : null;
  const { user } = useAuth();
  const router = useRouter();

  const [entry, setEntry] = useState<HistoryEntry | null>(null);
  const [planTier, setPlanTier] = useState<PlanTier | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Load the entry + the user's tier (for log.manual edit gating).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!user || !id) {
        setLoading(false);
        return;
      }
      const fetched = await getHistoryEntry(db, id);
      if (cancelled) return;
      if (fetched == null) {
        setNotFound(true);
      } else {
        setEntry(fetched);
      }
      setLoading(false);
    })().catch(() => {
      if (!cancelled) {
        setNotFound(true);
        setLoading(false);
      }
    });
    (async () => {
      try {
        const { doc, getDoc } = await import('firebase/firestore');
        const snap = await getDoc(doc(db, 'users', user!.uid));
        if (cancelled || !snap.exists()) return;
        const tier = snap.data().planTier;
        if (tier === 'free' || tier === 'advanced' || tier === 'pro') {
          setPlanTier(tier);
        }
      } catch {
        /* tier unknown — edit stays allowed */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, id]);

  if (!user) return null;

  const handleEdit = () => {
    if (!entry) return;
    router.push(`/(vehicle)/history-edit?entryId=${entry.id}`);
  };

  const confirmDelete = () => {
    if (!entry) return;
    Alert.alert(
      'Delete entry?',
      'This permanently removes this service entry. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => void handleDelete() },
      ]
    );
  };

  const handleDelete = async () => {
    if (!id) return;
    setDeleting(true);
    try {
      await deleteHistoryEntry(db, id);
      router.back();
    } catch {
      Alert.alert('Could not delete', 'Please try again.');
      setDeleting(false);
    }
  };

  // history.view is not in the entitlements map; edit is gated on log.manual.
  const canEdit = planTier == null || hasEntitlement(planTier, 'log.manual');

  if (loading) {
    return (
      <Screen padding="md">
        <Text style={styles.loading}>Loading…</Text>
      </Screen>
    );
  }

  if (!id || notFound || entry == null) {
    return (
      <Screen padding="md">
        <Text style={styles.loading}>Entry not found.</Text>
      </Screen>
    );
  }

  const typeLabel =
    SERVICE_TYPE_LABELS[entry.serviceType as ServiceType] ?? entry.serviceType;
  const lineItems: LineItem[] = entry.lineItems ?? [];

  return (
    <Screen padding="md" scrollable safeAreaBottom={false}>
      <View style={styles.header}>
        <Text style={styles.title}>{typeLabel}</Text>
        <View style={styles.headerBadges}>
          <Badge variant="info" size="sm">{formatEntryDate(entry.date)}</Badge>
          <Badge variant="default" size="sm">{formatCents(entry.costCents)}</Badge>
          {entry.source === 'ocr' && (
            <Badge variant="success" size="sm">From receipt</Badge>
          )}
        </View>
      </View>

      <Card padding="md" style={styles.card}>
        <View style={styles.fieldRow}>
          <Text style={styles.fieldLabel}>Date</Text>
          <Text style={styles.fieldValue}>{formatEntryDate(entry.date)}</Text>
        </View>
        <View style={styles.fieldRow}>
          <Text style={styles.fieldLabel}>Service type</Text>
          <Text style={styles.fieldValue}>{typeLabel}</Text>
        </View>
        <View style={styles.fieldRow}>
          <Text style={styles.fieldLabel}>Total amount</Text>
          <Text style={styles.fieldValue}>{formatCents(entry.costCents)}</Text>
        </View>
        <View style={styles.fieldRow}>
          <Text style={styles.fieldLabel}>Odometer</Text>
          <Text style={styles.fieldValue}>
            {entry.odometer > 0 ? `${entry.odometer.toLocaleString('en-US')} mi` : '—'}
          </Text>
        </View>
        <View style={styles.fieldRow}>
          <Text style={styles.fieldLabel}>Provider</Text>
          <Text style={styles.fieldValue}>{entry.provider || '—'}</Text>
        </View>
        <View style={styles.fieldRow}>
          <Text style={styles.fieldLabel}>Notes</Text>
          <Text style={styles.fieldValue}>{entry.notes || '—'}</Text>
        </View>
      </Card>

      <Card padding="md" style={styles.card}>
        <Text style={styles.sectionTitle}>Line items</Text>
        {lineItems.length === 0 ? (
          <Text style={styles.emptyText}>No line items recorded.</Text>
        ) : (
          lineItems.map((item, i) => (
            <View key={i} style={styles.itemRow}>
              <Text style={styles.fieldValue}>{item.desc || 'Item'}</Text>
              <Text style={styles.amount}>{formatCents(item.price)}</Text>
            </View>
          ))
        )}
      </Card>

      <View style={styles.actions}>
        {canEdit && (
          <Button variant="secondary" onPress={handleEdit} style={styles.actionButton}>
            Edit
          </Button>
        )}
        <Button
          variant="primary"
          onPress={confirmDelete}
          loading={deleting}
          disabled={deleting}
          style={{ ...styles.actionButton, backgroundColor: colors.error.default }}
        >
          Delete
        </Button>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  loading: {
    color: colors.text.secondary,
    fontSize: typography.fontSize.base,
    textAlign: 'center',
    marginTop: spacing.xl,
  },
  header: { marginBottom: spacing.md },
  title: {
    color: colors.text.primary,
    fontSize: typography.fontSize.xxl,
    fontWeight: typography.fontWeight.bold as '700',
    marginBottom: spacing.sm,
  },
  headerBadges: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  card: { marginBottom: spacing.md },
  fieldRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingVertical: spacing.xs,
  },
  fieldLabel: {
    color: colors.text.secondary,
    fontSize: typography.fontSize.base,
  },
  fieldValue: {
    color: colors.text.primary,
    fontSize: typography.fontSize.base,
    textAlign: 'right',
    flex: 1,
  },
  sectionTitle: {
    color: colors.text.primary,
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold as '600',
    marginBottom: spacing.sm,
  },
  emptyText: { color: colors.text.secondary, fontSize: typography.fontSize.base },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingVertical: spacing.xs,
  },
  amount: {
    color: colors.text.primary,
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium as '500',
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  actionButton: { flex: 1 } as const,
});
