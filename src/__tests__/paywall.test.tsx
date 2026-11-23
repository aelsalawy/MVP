/**
 * T7.1: Paywall component tests — matrix-driven rendering (D3.1).
 * Feature rows/columns are asserted against the canonical ENTITLEMENTS map,
 * never against hardcoded copies. Pattern: pinnedSave.test.tsx.
 */
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Paywall } from '../components/Paywall';
import {
  ENTITLEMENTS,
  TIERS,
  type Tier,
  type FeatureKey,
} from '../entitlements';
import type { StorePurchaseFlow } from '../services/payments';
import { NotImplementedError } from '../services/payments';

/** Fail-flow stub: always rejects with the real stub's error shape. */
function failingFlow(): StorePurchaseFlow {
  return {
    initPurchase: () => Promise.reject(new NotImplementedError()),
    restorePurchases: () => Promise.reject(new NotImplementedError()),
  };
}

const MATRIX = ENTITLEMENTS as Record<FeatureKey, Record<Tier, number | boolean>>;

describe('T7.1 paywall — matrix-driven rendering (D3.1)', () => {
  test('renders every feature key from the canonical map (no hardcoding)', async () => {
    const { getByTestId } = await render(<Paywall planTier="free" />);
    const keys = Object.keys(ENTITLEMENTS) as FeatureKey[];
    expect(keys.length).toBeGreaterThan(0);
    for (const key of keys) {
      expect(getByTestId(`paywall-feature-${key}`)).toBeTruthy();
    }
  });

  test('renders a column for every tier, including reserved advanced', async () => {
    const { getByTestId } = await render(<Paywall planTier="free" />);
    const keys = Object.keys(ENTITLEMENTS) as FeatureKey[];
    for (const key of keys) {
      for (const tier of TIERS) {
        expect(getByTestId(`paywall-value-${key}-${tier}`)).toBeTruthy();
      }
    }
  });

  test('cell values come from the matrix (free tier row matches map)', async () => {
    const { getByTestId } = await render(<Paywall planTier="free" />);
    // Free tier: ocr is false → '—'; vehicles.max is 1 → '1'.
    expect(getByTestId(`paywall-value-ocr-free`).props.children).toBe('—');
    expect(getByTestId(`paywall-value-ocr-pro`).props.children).toBe('✓');
    expect(getByTestId(`paywall-value-vehicles.max-pro`).props.children).toBe('Unlimited');
    // Assert directly against the map so test + UI cannot drift.
    for (const key of Object.keys(MATRIX) as FeatureKey[]) {
      expect(getByTestId(`paywall-value-${key}-free`).props.children).toBe(
        typeof MATRIX[key].free === 'boolean'
          ? MATRIX[key].free ? '✓' : '—'
          : MATRIX[key].free === Infinity ? 'Unlimited' : String(MATRIX[key].free)
      );
    }
  });

  test('free tier sees the Pro upgrade CTA and spec prices', async () => {
    const { getByText } = await render(<Paywall planTier="free" />);
    expect(getByText('Upgrade to Pro')).toBeTruthy();
    expect(getByText('$4.99/mo')).toBeTruthy();
    expect(getByText('$39/yr')).toBeTruthy();
  });

  test('pro tier sees active state, no upgrade CTA', async () => {
    const { getByText, queryByText } = await render(<Paywall planTier="pro" />);
    expect(getByText('You are on Pro')).toBeTruthy();
    expect(queryByText('Upgrade to Pro')).toBeNull();
    // Feature matrix still renders for pro.
    expect(getByText('ocr')).toBeTruthy();
  });

  test('purchase buttons surface the stub failure (no fake success paths)', async () => {
    const attempts: unknown[] = [];
    const { getByText } = await render(
      <Paywall
        planTier="free"
        purchaseFlow={failingFlow()}
        onPurchaseAttempt={(err) => attempts.push(err)}
      />
    );
    fireEvent.press(getByText('Subscribe monthly'));
    await new Promise((r) => setTimeout(r, 0));
    expect(attempts.length).toBe(1);
    expect((attempts[0] as NotImplementedError).code).toBe('not_implemented');

    fireEvent.press(getByText('Restore purchases'));
    await new Promise((r) => setTimeout(r, 0));
    expect(attempts.length).toBe(2);
    expect((attempts[1] as NotImplementedError).code).toBe('not_implemented');
  });
});

describe('T7.1 runtime entitlements — fail-closed gating', () => {
  test('unknown tier disables everything: has() false, limit() 0 via canonical map', () => {
    // The paywall itself with an unknown tier must render nothing "enabled":
    // free column of the comparison still shows the map, but the runtime
    // gates (hasEntitlement with unknown tier) are fail-closed. Assert the
    // gate contract the component relies on:
    const { hasEntitlement, getEntitlementLimit } = jest.requireActual('../entitlements') as {
      hasEntitlement: (t: string, f: string) => boolean;
      getEntitlementLimit: (t: string, f: string) => number;
    };
    expect(hasEntitlement('hacker-tier', 'ocr')).toBe(false);
    expect(getEntitlementLimit('hacker-tier', 'vehicles.max')).toBe(0);
    // Every feature fails closed on unknown tier:
    for (const key of Object.keys(ENTITLEMENTS)) {
      expect(hasEntitlement('unknown', key)).toBe(false);
    }
  });

  test('unknown tier on the paywall renders the generic matrix, not fake access', async () => {
    const { getByTestId } = await render(<Paywall planTier="unknown-tier" />);
    // Free column remains map-driven (fail-closed display), e.g. ocr '—'.
    expect(getByTestId('paywall-value-ocr-free').props.children).toBe('—');
  });
});
