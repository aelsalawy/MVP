/**
 * Entitlements Map — D3.1 single source of truth (Car Tracker MVP).
 * Spec: docs/car-tracker-mvp-spec.md §3.1. NO hardcoded tier strings outside this module.
 * 'advanced' tier is RESERVED for future use — included in type+map now, unused at launch.
 * Fail-closed: unknown tier or unknown feature → false / 0.
 */

export type Tier = 'free' | 'advanced' | 'pro';

/** Feature values: number = tier limit (Infinity = unlimited), boolean = binary access. */
export type EntitlementValue = number | boolean;
export type EntitlementTier = { free: EntitlementValue; advanced: EntitlementValue; pro: EntitlementValue };
export type FeatureKey =
  | 'vehicles.max'
  | 'log.manual'
  | 'reminders'
  | 'history.export'
  | 'ocr'
  | 'receipt.storage';

export const TIERS: Tier[] = ['free', 'advanced', 'pro'];

/** Spec §3.1 matrix. Feature set is spec-locked — extend ONLY with approval. */
export const ENTITLEMENTS: Record<FeatureKey, EntitlementTier> = {
  'vehicles.max': { free: 1, advanced: 3, pro: Infinity },
  'log.manual': { free: true, advanced: true, pro: true },
  'reminders': { free: true, advanced: true, pro: true},
  'history.export': { free: false, advanced: true, pro: true },
  'ocr': { free: false, advanced: false, pro: true },
  'receipt.storage': { free: false, advanced: true, pro: true },
};

/** Fail-closed gate. Unknown tier/feature → false. */
export function hasEntitlement(tier: string, featureKey: string): boolean {
  if (!(TIERS as string[]).includes(tier)) return false;
  const ent = (ENTITLEMENTS as Record<string, EntitlementTier>)[featureKey];
  if (!ent) return false;
  const v = ent[tier as Tier];
  if (typeof v === 'boolean') return v;
  return v === Infinity || (typeof v === 'number' && v > 0);
}

/** Numeric limit (Infinity = unlimited). Unknown tier/feature → 0 (fail-closed). */
export function getEntitlementLimit(tier: string, featureKey: string): number {
  if (!(TIERS as string[]).includes(tier)) return 0;
  const ent = (ENTITLEMENTS as Record<string, EntitlementTier>)[featureKey];
  if (!ent) return 0;
  const v = ent[tier as Tier];
  return typeof v === 'number' ? v : v ? Infinity : 0;
}

/** Human label — reserved tiers included. */
export const TIER_NAMES: Record<Tier, string> = { free: 'Free', advanced: 'Advanced', pro: 'Pro' };
export function getTierName(tier: string): string {
  return (TIER_NAMES as Record<string, string>)[tier] ?? 'Unknown';
}
