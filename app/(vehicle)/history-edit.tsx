/**
 * Edit an existing service entry (T5.1, FR-2.5): the manual-entry form
 * prefilled from the stored doc, saving via updateHistoryEntry. Reuses
 * src/services/entryValidation.ts (read-only) for validation + parsing.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View, Keyboard, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { db } from '../../lib/firebase';
import { useAuth } from '../../src/hooks/useAuth';
import { hasEntitlement } from '../../src/entitlements';
import { PlanTier } from '../../src/types';
import {
  Screen,
  Card,
  Input,
  Button,
  colors,
  spacing,
  typography,
} from '../../src/design';
import {
  getHistoryEntry,
  updateHistoryEntry,
  HistoryEntry,
} from '../../src/services/history';
import {
  SERVICE_TYPES,
  SERVICE_TYPE_LABELS,
  ServiceType,
  LineItemInput,
  validateServiceEntry,
  epochMsToIsoDate,
  LineItem,
} from '../../src/services/entryValidation';

const EMPTY_ITEM: LineItemInput = { desc: '', priceText: '' };

/** Cents → editable text, e.g. 12345 → "123.45"; 0 → "". */
function centsToText(cents: number): string {
  if (cents <= 0) return '';
  const whole = Math.floor(cents / 100);
  const frac = String(cents % 100).padStart(2, '0');
  return `${whole}.${frac}`;
}

export default function HistoryEditScreen() {
  const { entryId } = useLocalSearchParams<{ entryId?: string }>();
  const id = typeof entryId === 'string' && entryId ? entryId : null;
  const { user } = useAuth();
  const router = useRouter();

  const [loaded, setLoaded] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [planTier, setPlanTier] = useState<PlanTier | null>(null);
  const [saving, setSaving] = useState(false);

  const [dateText, setDateText] = useState('');
  const [serviceType, setServiceType] = useState<ServiceType>('maintenance');
  const [provider, setProvider] = useState('');
  const [totalText, setTotalText] = useState('');
  const [odometerText, setOdometerText] = useState('');
  const [notes, setNotes] = useState('');
  const [lineItems, setLineItems] = useState<LineItemInput[]>([EMPTY_ITEM]);
  const [showErrors, setShowErrors] = useState(false);

  // Prefill from the stored entry + load the user's tier for log.manual gating.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!user || !id) {
        setLoaded(true);
        return;
      }
      const entry: HistoryEntry | null = await getHistoryEntry(db, id);
      if (cancelled) return;
      if (entry == null) {
        setNotFound(true);
      } else {
        setDateText(epochMsToIsoDate(entry.date));
        if ((SERVICE_TYPES as readonly string[]).includes(entry.serviceType)) {
          setServiceType(entry.serviceType as ServiceType);
        }
        setProvider(entry.provider ?? '');
        setTotalText(centsToText(entry.costCents));
        setOdometerText(entry.odometer > 0 ? String(entry.odometer) : '');
        setNotes(entry.notes ?? '');
        const items = (entry.lineItems ?? []).map((it: LineItem) => ({
          desc: it.desc,
          priceText: centsToText(it.price),
        }));
        setLineItems(items.length > 0 ? items : [EMPTY_ITEM]);
      }
      setLoaded(true);
    })().catch(() => {
      if (!cancelled) {
        setNotFound(true);
        setLoaded(true);
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

  const values = useMemo(
    () => ({ dateText, serviceType, totalText, lineItems, odometerText }),
    [dateText, serviceType, totalText, lineItems, odometerText]
  );
  const validation = useMemo(() => validateServiceEntry(values), [values]);

  const setItem = (index: number, patch: Partial<LineItemInput>) => {
    setLineItems((prev) => prev.map((it, i) => (i === index ? { ...it, ...patch } : it)));
  };
  const removeItem = (index: number) => {
    setLineItems((prev) => (prev.length <= 1 ? [EMPTY_ITEM] : prev.filter((_, i) => i !== index)));
  };

  const handleSave = async () => {
    setShowErrors(true);
    if (!user || !id) return;
    if (planTier != null && !hasEntitlement(planTier, 'log.manual')) {
      Alert.alert('Not available', 'Manual service logging is not part of your plan.');
      return;
    }
    if (!validation.isValid || validation.date == null || validation.totalCents == null) return;

    setSaving(true);
    try {
      Keyboard.dismiss();
      await updateHistoryEntry(db, id, {
        date: validation.date,
        odometer: validation.odometer ?? 0,
        serviceType,
        costCents: validation.totalCents,
        provider: provider.trim() || undefined,
        notes: notes.trim() || undefined,
        lineItems: validation.lineItems,
      });
      router.back();
    } catch (e) {
      Alert.alert('Could not save', e instanceof Error ? e.message : 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (!user) return null;

  if (!loaded) {
    return (
      <Screen padding="md">
        <Text style={styles.loading}>Loading…</Text>
      </Screen>
    );
  }

  if (!id || notFound) {
    return (
      <Screen padding="md">
        <Text style={styles.loading}>Entry not found.</Text>
      </Screen>
    );
  }

  return (
    <Screen padding="md" scrollable safeAreaBottom={false}>
      <View style={styles.header}>
        <Text style={styles.title}>Edit service entry</Text>
        <Text style={styles.subtitle}>Update the details and save your changes.</Text>
      </View>

      <Input
        label="Date *"
        placeholder="YYYY-MM-DD"
        value={dateText}
        onChangeText={setDateText}
        autoCorrect={false}
        error={showErrors && validation.dateError ? validation.dateError : undefined}
      />

      <View style={styles.typeRow}>
        {SERVICE_TYPES.map((t) => (
          <Button
            key={t}
            size="sm"
            variant={serviceType === t ? 'primary' : 'secondary'}
            onPress={() => setServiceType(t)}
            style={styles.typeButton}
          >
            {SERVICE_TYPE_LABELS[t]}
          </Button>
        ))}
      </View>

      <Input
        label="Total amount *"
        placeholder="e.g. 123.45"
        value={totalText}
        onChangeText={(t) => setTotalText(t.replace(/[^0-9.,]/g, '').slice(0, 12))}
        keyboardType="decimal-pad"
        error={showErrors && validation.totalError ? validation.totalError : undefined}
      />

      <Input
        label="Odometer (optional)"
        placeholder="e.g. 52350"
        value={odometerText}
        onChangeText={(t) => setOdometerText(t.replace(/[^0-9]/g, '').slice(0, 11))}
        keyboardType="number-pad"
        error={showErrors && validation.odometerError ? validation.odometerError : undefined}
      />

      <Input
        label="Provider (optional)"
        placeholder="e.g. Jiffy Lube"
        value={provider}
        onChangeText={setProvider}
        autoCapitalize="words"
      />

      <Text style={styles.label}>Line items (optional)</Text>
      {lineItems.map((item, i) => (
        <View key={i} style={styles.itemRow}>
          <View style={styles.itemDesc}>
            <Input
              placeholder="Description"
              value={item.desc}
              onChangeText={(t) => setItem(i, { desc: t })}
              autoCapitalize="words"
              containerStyle={styles.itemInput}
            />
          </View>
          <View style={styles.itemPrice}>
            <Input
              placeholder="0.00"
              value={item.priceText}
              onChangeText={(t) => setItem(i, { priceText: t.replace(/[^0-9.,]/g, '').slice(0, 12) })}
              keyboardType="decimal-pad"
              containerStyle={styles.itemInput}
            />
          </View>
          <Button
            variant="secondary"
            size="sm"
            onPress={() => removeItem(i)}
            style={styles.removeButton}
          >
            Remove
          </Button>
        </View>
      ))}
      <Button
        variant="secondary"
        size="sm"
        onPress={() => setLineItems((prev) => [...prev, EMPTY_ITEM])}
        style={styles.addButton}
      >
        + Add line item
      </Button>

      {showErrors && validation.totalMismatch && (
        <Card style={styles.mismatchCard} padding="sm">
          <Text style={styles.mismatchText}>{validation.totalMismatch}</Text>
        </Card>
      )}

      <Input
        label="Notes (optional)"
        placeholder="Anything worth remembering…"
        value={notes}
        onChangeText={setNotes}
        multiline
      />

      <View style={styles.footer}>
        <Button onPress={handleSave} loading={saving} disabled={saving}>
          Save changes
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
  header: { marginBottom: spacing.lg },
  title: {
    color: colors.text.primary,
    fontSize: typography.fontSize.xxl,
    fontWeight: typography.fontWeight.bold as '700',
    marginBottom: spacing.xs,
  },
  subtitle: { color: colors.text.secondary, fontSize: typography.fontSize.base },
  label: {
    color: colors.text.secondary,
    fontSize: typography.fontSize.base,
    marginBottom: spacing.sm,
  },
  typeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  typeButton: { minWidth: 96 },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  itemDesc: { flex: 2 },
  itemPrice: { flex: 1 },
  itemInput: { marginBottom: 0 },
  removeButton: { marginTop: 0 },
  addButton: { alignSelf: 'flex-start', marginTop: spacing.md, marginBottom: spacing.md },
  mismatchCard: {
    marginBottom: spacing.md,
    backgroundColor: colors.warning.background,
    borderColor: colors.border.warning,
  },
  mismatchText: { color: colors.border.warning, fontSize: typography.fontSize.base },
  footer: {
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border.default,
  },
});
