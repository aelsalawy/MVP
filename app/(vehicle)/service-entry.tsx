/**
 * Manual service entry form (T3.1, FR-2.1 / FR-2.5).
 *
 * Date (default today), service type, provider, required total amount,
 * add/remove line-item rows, and notes. Saving writes a Firestore
 * `service_entries` doc for the selected vehicle (schema per src/types
 * ServiceEntryDoc + `vehicleOwnerId` required by firestore.rules).
 * Line-item sum vs total mismatch is informational only (never blocks).
 */
import React, { useEffect, useMemo, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Keyboard,
  Alert,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import {
  collection,
  doc,
  getDoc,
  addDoc,
  query,
  where,
  limit,
  getDocs,
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../src/hooks/useAuth';
import { useSyncState } from '../../src/hooks/useSyncState';
import { SyncBanner } from '../../src/components/SyncBanner';
import { hasEntitlement } from '../../src/entitlements';
import { PlanTier, VehicleDoc } from '../../src/types';
import {
  Screen,
  Card,
  Input,
  Button,
  ListRow,
  Badge,
  colors,
  spacing,
  typography,
} from '../../src/design';
import {
  SERVICE_TYPES,
  SERVICE_TYPE_LABELS,
  ServiceType,
  LineItemInput,
  validateServiceEntry,
  buildServiceEntryDoc,
  epochMsToIsoDate,
} from '../../src/services/entryValidation';

const EMPTY_ITEM: LineItemInput = { desc: '', priceText: '' };

export default function ServiceEntryScreen() {
  const { vehicleId: vehicleIdParam } = useLocalSearchParams<{ vehicleId?: string }>();
  const { user } = useAuth();
  // T3.4 / NFR-2: sync state drives the offline banner. The addDoc below
  // resolves from Firestore's persistent local cache while offline and
  // replays to the server on reconnect — no explicit queue needed here.
  const sync = useSyncState();

  const [vehicleId, setVehicleId] = useState<string | null>(
    typeof vehicleIdParam === 'string' && vehicleIdParam ? vehicleIdParam : null
  );
  const [vehicles, setVehicles] = useState<VehicleDoc[] | null>(null);
  const [planTier, setPlanTier] = useState<PlanTier | null>(null);

  const [dateText, setDateText] = useState(() => epochMsToIsoDate(Date.now()));
  const [serviceType, setServiceType] = useState<ServiceType>('maintenance');
  const [provider, setProvider] = useState('');
  const [totalText, setTotalText] = useState('');
  const [odometerText, setOdometerText] = useState('');
  const [notes, setNotes] = useState('');
  const [lineItems, setLineItems] = useState<LineItemInput[]>([EMPTY_ITEM]);
  const [showErrors, setShowErrors] = useState(false);
  const [saving, setSaving] = useState(false);

  // Load the user's tier + vehicles (once). If no vehicle was passed via
  // params, the first vehicle is preselected; multi-vehicle picker is T6.1.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const userSnap = await getDoc(doc(db, 'users', user.uid));
      if (cancelled) return;
      if (userSnap.exists()) {
        const tier = userSnap.data().planTier;
        if (tier === 'free' || tier === 'advanced' || tier === 'pro') {
          setPlanTier(tier);
        }
      }
      const snap = await getDocs(
        query(
          collection(db, 'vehicles'),
          where('ownerId', '==', user.uid),
          limit(10)
        )
      );
      if (cancelled) return;
      const list = snap.docs.map((d) => d.data() as VehicleDoc);
      setVehicles(list);
      setVehicleId((prev) => prev ?? (list.length > 0 ? list[0].uid : null));
    })().catch(() => {
      if (!cancelled) setVehicles([]);
    });
    return () => {
      cancelled = true;
    };
  }, [user]);

  const values = useMemo(
    () => ({
      dateText,
      serviceType,
      totalText,
      lineItems,
      odometerText,
    }),
    [dateText, serviceType, totalText, lineItems, odometerText]
  );
  const validation = useMemo(() => validateServiceEntry(values), [values]);

  const setItem = (index: number, patch: Partial<LineItemInput>) => {
    setLineItems((prev) =>
      prev.map((it, i) => (i === index ? { ...it, ...patch } : it))
    );
  };
  const removeItem = (index: number) => {
    setLineItems((prev) =>
      prev.length <= 1 ? [EMPTY_ITEM] : prev.filter((_, i) => i !== index)
    );
  };

  const handleSave = async () => {
    setShowErrors(true);
    if (!user || !vehicleId) {
      Alert.alert('Missing vehicle', 'Select a vehicle before saving.');
      return;
    }
    if (planTier != null && !hasEntitlement(planTier, 'log.manual')) {
      Alert.alert('Not available', 'Manual service logging is not part of your plan.');
      return;
    }
    if (!validation.isValid) return;

    setSaving(true);
    try {
      const entry = buildServiceEntryDoc(
        user.uid,
        vehicleId,
        values,
        validation,
        { provider: provider.trim() || undefined, notes: notes.trim() || undefined }
      );
      if (!entry) throw new Error('Invalid entry');
      Keyboard.dismiss();
      // NFR-2 / T3.4: while offline, addDoc resolves against the persistent
      // local cache and Firestore queues + replays the write automatically
      // when connectivity returns — manual entries queue natively.
      await addDoc(collection(db, 'service_entries'), entry);
      router.back();
    } catch (e) {
      Alert.alert(
        'Could not save',
        e instanceof Error ? e.message : 'Please try again.'
      );
    } finally {
      setSaving(false);
    }
  };

  const hasVehicles = (vehicles?.length ?? 0) > 0;
  const selectedVehicle = vehicles?.find((v) => v.uid === vehicleId);

  return (
    <Screen padding="md" scrollable safeAreaBottom={false}>
      <SyncBanner {...sync} />
      <View style={styles.header}>
        <Text style={styles.title}>Add service</Text>
        <Text style={styles.subtitle}>
          Log maintenance, repairs, inspections and more for
          {' '}{selectedVehicle
            ? `${selectedVehicle.year} ${selectedVehicle.make} ${selectedVehicle.model}`
            : 'your vehicle'}.
        </Text>
      </View>

      {vehicles != null && vehicles.length > 1 && (
        <Card style={styles.vehicleCard} padding="sm">
          {vehicles.map((v) => (
            <ListRow
              key={v.uid}
              title={`${v.year} ${v.make} ${v.model}`}
              showDivider={false}
              right={
                v.uid === vehicleId ? <Badge variant="info">Selected</Badge> : undefined              }
              onPress={() => setVehicleId(v.uid)}
            />
          ))}
        </Card>
      )}

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
        {vehicles != null && !hasVehicles && (
          <Text style={styles.noVehicle}>
            Add a vehicle first to log service entries.
          </Text>
        )}
        <Button
          onPress={handleSave}
          loading={saving}
          disabled={vehicles != null && !hasVehicles}
        >
          Save entry
        </Button>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { marginBottom: spacing.lg },
  title: {
    color: colors.text.primary,
    fontSize: typography.fontSize.xxl,
    fontWeight: typography.fontWeight.bold as '700',
    marginBottom: spacing.xs,
  },
  subtitle: {
    color: colors.text.secondary,
    fontSize: typography.fontSize.base,
  },
  vehicleCard: { marginBottom: spacing.md },
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
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
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
  mismatchText: {
    color: colors.border.warning,
    fontSize: typography.fontSize.base,
  },
  footer: {
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border.default,
  },
  noVehicle: {
    color: colors.border.warning,
    fontSize: typography.fontSize.sm,
    marginBottom: spacing.md,
  },
});
