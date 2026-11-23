/**
 * Paywall presentational component (T7.1, D3.1).
 *
 * Feature comparison is rendered by ITERATING the canonical ENTITLEMENTS map
 * (src/entitlements) — zero hardcoded feature keys or limits in JSX. Prices:
 * spec §3 Pro $4.99/mo or $39/yr. 'advanced' tier renders correctly if
 * injected because the map already covers it (reserved tier, D3.1).
 *
 * Purchases go through StorePurchaseFlow (src/services/payments.ts) — a
 * stub that rejects 'not_implemented' until real IAP lands (T8.x / E2).
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Button } from '../design/Button';
import { Card } from '../design/Card';
import { Screen } from '../design/Screen';
import { colors, typography } from '../design/theme';
import {
  ENTITLEMENTS,
  TIER_NAMES,
  TIERS,
  type Tier,
  type FeatureKey,
} from '../entitlements';
import {
  storePurchaseFlow,
  type BillingPeriod,
} from '../services/payments';

/** Spec §3 price strings — copy as-is from docs/car-tracker-mvp-spec.md §3. */
export const PRO_PRICES: Record<BillingPeriod, string> = {
  monthly: '$4.99/mo',
  annual: '$39/yr',
};

/** Human rendering of a matrix value — value comes ONLY from the map. */
function renderValue(v: number | boolean): string {
  if (typeof v === 'boolean') return v ? '✓' : '—';
  return v === Infinity ? 'Unlimited' : String(v);
}

export interface PaywallProps {
  /** Live users/{uid}.planTier. 'free' shows the upgrade CTA; 'pro' shows active state. */
  planTier: string;
  /** Injected for tests / future composition; defaults to the stub flow. */
  purchaseFlow?: typeof storePurchaseFlow;
  onPurchaseAttempt?: (error: unknown) => void;
}

export function Paywall({ planTier, purchaseFlow = storePurchaseFlow, onPurchaseAttempt }: PaywallProps) {
  const isPro = planTier === 'pro';

  const startPurchase = (period: BillingPeriod) => {
    // Stub flow: always rejects 'not_implemented'. Real IAP lands T8.x / E2.
    purchaseFlow.initPurchase('pro', period).catch((err: unknown) => {
      onPurchaseAttempt?.(err);
    });
  };

  const restore = () => {
    purchaseFlow.restorePurchases().catch((err: unknown) => {
      onPurchaseAttempt?.(err);
    });
  };

  return (
    <Screen scrollable>
      <Text style={styles.title}>
        {isPro ? 'You are on Pro' : 'Upgrade to Pro'}
      </Text>
      <Text style={styles.subtitle}>
        {isPro
          ? 'Thanks for supporting Car Tracker.'
          : 'Unlock the full maintenance picture for your car.'}
      </Text>

      {!isPro && (
        <Card style={styles.priceCard}>
          <Text style={styles.priceTitle}>Pro</Text>
          <View style={styles.priceRow}>
            <View style={styles.priceOption}>
              <Text style={styles.price}>{PRO_PRICES.monthly}</Text>
              <Button variant="primary" size="sm" onPress={() => startPurchase('monthly')}>
                Subscribe monthly
              </Button>
            </View>
            <View style={styles.priceOption}>
              <Text style={styles.price}>{PRO_PRICES.annual}</Text>
              <Button variant="secondary" size="sm" onPress={() => startPurchase('annual')}>
                Subscribe yearly
              </Button>
            </View>
          </View>
          <Button variant="secondary" size="sm" style={styles.restore} onPress={restore}>
            Restore purchases
          </Button>
        </Card>
      )}

      {/* Matrix-driven comparison: iterate the map, never hardcode features. */}
      <Card style={styles.compareCard}>
        <View style={styles.compareHeader}>
          <Text style={styles.compareFeature}>Feature</Text>
          {/* Columns derived from TIERS — 'advanced' renders if injected. */}
          {TIERS.map((t: Tier) => (
            <Text key={t} style={styles.compareCol}>
              {TIER_NAMES[t]}
            </Text>
          ))}
        </View>
        {(Object.keys(ENTITLEMENTS) as FeatureKey[]).map((key) => {
          const ent = ENTITLEMENTS[key];
          return (
            <View key={key} style={styles.compareRow} testID={`paywall-feature-${key}`}>
              <Text style={styles.compareFeature}>{key}</Text>
              {TIERS.map((t: Tier) => (
                <Text key={t} style={styles.compareCol} testID={`paywall-value-${key}-${t}`}>
                  {renderValue(ent[t])}
                </Text>
              ))}
            </View>
          );
        })}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: typography.fontSize.xxxl,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: typography.fontSize.base,
    color: colors.text.secondary,
    marginBottom: 16,
  },
  priceCard: { marginBottom: 16 },
  priceTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
    marginBottom: 12,
  },
  priceRow: { flexDirection: 'row', gap: 12 },
  priceOption: { flex: 1, gap: 8 },
  price: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.primary[300],
  },
  restore: { marginTop: 12 },
  compareCard: { marginBottom: 16 },
  compareHeader: { flexDirection: 'row', marginBottom: 8 },
  compareRow: { flexDirection: 'row', paddingVertical: 4 },
  compareFeature: { flex: 2, color: colors.text.primary, fontSize: typography.fontSize.sm },
  compareCol: { flex: 1, color: colors.text.secondary, fontSize: typography.fontSize.sm },
});
