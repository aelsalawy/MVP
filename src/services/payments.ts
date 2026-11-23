/**
 * Store purchase flow — STUB (T7.1, D3.1).
 *
 * Real IAP (react-native-iap / RevenueCat / Play Billing + StoreKit) wiring
 * lands in T8.x / E2 (later card). This module defines the interface the
 * paywall codes against so the real implementation is a drop-in swap.
 *
 * NO FAKE SUCCESS PATHS: initPurchase/restorePurchases always reject with
 * code 'not_implemented' until the real store flow lands.
 *
 * Dev bypass: EXPO_PUBLIC_PAYMENTS_DEV_BYPASS=1 does NOT fake a purchase;
 * it only flags isDevBypassEnabled() so dev tooling / screens can render a
 * "dev mode" notice and so tests can assert the flag plumbing. Purchases
 * still reject in dev-bypass mode — never simulate success.
 */

import type { Tier } from '../entitlements';

export type BillingPeriod = 'monthly' | 'annual';

export type StoreTier = Extract<Tier, 'pro'>;

export interface PurchaseResult {
  /** Store transaction id — only present after REAL wiring (T8.x). */
  transactionId: string;
  tier: Tier;
  period: BillingPeriod;
}

export interface RestoreResult {
  restored: boolean;
  tier: Tier | null;
}

export interface StorePurchaseFlow {
  /** Begin a store purchase for the given tier + billing period. */
  initPurchase(tier: StoreTier, period: BillingPeriod): Promise<PurchaseResult>;
  /** Restore previously purchased subscriptions (app reinstall / new device). */
  restorePurchases(): Promise<RestoreResult>;
}

export class NotImplementedError extends Error {
  readonly code = 'not_implemented';
  constructor(message = 'Store purchase flow not implemented (lands T8.x / E2)') {
    super(message);
    this.name = 'NotImplementedError';
  }
}

/** Dev-bypass flag plumbing only — never enables a fake success path. */
export function isDevBypassEnabled(): boolean {
  return process.env.EXPO_PUBLIC_PAYMENTS_DEV_BYPASS === '1';
}

/**
 * Stub implementation: always rejects 'not_implemented'.
 * Real StoreKit / Play Billing implementation swaps in at T8.x.
 */
export const storePurchaseFlow: StorePurchaseFlow = {
  async initPurchase(_tier: StoreTier, _period: BillingPeriod): Promise<PurchaseResult> {
    void _tier;
    void _period;
    throw new NotImplementedError();
  },
  async restorePurchases(): Promise<RestoreResult> {
    throw new NotImplementedError();
  },
};
