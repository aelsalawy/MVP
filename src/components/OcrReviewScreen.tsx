/**
 * OCR review screen (T3.3, FR-2.3, FR-2.4) — edit-above-confirm.
 *
 * Renders the parsed receipt fields as editable inputs. The "Edit Extracted
 * Fields" section sits ABOVE "Confirm & Add to Logbook" per FR-2.3; nothing
 * is persisted until the user explicitly taps Confirm (FR-2.4). Skip returns
 * to the previous screen without saving.
 */
import React, { useMemo, useState } from 'react';
import { Keyboard, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import {
  Button, Card, Input, Screen,
  colors, spacing, typography,
} from '../design';
import {
  useServiceDraft,
  type ServiceEntryDraftState,
} from '../state/serviceDraft';

const SERVICE_TYPES = [
  'oil_change', 'tire_rotation', 'brake_service', 'inspection',
  'repair', 'other',
];

export interface OcrReviewScreenProps {
  draft: ServiceEntryDraftState;
  onPatch: (fields: Partial<ServiceEntryDraftState>) => void;
  onUpdateLineItem: (index: number, item: { desc?: string; price?: number }) => void;
  onAddLineItem: () => void;
  onRemoveLineItem: (index: number) => void;
  /** Confirm (FR-2.4): caller builds/persists the doc, then navigates. */
  onConfirm: () => void;
  /** Skip / reject: return to the form without saving anything. */
  onSkip: () => void;
}

export const OcrReviewFields: React.FC<OcrReviewScreenProps> = ({
  draft,
  onPatch,
  onUpdateLineItem,
  onAddLineItem,
  onRemoveLineItem,
  onConfirm,
  onSkip,
}) => {
  const [showErrors, setShowErrors] = useState(false);

  // Local text buffers for numeric fields so typing stays smooth.
  const [totalText, setTotalText] = useState(
    draft.total != null ? String(draft.total) : ''
  );
  const [linePriceTexts, setLinePriceTexts] = useState<string[]>(
    draft.lineItems.map((li) => (li.price != null ? String(li.price) : ''))
  );

  const errors = useMemo(() => {
    const e: Partial<Record<'date' | 'total' | 'serviceType', string>> = {};
    if (!draft.date || Number.isNaN(Date.parse(`${draft.date}T00:00:00`))) {
      e.date = 'Enter a valid date (YYYY-MM-DD)';
    }
    const t = Number(totalText);
    if (!totalText.trim() || Number.isNaN(t) || t < 0) {
      e.total = 'Enter a valid non-negative amount';
    }
    if (!draft.serviceType.trim()) {
      e.serviceType = 'Choose a service type';
    }
    return e;
  }, [draft.date, draft.serviceType, totalText]);

  const hasErrors = Object.keys(errors).length > 0;

  const handleTotalChange = (text: string) => {
    setTotalText(text);
    const t = Number(text);
    if (!Number.isNaN(t)) onPatch({ total: t });
  };

  const handleLinePriceChange = (index: number, text: string) => {
    setLinePriceTexts((prev) => prev.map((p, i) => (i === index ? text : p)));
    const p = Number(text);
    if (!Number.isNaN(p)) onUpdateLineItem(index, { price: p });
  };

  const handleConfirm = () => {
    setShowErrors(true);
    if (hasErrors) return;
    Keyboard.dismiss();
    onConfirm();
  };

  const handleSkip = () => {
    Keyboard.dismiss();
    onSkip();
  };

  return (
    <Screen padding="md" scrollable safeAreaBottom={false}>
      <Text style={styles.heading}>Review Receipt</Text>
      <Text style={styles.subheading}>
        Check the extracted fields below — edit anything that looks wrong,
        then confirm to add it to your logbook.
      </Text>

      {/* Edit Extracted Fields — ABOVE Confirm (FR-2.3) */}
      <Card padding="md" style={styles.card}>
        <Text style={styles.sectionTitle}>Edit Extracted Fields</Text>

        <Input
          label="Provider"
          value={draft.provider}
          onChangeText={(text) => onPatch({ provider: text })}
          placeholder="e.g. Jiffy Lube"
        />

        <Input
          label="Date"
          value={draft.date}
          onChangeText={(text) => onPatch({ date: text })}
          placeholder="YYYY-MM-DD"
          error={showErrors ? errors.date : undefined}
          autoCapitalize="none"
        />

        <Input
          label="Total"
          value={totalText}
          onChangeText={handleTotalChange}
          placeholder="0.00"
          keyboardType="decimal-pad"
          error={showErrors ? errors.total : undefined}
        />

        <Input
          label="Currency"
          value={draft.currency}
          onChangeText={(text) => onPatch({ currency: text.toUpperCase() })}
          placeholder="USD"
          autoCapitalize="characters"
          maxLength={3}
        />

        <View style={styles.typeWrap}>
          <Text style={styles.typeLabel}>Service Type</Text>
          <View style={styles.typeRow}>
            {SERVICE_TYPES.map((type) => {
              const active = draft.serviceType === type;
              return (
                <Button
                  key={type}
                  size="sm"
                  variant={active ? 'primary' : 'secondary'}
                  onPress={() => onPatch({ serviceType: type })}
                  style={styles.typeChip}
                >
                  {type.replace(/_/g, ' ')}
                </Button>
              );
            })}
          </View>
          {showErrors && errors.serviceType ? (
            <Text style={styles.errorText}>{errors.serviceType}</Text>
          ) : null}
        </View>

        <View style={styles.itemsHeader}>
          <Text style={styles.typeLabel}>Line Items</Text>
          <Button size="sm" variant="secondary" onPress={onAddLineItem}>
            + Add
          </Button>
        </View>
        {draft.lineItems.length === 0 ? (
          <Text style={styles.emptyItems}>No line items — add one or leave empty.</Text>
        ) : (
          draft.lineItems.map((li, i) => (
            <View key={`li-${i}`} style={styles.lineItemRow}>
              <View style={styles.lineItemDesc}>
                <Input
                  label="Description"
                  value={li.desc}
                  onChangeText={(text) => onUpdateLineItem(i, { desc: text })}
                  placeholder="e.g. Synthetic oil"
                />
              </View>
              <View style={styles.lineItemPrice}>
                <Input
                  label="Price"
                  value={linePriceTexts[i] ?? ''}
                  onChangeText={(text) => handleLinePriceChange(i, text)}
                  placeholder="0.00"
                  keyboardType="decimal-pad"
                />
              </View>
              <Button
                size="sm"
                variant="secondary"
                onPress={() => onRemoveLineItem(i)}
                style={styles.removeBtn}
              >
                Remove
              </Button>
            </View>
          ))
        )}
      </Card>

      {/* Confirm & Add to Logbook — BELOW the editable fields (FR-2.3) */}
      <View style={styles.actions}>
        <Button
          variant="primary"
          size="lg"
          onPress={handleConfirm}
          disabled={showErrors && hasErrors}
          style={styles.confirmBtn}
        >
          Confirm &amp; Add to Logbook
        </Button>
        <Button variant="secondary" size="lg" onPress={handleSkip}>
          Skip — Discard Scan
        </Button>
        <Text style={styles.confirmHint}>
          Nothing is saved until you confirm.
        </Text>
      </View>
    </Screen>
  );
};

/** Route screen wiring the review fields to the shared draft store. */
export function OcrReviewScreen(): React.JSX.Element {
  const draft = useServiceDraft((s) => s.draft);
  const patch = useServiceDraft((s) => s.patch);
  const updateLineItem = useServiceDraft((s) => s.updateLineItem);
  const addLineItem = useServiceDraft((s) => s.addLineItem);
  const removeLineItem = useServiceDraft((s) => s.removeLineItem);
  const toServiceEntryDoc = useServiceDraft((s) => s.toServiceEntryDoc);
  const reset = useServiceDraft((s) => s.reset);

  if (!draft) {
    return (
      <Screen padding="md">
        <Text style={styles.heading}>No receipt to review</Text>
        <Button variant="secondary" size="lg" onPress={() => router.back()}>
          Go Back
        </Button>
      </Screen>
    );
  }

  return (
    <OcrReviewFields
      draft={draft}
      onPatch={patch}
      onUpdateLineItem={updateLineItem}
      onAddLineItem={addLineItem}
      onRemoveLineItem={removeLineItem}
      onConfirm={() => {
        // FR-2.4: explicit confirm creates the service entry draft doc.
        // Persistence to Firestore lands with the logbook write card (T5.x);
        // here the confirmed doc is finalized and the draft store cleared.
        toServiceEntryDoc();
        reset();
        router.back();
      }}
      onSkip={() => {
        // Skip/reject: nothing is saved (FR-2.4).
        reset();
        router.back();
      }}
    />
  );
}

const styles = StyleSheet.create({
  heading: {
    fontSize: typography.fontSize.xxl,
    fontWeight: typography.fontWeight.bold as '400',
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  subheading: {
    fontSize: typography.fontSize.base,
    color: colors.text.secondary,
    marginBottom: spacing.lg,
  },
  card: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold as '400',
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  typeWrap: {
    marginBottom: spacing.md,
  },
  typeLabel: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium as '400',
    color: colors.text.secondary,
    marginBottom: spacing.sm,
  },
  typeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  typeChip: {
    marginRight: 0,
  },
  itemsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  emptyItems: {
    fontSize: typography.fontSize.sm,
    color: colors.text.disabled,
    marginBottom: spacing.md,
  },
  lineItemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  lineItemDesc: {
    flex: 2,
  },
  lineItemPrice: {
    flex: 1,
  },
  removeBtn: {
    marginTop: spacing.lg,
  },
  actions: {
    marginTop: spacing.sm,
  },
  confirmBtn: {
    marginBottom: spacing.sm,
  },
  confirmHint: {
    fontSize: typography.fontSize.sm,
    color: colors.text.disabled,
    textAlign: 'center',
    marginTop: spacing.md,
  },
  errorText: {
    fontSize: typography.fontSize.sm,
    color: colors.border.error,
    marginTop: spacing.xs,
  },
});

export default OcrReviewScreen;
